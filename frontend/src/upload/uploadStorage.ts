import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './constants'

const STORAGE_KEY = 'pictoshare:pending-uploads'

interface StoredTask {
  id: string
  name: string
  type: string
  lastModified: number
  dataUrl: string
}

type Store = Record<string, StoredTask>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  try {
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage quota or availability issue — drop silently so the
    // in-memory upload still proceeds. Persistence is best-effort.
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function dataUrlToFile(stored: StoredTask): Promise<File> {
  const res = await fetch(stored.dataUrl)
  const blob = await res.blob()
  return new File([blob], stored.name, {
    type: stored.type,
    lastModified: stored.lastModified,
  })
}

export function isPersistableFile(file: File): boolean {
  return (
    file.size <= MAX_FILE_SIZE_BYTES &&
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
  )
}

export async function persistTask(id: string, file: File): Promise<void> {
  const dataUrl = await fileToDataUrl(file)
  const store = readStore()
  store[id] = {
    id,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    dataUrl,
  }
  writeStore(store)
}

export function forgetTask(id: string): void {
  const store = readStore()
  if (!(id in store)) return
  delete store[id]
  writeStore(store)
}

export function forgetTasks(ids: string[]): void {
  if (ids.length === 0) return
  const store = readStore()
  let changed = false
  for (const id of ids) {
    if (id in store) {
      delete store[id]
      changed = true
    }
  }
  if (changed) writeStore(store)
}

export async function loadPersistedTasks(): Promise<{ id: string; file: File }[]> {
  const store = readStore()
  const entries: { id: string; file: File }[] = []
  for (const stored of Object.values(store)) {
    try {
      const file = await dataUrlToFile(stored)
      entries.push({ id: stored.id, file })
    } catch {
      forgetTask(stored.id)
    }
  }
  return entries
}
