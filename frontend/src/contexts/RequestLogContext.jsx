import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setApiLogger } from '../utils/api.js'

const RequestLogContext = createContext(null)

export const RequestLogProvider = ({ children }) => {
  const [logs, setLogs] = useState([])

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

  const value = useMemo(() => ({ logs, appendLog }), [logs, appendLog])

  useEffect(() => {
    setApiLogger(appendLog)
    return () => setApiLogger(null)
  }, [appendLog])

  return <RequestLogContext.Provider value={value}>{children}</RequestLogContext.Provider>
}

export const useRequestLog = () => {
  const context = useContext(RequestLogContext)
  if (!context) {
    throw new Error('useRequestLog must be used within RequestLogProvider')
  }
  return context
}
