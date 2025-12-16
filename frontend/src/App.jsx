import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const MEDIA_API_BASE_URL = (import.meta.env.VITE_MEDIA_API_BASE_URL || '').replace(
  /\/$/,
  '',
)
const SEARCH_API_BASE_URL = (import.meta.env.VITE_SEARCH_API_BASE_URL ?? '').replace(/\/$/, '')
const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL ?? '').replace(/\/$/, '')

const initialSignup = {
  email: '',
  password: '',
  nickname: '',
}

const initialLogin = {
  email: '',
  password: '',
}

const buildUrl = (path) => `${API_BASE_URL}${path}`
const buildMediaUrl = (path) => `${MEDIA_API_BASE_URL}${path}`
const buildSearchUrl = (path) => `${SEARCH_API_BASE_URL}${path}`
const buildAiUrl = (path) => `${AI_API_BASE_URL}${path}`

const parseResponse = async (response) => {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return rawText
  }
}

function App() {
  const [signupForm, setSignupForm] = useState(initialSignup)
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [logs, setLogs] = useState([])
  const [accessToken, setAccessToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [mediaItems, setMediaItems] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState({ person: '', year: '' })
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchMediaById, setSearchMediaById] = useState({})

  // Labeling state (Person API)
  const [persons, setPersons] = useState([])
  const [personsLoading, setPersonsLoading] = useState(false)
  const [personsError, setPersonsError] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  const [creatingPerson, setCreatingPerson] = useState(false)

  const [unassignedFaces, setUnassignedFaces] = useState([])
  const [facesLoading, setFacesLoading] = useState(false)
  const [facesError, setFacesError] = useState('')
  const [mediaById, setMediaById] = useState({})
  const [faceAssignments, setFaceAssignments] = useState({})
  const [assigningFace, setAssigningFace] = useState({})
  const [ignoringFace, setIgnoringFace] = useState({})

  const appendLog = useCallback((title, payload) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        payload,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 6),
    ])
  }, [])

  const sendRequest = async ({ path, options, label }) => {
    try {
      const response = await fetch(buildUrl(path), options)
      const body = await parseResponse(response)
      appendLog(label, { status: response.status, ok: response.ok, body })
      return { response, body }
    } catch (error) {
      appendLog(label, { error: error.message })
      return { response: null, body: null }
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()

    await sendRequest({
      path: '/api/v1/auth/signup',
      label: 'Signup',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      },
    })
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    const { response, body } = await sendRequest({
      path: '/api/v1/auth/login',
      label: 'Login',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm),
      },
    })

    if (response?.ok && body?.accessToken) {
      setAccessToken(body.accessToken)
      setTokenInput(body.accessToken)
      setIsAuthenticated(true)
    }
  }

  const handleValidate = async () => {
    const token = tokenInput.trim() || accessToken
    if (!token) {
      appendLog('Validate', { error: 'Access token is empty' })
      return
    }

    await sendRequest({
      path: '/auth/validate',
      label: 'Validate',
      options: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })
  }

  const fetchMediaItems = useCallback(async () => {
    if (!isAuthenticated) {
      return
    }

    setMediaLoading(true)
    setMediaError('')
    try {
      const response = await fetch(buildMediaUrl('/media'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      })
      const body = await parseResponse(response)
      appendLog('Media List', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setMediaError(body?.message || 'Failed to load media files')
        setMediaItems([])
        return
      }

      setMediaItems(Array.isArray(body?.items) ? body.items : [])
    } catch (error) {
      appendLog('Media List', { error: error.message })
      setMediaError(error.message)
      setMediaItems([])
    } finally {
      setMediaLoading(false)
    }
  }, [appendLog, isAuthenticated, accessToken])

  const handleMediaUpload = async (event) => {
    event.preventDefault()
    if (!isAuthenticated) {
      setMediaError('Login to upload media.')
      return
    }
    if (!selectedFile) {
      setMediaError('Please choose an image before uploading.')
      return
    }

    setUploading(true)
    setMediaError('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(buildMediaUrl('/media/upload'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: 'include',
      })
      const body = await parseResponse(response)
      appendLog('Media Upload', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setMediaError(body?.message || 'Upload failed')
        return
      }

      setSelectedFile(null)
      setFileInputKey(Date.now())
      await fetchMediaItems()
    } catch (error) {
      appendLog('Media Upload', { error: error.message })
      setMediaError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!isAuthenticated) return

    setSearchLoading(true)
    setSearchError('')
    setSearchResults([]) // Clear previous results
    setSearchMediaById({})

    try {
      const params = new URLSearchParams()
      if (searchQuery.person) params.append('person', searchQuery.person)
      if (searchQuery.year) params.append('year', searchQuery.year)

      const response = await fetch(buildSearchUrl(`/search/photos?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
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
  }

  const formatSizeKb = (sizeBytes) => {
    const numeric = typeof sizeBytes === 'string' ? Number(sizeBytes) : sizeBytes
    if (!Number.isFinite(numeric)) return '-'
    return `${(numeric / 1024).toFixed(1)} KB`
  }

  const fetchPersons = useCallback(async () => {
    if (!isAuthenticated) return

    setPersonsLoading(true)
    setPersonsError('')

    try {
      const response = await fetch(buildAiUrl('/ai/persons'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      })
      const body = await parseResponse(response)
      appendLog('AI Persons', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setPersonsError(body?.detail || body?.message || 'Failed to load persons')
        setPersons([])
        return
      }

      setPersons(Array.isArray(body) ? body : [])
    } catch (error) {
      appendLog('AI Persons', { error: error.message })
      setPersonsError(error.message)
      setPersons([])
    } finally {
      setPersonsLoading(false)
    }
  }, [appendLog, isAuthenticated, accessToken])

  const fetchUnassignedFaces = useCallback(async () => {
    if (!isAuthenticated) return

    setFacesLoading(true)
    setFacesError('')

    try {
      const response = await fetch(buildAiUrl('/ai/faces/unassigned'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      })
      const body = await parseResponse(response)
      appendLog('AI Faces', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setFacesError(body?.detail || body?.message || 'Failed to load faces')
        setUnassignedFaces([])
        return
      }

      const faces = Array.isArray(body) ? body : []
      setUnassignedFaces(faces)

      const mediaIds = Array.from(
        new Set(faces.map((face) => face.media_id).filter(Boolean)),
      ).filter((mediaId) => !mediaById[mediaId])

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
            return [
              mediaId,
              {
                url: mediaBody?.url ?? mediaBody?.presignedUrl ?? null,
                width: mediaBody?.width ?? null,
                height: mediaBody?.height ?? null,
                originalName: mediaBody?.originalName ?? null,
              },
            ]
          }),
        )

        setMediaById((prev) => {
          const next = { ...prev }
          results.forEach(([mediaId, value]) => {
            if (value) next[mediaId] = value
          })
          return next
        })
      }
    } catch (error) {
      appendLog('AI Faces', { error: error.message })
      setFacesError(error.message)
      setUnassignedFaces([])
    } finally {
      setFacesLoading(false)
    }
  }, [appendLog, isAuthenticated, accessToken, mediaById])

  const handleCreatePerson = async (event) => {
    event.preventDefault()
    if (!newPersonName.trim()) return

    setCreatingPerson(true)
    setPersonsError('')
    try {
      const response = await fetch(buildAiUrl('/ai/persons'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: newPersonName.trim() }),
      })
      const body = await parseResponse(response)
      appendLog('AI Person Create', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setPersonsError(body?.detail || body?.message || 'Failed to create person')
        return
      }

      setNewPersonName('')
      await fetchPersons()
    } catch (error) {
      appendLog('AI Person Create', { error: error.message })
      setPersonsError(error.message)
    } finally {
      setCreatingPerson(false)
    }
  }

  const handleAssignFace = async (faceId) => {
    const personId = faceAssignments[faceId]
    if (!personId) return

    setAssigningFace((prev) => ({ ...prev, [faceId]: true }))
    setFacesError('')

    try {
      const response = await fetch(buildAiUrl(`/ai/faces/${faceId}/assign`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ person_id: personId }),
      })
      const body = await parseResponse(response)
      appendLog('AI Face Assign', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setFacesError(body?.detail || body?.message || 'Failed to assign face')
        return
      }

      setUnassignedFaces((prev) => prev.filter((face) => face.id !== faceId))
      await fetchUnassignedFaces()
      await fetchPersons()
    } catch (error) {
      appendLog('AI Face Assign', { error: error.message })
      setFacesError(error.message)
    } finally {
      setAssigningFace((prev) => ({ ...prev, [faceId]: false }))
    }
  }

  const handleIgnoreFace = async (faceId) => {
    setIgnoringFace((prev) => ({ ...prev, [faceId]: true }))
    setFacesError('')

    try {
      const response = await fetch(buildAiUrl(`/ai/faces/${faceId}/ignore`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      })
      const body = await parseResponse(response)
      appendLog('AI Face Ignore', { status: response.status, ok: response.ok, body })

      if (!response.ok) {
        setFacesError(body?.detail || body?.message || 'Failed to ignore face')
        return
      }

      setUnassignedFaces((prev) => prev.filter((face) => face.id !== faceId))
      await fetchUnassignedFaces()
    } catch (error) {
      appendLog('AI Face Ignore', { error: error.message })
      setFacesError(error.message)
    } finally {
      setIgnoringFace((prev) => ({ ...prev, [faceId]: false }))
    }
  }

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

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    fetchMediaItems()
  }, [isAuthenticated, fetchMediaItems])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchPersons()
    fetchUnassignedFaces()
  }, [isAuthenticated, fetchPersons, fetchUnassignedFaces])

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="tag">MSA Gateway</p>
          <h1>Auth Frontend</h1>
          <p>
            Requests are sent to <code>{API_BASE_URL || 'same-origin'}</code> via
            Nginx.
          </p>
        </div>
        <div className="token-panel">
          <label htmlFor="token-input">Access Token</label>
          <textarea
            id="token-input"
            rows={3}
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Paste token or login to populate automatically"
          />
          <button type="button" onClick={handleValidate}>
            Validate Token
          </button>
        </div>
      </header>

      <section className="panels">
        <form className="panel" onSubmit={handleSignup}>
          <h2>Sign Up</h2>
          <label>
            Email
            <input
              type="email"
              required
              value={signupForm.email}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </label>
          <label>
            Nickname
            <input
              type="text"
              required
              value={signupForm.nickname}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, nickname: event.target.value }))
              }
            />
          </label>
          <button type="submit">Send Signup</button>
        </form>

        <form className="panel" onSubmit={handleLogin}>
          <h2>Login</h2>
          <label>
            Email
            <input
              type="email"
              required
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </label>
          <button type="submit">Send Login</button>
          {accessToken && (
            <p className="hint">Access token captured and ready for validation.</p>
          )}
        </form>
      </section>

      {isAuthenticated ? (
        <>
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
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, person: e.target.value }))}
                    placeholder="e.g. 홍길동"
                  />
                </label>
                <label>
                  Year
                  <input
                    type="number"
                    value={searchQuery.year}
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, year: e.target.value }))}
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
              {!searchLoading && searchResults.length === 0 && searchQuery.person && <p>No results found.</p>}
	              {searchResults.map((item, index) => (
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
	                    {(item.mediaId ?? item.media_id) && searchMediaById[item.mediaId ?? item.media_id]?.url ? (
	                      <img
	                        src={searchMediaById[item.mediaId ?? item.media_id]?.url}
	                        alt={`Search Result ${item.mediaId ?? item.media_id}`}
	                      />
	                    ) : (
	                      <div className="media-placeholder">Loading preview...</div>
	                    )}
	                  </div>
	                  <figcaption className="media-meta">
	                    <div>
	                      <strong>{new Date(item.takenAt || item.analyzedAt).toLocaleDateString()}</strong>
	                      <p>
	                        Found:{' '}
	                        {(item.persons ?? []).map((person) => person.name).join(', ') || 'Unknown person'}
	                      </p>
	                    </div>
	                  </figcaption>
	                </figure>
	              ))}
	            </div>
	          </section>

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
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] || null)
                  }}
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
                mediaItems.map((item) => (
                  <figure key={item.id ?? item.storedKey ?? item.originalName} className="media-card">
                    <div className="media-preview">
                      <img src={item.url} alt={item.originalName || item.id || 'uploaded file'} />
                    </div>
                    <figcaption className="media-meta">
                      <div>
                        <strong>{item.originalName || item.id}</strong>
                        <p>{formatSizeKb(item.sizeBytes)} · {new Date(item.uploadedAt).toLocaleString()}</p>
                      </div>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </figcaption>
                  </figure>
                ))}
            </div>
          </section>

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
                  onChange={(event) => setNewPersonName(event.target.value)}
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
                    const disabled = persons.length === 0 || assigningFace[face.id] || ignoringFace[face.id]
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
                            <>
                              <img
                                src={media.url}
                                alt={media.originalName || face.media_id}
                                style={previewImageStyle}
                              />
                            </>
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
                              onChange={(event) =>
                                setFaceAssignments((prev) => ({
                                  ...prev,
                                  [face.id]: event.target.value,
                                }))
                              }
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
        </>
      ) : (
        <section className="panel media-panel">
          <div className="media-header">
            <div>
              <h2>Media Uploads</h2>
              <p className="hint">Login is required to view and upload media.</p>
            </div>
          </div>
        </section>
      )}

      <section className="logs">
        <h2>Request Log</h2>
        {logs.length === 0 && <p>No requests yet.</p>}
        {logs.map((log) => (
          <article key={log.id} className="log-item">
            <header>
              <strong>{log.title}</strong>
              <span>{log.timestamp}</span>
            </header>
            <pre>{JSON.stringify(log.payload, null, 2)}</pre>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
