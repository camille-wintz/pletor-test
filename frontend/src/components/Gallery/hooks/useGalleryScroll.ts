import { useEffect, useRef } from 'react'
import type { PageOffset } from './usePageOffsetUrl'

interface UseGalleryScrollArgs {
  isCatchingUp: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  setPosition: (page: number, offset: number) => void
  initial: PageOffset | null
}

export function useGalleryScroll({
  isCatchingUp,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  setPosition,
  initial,
}: UseGalleryScrollArgs) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const restoredRef = useRef(false)

  // Restore initial scroll position once catch-up has loaded the target page.
  useEffect(() => {
    if (restoredRef.current) return
    if (!initial) return
    if (initial.page === 0 && initial.offset === 0) return
    if (isCatchingUp) return
    const target = document.querySelector<HTMLElement>(
      `[data-page="${initial.page}"][data-offset="${initial.offset}"]`,
    )
    if (target) {
      target.scrollIntoView({ block: 'start' })
      restoredRef.current = true
    }
  }, [isCatchingUp, initial])

  // Auto-load next page when sentinel enters view.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (isCatchingUp) return
        if (!hasNextPage) return
        if (isFetchingNextPage) return
        fetchNextPage()
      },
      // Prefetch well before reaching the bottom — the sentinel sits below the
      // tallest column, but the shortest column may end far above it.
      { rootMargin: '1500px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isCatchingUp, fetchNextPage])

  // Update URL with topmost visible card on scroll. Skipped during catch-up
  // so the programmatic scroll restoration doesn't overwrite the URL state.
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

  return { sentinelRef }
}
