export const CONCURRENCY = 3

export const MAX_ATTEMPTS = 3

export const RETRY_DELAYS_MS = [500, 1000, 2000] as const

export const PROGRESS_THROTTLE_MS = 100

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export const UPLOAD_URL = '/api/images/upload'
