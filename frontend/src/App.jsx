import { useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

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

  const appendLog = (title, payload) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        payload,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 6),
    ])
  }

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
        body: JSON.stringify(loginForm),
      },
    })

    if (response?.ok && body?.accessToken) {
      setAccessToken(body.accessToken)
      setTokenInput(body.accessToken)
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
