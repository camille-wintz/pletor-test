export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'retrying'
  | 'success'
  | 'error'
  | 'cancelled'

export interface UploadTask {
  id: string
  file: File | null
  name: string
  size: number
  status: UploadStatus
  progress: number
  attempt: number
  errorMessage?: string
}

export interface UploadQueueState {
  tasks: Record<string, UploadTask>
  order: string[]
  panelExpanded: boolean
}

export const ACTIVE_STATUSES: ReadonlySet<UploadStatus> = new Set([
  'queued',
  'uploading',
  'retrying',
])

export const TERMINAL_STATUSES: ReadonlySet<UploadStatus> = new Set([
  'success',
  'error',
  'cancelled',
])
