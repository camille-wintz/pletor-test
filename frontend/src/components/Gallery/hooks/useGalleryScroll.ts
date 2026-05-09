import { useEffect, useMemo, useRef } from 'react'
import type { PageOffset } from './usePageOffsetUrl'

interface UseGalleryScrollArgs {
  isCatchingUp: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  setPosition: (page: number, offset: number) => void
  initial: PageOffset | null
  pages: { length: number }[] | undefined
  itemsLength: number
}

export function useGalleryScroll({
  isCatchingUp,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  setPosition,
  initial,
  pages,
  itemsLength,
}: UseGalleryScrollArgs) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const scrollToIndex = useMemo<number | undefined>(() => {
    if (!initial) return undefined
    if (initial.page === 0) return undefined
    const allPages = pages ?? []
    if (initial.page >= allPages.length) return undefined
    let idx = 0
    for (let p = 0; p < initial.page; p++) idx += allPages[p].length
    const target = idx + initial.offset
    return target < itemsLength ? target : undefined
  }, [initial, pages, itemsLength])

  // Auto-load next page when sentinel enters view.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (isCatchingUp) return
      if (!hasNextPage) return
      if (isFetchingNextPage) return
      fetchNextPage()
    }, { rootMargin: '200px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isCatchingUp, fetchNextPage])

  // Update URL with topmost visible card on scroll. Skipped during catch-up
  // so the programmatic scroll-to-index doesn't overwrite the URL state.
  useEffect(() => {
    if (isCatchingUp) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const onScroll = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const cards = document.querySelectorAll<HTMLElement>('[data-page]')
        let topmost: HTMLElement | null = null
        let topmostBoundary = Infinity
        cards.forEach((card) => {
          const top = card.getBoundingClientRect().top
          if (top >= 0 && top < topmostBoundary) {
            topmost = card
            topmostBoundary = top
          }
        })
        if (topmost) {
          const el = topmost as HTMLElement
          const page = Number(el.dataset.page)
          const offset = Number(el.dataset.offset)
          if (Number.isFinite(page) && Number.isFinite(offset)) {
            setPosition(page, offset)
          }
        }
      }, 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timer) clearTimeout(timer)
    }
  }, [isCatchingUp, setPosition])

  return { sentinelRef, scrollToIndex }
}
