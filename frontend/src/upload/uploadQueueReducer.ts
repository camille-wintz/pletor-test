import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './constants'
import {
  ACTIVE_STATUSES,
  type UploadQueueState,
  type UploadTask,
} from './types'

export type Action =
  | { type: 'ADD_FILES'; entries: { id: string; file: File }[] }
  | { type: 'TASK_START'; id: string }
  | { type: 'TASK_PROGRESS'; id: string; progress: number }
  | { type: 'TASK_SUCCESS'; id: string }
  | { type: 'TASK_ERROR'; id: string; message: string }
  | { type: 'TASK_SCHEDULE_RETRY'; id: string }
  | { type: 'TASK_REQUEUE'; id: string }
  | { type: 'TASK_CANCEL'; id: string }
  | { type: 'TASK_MANUAL_RETRY'; id: string }
  | { type: 'CLEAR_FINISHED' }
  | { type: 'PANEL_EXPAND' }
  | { type: 'PANEL_MINIMIZE' }

export const initialState: UploadQueueState = {
  tasks: {},
  order: [],
  panelExpanded: false,
}

function activeCount(state: UploadQueueState): number {
  let n = 0
  for (const id of state.order) {
    if (ACTIVE_STATUSES.has(state.tasks[id].status)) n++
  }
  return n
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return `Unsupported file type${file.type ? `: ${file.type}` : ''}`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File exceeds 10MB limit'
  }
  return null
}

function withTask(state: UploadQueueState, id: string, patch: Partial<UploadTask>): UploadQueueState {
  const existing = state.tasks[id]
  if (!existing) return state
  return {
    ...state,
    tasks: { ...state.tasks, [id]: { ...existing, ...patch } },
  }
}

function withoutTasks(state: UploadQueueState, predicate: (task: UploadTask) => boolean): UploadQueueState {
  const nextTasks: Record<string, UploadTask> = {}
  const nextOrder: string[] = []
  for (const id of state.order) {
    const task = state.tasks[id]
    if (predicate(task)) continue
    nextTasks[id] = task
    nextOrder.push(id)
  }
  return { ...state, tasks: nextTasks, order: nextOrder }
}

export function uploadQueueReducer(state: UploadQueueState, action: Action): UploadQueueState {
  switch (action.type) {
    case 'ADD_FILES': {
      const newTasks: Record<string, UploadTask> = { ...state.tasks }
      const newOrder = [...state.order]
      for (const { id, file } of action.entries) {
        const reason = validateFile(file)
        const task: UploadTask = reason
          ? {
              id,
              file: null,
              name: file.name,
              size: file.size,
              status: 'error',
              progress: 0,
              attempt: 0,
              errorMessage: reason,
            }
          : {
              id,
              file,
              name: file.name,
              size: file.size,
              status: 'queued',
              progress: 0,
              attempt: 0,
            }
        newTasks[id] = task
        newOrder.push(id)
      }
      const nextState: UploadQueueState = {
        ...state,
        tasks: newTasks,
        order: newOrder,
      }
      const active = activeCount(nextState)
      if (active >= 2) nextState.panelExpanded = true
      return nextState
    }

    case 'TASK_START': {
      const task = state.tasks[action.id]
      if (!task) return state
      return withTask(state, action.id, {
        status: 'uploading',
        progress: 0,
        attempt: task.attempt + 1,
        errorMessage: undefined,
      })
    }

    case 'TASK_PROGRESS':
      return withTask(state, action.id, { progress: action.progress })

    case 'TASK_SUCCESS':
      return withTask(state, action.id, {
        status: 'success',
        progress: 1,
        file: null,
      })

    case 'TASK_ERROR':
      return withTask(state, action.id, {
        status: 'error',
        errorMessage: action.message,
      })

    case 'TASK_SCHEDULE_RETRY':
      return withTask(state, action.id, { status: 'retrying' })

    case 'TASK_REQUEUE':
      return withTask(state, action.id, { status: 'queued' })

    case 'TASK_CANCEL': {
      const task = state.tasks[action.id]
      if (!task) return state
      return withTask(state, action.id, {
        status: 'cancelled',
        file: null,
        errorMessage: undefined,
      })
    }

    case 'TASK_MANUAL_RETRY': {
      const task = state.tasks[action.id]
      if (!task || task.status !== 'error' || !task.file) return state
      return withTask(state, action.id, {
        status: 'queued',
        progress: 0,
        attempt: 0,
        errorMessage: undefined,
      })
    }

    case 'CLEAR_FINISHED':
      return withoutTasks(state, (t) =>
        t.status === 'success' || t.status === 'cancelled' || t.status === 'error',
      )

    case 'PANEL_EXPAND':
      return state.panelExpanded ? state : { ...state, panelExpanded: true }

    case 'PANEL_MINIMIZE':
      return state.panelExpanded ? { ...state, panelExpanded: false } : state

    default:
      return state
  }
}
