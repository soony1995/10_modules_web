import { useAuth } from '../contexts/AuthContext.jsx'

const AuthPanels = () => {
  const {
    signupForm,
    loginForm,
    accessToken,
    handleSignupChange,
    handleLoginChange,
    handleSignup,
    handleLogin,
  } = useAuth()

  return (
    <section className="panels">
      <form className="panel" onSubmit={handleSignup}>
        <h2>Sign Up</h2>
        <label>
          Email
          <input
            type="email"
            required
            value={signupForm.email}
            onChange={(event) => handleSignupChange('email', event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={signupForm.password}
            onChange={(event) => handleSignupChange('password', event.target.value)}
          />
        </label>
        <label>
          Nickname
          <input
            type="text"
            required
            value={signupForm.nickname}
            onChange={(event) => handleSignupChange('nickname', event.target.value)}
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
            onChange={(event) => handleLoginChange('email', event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={loginForm.password}
            onChange={(event) => handleLoginChange('password', event.target.value)}
          />
        </label>
        <button type="submit">Send Login</button>
        {accessToken && (
          <p className="hint">Access token captured and ready for validation.</p>
        )}
      </form>
    </section>
  )
}

export default AuthPanels
