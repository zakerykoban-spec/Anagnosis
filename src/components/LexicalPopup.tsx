import { useEffect, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { LexicalWordInfo } from '../models/lexical'

interface LexicalPopupProps {
  info: LexicalWordInfo
  anchor: RefObject<HTMLButtonElement | null>
  showGloss: boolean
  onClose: () => void
}

export function LexicalPopup({
  info,
  anchor,
  showGloss,
  onClose,
}: LexicalPopupProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const rect = anchor.current?.getBoundingClientRect()
  const style = rect ? {
    '--lexical-anchor-x': `${rect.left + rect.width / 2}px`,
    '--lexical-anchor-y': `${rect.bottom + 10}px`,
  } as CSSProperties : undefined

  useEffect(() => {
    closeButton.current?.focus()
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return <div
    className="lexical-backdrop"
    role="presentation"
    onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}
  >
    <section
      className="lexical-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lexical-popup-title"
      style={style}
    >
      <header className="lexical-popup-header">
        <div>
          <p className="lexical-surface">{info.surface}</p>
          <h2 id="lexical-popup-title">{info.lemma}</h2>
          <small>Λεξικὸς τύπος · {info.sourceLabel ?? 'STEP Bible'}</small>
        </div>
        <button
          className="lexical-close"
          type="button"
          aria-label="Κλεῖσον · Close"
          ref={closeButton}
          onClick={onClose}
        >×</button>
      </header>
      {showGloss && info.gloss && <p className="lexical-gloss" lang="en">{info.gloss}</p>}
      <dl className="lexical-analysis">
        <div>
          <dt>Μέρος λόγου</dt>
          <dd>{info.partOfSpeechGreek}</dd>
        </div>
        {info.compactGreek && <div>
          <dt>Γραμματική</dt>
          <dd className="lexical-compact">{info.compactGreek}</dd>
        </div>}
        {info.expandedGreek && <div>
          <dt>Ἐξήγησις</dt>
          <dd>{info.expandedGreek}</dd>
        </div>}
      </dl>
      {info.uncommon && <p className="lexical-frequency">
        <span>Σπάνιον · {info.ntFrequency}× ἐν τῇ Καινῇ Διαθήκῃ</span>
        {showGloss && <small lang="en">Uncommon in the New Testament</small>}
      </p>}
    </section>
  </div>
}
