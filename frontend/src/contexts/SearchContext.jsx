import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { requestMedia, requestSearch } from '../utils/api.js'

const SearchContext = createContext(null)

const initialSearchQuery = {
  person: '',
  year: '',
}

export const SearchProvider = ({ children, isAuthenticated }) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchMediaById, setSearchMediaById] = useState({})
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchSuggestionsLoading, setSearchSuggestionsLoading] = useState(false)
  const suppressSuggestionsRef = useRef(false)
  const suggestionRequestId = useRef(0)

  const handleSearchQueryChange = useCallback((field, value) => {
    setSearchQuery((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSearchSuggestionSelect = useCallback((value) => {
    suppressSuggestionsRef.current = true
    setSearchQuery((prev) => ({ ...prev, person: value }))
    setSearchSuggestions([])
    setSearchSuggestionsLoading(false)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setSearchSuggestions([])
      setSearchSuggestionsLoading(false)
      return
    }

    if (suppressSuggestionsRef.current) {
      suppressSuggestionsRef.current = false
      return
    }

    const term = searchQuery.person.trim()
    if (!term) {
      setSearchSuggestions([])
      setSearchSuggestionsLoading(false)
      return
    }

    const requestId = ++suggestionRequestId.current
    setSearchSuggestionsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const { response, body } = await requestSearch({
          path: `/search/photos/suggestions?q=${encodeURIComponent(term)}`,
          label: 'Search suggestions',
          auth: true,
        })

        if (suggestionRequestId.current !== requestId) return

        if (!response?.ok) {
          setSearchSuggestions([])
          return
        }

        setSearchSuggestions(Array.isArray(body) ? body : [])
      } catch {
        if (suggestionRequestId.current === requestId) {
          setSearchSuggestions([])
        }
      } finally {
        if (suggestionRequestId.current === requestId) {
          setSearchSuggestionsLoading(false)
        }
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [isAuthenticated, searchQuery.person])

  const handleSearch = useCallback(
    async (event) => {
      event.preventDefault()
      if (!isAuthenticated) return

      setSearchLoading(true)
      setSearchError('')
      setSearchResults([])
      setSearchMediaById({})
      setSearchSuggestions([])
      setSearchSuggestionsLoading(false)

      try {
        const params = new URLSearchParams()
        if (searchQuery.person) params.append('person', searchQuery.person)
        if (searchQuery.year) params.append('year', searchQuery.year)

        const { response, body } = await requestSearch({
          path: `/search/photos?${params.toString()}`,
          label: 'Search',
          auth: true,
        })

        if (!response?.ok) {
          setSearchError(body?.message || 'Search failed')
          return
        }

        const rawItems = Array.isArray(body?.items) ? body.items : []
        const items = rawItems.map((item) => {
          const resolvedMediaId = item?.mediaId ?? item?.media_id ?? null
          return resolvedMediaId ? { ...item, mediaId: resolvedMediaId } : item
        })

        setSearchResults(items)

        const mediaIds = Array.from(
          new Set(items.map((item) => item?.mediaId ?? item?.media_id).filter(Boolean)),
        )
        if (mediaIds.length > 0) {
          const results = await Promise.all(
            mediaIds.map(async (mediaId) => {
              const { response: mediaResponse, body: mediaBody } = await requestMedia({
                path: `/media/${mediaId}`,
                auth: true,
                options: { credentials: 'include' },
              })
              if (!mediaResponse?.ok) {
                return [mediaId, null]
              }
              return [mediaId, { url: mediaBody?.url ?? mediaBody?.presignedUrl ?? null }]
            }),
          )

          setSearchMediaById((prev) => {
            const next = { ...prev }
            results.forEach(([mediaId, value]) => {
              if (value) next[mediaId] = value
            })
            return next
          })
        }
      } catch (error) {
        setSearchError(error.message)
      } finally {
        setSearchLoading(false)
      }
    },
    [isAuthenticated, searchQuery],
  )

  const value = useMemo(
    () => ({
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      searchMediaById,
      searchSuggestions,
      searchSuggestionsLoading,
      handleSearchQueryChange,
      handleSearchSuggestionSelect,
      handleSearch,
    }),
    [
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      searchMediaById,
      searchSuggestions,
      searchSuggestionsLoading,
      handleSearchQueryChange,
      handleSearchSuggestionSelect,
      handleSearch,
    ],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider')
  }
  return context
}
