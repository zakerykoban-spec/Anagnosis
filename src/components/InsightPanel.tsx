import { useEffect, useMemo, useRef } from 'react'
import type { ScriptureVerse } from '../data/dailyOffice'
import type { NtSyntaxBook } from '../models/syntax'
import { syntaxInsightForVerse } from '../models/syntax'

interface InsightPanelProps {
  book: NtSyntaxBook | null
  error: string | null
  loading: boolean
  reference: string
  showGloss: boolean
  verse: ScriptureVerse
  onClose: () => void
}

export function InsightPanel({
  book,
  error,
  loading,
  reference,
  showGloss,
  verse,
  onClose,
}: InsightPanelProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const surfaces = useMemo(
    () => verse.displayText.split(/\s+/u).filter(Boolean),
    [verse.displayText],
  )
  const clauses = useMemo(
    () => syntaxInsightForVerse(book, verse.id, surfaces),
    [book, surfaces, verse.id],
  )

  useEffect(() => {
    closeButton.current?.focus()
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const scrollY = window.scrollY
    const bodyStyle = document.body.style
    const rootStyle = document.documentElement.style
    const previous = {
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      bodyOverflow: bodyStyle.overflow,
      rootOverflow: rootStyle.overflow,
    }

    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.left = '0'
    bodyStyle.right = '0'
    bodyStyle.width = '100%'
    bodyStyle.overflow = 'hidden'
    rootStyle.overflow = 'hidden'

    return () => {
      bodyStyle.position = previous.bodyPosition
      bodyStyle.top = previous.bodyTop
      bodyStyle.left = previous.bodyLeft
      bodyStyle.right = previous.bodyRight
      bodyStyle.width = previous.bodyWidth
      bodyStyle.overflow = previous.bodyOverflow
      rootStyle.overflow = previous.rootOverflow
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
    }
  }, [])

  return <div
    className="insight-backdrop"
    role="presentation"
    onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}
  >
    <section
      className="insight-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insight-title"
    >
      <header className="insight-header">
        <div>
          <p className="insight-kicker">Σύνταξις{showGloss && <small>Insight</small>}</p>
          <h2 id="insight-title">{reference}</h2>
        </div>
        <button
          className="insight-close"
          type="button"
          aria-label="Κλεῖσον · Close"
          ref={closeButton}
          onClick={onClose}
        >×</button>
      </header>
      <p className="insight-verse" lang="grc">{verse.displayText}</p>
      {loading && <p className="insight-status" role="status">
        <span>Ἀναλύεται…</span>
        {showGloss && <small>Loading syntax…</small>}
      </p>}
      {!loading && error && <p className="insight-status insight-error" role="alert">
        <span>Οὐκ ἠδυνήθη ἀνοιχθῆναι.</span>
        {showGloss && <small>{error}</small>}
      </p>}
      {!loading && !error && clauses.length === 0 && <p className="insight-status">
        <span>Οὐκ ἔστι σύνταξις τούτου τοῦ στίχου.</span>
        {showGloss && <small>No syntax grouping is available for this verse.</small>}
      </p>}
      {!loading && !error && clauses.length > 0 && <ol className="insight-clauses">
        {clauses.map((clause, clauseIndex) => <li key={`${verse.id}:${clauseIndex}`}>
          <header className="insight-clause-header">
            <strong>Πρότασις {clauseIndex + 1}</strong>
            {showGloss && <small>Clause {clauseIndex + 1}</small>}
          </header>
          {clause.observations.length > 0 && <ul className="insight-observations">
            {clause.observations.map((observation) => <li key={observation.greek}>
              <span>{observation.greek}</span>
              {showGloss && <small>{observation.english}</small>}
            </li>)}
          </ul>}
          <dl className="insight-groups">
            {clause.groups.map((group, groupIndex) => <div key={`${group.role}:${group.startTokenIndex}:${group.endTokenIndex}:${groupIndex}`}>
              <dt>
                <span>{group.greek}</span>
                {showGloss && <small>{group.english}</small>}
              </dt>
              <dd lang="grc">{group.text}</dd>
            </div>)}
          </dl>
        </li>)}
      </ol>}
      <p className="insight-source">
        <span>Δεδομένα συντάξεως · MACULA Greek</span>
        {showGloss && <small>Deterministic grouping from MACULA; canonical SBLGNT text shown above.</small>}
      </p>
    </section>
  </div>
}
