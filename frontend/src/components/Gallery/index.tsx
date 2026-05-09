import { useEffect, useRef } from 'react'
import { useImages } from './hooks/useImages'
import { usePageOffsetUrl } from './hooks/usePageOffsetUrl'

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eee"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#888" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>',
  )

interface GalleryProps {
  deleting: string | null
  onDelete: (id: string) => void
}

function Gallery({ deleting, onDelete }: GalleryProps) {
  const { initial, setPosition } = usePageOffsetUrl()
  const initialPage = initial?.page ?? 0

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isCatchingUp,
    error,
  } = useImages(initialPage)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const restoredRef = useRef(false)

  // Scroll restoration once the target page is loaded.
  useEffect(() => {
    if (restoredRef.current) return
    if (!initial) {
      restoredRef.current = true
      return
    }
    if (isCatchingUp) return
    const target = document.querySelector<HTMLElement>(
      `[data-page="${initial.page}"][data-offset="${initial.offset}"]`,
    )
    if (target) {
      target.scrollIntoView({ block: 'start' })
    }
    restoredRef.current = true
  }, [initial, isCatchingUp])

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

  // Update URL with topmost visible card on scroll.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const onScroll = () => {
      if (!restoredRef.current) return
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
  }, [setPosition])

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p>Loading images...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center' }}>
        Error: {error.message}
      </div>
    )
  }

  const pages = data?.pages ?? []
  const totalImages = pages.reduce((acc, p) => acc + p.length, 0)

  return (
    <>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {totalImages === 0 && <p style={{ color: '#666' }}>No images found. Add one above!</p>}
        {pages.map((page, pageIdx) =>
          page.map((img, indexInPage) => {
            const cardStyle = {
              width: 400,
              background: '#fff',
              borderRadius: 8,
              overflow: 'hidden' as const,
              boxShadow: `0 ${Math.random() * 0 + 1}px 3px rgba(0,0,0,0.1), 0 ${Math.random() * 0 + 2}px 8px rgba(0,0,0,0.08)`,
              position: 'relative' as const,
              transform: `translateZ(0) rotate(${Math.random() * 0}deg)`,
            }
            return (
              <div
                key={img.id}
                data-page={pageIdx}
                data-offset={indexInPage}
                style={cardStyle}
              >
                <button
                  type="button"
                  onClick={() => onDelete(img.id)}
                  disabled={deleting === img.id}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 22,
                    height: 22,
                    minWidth: 22,
                    minHeight: 22,
                    padding: 0,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: 16,
                    lineHeight: '22px',
                    textAlign: 'center',
                    cursor: deleting === img.id ? 'not-allowed' : 'pointer',
                    opacity: deleting === img.id ? 0.5 : 1,
                  }}
                >
                  ×
                </button>
                <img
                  src={img.url}
                  alt={img.title}
                  loading="eager"
                  decoding="sync"
                  style={{ width: 400, height: 300, objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement
                    if (el.src === FALLBACK_IMAGE) return
                    el.src = FALLBACK_IMAGE
                  }}
                />
                <div style={{ padding: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.title}</p>
                </div>
              </div>
            )
          }),
        )}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      {(isFetchingNextPage || isCatchingUp) && (
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
          <p>Loading more...</p>
        </div>
      )}
    </>
  )
}

export default Gallery
