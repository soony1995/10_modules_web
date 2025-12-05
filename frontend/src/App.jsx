import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const MEDIA_API_BASE_URL = (import.meta.env.VITE_MEDIA_API_BASE_URL || '').replace(
  /\/$/,
  '',
)

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
  }, [appendLog, isAuthenticated])

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

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    fetchMediaItems()
  }, [isAuthenticated, fetchMediaItems])

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
                <figure key={item.filename} className="media-card">
                  <div className="media-preview">
                    <img src={item.url} alt={item.originalName || item.filename} />
                  </div>
                  <figcaption className="media-meta">
                    <div>
                      <strong>{item.originalName || item.filename}</strong>
                      <p>{(item.size / 1024).toFixed(1)} KB · {new Date(item.uploadedAt).toLocaleString()}</p>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </figcaption>
                </figure>
              ))}
          </div>
        </section>
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
