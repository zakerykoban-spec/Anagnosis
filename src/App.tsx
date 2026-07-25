import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { VoiceText } from './components/VoiceText'
import {
  loadPsalm,
  resolveDailyOffice,
  weekdayTabs,
  weeklyPrayerCycle,
  type OfficeEntry,
  type ScriptureReading,
} from './data/dailyOffice'
import { mealPrayers } from './data/mealPrayers'
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

type OfficeDate = {
  iso: string
  greek: string
  english: string
  weekdayGreek: string
}

type MealIconKind = 'cup' | 'bread' | 'fish'

const OPTIONS_KEY = 'anagnosis.options.v1'
const POSITIONS_KEY = 'anagnosis.reading-positions.v1'

const GREEK_MONTHS = [
  'Ἰανουαρίου',
  'Φεβρουαρίου',
  'Μαρτίου',
  'Ἀπριλίου',
  'Μαΐου',
  'Ἰουνίου',
  'Ἰουλίου',
  'Αὐγούστου',
  'Σεπτεμβρίου',
  'Ὀκτωβρίου',
  'Νοεμβρίου',
  'Δεκεμβρίου',
] as const

const GREEK_WEEKDAYS = [
  'Κυριακή',
  'Δευτέρα',
  'Τρίτη',
  'Τετάρτη',
  'Πέμπτη',
  'Παρασκευή',
  'Σάββατον',
] as const

interface OfficeReadingButtonProps {
  entry: OfficeEntry
  showGloss: boolean
  onOpen: (entry: OfficeEntry) => void
}

function ScrollIcon() {
  return (
    <span className="scroll-icon" aria-hidden="true">
      <svg viewBox="0 0 28 28" role="presentation">
        <path d="M9 6.5h10a2.5 2.5 0 0 1 0 5H17.5v10H8.75a2.75 2.75 0 0 1 0-5.5H11V6.5" />
        <path d="M11 10h6.25M11 13.5h5.25M11 17h4.5" />
      </svg>
    </span>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  )
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      {dark ? (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
        </>
      ) : (
        <path d="M20 15.1A8 8 0 0 1 8.9 4a8 8 0 1 0 11.1 11.1Z" />
      )}
    </svg>
  )
}

function MealIcon({ kind }: { kind: MealIconKind }) {
  return (
    <span className="meal-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="presentation">
        {kind === 'cup' && (
          <>
            <path d="M10 6h12l-1.5 8.5a4.6 4.6 0 0 1-9 0L10 6Z" />
            <path d="M16 19v7M12.5 26h7" />
          </>
        )}

        {kind === 'bread' && (
          <>
            <path d="M7 19.5v-5.7c0-4.2 3.8-7.3 9-7.3s9 3.1 9 7.3v5.7c0 3.2-2.4 5.5-5.5 5.5h-7C9.4 25 7 22.7 7 19.5Z" />
            <path d="m12 11.5 1.8 2M16 10.2l1.6 2.2M20 11.5l-1.8 2" />
          </>
        )}

        {kind === 'fish' && (
          <>
            <path d="M7 16c3.4-5 8.4-7.4 14-6.5l4-3v7.2l-4-3.2c-5.6-.9-10.6 1.5-14 5.5Z" />
            <path d="M7 16c3.4 5 8.4 7.4 14 6.5l4 3v-7.2l-4 3.2C15.4 22.4 10.4 20 7 16Z" />
            <circle cx="13" cy="14" r=".9" />
          </>
        )}
      </svg>
    </span>
  )
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
      <ScrollIcon />

      <span className="office-reading-copy">
        <VoiceText
          term={{
            greek: entry.sectionGreek,
            english: entry.sectionEnglish,
          }}
          showGloss={showGloss}
        />

        <span className="office-reading-title">{entry.titleGreek}</span>

        <span className="office-reading-reference">{entry.reference}</span>
      </span>

      <span className="office-reading-disclosure" aria-hidden="true">›</span>
    </button>
  )
}

function MealPrayerDock({
  showGloss,
  onOpen,
}: {
  showGloss: boolean
  onOpen: (entry: OfficeEntry) => void
}) {
  const icons: MealIconKind[] = ['cup', 'bread', 'fish']
  const labels = [
    { greek: 'Ποτήριον', english: 'Cup' },
    { greek: 'Κλάσμα', english: 'Bread' },
    { greek: 'Μετὰ τροφήν', english: 'After food' },
  ]

  return (
    <section className="meal-prayers" aria-labelledby="meal-prayers-title">
      <div className="meal-prayers-heading" id="meal-prayers-title">
        <span>Εὐχαριστίαι τραπέζης</span>
        {showGloss && <small>Meal prayers</small>}
      </div>

      <nav className="meal-prayer-dock" aria-label="Meal prayers">
        {mealPrayers.map((prayer, index) => (
          <button
            className="meal-prayer-button"
            type="button"
            key={prayer.id}
            onClick={() => onOpen(prayer)}
            aria-label={
              showGloss
                ? `${prayer.titleGreek}, ${prayer.sectionEnglish}`
                : prayer.titleGreek
            }
          >
            <MealIcon kind={icons[index]} />
            <span className="meal-prayer-label">
              <span>{labels[index].greek}</span>
              {showGloss && <small>{labels[index].english}</small>}
            </span>
          </button>
        ))}
      </nav>
    </section>
  )
}

const DEFAULT_OPTIONS: ReaderOptions = {
  showGloss: true,
  darkMode: false,
  showProgressive: true,
  showChallenge: true,
  showPsalm: true,
}

function formatDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatOfficeDate(date: Date): OfficeDate {
  const iso = [
    date.getFullYear(),
    formatDatePart(date.getMonth() + 1),
    formatDatePart(date.getDate()),
  ].join('-')

  return {
    iso,
    greek: `${date.getDate()} ${GREEK_MONTHS[date.getMonth()]}`,
    english: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date),
    weekdayGreek: GREEK_WEEKDAYS[date.getDay()],
  }
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
  const today = useMemo(() => new Date(), [])
  const officeDate = useMemo(() => formatOfficeDate(today), [today])
  const office = useMemo(() => resolveDailyOffice(today), [today])
  const [view, setView] = useState<AppView>('office')
  const [options, setOptions] = useState<ReaderOptions>(() => loadOptions())
  const [activeEntry, setActiveEntry] = useState<OfficeEntry | null>(null)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [psalmReading, setPsalmReading] = useState<ScriptureReading | null>(null)
  const [psalmError, setPsalmError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedWeekday, setSelectedWeekday] = useState(today.getDay())
  const verseElements = useRef<Record<string, HTMLElement | null>>({})
  const menuTrigger = useRef<HTMLButtonElement | null>(null)
  const menuPanel = useRef<HTMLElement | null>(null)

  const scriptureReading =
    activeEntry?.kind === 'scripture' ? activeEntry : null
  const currentVerse = scriptureReading?.verses[currentVerseIndex]

  useEffect(() => {
    window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(options))
    document.documentElement.dataset.theme = options.darkMode ? 'dark' : 'light'
  }, [options])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        window.requestAnimationFrame(() => menuTrigger.current?.focus())
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => {
      menuPanel.current?.querySelector<HTMLInputElement>('input')?.focus()
    })

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

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
        behavior: 'smooth',
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

    if (entry.id.startsWith('weekday-prayer:')) {
      setSelectedWeekday(today.getDay())
    }

    setActiveEntry(entry)
    setView('reader')
  }

  function previewWeekday(weekday: number) {
    setSelectedWeekday(weekday)
    setActiveEntry(weeklyPrayerCycle[weekday])
  }

  function closeMenu() {
    setMenuOpen(false)
    window.requestAnimationFrame(() => menuTrigger.current?.focus())
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
          <header className="office-toolbar">
            <button
              className="icon-button"
              type="button"
              ref={menuTrigger}
              aria-label="Ἐπιλογαί"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>

            <div className="office-identity">
              <p className="app-name">Ἀνάγνωσις</p>
              <time className="toolbar-date" dateTime={officeDate.iso}>
                <span>{officeDate.weekdayGreek}</span>
                <span aria-hidden="true">·</span>
                <span>{officeDate.greek}</span>
              </time>
              {options.showGloss && (
                <span className="calendar-english">{officeDate.english}</span>
              )}
            </div>

            <button
              className="icon-button"
              type="button"
              aria-label={
                options.darkMode
                  ? 'Χρῆσαι φωτεινῇ ὄψει'
                  : 'Χρῆσαι σκοτεινῇ ὄψει'
              }
              onClick={() => updateOption('darkMode', !options.darkMode)}
            >
              <ThemeIcon dark={options.darkMode} />
            </button>
          </header>

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

          <MealPrayerDock
            showGloss={options.showGloss}
            onOpen={openEntry}
          />

          <p className="source-note">
            SBLGNT 1.2 · CC BY 4.0 · LXX Swete / First1KGreek · CC BY-SA 4.0 · Διδαχὴ 9–10 · public domain
          </p>
        </section>

        {menuOpen && (
          <div
            className="options-backdrop"
            role="presentation"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                closeMenu()
              }
            }}
          >
            <section
              className="options-menu"
              ref={menuPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="options-title"
            >
              <header className="options-menu-header">
                <h2 id="options-title">
                  <VoiceText
                    term={UI.options}
                    showGloss={options.showGloss}
                  />
                </h2>
                <button
                  className="options-close"
                  type="button"
                  aria-label="Κλεῖσον"
                  onClick={closeMenu}
                >
                  ×
                </button>
              </header>

              <div className="options-list">
                {[
                  {
                    key: 'showGloss',
                    term: UI.englishAids,
                  },
                  {
                    key: 'showProgressive',
                    term: UI.progressiveReading,
                  },
                  {
                    key: 'showChallenge',
                    term: UI.challengeReading,
                  },
                  {
                    key: 'showPsalm',
                    term: UI.psalm,
                  },
                ].map(({ key, term }) => {
                  const optionKey = key as Exclude<
                    keyof ReaderOptions,
                    'darkMode'
                  >

                  return (
                    <label className="option-switch" key={key}>
                      <VoiceText
                        term={term}
                        showGloss={options.showGloss}
                      />
                      <input
                        type="checkbox"
                        checked={options[optionKey]}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateOption(optionKey, event.target.checked)
                        }
                      />
                      <span className="switch-track" aria-hidden="true" />
                    </label>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    )
  }

  if (!activeEntry) {
    return null
  }

  const isWeekdayPrayer =
    activeEntry.kind === 'prayer' &&
    activeEntry.id.startsWith('weekday-prayer:')

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

          {isWeekdayPrayer && (
            <nav
              className="weekday-tabs"
              aria-label="Ἡμέραι προσευχῆς"
            >
              {weekdayTabs.map((day, index) => (
                <button
                  className={[
                    'weekday-tab',
                    index === selectedWeekday ? 'is-selected' : '',
                    index === today.getDay() ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  type="button"
                  key={day.short}
                  aria-label={`${day.greek}${index === today.getDay() ? ', σήμερον' : ''}`}
                  aria-pressed={index === selectedWeekday}
                  onClick={() => previewWeekday(index)}
                >
                  {day.short}
                </button>
              ))}
            </nav>
          )}

          <div className="prayer-meta">
            {activeEntry.weekdayGreek && (
              <p className="prayer-weekday">{activeEntry.weekdayGreek}</p>
            )}
            <h1 className="prayer-name">{activeEntry.titleGreek}</h1>
            <p className="prayer-reference">{activeEntry.reference}</p>
          </div>

          <p className="prayer-text">{activeEntry.textGreek}</p>

          {activeEntry.traditionalEnding && (
            <aside className="traditional-ending">
              <p className="traditional-ending-label">
                {activeEntry.traditionalEnding.labelGreek}
                {options.showGloss && (
                  <span lang="en">
                    {activeEntry.traditionalEnding.labelEnglish}
                  </span>
                )}
              </p>
              <p>{activeEntry.traditionalEnding.textGreek}</p>
            </aside>
          )}

          {options.showGloss && (
            <p className="prayer-gloss" lang="en">
              {activeEntry.textEnglish}
              {activeEntry.traditionalEnding && (
                <>
                  <br />
                  {activeEntry.traditionalEnding.textEnglish}
                </>
              )}
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
            className="navigation-button navigation-button-back"
            type="button"
            disabled={currentVerseIndex === 0}
            onClick={() => moveToVerse(currentVerseIndex - 1)}
          >
            <span className="navigation-arrow" aria-hidden="true">‹</span>
            <VoiceText term={UI.back} showGloss={options.showGloss} />
          </button>

          <button
            className="navigation-button navigation-button-next"
            type="button"
            disabled={
              currentVerseIndex === scriptureReading.verses.length - 1
            }
            onClick={() => moveToVerse(currentVerseIndex + 1)}
          >
            <VoiceText term={UI.next} showGloss={options.showGloss} />
            <span className="navigation-arrow" aria-hidden="true">›</span>
          </button>
        </nav>
      )}
    </main>
  )
}

export default App
