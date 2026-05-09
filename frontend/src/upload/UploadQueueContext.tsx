import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { imagesQueryKey } from '../components/Gallery/hooks/useImages'
import {
  CONCURRENCY,
  MAX_ATTEMPTS,
  PROGRESS_THROTTLE_MS,
  RETRY_DELAYS_MS,
} from './constants'
import { initialState, uploadQueueReducer } from './uploadQueueReducer'
import { ACTIVE_STATUSES, type UploadQueueState, type UploadTask } from './types'
import { isRetryable, uploadImageXhr, UploadError } from './uploadXhr'

interface InFlightEntry {
  controller?: AbortController
  retryTimer?: ReturnType<typeof setTimeout>
  lastProgressAt?: number
}

export interface UploadQueueContextValue {
  tasks: UploadTask[]
  activeCount: number
  panelExpanded: boolean
  addFiles: (files: File[]) => void
  cancelTask: (id: string) => void
  retryTask: (id: string) => void
  clearFinished: () => void
  expandPanel: () => void
  minimizePanel: () => void
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null)

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function backoffFor(attempt: number): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]
  const jitter = 0.75 + Math.random() * 0.5
  return Math.round(base * jitter)
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uploadQueueReducer, initialState)
  const inFlight = useRef<Map<string, InFlightEntry>>(new Map())
  const queryClient = useQueryClient()

  const stateRef = useRef<UploadQueueState>(state)
  stateRef.current = state

  const startUpload = useCallback(
    (id: string) => {
      if (inFlight.current.has(id)) return
      const task = stateRef.current.tasks[id]
      if (!task || !task.file || task.status !== 'queued') return

      const controller = new AbortController()
      const entry: InFlightEntry = { controller }
      inFlight.current.set(id, entry)

      dispatch({ type: 'TASK_START', id })

      uploadImageXhr({
        file: task.file,
        signal: controller.signal,
        onProgress: (fraction) => {
          const ent = inFlight.current.get(id)
          if (!ent) return
          const now = performance.now()
          if (
            fraction < 1 &&
            ent.lastProgressAt !== undefined &&
            now - ent.lastProgressAt < PROGRESS_THROTTLE_MS
          ) {
            return
          }
          ent.lastProgressAt = now
          dispatch({ type: 'TASK_PROGRESS', id, progress: fraction })
        },
      })
        .then(() => {
          if (!inFlight.current.has(id)) return
          inFlight.current.delete(id)
          dispatch({ type: 'TASK_SUCCESS', id })
          queryClient.invalidateQueries({ queryKey: imagesQueryKey })
        })
        .catch((err: unknown) => {
          if (!inFlight.current.has(id)) return
          if (err instanceof UploadError && err.kind === 'aborted') {
            return
          }
          const current = stateRef.current.tasks[id]
          const attempt = current?.attempt ?? 1
          if (isRetryable(err) && attempt < MAX_ATTEMPTS) {
            const delay = backoffFor(attempt)
            const timer = setTimeout(() => {
              const ent = inFlight.current.get(id)
              if (!ent || ent.retryTimer !== timer) return
              inFlight.current.delete(id)
              dispatch({ type: 'TASK_REQUEUE', id })
            }, delay)
            inFlight.current.set(id, { retryTimer: timer })
            dispatch({ type: 'TASK_SCHEDULE_RETRY', id })
            return
          }
          inFlight.current.delete(id)
          const message =
            err instanceof Error ? err.message : 'Upload failed'
          dispatch({ type: 'TASK_ERROR', id, message })
        })
    },
    [queryClient],
  )

  useEffect(() => {
    let running = 0
    for (const id of state.order) {
      if (state.tasks[id].status === 'uploading') running++
    }
    let slots = CONCURRENCY - running
    if (slots <= 0) return
    for (const id of state.order) {
      if (slots <= 0) break
      const task = state.tasks[id]
      if (task.status !== 'queued') continue
      if (inFlight.current.has(id)) continue
      startUpload(id)
      slots--
    }
  }, [state.tasks, state.order, startUpload])

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    const entries = files.map((file) => ({ id: genId(), file }))
    dispatch({ type: 'ADD_FILES', entries })
  }, [])

  const cancelTask = useCallback((id: string) => {
    const ent = inFlight.current.get(id)
    if (ent) {
      if (ent.retryTimer) clearTimeout(ent.retryTimer)
      ent.controller?.abort()
      inFlight.current.delete(id)
    }
    dispatch({ type: 'TASK_CANCEL', id })
  }, [])

  const retryTask = useCallback((id: string) => {
    dispatch({ type: 'TASK_MANUAL_RETRY', id })
  }, [])

  const clearFinished = useCallback(() => {
    dispatch({ type: 'CLEAR_FINISHED' })
  }, [])

  const expandPanel = useCallback(() => {
    dispatch({ type: 'PANEL_EXPAND' })
  }, [])

  const minimizePanel = useCallback(() => {
    dispatch({ type: 'PANEL_MINIMIZE' })
  }, [])

  const value = useMemo<UploadQueueContextValue>(() => {
    const tasks = state.order.map((id) => state.tasks[id])
    let activeCount = 0
    for (const task of tasks) {
      if (ACTIVE_STATUSES.has(task.status)) activeCount++
    }
    return {
      tasks,
      activeCount,
      panelExpanded: state.panelExpanded,
      addFiles,
      cancelTask,
      retryTask,
      clearFinished,
      expandPanel,
      minimizePanel,
    }
  }, [
    state,
    addFiles,
    cancelTask,
    retryTask,
    clearFinished,
    expandPanel,
    minimizePanel,
  ])

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  )
}

export function useUploadQueue(): UploadQueueContextValue {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) {
    throw new Error('useUploadQueue must be used within UploadQueueProvider')
  }
  return ctx
}
