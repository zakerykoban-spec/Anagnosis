import { useEffect, useMemo, useRef, useState } from 'react'
import markData from './data/scripture/generated/sblgnt/mark.json'
import './App.css'

type AppView = 'office' | 'reader'

type ScriptureVerse = {
  id: string
  chapter: number
  number: number
  sourceText: string
  displayText: string
}

type ReadingPosition = {
  readingId: string
  verseId: string
}

const READING_ID = 'mark.1.1-15'
const STORAGE_KEY = 'anagnosis.reading-position.v1'

function loadReadingPosition(): ReadingPosition | null {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const parsedValue = JSON.parse(storedValue) as Partial<ReadingPosition>

    if (
      parsedValue.readingId !== READING_ID ||
      typeof parsedValue.verseId !== 'string'
    ) {
      return null
    }

    return {
      readingId: parsedValue.readingId,
      verseId: parsedValue.verseId,
    }
  } catch {
    return null
  }
}

function App() {
  const readingVerses = useMemo<ScriptureVerse[]>(() => {
    const chapter = markData.chapters.find(
      (candidate) => candidate.number === 1,
    )

    if (!chapter) {
      throw new Error('Mark chapter 1 is missing from the generated corpus.')
    }

    return chapter.verses.filter(
      (verse) => verse.number >= 1 && verse.number <= 15,
    )
  }, [])

  const initialPosition = useMemo(() => loadReadingPosition(), [])
  const initialVerseIndex = Math.max(
    0,
    readingVerses.findIndex(
      (verse) => verse.id === initialPosition?.verseId,
    ),
  )

  const [view, setView] = useState<AppView>('office')
  const [hasReadingPosition, setHasReadingPosition] = useState(
    initialPosition !== null,
  )
  const [currentVerseIndex, setCurrentVerseIndex] =
    useState(initialVerseIndex)

  const verseElements = useRef<Record<string, HTMLElement | null>>({})

  const currentVerse = readingVerses[currentVerseIndex]

  useEffect(() => {
    if (view !== 'reader') {
      return
    }

    setHasReadingPosition(true)

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        readingId: READING_ID,
        verseId: currentVerse.id,
      } satisfies ReadingPosition),
    )
  }, [currentVerse.id, view])

  function beginReading() {
    setView('reader')
  }

  function moveToVerse(nextIndex: number) {
    const boundedIndex = Math.min(
      Math.max(nextIndex, 0),
      readingVerses.length - 1,
    )

    setCurrentVerseIndex(boundedIndex)

    const verse = readingVerses[boundedIndex]

    window.requestAnimationFrame(() => {
      verseElements.current[verse.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  if (view === 'office') {
    return (
      <main className="office-shell">
        <section className="office-card" aria-labelledby="office-title">
          <p className="app-name">Ἀνάγνωσις</p>

          <div className="office-heading">
            <p className="eyebrow">Today’s Office</p>
            <h1 id="office-title">Morning Reading</h1>
          </div>

          <div className="reading-summary">
            <p className="reading-book">Κατὰ Μᾶρκον</p>
            <p className="reading-reference">Mark 1:1–15</p>
            <p className="reading-count">15 verses</p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={beginReading}
          >
            {hasReadingPosition ? 'Resume Reading' : 'Begin Reading'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <button
          className="text-button"
          type="button"
          onClick={() => setView('office')}
        >
          Today’s Office
        </button>

        <div className="reader-title">
          <p>Κατὰ Μᾶρκον</p>
          <span>1:1–15</span>
        </div>

        <p className="reader-progress" aria-live="polite">
          {currentVerseIndex + 1} / {readingVerses.length}
        </p>
      </header>

      <article className="scripture" lang="grc">
        <h1>ΚΑΤΑ ΜΑΡΚΟΝ</h1>
        <p className="chapter-number">Αʹ</p>

        <div className="verse-list">
          {readingVerses.map((verse, index) => (
            <p
              className={
                index === currentVerseIndex
                  ? 'verse current-verse'
                  : 'verse'
              }
              id={verse.id}
              key={verse.id}
              ref={(element) => {
                verseElements.current[verse.id] = element
              }}
              onClick={() => setCurrentVerseIndex(index)}
            >
              <button
                className="verse-number"
                type="button"
                aria-label={`Verse ${verse.number}`}
                onClick={(event) => {
                  event.stopPropagation()
                  moveToVerse(index)
                }}
              >
                {verse.number}
              </button>

              <span>{verse.displayText}</span>
            </p>
          ))}
        </div>
      </article>

      <nav className="reader-navigation" aria-label="Reading navigation">
        <button
          className="navigation-button"
          type="button"
          disabled={currentVerseIndex === 0}
          onClick={() => moveToVerse(currentVerseIndex - 1)}
        >
          Previous
        </button>

        <button
          className="navigation-button"
          type="button"
          disabled={currentVerseIndex === readingVerses.length - 1}
          onClick={() => moveToVerse(currentVerseIndex + 1)}
        >
          Next
        </button>
      </nav>
    </main>
  )
}

export default App



