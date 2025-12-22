import { useSearch } from '../contexts/SearchContext.jsx'

const SearchPanel = () => {
  const {
    searchQuery,
    searchLoading,
    searchError,
    searchResults,
    searchMediaById,
    handleSearchQueryChange,
    handleSearch,
  } = useSearch()

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
              value={searchQuery.person}
              onChange={(event) => handleSearchQueryChange('person', event.target.value)}
              placeholder="e.g. 홍길동"
            />
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
