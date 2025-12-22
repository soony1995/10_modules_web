import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { logClientEvent, requestApi, setAccessToken as setApiAccessToken } from '../utils/api.js'

const AuthContext = createContext(null)

const initialSignup = {
  email: '',
  password: '',
  nickname: '',
}

const initialLogin = {
  email: '',
  password: '',
}

export const AuthProvider = ({ children }) => {
  const [signupForm, setSignupForm] = useState(initialSignup)
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [accessToken, setAccessToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleSignup = useCallback(
    async (event) => {
      event.preventDefault()

      await requestApi({
        path: '/api/v1/auth/signup',
        label: 'Signup',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupForm),
        },
      })
    },
    [signupForm],
  )

  const handleLogin = useCallback(
    async (event) => {
      event.preventDefault()

      const { response, body } = await requestApi({
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
    },
    [loginForm],
  )

  const handleValidate = useCallback(async () => {
    const token = tokenInput.trim() || accessToken
    if (!token) {
      logClientEvent('Validate', { error: 'Access token is empty' })
      return
    }

    await requestApi({
      path: '/auth/validate',
      label: 'Validate',
      options: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })
  }, [accessToken, tokenInput])

  const handleSignupChange = useCallback((field, value) => {
    setSignupForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleLoginChange = useCallback((field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleTokenInputChange = useCallback((value) => {
    setTokenInput(value)
  }, [])

  useEffect(() => {
    setApiAccessToken(accessToken)
  }, [accessToken])

  const value = useMemo(
    () => ({
      signupForm,
      loginForm,
      accessToken,
      tokenInput,
      isAuthenticated,
      handleSignup,
      handleLogin,
      handleValidate,
      handleSignupChange,
      handleLoginChange,
      handleTokenInputChange,
    }),
    [
      signupForm,
      loginForm,
      accessToken,
      tokenInput,
      isAuthenticated,
      handleSignup,
      handleLogin,
      handleValidate,
      handleSignupChange,
      handleLoginChange,
      handleTokenInputChange,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
