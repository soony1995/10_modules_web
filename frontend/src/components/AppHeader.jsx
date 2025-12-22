import { API_BASE_URL } from '../utils/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const AppHeader = () => {
  const { tokenInput, handleTokenInputChange, handleValidate } = useAuth()

  return (
    <header className="header">
      <div>
        <p className="tag">MSA Gateway</p>
        <h1>Auth Frontend</h1>
        <p>
          Requests are sent to <code>{API_BASE_URL || 'same-origin'}</code> via Nginx.
        </p>
      </div>
      <div className="token-panel">
        <label htmlFor="token-input">Access Token</label>
        <textarea
          id="token-input"
          rows={3}
          value={tokenInput}
          onChange={(event) => handleTokenInputChange(event.target.value)}
          placeholder="Paste token or login to populate automatically"
        />
        <button type="button" onClick={handleValidate}>
          Validate Token
        </button>
      </div>
    </header>
  )
}

export default AppHeader
