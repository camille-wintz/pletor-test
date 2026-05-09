import { useCallback, useRef } from 'react'

export interface PageOffset {
  page: number
  offset: number
}

function readFromUrl(): PageOffset | null {
  const params = new URLSearchParams(window.location.search)
  const pageRaw = params.get('page')
  const offsetRaw = params.get('offset')
  if (pageRaw === null || offsetRaw === null) return null
  const page = Number(pageRaw)
  const offset = Number(offsetRaw)
  if (!Number.isFinite(page) || !Number.isFinite(offset)) return null
  if (page < 0 || offset < 0) return null
  return { page: Math.floor(page), offset: Math.floor(offset) }
}

export function usePageOffsetUrl() {
  const initialRef = useRef<PageOffset | null>(null)
  if (initialRef.current === null) {
    initialRef.current = readFromUrl()
  }

  const setPosition = useCallback((page: number, offset: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(page))
    params.set('offset', String(offset))
    const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`
    window.history.replaceState(null, '', url)
  }, [])

  return { initial: initialRef.current, setPosition }
}
