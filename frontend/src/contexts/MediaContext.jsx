import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { requestMedia } from '../utils/api.js'

const MediaContext = createContext(null)

export const MediaProvider = ({ children, isAuthenticated }) => {
  const [mediaItems, setMediaItems] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [deletingMedia, setDeletingMedia] = useState({})

  const fetchMediaItems = useCallback(async () => {
    if (!isAuthenticated) {
      return
    }

    setMediaLoading(true)
    setMediaError('')
    try {
      const { response, body } = await requestMedia({
        path: '/media',
        label: 'Media List',
        auth: true,
        options: { credentials: 'include' },
      })

      if (!response?.ok) {
        setMediaError(body?.message || 'Failed to load media files')
        setMediaItems([])
        return
      }

      setMediaItems(Array.isArray(body?.items) ? body.items : [])
    } catch (error) {
      setMediaError(error.message)
      setMediaItems([])
    } finally {
      setMediaLoading(false)
    }
  }, [isAuthenticated])

  const handleMediaUpload = useCallback(
    async (event) => {
      event.preventDefault()
      if (!isAuthenticated) {
        setMediaError('Login to upload media.')
        return
      }
      if (selectedFiles.length === 0) {
        setMediaError('Please choose an image before uploading.')
        return
      }

      setUploading(true)
      setMediaError('')
      try {
        const formData = new FormData()
        selectedFiles.forEach((file) => {
          formData.append('files', file)
        })

        const { response, body } = await requestMedia({
          path: '/media/upload',
          label: 'Media Upload',
          auth: true,
          options: {
            method: 'POST',
            body: formData,
            credentials: 'include',
          },
        })

        if (!response?.ok) {
          setMediaError(body?.message || 'Upload failed')
          return
        }

        setSelectedFiles([])
        setFileInputKey(Date.now())
        await fetchMediaItems()
        if (body?.failed?.length) {
          setMediaError(`Failed: ${body.failed.map((item) => item.fileName).join(', ')}`)
        }
      } catch (error) {
        setMediaError(error.message)
      } finally {
        setUploading(false)
      }
    },
    [fetchMediaItems, isAuthenticated, selectedFiles],
  )

  const handleDeleteMedia = useCallback(
    async (mediaId) => {
      if (!mediaId) {
        return
      }
      if (!isAuthenticated) {
        setMediaError('Login to delete media.')
        return
      }

      setDeletingMedia((prev) => ({ ...prev, [mediaId]: true }))
      setMediaError('')
      try {
        const { response, body } = await requestMedia({
          path: `/media/${mediaId}`,
          label: 'Media Delete',
          auth: true,
          options: {
            method: 'DELETE',
            credentials: 'include',
          },
        })

        if (!response?.ok) {
          setMediaError(body?.message || 'Delete failed')
          return
        }

        setMediaItems((prev) => prev.filter((item) => item.id !== mediaId))
      } catch (error) {
        setMediaError(error.message)
      } finally {
        setDeletingMedia((prev) => ({ ...prev, [mediaId]: false }))
      }
    },
    [isAuthenticated],
  )

  const handleFileChange = useCallback((event) => {
    setSelectedFiles(event.target.files ? Array.from(event.target.files) : [])
  }, [])

  const formatSizeKb = useCallback((sizeBytes) => {
    const numeric = typeof sizeBytes === 'string' ? Number(sizeBytes) : sizeBytes
    if (!Number.isFinite(numeric)) return '-'
    return `${(numeric / 1024).toFixed(1)} KB`
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    fetchMediaItems()
  }, [isAuthenticated, fetchMediaItems])

  const value = useMemo(
    () => ({
      mediaItems,
      mediaLoading,
      mediaError,
      selectedFiles,
      uploading,
      fileInputKey,
      deletingMedia,
      fetchMediaItems,
      handleMediaUpload,
      handleDeleteMedia,
      handleFileChange,
      formatSizeKb,
    }),
    [
      mediaItems,
      mediaLoading,
      mediaError,
      selectedFiles,
      uploading,
      fileInputKey,
      deletingMedia,
      fetchMediaItems,
      handleMediaUpload,
      handleDeleteMedia,
      handleFileChange,
      formatSizeKb,
    ],
  )

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>
}

export const useMedia = () => {
  const context = useContext(MediaContext)
  if (!context) {
    throw new Error('useMedia must be used within MediaProvider')
  }
  return context
}
