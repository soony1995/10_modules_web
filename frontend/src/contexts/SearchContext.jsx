import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { buildMediaUrl, buildSearchUrl, parseResponse } from '../utils/api.js'
import { useAuth } from './AuthContext.jsx'
import { useRequestLog } from './RequestLogContext.jsx'

const SearchContext = createContext(null)

const initialSearchQuery = {
  person: '',
  year: '',
}

export const SearchProvider = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth()
  const { appendLog } = useReq
  uestLog()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchMediaById, setSearchMediaById] = useState({})

  const handleSearchQueryChange = useCallback((field, value) => {
    setSearchQuery((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSearch = useCallback(
    async (event) => {
      event.preventDefault()
      if (!isAuthenticated) return

      setSearchLoading(true)
      setSearchError('')
      setSearchResults([])
      setSearchMediaById({})

      try {
        const params = new URLSearchParams()
        if (searchQuery.person) params.append('person', searchQuery.person)
        if (searchQuery.year) params.append('year', searchQuery.year)

        const response = await fetch(buildSearchUrl(`/search/photos?${params.toString()}`), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const body = await parseResponse(response)
        appendLog('Search', { status: response.status, ok: response.ok, body })

        if (!response.ok) {
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
              const mediaResponse = await fetch(buildMediaUrl(`/media/${mediaId}`), {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                credentials: 'include',
              })
              const mediaBody = await parseResponse(mediaResponse)
              if (!mediaResponse.ok) {
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
        appendLog('Search', { error: error.message })
        setSearchError(error.message)
      } finally {
        setSearchLoading(false)
      }
    },
    [accessToken, appendLog, isAuthenticated, searchQuery],
  )

  const value = useMemo(
    () => ({
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      searchMediaById,
      handleSearchQueryChange,
      handleSearch,
    }),
    [
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      searchMediaById,
      handleSearchQueryChange,
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
