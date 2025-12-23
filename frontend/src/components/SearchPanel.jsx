import { useEffect, useRef, useState } from 'react'
import { useSearch } from '../contexts/SearchContext.jsx'

const SearchPanel = () => {
  const {
    searchQuery,
    searchLoading,
    searchError,
    searchResults,
    searchMediaById,
    searchSuggestions,
    searchSuggestionsLoading,
    handleSearchQueryChange,
    handleSearchSuggestionSelect,
    handleSearch,
  } = useSearch()
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const inputRef = useRef(null)
  const suggestionRefs = useRef([])

  useEffect(() => {
    setActiveSuggestionIndex(-1)
    suggestionRefs.current = []
  }, [searchSuggestions])

  const focusSuggestion = (index) => {
    requestAnimationFrame(() => {
      suggestionRefs.current[index]?.focus()
    })
  }

  const moveSuggestion = (nextIndex) => {
    setActiveSuggestionIndex(nextIndex)
    focusSuggestion(nextIndex)
  }

  const handleSuggestionPick = (value) => {
    handleSearchSuggestionSelect(value)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const handlePersonKeyDown = (event) => {
    if (searchSuggestions.length === 0) return

    if (event.key === 'ArrowDown' || event.keyCode === 40) {
      event.preventDefault()
      const nextIndex =
        activeSuggestionIndex >= searchSuggestions.length - 1 ? 0 : activeSuggestionIndex + 1
      moveSuggestion(nextIndex)
    } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
      event.preventDefault()
      const nextIndex =
        activeSuggestionIndex <= 0 ? searchSuggestions.length - 1 : activeSuggestionIndex - 1
      moveSuggestion(nextIndex)
    } else if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault()
      handleSuggestionPick(searchSuggestions[activeSuggestionIndex])
    } else if (event.key === 'Escape') {
      setActiveSuggestionIndex(-1)
    }
  }

  const handleSuggestionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown' || event.keyCode === 40) {
      event.preventDefault()
      const nextIndex = index >= searchSuggestions.length - 1 ? 0 : index + 1
      moveSuggestion(nextIndex)
    } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
      event.preventDefault()
      const nextIndex = index <= 0 ? searchSuggestions.length - 1 : index - 1
      moveSuggestion(nextIndex)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      handleSuggestionPick(searchSuggestions[index])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setActiveSuggestionIndex(-1)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }

  return (
    <section className="panel media-panel search-panel">
      <div className="media-header">
        <div>
          <h2>Photo Search</h2>
          <p className="hint">Search by person name or year</p>
        </div>
      </div>
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-inputs">
          <label>
            Person Name
            <input
              type="text"
              ref={inputRef}
              value={searchQuery.person}
              onChange={(event) => handleSearchQueryChange('person', event.target.value)}
              onKeyDown={handlePersonKeyDown}
              placeholder="e.g. 홍길동"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-activedescendant={
                activeSuggestionIndex >= 0
                  ? `search-suggestion-${activeSuggestionIndex}`
                  : undefined
              }
            />
            {searchSuggestionsLoading && <span className="hint">Fetching suggestions...</span>}
            {!searchSuggestionsLoading && searchSuggestions.length > 0 && (
              <ul className="search-suggestions" role="listbox" id="search-suggestions">
                {searchSuggestions.map((suggestion, index) => {
                  const isActive = index === activeSuggestionIndex
                  return (
                    <li key={suggestion}>
                      <button
                        type="button"
                        id={`search-suggestion-${index}`}
                        ref={(node) => {
                          suggestionRefs.current[index] = node
                        }}
                        className={`search-suggestion${isActive ? ' active' : ''}`}
                        aria-selected={isActive}
                        onClick={() => handleSuggestionPick(suggestion)}
                        onKeyDown={(event) => handleSuggestionKeyDown(event, index)}
                      >
                        {suggestion}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </label>
          <label>
            Year
            <input
              type="number"
              value={searchQuery.year}
              onChange={(event) => handleSearchQueryChange('year', event.target.value)}
              placeholder="e.g. 2024"
            />
          </label>
        </div>
        <button type="submit" disabled={searchLoading}>
          {searchLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchError && <p className="media-error">{searchError}</p>}

      <div className="media-grid">
        {!searchLoading && searchResults.length === 0 && searchQuery.person && (
          <p>No results found.</p>
        )}
        {searchResults.map((item, index) => {
          const mediaId = item.mediaId ?? item.media_id
          const mediaPreview = mediaId ? searchMediaById[mediaId] : null

          return (
            <figure
              key={
                item.mediaId ??
                item.media_id ??
                item.analyzedAt ??
                item.takenAt ??
                `${item.ownerId ?? 'unknown'}-${index}`
              }
              className="media-card"
            >
              <div className="media-preview">
                {mediaId && mediaPreview?.url ? (
                  <img src={mediaPreview.url} alt={`Search Result ${mediaId}`} />
                ) : (
                  <div className="media-placeholder">Loading preview...</div>
                )}
              </div>
              <figcaption className="media-meta">
                <div>
                  <strong>{new Date(item.takenAt || item.analyzedAt).toLocaleDateString()}</strong>
                  <p>
                    Found:{' '}
                    {(item.persons ?? []).map((person) => person.name).join(', ') ||
                      'Unknown person'}
                  </p>
                </div>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export default SearchPanel
