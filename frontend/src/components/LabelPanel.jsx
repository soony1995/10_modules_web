const buildFaceImageStyle = (face, media, size) => {
  if (!media?.url || !media?.width || !media?.height) {
    return null
  }

  const bboxWidth = Number(face.bbox_width)
  const bboxHeight = Number(face.bbox_height)
  const bboxX = Number(face.bbox_x)
  const bboxY = Number(face.bbox_y)
  const mediaWidth = Number(media.width)
  const mediaHeight = Number(media.height)

  if (
    !Number.isFinite(bboxWidth) ||
    !Number.isFinite(bboxHeight) ||
    !Number.isFinite(bboxX) ||
    !Number.isFinite(bboxY) ||
    !Number.isFinite(mediaWidth) ||
    !Number.isFinite(mediaHeight) ||
    bboxWidth <= 0 ||
    bboxHeight <= 0
  ) {
    return null
  }

  const scale = size / Math.max(bboxWidth, bboxHeight)
  const scaledWidth = mediaWidth * scale
  const scaledHeight = mediaHeight * scale
  const offsetX = -bboxX * scale + (size - bboxWidth * scale) / 2
  const offsetY = -bboxY * scale + (size - bboxHeight * scale) / 2

  return {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    transform: `translate(${offsetX}px, ${offsetY}px)`,
    transformOrigin: 'top left',
  }
}

import { useLabeling } from '../contexts/LabelingContext.jsx'

const LabelPanel = () => {
  const {
    persons,
    personsLoading,
    personsError,
    newPersonName,
    creatingPerson,
    facesError,
    facesLoading,
    unassignedFaces,
    mediaById,
    faceAssignments,
    assigningFace,
    ignoringFace,
    fetchPersons,
    fetchUnassignedFaces,
    handleCreatePerson,
    handleAssignFace,
    handleIgnoreFace,
    handleNewPersonNameChange,
    handleFaceAssignmentChange,
  } = useLabeling()

  return (
    <section className="panel media-panel label-panel">
      <div className="media-header">
        <div>
          <h2>Face Labeling</h2>
          <p className="hint">Create persons and assign unlabelled faces. Assign triggers ES reindex.</p>
        </div>
        <div className="media-actions">
          <button type="button" onClick={fetchPersons} disabled={personsLoading}>
            Refresh persons
          </button>
          <button type="button" onClick={fetchUnassignedFaces} disabled={facesLoading}>
            Refresh faces
          </button>
        </div>
      </div>

      <form className="label-form" onSubmit={handleCreatePerson}>
        <label>
          New person name
          <input
            type="text"
            value={newPersonName}
            onChange={(event) => handleNewPersonNameChange(event.target.value)}
            placeholder="e.g. 홍길동"
          />
        </label>
        <button type="submit" disabled={creatingPerson || !newPersonName.trim()}>
          {creatingPerson ? 'Creating...' : 'Create person'}
        </button>
      </form>

      {personsError && <p className="media-error">{personsError}</p>}
      {facesError && <p className="media-error">{facesError}</p>}

      <div className="label-columns">
        <div className="label-column">
          <h3>Persons</h3>
          {personsLoading && <p>Loading persons...</p>}
          {!personsLoading && persons.length === 0 && <p className="hint">No persons yet.</p>}
          {!personsLoading && persons.length > 0 && (
            <ul className="person-list">
              {persons.map((person) => (
                <li key={person.id} className="person-item">
                  <span className="person-name">{person.name}</span>
                  <span className="person-meta">{Number(person.photo_count || 0)} photos</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="label-column">
          <h3>Unassigned faces</h3>
          <p className="hint">One card per detected face. Group photos can appear multiple times.</p>
          {facesLoading && <p>Loading faces...</p>}
          {!facesLoading && unassignedFaces.length === 0 && (
            <p className="hint">No unassigned faces.</p>
          )}

          <div className="faces-grid">
            {unassignedFaces.map((face) => {
              const media = mediaById[face.media_id]
              const previewSize = 120
              const imgStyle = buildFaceImageStyle(face, media, previewSize)
              const disabled =
                persons.length === 0 || assigningFace[face.id] || ignoringFace[face.id]
              const suggestedLabel = face.suggested_person_name
                ? `Suggested: ${face.suggested_person_name}`
                : null
              const previewImageStyle = imgStyle
                ? { position: 'absolute', top: 0, left: 0, ...imgStyle }
                : { width: '100%', height: '100%', objectFit: 'cover' }

              return (
                <div key={face.id} className="face-card">
                  <div className="face-preview" style={{ width: previewSize, height: previewSize }}>
                    {media?.url ? (
                      <img
                        src={media.url}
                        alt={media.originalName || face.media_id}
                        style={previewImageStyle}
                      />
                    ) : (
                      <div className="face-placeholder">No image</div>
                    )}
                  </div>

                  <div className="face-meta">
                    <div className="hint">media: {face.media_id}</div>
                    <div className="hint">face: {String(face.id).slice(0, 8)}</div>
                    {suggestedLabel && <div className="hint">{suggestedLabel}</div>}
                    <div className="face-actions">
                      <select
                        value={faceAssignments[face.id] || ''}
                        onChange={(event) => handleFaceAssignmentChange(face.id, event.target.value)}
                        disabled={persons.length === 0}
                      >
                        <option value="" disabled>
                          Select person
                        </option>
                        {persons.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleAssignFace(face.id)} disabled={disabled}>
                        {assigningFace[face.id] ? 'Assigning...' : 'Assign'}
                      </button>
                      <button type="button" onClick={() => handleIgnoreFace(face.id)} disabled={disabled}>
                        {ignoringFace[face.id] ? 'Skipping...' : 'Skip'}
                      </button>
                    </div>
                    {media?.url && (
                      <a className="face-open" href={media.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default LabelPanel
