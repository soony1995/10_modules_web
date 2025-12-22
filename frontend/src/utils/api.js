export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const MEDIA_API_BASE_URL = (import.meta.env.VITE_MEDIA_API_BASE_URL || '').replace(
  /\/$/,
  '',
)
export const SEARCH_API_BASE_URL = (import.meta.env.VITE_SEARCH_API_BASE_URL ?? '').replace(
  /\/$/,
  '',
)
export const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL ?? '').replace(/\/$/, '')

export const buildUrl = (path) => `${API_BASE_URL}${path}`
export const buildMediaUrl = (path) => `${MEDIA_API_BASE_URL}${path}`
export const buildSearchUrl = (path) => `${SEARCH_API_BASE_URL}${path}`
export const buildAiUrl = (path) => `${AI_API_BASE_URL}${path}`

export const parseResponse = async (response) => {
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

let accessToken = ''
let apiLogger = null

export const setAccessToken = (token) => {
  accessToken = token || ''
}

export const setApiLogger = (logger) => {
  apiLogger = typeof logger === 'function' ? logger : null
}

const logResponse = (label, payload) => {
  if (!label || !apiLogger) {
    return
  }
  apiLogger(label, payload)
}

export const logClientEvent = (label, payload) => {
  logResponse(label, payload)
}

const buildAuthHeaders = (headers) => {
  const nextHeaders = { ...(headers || {}) }
  if (accessToken) {
    nextHeaders.Authorization = `Bearer ${accessToken}`
  }
  return nextHeaders
}

const request = async ({ baseUrl, path, options = {}, label, auth = false }) => {
  try {
    const finalOptions = { ...options }
    if (auth) {
      finalOptions.headers = buildAuthHeaders(finalOptions.headers)
    }

    const response = await fetch(`${baseUrl}${path}`, finalOptions)
    const body = await parseResponse(response)
    logResponse(label, { status: response.status, ok: response.ok, body })
    return { response, body }
  } catch (error) {
    logResponse(label, { error: error.message })
    return { response: null, body: null }
  }
}

export const requestApi = (config) => request({ baseUrl: API_BASE_URL, ...config })
export const requestMedia = (config) => request({ baseUrl: MEDIA_API_BASE_URL, ...config })
export const requestSearch = (config) => request({ baseUrl: SEARCH_API_BASE_URL, ...config })
export const requestAi = (config) => request({ baseUrl: AI_API_BASE_URL, ...config })
