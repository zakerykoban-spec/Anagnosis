type VerseViewportGeometry = {
  verseTop: number
  verseBottom: number
  viewportTop: number
  viewportBottom: number
}

const EDGE_GUTTER_RATIO = 0.12
const MIN_EDGE_GUTTER = 56
const MAX_EDGE_GUTTER = 104

export function verseViewportScrollDelta({
  verseTop,
  verseBottom,
  viewportTop,
  viewportBottom,
}: VerseViewportGeometry) {
  const viewportHeight = Math.max(viewportBottom - viewportTop, 0)
  if (viewportHeight === 0) return 0

  const edgeGutter = Math.min(
    MAX_EDGE_GUTTER,
    Math.max(MIN_EDGE_GUTTER, viewportHeight * EDGE_GUTTER_RATIO),
  )
  const safeTop = viewportTop + edgeGutter
  const safeBottom = viewportBottom - edgeGutter

  if (safeBottom <= safeTop) return 0
  if (verseTop < safeTop) return verseTop - safeTop
  if (verseBottom > safeBottom) return verseBottom - safeBottom
  return 0
}

export function keepVerseComfortablyVisible(element: HTMLElement) {
  const verseRect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const headerBottom = Math.max(
    document.querySelector<HTMLElement>('.reader-header')
      ?.getBoundingClientRect().bottom ?? 0,
    0,
  )
  const navigationTop = document
    .querySelector<HTMLElement>('.reader-navigation')
    ?.getBoundingClientRect().top
  const viewportBottom = navigationTop !== undefined
    && navigationTop > headerBottom
    && navigationTop < viewportHeight
    ? navigationTop
    : viewportHeight
  const delta = verseViewportScrollDelta({
    verseTop: verseRect.top,
    verseBottom: verseRect.bottom,
    viewportTop: headerBottom,
    viewportBottom,
  })

  if (Math.abs(delta) < 1) return
  window.scrollBy({ top: delta, left: 0, behavior: 'auto' })
}
