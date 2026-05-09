import { useCallback, useState } from 'react'

function compute(width: number, targetWidth: number, gutter: number): number {
  if (width <= 0) return 1
  return Math.max(1, Math.floor((width + gutter) / (targetWidth + gutter)))
}

export function useColumnCount(targetWidth: number, gutter: number) {
  const [count, setCount] = useState(() => {
    if (typeof window === 'undefined') return 1
    return compute(window.innerWidth - 40, targetWidth, gutter)
  })

  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return
      setCount(compute(el.clientWidth, targetWidth, gutter))
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        setCount(compute(entry.contentRect.width, targetWidth, gutter))
      })
      ro.observe(el)
      return () => ro.disconnect()
    },
    [targetWidth, gutter],
  )

  return { ref, count }
}
