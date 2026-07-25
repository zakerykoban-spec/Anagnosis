import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { VoiceText } from './components/VoiceText'
import {
  loadPsalm,
  resolveDailyOffice,
  type OfficeEntry,
  type ScriptureReading,
} from './data/dailyOffice'
import { UI } from './ui/lexicon'
import './App.css'

type AppView = 'office' | 'reader'

type ReaderOptions = {
  showGloss: boolean
  darkMode: boolean
  showProgressive: boolean
  showChallenge: boolean
  showPsalm: boolean
}

type StoredPositions = Record<string, string>

const OPTIONS_KEY = 'anagnosis.options.v1'
const POSITIONS_KEY = 'anagnosis.reading-positions.v1'

interface OfficeReadingButtonProps {
  entry: OfficeEntry
  showGloss: boolean
  onOpen: (entry: OfficeEntry) => void
}

function OfficeReadingButton({
  entry,
  showGloss,
  onOpen,
}: OfficeReadingButtonProps) {
  return (
    <button
      className="office-reading"
      type="button"
      onClick={() => onOpen(entry)}
    >
      <span className="office-reading-copy">
        <VoiceText
          term={{
            greek: entry.sectionGreek,
            english: entry.sectionEnglish,
          }}
          showGloss={showGloss}
        />

        <span className="office-reading-title">{entry.titleGreek}</span>

        {showGloss && (
          <span className="office-reading-reference">{entry.reference}</span>
        )}
      </span>

      <span className="office-reading-action" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

const DEFAULT_OPTIONS: ReaderOptions = {
  showGloss: true,
  darkMode: false,
  showProgressive: true,
  showChallenge: true,
  showPsalm: true,
}

function loadOptions(): ReaderOptions {
  try {
    const stored = window.localStorage.getItem(OPTIONS_KEY)

    if (!stored) {
      return DEFAULT_OPTIONS
    }

    return {
      ...DEFAULT_OPTIONS,
      ...(JSON.parse(stored) as Partial<ReaderOptions>),
    }
  } catch {
    return DEFAULT_OPTIONS
  }
}

function loadPositions(): StoredPositions {
  try {
    const stored = window.localStorage.getItem(POSITIONS_KEY)
    return stored ? (JSON.parse(stored) as StoredPositions) : {}
  } catch {
    return {}
  }
}

function savePosition(readingId: string, verseId: string) {
  const positions = loadPositions()
  positions[readingId] = verseId
  window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
}

function App() {
  const office = useMemo(() => resolveDailyOffice(), [])
  const [view, setView] = useState<AppView>('office')
  const [options, setOptions] = useState<ReaderOptions>(() => loadOptions())
  const [activeEntry, setActiveEntry] = useState<OfficeEntry | null>(null)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [psalmReading, setPsalmReading] = useState<ScriptureReading | null>(null)
  const [psalmError, setPsalmError] = useState<string | null>(null)
  const verseElements = useRef<Record<string, HTMLElement | null>>({})

  const scriptureReading =
    activeEntry?.kind === 'scripture' ? activeEntry : null
  const currentVerse = scriptureReading?.verses[currentVerseIndex]

  useEffect(() => {
    window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(options))
    document.documentElement.dataset.theme = options.darkMode ? 'dark' : 'light'
  }, [options])

  useEffect(() => {
    if (!options.showPsalm) {
      return
    }

    let cancelled = false

    loadPsalm(office.psalmNumber)
      .then((reading) => {
        if (!cancelled) {
          setPsalmReading(reading)
          setPsalmError(null)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPsalmError(
            error instanceof Error ? error.message : 'Unable to load the Psalm.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [office.psalmNumber, options.showPsalm])

  useEffect(() => {
    if (view !== 'reader' || !scriptureReading || !currentVerse) {
      return
    }

    savePosition(
      `${office.dayNumber}:${scriptureReading.id}`,
      currentVerse.id,
    )
  }, [currentVerse, office.dayNumber, scriptureReading, view])

  useEffect(() => {
    if (view !== 'reader' || !scriptureReading) {
      return
    }

    const verse = scriptureReading.verses[currentVerseIndex]

    window.requestAnimationFrame(() => {
      verseElements.current[verse.id]?.scrollIntoView({
        block: 'center',
      })
    })
  }, [currentVerseIndex, scriptureReading, view])

  function openEntry(entry: OfficeEntry) {
    if (entry.kind === 'scripture') {
      const savedVerseId =
        loadPositions()[`${office.dayNumber}:${entry.id}`]
      const savedIndex = entry.verses.findIndex(
        (verse) => verse.id === savedVerseId,
      )
      setCurrentVerseIndex(Math.max(0, savedIndex))
    } else {
      setCurrentVerseIndex(0)
    }

    setActiveEntry(entry)
    setView('reader')
  }

  function moveToVerse(nextIndex: number) {
    if (!scriptureReading) {
      return
    }

    const boundedIndex = Math.min(
      Math.max(nextIndex, 0),
      scriptureReading.verses.length - 1,
    )

    setCurrentVerseIndex(boundedIndex)
  }

  function updateOption<Key extends keyof ReaderOptions>(
    key: Key,
    value: ReaderOptions[Key],
  ) {
    setOptions((current) => ({
      ...current,
      [key]: value,
    }))
  }

  if (view === 'office') {
    return (
      <main className="office-shell">
        <section className="office-card" aria-labelledby="office-title">
          <p className="app-name">Ἀνάγνωσις</p>

          <header className="office-heading" id="office-title">
            <VoiceText
              term={UI.todaysReading}
              showGloss={options.showGloss}
            />
          </header>

          <div className="office-list">
            <OfficeReadingButton
              entry={office.openingPrayer}
              showGloss={options.showGloss}
              onOpen={openEntry}
            />

            {options.showProgressive && (
              <OfficeReadingButton
                entry={office.progressiveReading}
                showGloss={options.showGloss}
                onOpen={openEntry}
              />
            )}

            {options.showChallenge && (
              <OfficeReadingButton
                entry={office.challengeReading}
                showGloss={options.showGloss}
                onOpen={openEntry}
              />
            )}

            {options.showPsalm &&
              (psalmReading ? (
                <OfficeReadingButton
                  entry={psalmReading}
                  showGloss={options.showGloss}
                  onOpen={openEntry}
                />
              ) : (
                <div className="office-reading office-reading-status">
                  <span>
                    {psalmError ?? `Ψαλμὸς ${office.psalmNumber}…`}
                  </span>
                </div>
              ))}

            <OfficeReadingButton
              entry={office.closingPrayer}
              showGloss={options.showGloss}
              onOpen={openEntry}
            />
          </div>

          <fieldset className="options-panel">
            <legend>
              <VoiceText
                term={UI.options}
                showGloss={options.showGloss}
              />
            </legend>

            <label>
              <input
                type="checkbox"
                checked={options.showGloss}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateOption('showGloss', event.target.checked)
                }
              />
              <VoiceText
                term={UI.englishAids}
                showGloss={options.showGloss}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={options.darkMode}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateOption('darkMode', event.target.checked)
                }
              />
              <VoiceText
                term={UI.darkMode}
                showGloss={options.showGloss}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={options.showProgressive}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateOption('showProgressive', event.target.checked)
                }
              />
              <VoiceText
                term={UI.progressiveReading}
                showGloss={options.showGloss}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={options.showChallenge}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateOption('showChallenge', event.target.checked)
                }
              />
              <VoiceText
                term={UI.challengeReading}
                showGloss={options.showGloss}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={options.showPsalm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateOption('showPsalm', event.target.checked)
                }
              />
              <VoiceText
                term={UI.psalm}
                showGloss={options.showGloss}
              />
            </label>
          </fieldset>

          <p className="source-note">
            SBLGNT 1.2 · CC BY 4.0 · LXX Swete / First1KGreek · CC BY-SA 4.0
          </p>
        </section>
      </main>
    )
  }

  if (!activeEntry) {
    return null
  }

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <button
          className="text-button"
          type="button"
          onClick={() => setView('office')}
        >
          <VoiceText term={UI.back} showGloss={options.showGloss} />
        </button>

        <div className="reader-title">
          <p>{activeEntry.titleGreek}</p>
          {options.showGloss && <span>{activeEntry.reference}</span>}
        </div>

        {scriptureReading ? (
          <p className="reader-progress" aria-live="polite">
            {currentVerseIndex + 1} / {scriptureReading.verses.length}
          </p>
        ) : (
          <span />
        )}
      </header>

      {activeEntry.kind === 'prayer' ? (
        <article className="prayer-reader" lang="grc">
          <p className="prayer-section">{activeEntry.sectionGreek}</p>
          <h1>{activeEntry.titleGreek}</h1>
          <p className="prayer-text">{activeEntry.textGreek}</p>

          {options.showGloss && (
            <p className="prayer-gloss" lang="en">
              {activeEntry.textEnglish}
            </p>
          )}
        </article>
      ) : (
        <article className="scripture" lang="grc">
          <p className="reading-section">{activeEntry.sectionGreek}</p>
          <h1>{activeEntry.titleGreek}</h1>
          {options.showGloss && (
            <p className="reader-reference">{activeEntry.reference}</p>
          )}

          <div className="verse-list">
            {activeEntry.verses.map((verse, index) => (
              <p
                className={
                  index === currentVerseIndex
                    ? 'verse current-verse'
                    : 'verse'
                }
                id={verse.id}
                key={verse.id}
                ref={(element: HTMLParagraphElement | null) => {
                  verseElements.current[verse.id] = element
                }}
                onClick={() => setCurrentVerseIndex(index)}
              >
                <button
                  className="verse-number"
                  type="button"
                  aria-label={`Verse ${verse.number}`}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
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
      )}

      {scriptureReading && (
        <nav className="reader-navigation" aria-label="Reading navigation">
          <button
            className="navigation-button"
            type="button"
            disabled={currentVerseIndex === 0}
            onClick={() => moveToVerse(currentVerseIndex - 1)}
          >
            <VoiceText term={UI.back} showGloss={options.showGloss} />
          </button>

          <button
            className="navigation-button"
            type="button"
            disabled={
              currentVerseIndex === scriptureReading.verses.length - 1
            }
            onClick={() => moveToVerse(currentVerseIndex + 1)}
          >
            <VoiceText term={UI.next} showGloss={options.showGloss} />
          </button>
        </nav>
      )}
    </main>
  )
}

export default App
