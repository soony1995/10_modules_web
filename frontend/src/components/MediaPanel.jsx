import { useMedia } from '../contexts/MediaContext.jsx'

const MediaPanel = () => {
  const {
    mediaItems,
    mediaLoading,
    mediaError,
    selectedFile,
    uploading,
    fileInputKey,
    deletingMedia,
    fetchMediaItems,
    handleMediaUpload,
    handleDeleteMedia,
    handleFileChange,
    formatSizeKb,
  } = useMedia()

  return (
    <section className="panel media-panel">
      <div className="media-header">
        <div>
          <h2>Media Uploads</h2>
          <p className="hint">
            Files are stored by whichever media backend is configured via{' '}
            <code>VITE_MEDIA_API_BASE_URL</code>.
          </p>
        </div>
        <div className="media-actions">
          <button type="button" onClick={fetchMediaItems} disabled={mediaLoading}>
            Refresh
          </button>
        </div>
      </div>
      <form className="media-form" onSubmit={handleMediaUpload}>
        <label>
          Select image
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
        <button type="submit" disabled={!selectedFile || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {mediaError && <p className="media-error">{mediaError}</p>}
      <div className="media-grid">
        {mediaLoading && <p>Loading media...</p>}
        {!mediaLoading && mediaItems.length === 0 && <p>No uploads yet.</p>}
        {!mediaLoading &&
          mediaItems.map((item) => {
            const isDeleting = Boolean(item.id && deletingMedia[item.id])

            return (
              <figure key={item.id ?? item.storedKey ?? item.originalName} className="media-card">
                <div className="media-preview">
                  <img src={item.url} alt={item.originalName || item.id || 'uploaded file'} />
                </div>
                <figcaption className="media-meta">
                  <div>
                    <strong>{item.originalName || item.id}</strong>
                    <p>
                      {formatSizeKb(item.sizeBytes)} ·{' '}
                      {new Date(item.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="media-meta-actions">
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button
                      type="button"
                      className="media-delete"
                      onClick={() => handleDeleteMedia(item.id)}
                      disabled={!item.id || isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </figcaption>
              </figure>
            )
          })}
      </div>
    </section>
  )
}

export default MediaPanel
