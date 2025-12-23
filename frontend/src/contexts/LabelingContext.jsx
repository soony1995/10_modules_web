import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { requestAi, requestMedia } from '../utils/api.js'

const LabelingContext = createContext(null)

export const LabelingProvider = ({ children, isAuthenticated }) => {
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

  const fetchPersons = useCallback(async () => {
    if (!isAuthenticated) return

    setPersonsLoading(true)
    setPersonsError('')

    try {
      const { response, body } = await requestAi({
        path: '/ai/persons',
        label: 'AI Persons',
        auth: true,
        options: { credentials: 'include' },
      })

      if (!response?.ok) {
        setPersonsError(body?.detail || body?.message || 'Failed to load persons')
        setPersons([])
        return
      }

      setPersons(Array.isArray(body) ? body : [])
    } catch (error) {
      setPersonsError(error.message)
      setPersons([])
    } finally {
      setPersonsLoading(false)
    }
  }, [isAuthenticated])

  const fetchUnassignedFaces = useCallback(async () => {
    if (!isAuthenticated) return

    setFacesLoading(true)
    setFacesError('')

    try {
      const { response, body } = await requestAi({
        path: '/ai/faces/unassigned',
        label: 'AI Faces',
        auth: true,
        options: { credentials: 'include' },
      })

      if (!response?.ok) {
        setFacesError(body?.detail || body?.message || 'Failed to load faces')
        setUnassignedFaces([])
        return
      }

      const faces = Array.isArray(body) ? body : []
      setUnassignedFaces(faces)
      setFaceAssignments((prev) => {
        const next = { ...prev }
        faces.forEach((face) => {
          if (!face?.id) return
          if (!next[face.id] && face.suggested_person_id) {
            next[face.id] = face.suggested_person_id
          }
        })
        return next
      })

      const mediaIds = Array.from(
        new Set(faces.map((face) => face.media_id).filter(Boolean)),
      ).filter((mediaId) => !mediaById[mediaId])

      if (mediaIds.length > 0) {
        const results = await Promise.all(
          mediaIds.map(async (mediaId) => {
            const { response: mediaResponse, body: mediaBody } = await requestMedia({
              path: `/media/${mediaId}`,
              auth: true,
              options: { credentials: 'include' },
            })
            if (!mediaResponse?.ok) {
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
      setFacesError(error.message)
      setUnassignedFaces([])
    } finally {
      setFacesLoading(false)
    }
  }, [isAuthenticated, mediaById])

  const handleCreatePerson = useCallback(
    async (event) => {
      event.preventDefault()
      if (!newPersonName.trim()) return

      setCreatingPerson(true)
      setPersonsError('')
      try {
        const { response, body } = await requestAi({
          path: '/ai/persons',
          label: 'AI Person Create',
          auth: true,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: newPersonName.trim() }),
          },
        })

        if (!response?.ok) {
          setPersonsError(body?.detail || body?.message || 'Failed to create person')
          return
        }

        setNewPersonName('')
        await fetchPersons()
      } catch (error) {
        setPersonsError(error.message)
      } finally {
        setCreatingPerson(false)
      }
    },
    [fetchPersons, newPersonName],
  )

  const handleAssignFace = useCallback(
    async (faceId) => {
      const personId = faceAssignments[faceId]
      if (!personId) return

      setAssigningFace((prev) => ({ ...prev, [faceId]: true }))
      setFacesError('')

      try {
        const { response, body } = await requestAi({
          path: `/ai/faces/${faceId}/assign`,
          label: 'AI Face Assign',
          auth: true,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ person_id: personId }),
          },
        })

        if (!response?.ok) {
          setFacesError(body?.detail || body?.message || 'Failed to assign face')
          return
        }

        setUnassignedFaces((prev) => prev.filter((face) => face.id !== faceId))
        await fetchUnassignedFaces()
        await fetchPersons()
      } catch (error) {
        setFacesError(error.message)
      } finally {
        setAssigningFace((prev) => ({ ...prev, [faceId]: false }))
      }
    },
    [faceAssignments, fetchPersons, fetchUnassignedFaces],
  )

  const handleIgnoreFace = useCallback(
    async (faceId) => {
      setIgnoringFace((prev) => ({ ...prev, [faceId]: true }))
      setFacesError('')

      try {
        const { response, body } = await requestAi({
          path: `/ai/faces/${faceId}/ignore`,
          label: 'AI Face Ignore',
          auth: true,
          options: {
            method: 'POST',
            credentials: 'include',
          },
        })

        if (!response?.ok) {
          setFacesError(body?.detail || body?.message || 'Failed to ignore face')
          return
        }

        setUnassignedFaces((prev) => prev.filter((face) => face.id !== faceId))
        await fetchUnassignedFaces()
      } catch (error) {
        setFacesError(error.message)
      } finally {
        setIgnoringFace((prev) => ({ ...prev, [faceId]: false }))
      }
    },
    [fetchUnassignedFaces],
  )

  const handleNewPersonNameChange = useCallback((value) => {
    setNewPersonName(value)
  }, [])

  const handleFaceAssignmentChange = useCallback((faceId, personId) => {
    setFaceAssignments((prev) => ({
      ...prev,
      [faceId]: personId,
    }))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchPersons()
    fetchUnassignedFaces()
  }, [isAuthenticated, fetchPersons, fetchUnassignedFaces])

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  )

  return <LabelingContext.Provider value={value}>{children}</LabelingContext.Provider>
}

export const useLabeling = () => {
  const context = useContext(LabelingContext)
  if (!context) {
    throw new Error('useLabeling must be used within LabelingProvider')
  }
  return context
}
