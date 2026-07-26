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
import {
  completeStreamAssignment,
  isDailySectionMarked,
  loadProgress,
  markDailySection,
  saveProgress,
  updateStreamPosition,
  type ReadingProgressState,
  type ReadingStreamId,
} from './readingProgress'
import { UI } from './ui/lexicon'
import './App.css'
import './pass1.css'

type AppView = 'office' | 'reader'

type ReaderOptions = {
  showGloss: boolean
  darkMode: boolean
  showProgressive: boolean
  showChallenge: boolean
  showPsalm: boolean
}

type OfficeDate = {
  iso: string
  greek: string
  english: string
  weekdayGreek: string
}

type MealIconKind = 'cup' | 'bread' | 'table'
type OfficeIconKind = 'prayer' | 'codex' | 'lamp' | 'lyre' | 'lampstand'

const OPTIONS_KEY = 'anagnosis.options.v1'
const OFFICE_START = new Date(2026, 6, 25)
const PSALM_COUNT = 150

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
    return stored
      ? { ...DEFAULT_OPTIONS, ...(JSON.parse(stored) as Partial<ReaderOptions>) }
      : DEFAULT_OPTIONS
  } catch {
    return DEFAULT_OPTIONS
  }
}

function dateForAssignment(index: number) {
  const date = new Date(OFFICE_START)
  date.setDate(date.getDate() + index)
  return date
}

function streamForEntry(entry: OfficeEntry | null): ReadingStreamId | null {
  if (!entry || entry.kind !== 'scripture') return null
  if (entry.id.startsWith('progressive:')) return 'progressive'
  if (entry.id.startsWith('challenge:')) return 'challenge'
  if (entry.id.startsWith('psalm:')) return 'psalm'
  return null
}

function OfficeIcon({ kind }: { kind: OfficeIconKind }) {
  return (
    <span className={`office-icon office-icon-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" role="presentation">
        {kind === 'prayer' && (
          <>
            <path d="M15.8 5.2c-1.4.8-2.3 2.4-3.1 4.2l-3.2 7.3c-.8 1.9-2.1 3.4-4 4.8l4.7 5.1c2.6-2.2 4.4-4.9 5.8-8.2" />
            <path d="M16.2 5.2c1.4.8 2.3 2.4 3.1 4.2l3.2 7.3c.8 1.9 2.1 3.4 4 4.8l-4.7 5.1c-2.6-2.2-4.4-4.9-5.8-8.2" />
            <path d="M16 5.2v13.2M12.7 9.4l3.3 9M19.3 9.4l-3.3 9M7.4 23.4l4.6 4.2M24.6 23.4 20 27.6" />
          </>
        )}
        {kind === 'codex' && (
          <>
            <path d="M4.5 7.5c4.4-1.3 8.2-.5 11.5 2.2v16c-3.3-2.7-7.1-3.5-11.5-2.2v-16ZM27.5 7.5c-4.4-1.3-8.2-.5-11.5 2.2v16c3.3-2.7 7.1-3.5 11.5-2.2v-16Z" />
            <path d="M8 11.5c2.1-.2 3.8.2 5.4 1.2M19 12.7c1.6-1 3.3-1.4 5.4-1.2M8 15.5c2.1-.2 3.8.2 5.4 1.2M19 16.7c1.6-1 3.3-1.4 5.4-1.2" />
          </>
        )}
        {kind === 'lamp' && (
          <>
            <path d="M7 18.5c4.4-4.8 10.8-6.6 18-4.3-1.1 5.7-5.3 9.3-11.5 9.3H8.2L7 18.5Z" />
            <path d="M23.2 14.1c1.6-2.7 3.2-4.4 4.8-5.1M14 23.5v3M9.5 26.5h9" />
            <path className="office-icon-flame" d="M27.8 8.8c-2.3-1.5-2.1-3.6-.2-5.3 1.3 2 .9 3.7.2 5.3Z" />
          </>
        )}
        {kind === 'lyre' && (
          <>
            <path d="M9 5.5c-1.2 6.3-.8 12.6 2 18.5M23 5.5c1.2 6.3.8 12.6-2 18.5M11 24c3.1 2.2 6.9 2.2 10 0M9.5 9.5c4.2 2.2 8.8 2.2 13 0" />
            <path d="M13 10.8v13.7M16 11v14.7M19 10.8v13.7" />
          </>
        )}
        {kind === 'lampstand' && (
          <>
            <path d="M16 7v18M10 25h12M12.5 28h7M16 13c-4.5 0-7.5-2.4-7.5-6M16 18c-6.7 0-11-3-11-8M16 13c4.5 0 7.5-2.4 7.5-6M16 18c6.7 0 11-3 11-8" />
            <path d="M5 7h3M8.5 4.5c-1.5-1.2-1.4-2.5 0-3.5 1 1.3.7 2.4 0 3.5ZM12.5 5h7M16 3.5c-1.5-1.2-1.4-2.5 0-3.5 1 1.3.7 2.4 0 3.5ZM23.5 4.5c-1.5-1.2-1.4-2.5 0-3.5 1 1.3.7 2.4 0 3.5ZM24 7h3" />
          </>
        )}
      </svg>
    </span>
  )
}

function Seal({ complete }: { complete: boolean }) {
  return (
    <span
      className={`completion-seal${complete ? ' is-complete' : ''}`}
      aria-label={complete ? 'Πεπλήρωται' : 'Οὔπω πεπλήρωται'}
      title={complete ? 'Completed' : 'Not completed'}
    >
      <span aria-hidden="true" />
    </span>
  )
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {dark ? (
        <><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>
      ) : <path d="M20 15.1A8 8 0 0 1 8.9 4a8 8 0 1 0 11.1 11.1Z" />}
    </svg>
  )
}

function MealIcon({ kind }: { kind: MealIconKind }) {
  return (
    <span className="meal-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        {kind === 'cup' && <><path d="M10 6h12l-1.5 8.5a4.6 4.6 0 0 1-9 0L10 6Z" /><path d="M16 19v7M12.5 26h7" /></>}
        {kind === 'bread' && <><path d="M7 19.5v-5.7c0-4.2 3.8-7.3 9-7.3s9 3.1 9 7.3v5.7c0 3.2-2.4 5.5-5.5 5.5h-7C9.4 25 7 22.7 7 19.5Z" /><path d="m12 11.5 1.8 2M16 10.2l1.6 2.2M20 11.5l-1.8 2" /></>}
        {kind === 'table' && <><path d="M5 18h22M8 18v9M24 18v9" /><path d="M8.5 16.5c.5-3 2.4-4.8 5-4.8s4.5 1.8 5 4.8M11.5 13.1l1.3 1.5M15 12.1l1.1 1.6" /><path d="M21 9.5h5l-.7 4a2 2 0 0 1-3.9 0l-.4-4ZM23.5 15.5v2.5" /></>}
      </svg>
    </span>
  )
}

function OfficeReadingButton({ entry, icon, showGloss, complete, onOpen }: {
  entry: OfficeEntry
  icon: OfficeIconKind
  showGloss: boolean
  complete: boolean
  onOpen: (entry: OfficeEntry) => void
}) {
  return (
    <button className="office-reading" type="button" onClick={() => onOpen(entry)}>
      <OfficeIcon kind={icon} />
      <span className="office-reading-copy">
        <VoiceText term={{ greek: entry.sectionGreek, english: entry.sectionEnglish }} showGloss={showGloss} />
        <span className="office-reading-title">{entry.titleGreek}</span>
        <span className="office-reading-reference">{entry.reference}</span>
      </span>
      <Seal complete={complete} />
      <span className="office-reading-disclosure" aria-hidden="true">›</span>
    </button>
  )
}

function MealPrayerDock({ showGloss, onOpen }: { showGloss: boolean; onOpen: (entry: OfficeEntry) => void }) {
  const icons: MealIconKind[] = ['cup', 'bread', 'table']
  const labels = [
    { greek: 'Ποτήριον', english: 'Cup' },
    { greek: 'Κλάσμα', english: 'Bread' },
    { greek: 'Μετὰ τροφήν', english: 'After food' },
  ]

  return (
    <section className="meal-prayers" aria-labelledby="meal-prayers-title">
      <div className="meal-prayers-heading" id="meal-prayers-title"><span>Εὐχαριστίαι τραπέζης</span>{showGloss && <small>Meal prayers</small>}</div>
      <nav className="meal-prayer-dock" aria-label="Meal prayers">
        {mealPrayers.map((prayer, index) => (
          <button className="meal-prayer-button" type="button" key={prayer.id} onClick={() => onOpen(prayer)}>
            <MealIcon kind={icons[index]} />
            <span className="meal-prayer-label"><span>{labels[index].greek}</span>{showGloss && <small>{labels[index].english}</small>}</span>
          </button>
        ))}
      </nav>
    </section>
  )
}

function App() {
  const today = useMemo(() => new Date(), [])
  const officeDate = useMemo(() => formatOfficeDate(today), [today])
  const calendarOffice = useMemo(() => resolveDailyOffice(today), [today])
  const [view, setView] = useState<AppView>('office')
  const [options, setOptions] = useState<ReaderOptions>(() => loadOptions())
  const [progress, setProgress] = useState<ReadingProgressState>(() => loadProgress())
  const [activeEntry, setActiveEntry] = useState<OfficeEntry | null>(null)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [psalmReading, setPsalmReading] = useState<ScriptureReading | null>(null)
  const [psalmError, setPsalmError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedWeekday, setSelectedWeekday] = useState(today.getDay())
  const verseElements = useRef<Record<string, HTMLElement | null>>({})
  const menuTrigger = useRef<HTMLButtonElement | null>(null)

  const progressiveReading = useMemo(
    () => resolveDailyOffice(dateForAssignment(progress.streams.progressive.assignmentIndex)).progressiveReading,
    [progress.streams.progressive.assignmentIndex],
  )
  const challengeReading = useMemo(
    () => resolveDailyOffice(dateForAssignment(progress.streams.challenge.assignmentIndex)).challengeReading,
    [progress.streams.challenge.assignmentIndex],
  )
  const psalmNumber = (progress.streams.psalm.assignmentIndex % PSALM_COUNT) + 1
  const scriptureReading = activeEntry?.kind === 'scripture' ? activeEntry : null
  const currentVerse = scriptureReading?.verses[currentVerseIndex]
  const activeStream = streamForEntry(activeEntry)

  useEffect(() => {
    window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(options))
    document.documentElement.dataset.theme = options.darkMode ? 'dark' : 'light'
  }, [options])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    if (!options.showPsalm) return
    let cancelled = false
    setPsalmReading(null)
    loadPsalm(psalmNumber)
      .then((reading) => {
        if (!cancelled) {
          setPsalmReading(reading)
          setPsalmError(null)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setPsalmError(error instanceof Error ? error.message : 'Unable to load the Psalm.')
      })
    return () => { cancelled = true }
  }, [options.showPsalm, psalmNumber])

  useEffect(() => {
    if (view !== 'reader' || !scriptureReading || !currentVerse || !activeStream) return
    setProgress((current) => updateStreamPosition(current, activeStream, currentVerse.id))
  }, [activeStream, currentVerse, scriptureReading, view])

  useEffect(() => {
    if (view !== 'reader' || !scriptureReading) return
    const verse = scriptureReading.verses[currentVerseIndex]
    window.requestAnimationFrame(() => verseElements.current[verse.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [currentVerseIndex, scriptureReading, view])

  function openEntry(entry: OfficeEntry) {
    const stream = streamForEntry(entry)
    if (entry.kind === 'scripture' && stream) {
      const savedVerseId = progress.streams[stream].lastVerseId
      const savedIndex = entry.verses.findIndex((verse) => verse.id === savedVerseId)
      setCurrentVerseIndex(Math.max(0, savedIndex))
    } else {
      setCurrentVerseIndex(0)
    }
    if (entry.id.startsWith('weekday-prayer:')) setSelectedWeekday(today.getDay())
    setActiveEntry(entry)
    setView('reader')
  }

  function previewWeekday(weekday: number) {
    setSelectedWeekday(weekday)
    setActiveEntry(weeklyPrayerCycle[weekday])
  }

  function moveToVerse(nextIndex: number) {
    if (!scriptureReading) return
    setCurrentVerseIndex(Math.min(Math.max(nextIndex, 0), scriptureReading.verses.length - 1))
  }

  function completeActiveEntry() {
    if (!activeEntry) return
    if (activeStream) {
      setProgress((current) => {
        const completed = completeStreamAssignment(current, activeStream, activeEntry.id)
        return markDailySection(completed, officeDate.iso, activeStream)
      })
    } else if (activeEntry.kind === 'prayer' && !activeEntry.id.startsWith('meal:')) {
      setProgress((current) => markDailySection(current, officeDate.iso, activeEntry.id))
    }
  }

  function proceed() {
    if (!activeStream) return
    const nextEntry = activeStream === 'progressive'
      ? resolveDailyOffice(dateForAssignment(progress.streams.progressive.assignmentIndex)).progressiveReading
      : activeStream === 'challenge'
        ? resolveDailyOffice(dateForAssignment(progress.streams.challenge.assignmentIndex)).challengeReading
        : psalmReading
    if (nextEntry) openEntry(nextEntry)
  }

  function updateOption<Key extends keyof ReaderOptions>(key: Key, value: ReaderOptions[Key]) {
    setOptions((current) => ({ ...current, [key]: value }))
  }

  const markedToday = (id: string) => isDailySectionMarked(progress, officeDate.iso, id)

  if (view === 'office') {
    return (
      <main className="office-shell">
        <section className="office-card" aria-labelledby="office-title">
          <header className="office-toolbar">
            <button className="icon-button" type="button" ref={menuTrigger} aria-label="Ἐπιλογαί" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><MenuIcon /></button>
            <div className="office-identity">
              <p className="app-name">Ἀνάγνωσις</p>
              <time className="toolbar-date" dateTime={officeDate.iso}><span>{officeDate.weekdayGreek}</span><span aria-hidden="true">·</span><span>{officeDate.greek}</span></time>
              {options.showGloss && <span className="calendar-english">{officeDate.english}</span>}
            </div>
            <button className="icon-button" type="button" aria-label={options.darkMode ? 'Χρῆσαι φωτεινῇ ὄψει' : 'Χρῆσαι σκοτεινῇ ὄψει'} onClick={() => updateOption('darkMode', !options.darkMode)}><ThemeIcon dark={options.darkMode} /></button>
          </header>

          <header className="office-heading" id="office-title"><VoiceText term={UI.todaysReading} showGloss={options.showGloss} /></header>

          <div className="office-list">
            <OfficeReadingButton entry={calendarOffice.openingPrayer} icon="prayer" showGloss={options.showGloss} complete={markedToday(calendarOffice.openingPrayer.id)} onOpen={openEntry} />
            {options.showProgressive && <OfficeReadingButton entry={progressiveReading} icon="codex" showGloss={options.showGloss} complete={markedToday('progressive')} onOpen={openEntry} />}
            {options.showChallenge && <OfficeReadingButton entry={challengeReading} icon="lamp" showGloss={options.showGloss} complete={markedToday('challenge')} onOpen={openEntry} />}
            {options.showPsalm && (psalmReading
              ? <OfficeReadingButton entry={psalmReading} icon="lyre" showGloss={options.showGloss} complete={markedToday('psalm')} onOpen={openEntry} />
              : <div className="office-reading office-reading-status"><span>{psalmError ?? `Ψαλμὸς ${psalmNumber}…`}</span></div>)}
            <OfficeReadingButton entry={calendarOffice.closingPrayer} icon="lampstand" showGloss={options.showGloss} complete={markedToday(calendarOffice.closingPrayer.id)} onOpen={openEntry} />
          </div>

          <MealPrayerDock showGloss={options.showGloss} onOpen={openEntry} />
          <p className="source-note">SBLGNT 1.2 · CC BY 4.0 · LXX Swete / First1KGreek · CC BY-SA 4.0 · Διδαχὴ 9–10 and traditional Greek prayers · public domain</p>
        </section>

        {menuOpen && (
          <div className="options-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false) }}>
            <section className="options-menu" role="dialog" aria-modal="true" aria-labelledby="options-title">
              <header className="options-menu-header"><h2 id="options-title"><VoiceText term={UI.options} showGloss={options.showGloss} /></h2><button className="options-close" type="button" aria-label="Κλεῖσον" onClick={() => setMenuOpen(false)}>×</button></header>
              <div className="options-list">
                {[
                  { key: 'showGloss', term: UI.englishAids },
                  { key: 'showProgressive', term: UI.progressiveReading },
                  { key: 'showChallenge', term: UI.challengeReading },
                  { key: 'showPsalm', term: UI.psalm },
                ].map(({ key, term }) => {
                  const optionKey = key as Exclude<keyof ReaderOptions, 'darkMode'>
                  return <label className="option-switch" key={key}><VoiceText term={term} showGloss={options.showGloss} /><input type="checkbox" checked={options[optionKey]} onChange={(event: ChangeEvent<HTMLInputElement>) => updateOption(optionKey, event.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    )
  }

  if (!activeEntry) return null

  const isWeekdayPrayer = activeEntry.kind === 'prayer' && activeEntry.id.startsWith('weekday-prayer:')
  const isMealPrayer = activeEntry.id.startsWith('meal:')
  const isMarked = activeStream ? markedToday(activeStream) : markedToday(activeEntry.id)

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <button className="text-button" type="button" onClick={() => setView('office')}><VoiceText term={UI.back} showGloss={options.showGloss} /></button>
        <div className="reader-title"><p>{activeEntry.titleGreek}</p>{options.showGloss && <span>{activeEntry.reference}</span>}</div>
        {scriptureReading ? <p className="reader-progress" aria-live="polite">{currentVerseIndex + 1} / {scriptureReading.verses.length}</p> : <span />}
      </header>

      {activeEntry.kind === 'prayer' ? (
        <article className="prayer-reader" lang="grc">
          <p className="prayer-section">{activeEntry.sectionGreek}</p>
          {isWeekdayPrayer && <nav className="weekday-tabs" aria-label="Ἡμέραι προσευχῆς">{weekdayTabs.map((day, index) => <button className={['weekday-tab', index === selectedWeekday ? 'is-selected' : '', index === today.getDay() ? 'is-today' : ''].filter(Boolean).join(' ')} type="button" key={day.short} aria-pressed={index === selectedWeekday} onClick={() => previewWeekday(index)}>{day.short}</button>)}</nav>}
          <div className="prayer-meta">{activeEntry.weekdayGreek && <p className="prayer-weekday">{activeEntry.weekdayGreek}</p>}<h1 className="prayer-name">{activeEntry.titleGreek}</h1><p className="prayer-reference">{activeEntry.reference}</p></div>
          <p className="prayer-text">{activeEntry.textGreek}</p>
          {activeEntry.traditionalEnding && <aside className="traditional-ending"><p className="traditional-ending-label">{activeEntry.traditionalEnding.labelGreek}{options.showGloss && <span lang="en">{activeEntry.traditionalEnding.labelEnglish}</span>}</p><p>{activeEntry.traditionalEnding.textGreek}</p></aside>}
          {options.showGloss && <p className="prayer-gloss" lang="en">{activeEntry.textEnglish}{activeEntry.traditionalEnding && <><br />{activeEntry.traditionalEnding.textEnglish}</>}</p>}
        </article>
      ) : (
        <article className="scripture" lang="grc">
          <p className="reading-section">{activeEntry.sectionGreek}</p><h1>{activeEntry.titleGreek}</h1>{options.showGloss && <p className="reader-reference">{activeEntry.reference}</p>}
          <div className="verse-list">{activeEntry.verses.map((verse, index) => <p className={index === currentVerseIndex ? 'verse current-verse' : 'verse'} id={verse.id} key={verse.id} ref={(element: HTMLParagraphElement | null) => { verseElements.current[verse.id] = element }} onClick={() => setCurrentVerseIndex(index)}><button className="verse-number" type="button" aria-label={`Verse ${verse.number}`} onClick={(event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); moveToVerse(index) }}>{verse.number}</button><span>{verse.displayText}</span></p>)}</div>
        </article>
      )}

      {!isMealPrayer && (
        <div className="completion-actions">
          {!isMarked ? <button className="completion-button" type="button" onClick={completeActiveEntry}><Seal complete={false} /><span>Σφράγισον</span>{options.showGloss && <small>Mark complete</small>}</button> : <div className="completion-confirmed"><Seal complete /><span>Πεπλήρωται</span></div>}
          {isMarked && activeStream && <button className="proceed-button" type="button" onClick={proceed}><span>Πρόβαινε</span><span aria-hidden="true">›</span></button>}
          {isMarked && <button className="home-button" type="button" onClick={() => setView('office')}><span aria-hidden="true">⌂</span><span>Οἶκος</span></button>}
        </div>
      )}

      {scriptureReading && !isMarked && (
        <nav className="reader-navigation" aria-label="Reading navigation">
          <button className="navigation-button navigation-button-back" type="button" disabled={currentVerseIndex === 0} onClick={() => moveToVerse(currentVerseIndex - 1)}><span className="navigation-arrow" aria-hidden="true">‹</span><VoiceText term={UI.back} showGloss={options.showGloss} /></button>
          <button className="navigation-button navigation-button-next" type="button" disabled={currentVerseIndex === scriptureReading.verses.length - 1} onClick={() => moveToVerse(currentVerseIndex + 1)}><VoiceText term={UI.next} showGloss={options.showGloss} /><span className="navigation-arrow" aria-hidden="true">›</span></button>
        </nav>
      )}
    </main>
  )
}

export default App
