import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-into-view reveal for below-the-fold sections.
 *
 *   <Reveal><FeatureBento /></Reveal>
 *   <Reveal delay={120} className="grid gap-4">…</Reveal>
 *
 * Fades up 24px with a spring ease once ~15% of the block is visible.
 * Honors prefers-reduced-motion by rendering immediately.
 *
 * Reveal renders the wrapper element itself: inside a grid, put layout
 * classes on Reveal (`<Reveal className="lg:col-span-2">`) — a col-span
 * on a lone inner div has no effect and leaves the column empty.
 */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(24px)',
        transition: [
          `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ].join(', '),
      }}
    >
      {children}
    </Tag>
  )
}

export default Reveal
