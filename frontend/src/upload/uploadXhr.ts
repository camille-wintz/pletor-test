import { UPLOAD_URL } from './constants'

export type UploadErrorKind = 'network' | 'server' | 'client' | 'aborted'

export class UploadError extends Error {
  constructor(
    public kind: UploadErrorKind,
    public status: number | null,
    message: string,
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

export function isRetryable(err: unknown): boolean {
  return err instanceof UploadError && (err.kind === 'network' || err.kind === 'server')
}

export interface UploadXhrOptions {
  file: File
  signal: AbortSignal
  onProgress?: (fraction: number) => void
}

export function uploadImageXhr({ file, signal, onProgress }: UploadXhrOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadError('aborted', null, 'Upload cancelled'))
      return
    }

    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    const onAbort = () => xhr.abort()
    signal.addEventListener('abort', onAbort)

    const cleanup = () => {
      signal.removeEventListener('abort', onAbort)
    }

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          onProgress(Math.min(1, e.loaded / e.total))
        }
      }
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(1)
        resolve()
        return
      }
      let detail = `HTTP ${xhr.status}`
      try {
        const parsed = JSON.parse(xhr.responseText)
        if (parsed && typeof parsed.detail === 'string') detail = parsed.detail
      } catch {
        // response isn't JSON; use the default
      }
      const kind: UploadErrorKind = xhr.status >= 500 ? 'server' : 'client'
      reject(new UploadError(kind, xhr.status, detail))
    }

    xhr.onerror = () => {
      cleanup()
      reject(new UploadError('network', null, 'Network error'))
    }

    xhr.ontimeout = () => {
      cleanup()
      reject(new UploadError('network', null, 'Request timed out'))
    }

    xhr.onabort = () => {
      cleanup()
      reject(new UploadError('aborted', null, 'Upload cancelled'))
    }

    xhr.open('POST', UPLOAD_URL)
    xhr.send(formData)
  })
}
