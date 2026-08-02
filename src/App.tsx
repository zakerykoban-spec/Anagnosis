import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { VoiceText } from './components/VoiceText'
import { HelpPanel } from './components/HelpPanel'
import { LexicalPopup } from './components/LexicalPopup'
import { LexicalWord } from './components/LexicalWord'
import {
  ReaderReferenceNavigator,
  type ReaderNavigatorSelection,
} from './components/ReaderReferenceNavigator'
import {
  loadPsalm,
  resolveDailyOffice,
  weekdayTabs,
  weeklyPrayerCycle,
  type OfficeEntry,
  type ScriptureReading,
  type ScriptureVerse,
} from './data/dailyOffice'
import { mealPrayers } from './data/mealPrayers'
import {
  readingContentsItems,
  type ReadHistoryCandidates,
  type ReadingContentsItem,
} from './readHistory'
import {
  remembersVersePosition,
  restoredVerseIndex,
} from './readingNavigation'
import {
  completeStreamAssignment,
  isDailySectionMarked,
  loadProgress,
  markDailySection,
  readingPlanKey,
  restartReadingPlan,
  saveProgress,
  selectStreamAssignment,
  switchReadingPlan,
  undoLastStreamCompletion,
  unmarkDailySection,
  updateStreamPosition,
  type ReadingProgressState,
  type ReadingPlanSelection,
  type ReadingPlanStreamId,
  type ReadingStreamId,
} from './readingProgress'
import { buildReadingPlan } from './readingPlans'
import {
  bookIdFromVerseId,
  buildReadingWithContinuation,
} from './readerContinuity'
import {
  bookForCorpus,
  booksForCorpus,
  chapterNumbers,
  type ScriptureBookOption,
  type ScriptureCorpusId,
} from './scriptureCatalog'
import {
  loadLxxChapter,
  loadSblgntChapter,
  loadScriptureBook,
} from './scriptureLibrary'
import type { ScriptureReferencePart } from './models/scripture'
import {
  lexicalAssistanceApplies,
  lexicalWordsForVerse,
  type LexicalWordInfo,
  type NtLexicalBook,
} from './models/lexical'
import { loadSblgntLexicalBook } from './stepLexicalLibrary'
import { UI } from './ui/lexicon'
import altarBanner from './assets/banners/banner-altar.webp'
import afterMealBanner from './assets/banners/banner-meal-after.webp'
import mealBanner from './assets/banners/banner-meal-before.webp'
import psalmBanner from './assets/banners/banner-psalm.webp'
import breadIcon from './assets/icons/icon-bread.png'
import codexIcon from './assets/icons/icon-codex.png'
import cupIcon from './assets/icons/icon-cup.png'
import lampIcon from './assets/icons/icon-lamp.png'
import lyreIcon from './assets/icons/icon-lyre.png'
import plateIcon from './assets/icons/icon-after-food.png'
import freeReadingIcon from './assets/icons/free_reading.png'
import prayerHandsIcon from './assets/icons/icon-prayer.png'
import scrollIcon from './assets/icons/icon-scroll.png'
import sealMarkIcon from './assets/icons/seal-pending.png'
import waxSealIcon from './assets/icons/seal-complete.png'
import './App.css'
import './pass1.css'
import './pass2.css'
import './pass3.css'
import './artwork.css'
import './lexical.css'
import './reader-navigation.css'

type AppView = 'office' | 'reader'
type ReaderOptions = { showGloss: boolean; showProgressive: boolean; showChallenge: boolean; showPsalm: boolean }
type MealIconKind = 'cup' | 'bread' | 'table'
type OfficeIconKind = 'prayer' | 'codex' | 'lamp' | 'lyre' | 'lampstand'
type OfficeDate = { iso: string; day: number; monthGreek: string; year: number; english: string; weekdayGreek: string }
type ReaderBannerKind = 'altar' | 'meal' | 'after-meal' | 'psalm'
type ScriptureBrowserView = 'books' | 'chapters'
type LoadedReadingPlan = {
  key: string
  readings: ScriptureReading[]
  loading: boolean
  error: string | null
}
type FreeReadingLocation = {
  corpus: ScriptureCorpusId
  bookId: string
  chapter: ScriptureReferencePart
  verseId: string
}
type LoadedLexicalBook = {
  bookId: string
  data: NtLexicalBook | null
}

const OPTIONS_KEY = 'anagnosis.options.v1'
const FREE_READING_LOCATION_KEY = 'anagnosis.free-reading-location.v1'
const PSALM_COUNT = 150
const GREEK_MONTHS = ['Ἰανουαρίου','Φεβρουαρίου','Μαρτίου','Ἀπριλίου','Μαΐου','Ἰουνίου','Ἰουλίου','Αὐγούστου','Σεπτεμβρίου','Ὀκτωβρίου','Νοεμβρίου','Δεκεμβρίου'] as const
const GREEK_WEEKDAYS = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατον'] as const
const DEFAULT_OPTIONS: ReaderOptions = { showGloss: true, showProgressive: true, showChallenge: true, showPsalm: true }
const OFFICE_ICONS: Record<OfficeIconKind, string> = {
  prayer: prayerHandsIcon,
  codex: codexIcon,
  lamp: lampIcon,
  lyre: lyreIcon,
  lampstand: scrollIcon,
}
const MEAL_ICONS: Record<MealIconKind, string> = {
  cup: cupIcon,
  bread: breadIcon,
  table: plateIcon,
}
const READER_BANNERS: Record<ReaderBannerKind, string> = {
  altar: altarBanner,
  meal: mealBanner,
  'after-meal': afterMealBanner,
  psalm: psalmBanner,
}
function formatOfficeDate(date: Date): OfficeDate {
  const iso = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  return {
    iso,
    day: date.getDate(),
    monthGreek: GREEK_MONTHS[date.getMonth()],
    year: date.getFullYear(),
    english: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date),
    weekdayGreek: GREEK_WEEKDAYS[date.getDay()],
  }
}

function loadOptions(): ReaderOptions {
  try {
    const stored = localStorage.getItem(OPTIONS_KEY)
    const parsed = stored
      ? JSON.parse(stored) as Partial<ReaderOptions>
      : {}

    return {
      showGloss: parsed.showGloss ?? DEFAULT_OPTIONS.showGloss,
      showProgressive: parsed.showProgressive ?? DEFAULT_OPTIONS.showProgressive,
      showChallenge: parsed.showChallenge ?? DEFAULT_OPTIONS.showChallenge,
      showPsalm: parsed.showPsalm ?? DEFAULT_OPTIONS.showPsalm,
    }
  } catch { return DEFAULT_OPTIONS }
}

function loadFreeReadingLocation(): FreeReadingLocation | null {
  try {
    const stored = localStorage.getItem(FREE_READING_LOCATION_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<FreeReadingLocation>
    if (
      (parsed.corpus !== 'sblgnt' && parsed.corpus !== 'lxx')
      || typeof parsed.bookId !== 'string'
      || (typeof parsed.chapter !== 'string' && typeof parsed.chapter !== 'number')
      || typeof parsed.verseId !== 'string'
    ) return null
    return parsed as FreeReadingLocation
  } catch { return null }
}

function saveFreeReadingLocation(location: FreeReadingLocation) {
  localStorage.setItem(FREE_READING_LOCATION_KEY, JSON.stringify(location))
}

function streamForEntry(entry: OfficeEntry | null): ReadingStreamId | null {
  if (!entry || entry.kind !== 'scripture') return null
  if (entry.id.startsWith('progressive:')) return 'progressive'
  if (entry.id.startsWith('challenge:')) return 'challenge'
  if (entry.id.startsWith('psalm:')) return 'psalm'
  return null
}

function corpusForReading(reading: ScriptureReading): ScriptureCorpusId {
  const bookId = bookIdForReading(reading)
  return bookForCorpus('lxx', bookId) ? 'lxx' : 'sblgnt'
}

function bookIdForReading(reading: ScriptureReading) {
  return reading.verses[0]?.id.split('.')[0] ?? null
}

function assignmentIdForStreamIndex(
  streamId: ReadingStreamId,
  assignmentIndex: number,
  candidates: ReadHistoryCandidates,
) {
  if (streamId !== 'psalm') {
    return candidates[streamId][assignmentIndex]?.id ?? null
  }

  const psalmNumber = (
    (assignmentIndex % PSALM_COUNT + PSALM_COUNT) % PSALM_COUNT
  ) + 1
  return `psalm:${psalmNumber}`
}

function useSelectedReadingPlan(
  streamId: ReadingPlanStreamId,
  selection: ReadingPlanSelection,
): LoadedReadingPlan {
  const key = readingPlanKey(selection)
  const [loaded,setLoaded] = useState<LoadedReadingPlan>({
    key: '',
    readings: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    const book = bookForCorpus(selection.corpus, selection.bookId)

    Promise.resolve()
      .then(async () => {
        if (!book) {
          throw new Error('That reading-plan book is unavailable.')
        }
        const data = await loadScriptureBook(
          selection.corpus,
          selection.bookId,
        )
        if (cancelled) return
        setLoaded({
          key,
          readings: buildReadingPlan(
            streamId,
            selection.corpus,
            book,
            data,
          ),
          loading: false,
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoaded({
          key,
          readings: [],
          loading: false,
          error: error instanceof Error
            ? error.message
            : 'Unable to load this reading plan.',
        })
      })

    return () => { cancelled = true }
  }, [key, selection.bookId, selection.corpus, streamId])

  return loaded.key === key
    ? loaded
    : { key, readings: [], loading: true, error: null }
}

function groupVersesByChapter(verses: ScriptureVerse[]) {
  const groups: Array<{
    bookId: string
    chapter: ScriptureReferencePart
    verses: ScriptureVerse[]
  }> = []
  verses.forEach((verse) => {
    const bookId = bookIdFromVerseId(verse.id) ?? 'unknown'
    const last = groups[groups.length - 1]
    if (
      !last
      || last.bookId !== bookId
      || String(last.chapter) !== String(verse.chapter)
    ) {
      groups.push({ bookId, chapter: verse.chapter, verses: [verse] })
    } else {
      last.verses.push(verse)
    }
  })
  return groups
}

function OfficeIcon({ kind }: { kind: OfficeIconKind }) {
  return <span className={`office-icon office-icon-${kind}`} aria-hidden="true"><img className="canonical-icon" src={OFFICE_ICONS[kind]} alt=""/></span>
}
function Seal({ complete }: { complete: boolean }) { return <span className={`completion-seal${complete ? ' is-complete' : ''}`} aria-label={complete ? 'Πεπλήρωται' : 'Οὔπω πεπλήρωται'}><img className="canonical-icon" src={complete ? waxSealIcon : sealMarkIcon} alt=""/></span> }
function MenuIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg> }
function BookIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5c2.9-.8 5.7-.2 8.5 1.8v11.2c-2.8-2-5.6-2.6-8.5-1.8V5.5ZM20.5 5.5c-2.9-.8-5.7-.2-8.5 1.8v11.2c2.8-2 5.6-2.6 8.5-1.8V5.5Z"/></svg> }

function MealIcon({ kind }: { kind: MealIconKind }) { return <span className="meal-icon" aria-hidden="true"><img className="canonical-icon" src={MEAL_ICONS[kind]} alt=""/></span> }
function ReaderBanner({ kind }: { kind: ReaderBannerKind }) { return <img className={`reader-banner reader-banner-${kind} manuscript-art`} src={READER_BANNERS[kind]} alt="" aria-hidden="true"/> }

function OfficeReadingButton({ entry, icon, showGloss, complete, onOpen }: { entry: OfficeEntry; icon: OfficeIconKind; showGloss: boolean; complete: boolean; onOpen: (entry: OfficeEntry) => void }) {
  return <button className="office-reading" type="button" onClick={() => onOpen(entry)}><OfficeIcon kind={icon}/><span className="office-reading-copy"><VoiceText term={{ greek: entry.sectionGreek, english: entry.sectionEnglish }} showGloss={showGloss}/><span className="office-reading-title">{entry.titleGreek}</span><span className="office-reading-reference">{entry.reference}</span></span><Seal complete={complete}/></button>
}
function OfficePlanStatus({ streamId, icon, book, showGloss, loading, error, onChoose, onRestart }: { streamId: ReadingPlanStreamId; icon: OfficeIconKind; book: ScriptureBookOption | null; showGloss: boolean; loading: boolean; error: string | null; onChoose: () => void; onRestart: () => void }) {
  const term = streamId === 'progressive'
    ? UI.progressiveReading
    : UI.challengeReading

  return <div className="office-reading office-plan-status"><OfficeIcon kind={icon}/><span className="office-reading-copy"><VoiceText term={term} showGloss={showGloss}/><span className="office-reading-title">{book?.titleGreek ?? 'Γραφαί'}</span><span className="office-reading-reference">{loading ? 'Ἀνοίγεται…' : error ?? (showGloss ? 'Book complete' : 'Τέλος τοῦ βιβλίου')}</span>{!loading&&!error&&<span className="office-plan-actions"><button type="button" onClick={onChoose}><span>Ἑλοῦ βιβλίου</span>{showGloss&&<small>Choose next book</small>}</button><button type="button" onClick={onRestart}><span>Ἀνάγνωθι πάλιν</span>{showGloss&&<small>Read again</small>}</button></span>}</span><Seal complete={!loading&&!error}/></div>
}
function MealPrayerDock({ showGloss, onOpen }: { showGloss: boolean; onOpen: (entry: OfficeEntry) => void }) {
  const icons: MealIconKind[] = ['cup','bread','table']; const labels = [{greek:'Ποτήριον',english:'Cup'},{greek:'Κλάσμα',english:'Bread'},{greek:'Μετὰ τροφήν',english:'After food'}]
  return <section className="meal-prayers" aria-labelledby="meal-prayers-title"><div className="meal-prayers-heading" id="meal-prayers-title"><span>Εὐχαὶ τραπέζης</span>{showGloss && <small>Table prayers</small>}</div><nav className="meal-prayer-dock" aria-label="Table prayers">{mealPrayers.map((prayer,index)=><button className="meal-prayer-button" type="button" key={prayer.id} onClick={()=>onOpen(prayer)}><MealIcon kind={icons[index]}/><span className="meal-prayer-label"><span>{labels[index].greek}</span>{showGloss && <small>{labels[index].english}</small>}</span></button>)}</nav></section>
}
function HomeReadingDock({ showGloss, onOpenFreeReading, onOpenPrayer }: { showGloss: boolean; onOpenFreeReading: () => void; onOpenPrayer: (entry: OfficeEntry) => void }) {
  return <section className="home-reading-dock" aria-label="Additional reading and prayers"><button className="free-reading-panel" type="button" onClick={onOpenFreeReading}><span className="free-reading-heading"><span>Γραφαί</span>{showGloss && <small>Scripture</small>}</span><img className="free-reading-icon canonical-icon" src={freeReadingIcon} alt="" aria-hidden="true"/><span className="free-reading-label"><span>Ἀνάγνωσις</span>{showGloss && <small>Free Reading</small>}</span></button><MealPrayerDock showGloss={showGloss} onOpen={onOpenPrayer}/></section>
}

export default function App() {
  const today = useMemo(() => new Date(), [])
  const officeDate = useMemo(() => formatOfficeDate(today), [today])
  const calendarOffice = useMemo(() => resolveDailyOffice(today), [today])
  const [view,setView] = useState<AppView>('office')
  const [options,setOptions] = useState<ReaderOptions>(()=>loadOptions())
  const [progress,setProgress] = useState<ReadingProgressState>(()=>loadProgress())
  const [activeEntry,setActiveEntry] = useState<OfficeEntry|null>(null)
  const [currentVerseIndex,setCurrentVerseIndex] = useState(0)
  const [psalmReading,setPsalmReading] = useState<ScriptureReading|null>(null)
  const [psalmError,setPsalmError] = useState<string|null>(null)
  const [menuOpen,setMenuOpen] = useState(false)
  const [readerMenuOpen,setReaderMenuOpen] = useState(false)
  const [readHistoryOpen,setReadHistoryOpen] = useState(false)
  const [reviewEntry,setReviewEntry] = useState<ScriptureReading|null>(null)
  const [reviewVerseIndex,setReviewVerseIndex] = useState(0)
  const [freeReadingEntry,setFreeReadingEntry] = useState<ScriptureReading|null>(null)
  const [freeReadingVerseIndex,setFreeReadingVerseIndex] = useState(0)
  const [freeReadingLocation,setFreeReadingLocation] =
    useState<FreeReadingLocation|null>(()=>loadFreeReadingLocation())
  const [readerScriptureEntry,setReaderScriptureEntry] =
    useState<ScriptureReading|null>(null)
  const [readerScriptureVerseIndex,setReaderScriptureVerseIndex] =
    useState(0)
  const [readerScriptureCorpus,setReaderScriptureCorpus] =
    useState<ScriptureCorpusId>('sblgnt')
  const [visibleVerseId,setVisibleVerseId] = useState<string|null>(null)
  const [referenceNavigatorOpen,setReferenceNavigatorOpen] = useState(false)
  const [scriptureBrowserOpen,setScriptureBrowserOpen] = useState(false)
  const [scriptureBrowserCorpus,setScriptureBrowserCorpus] =
    useState<ScriptureCorpusId>('sblgnt')
  const [scriptureBrowserView,setScriptureBrowserView] =
    useState<ScriptureBrowserView>('books')
  const [scriptureBrowserBookId,setScriptureBrowserBookId] =
    useState<string|null>(null)
  const [scriptureBrowserLoadingKey,setScriptureBrowserLoadingKey] =
    useState<string|null>(null)
  const [scriptureBrowserError,setScriptureBrowserError] =
    useState<string|null>(null)
  const [planSelectorStream,setPlanSelectorStream] =
    useState<ReadingPlanStreamId|null>(null)
  const [historyLoadingId,setHistoryLoadingId] = useState<string|null>(null)
  const [historyUndoingId,setHistoryUndoingId] = useState<string|null>(null)
  const [historyError,setHistoryError] = useState<string|null>(null)
  const [loadedLexicalBook,setLoadedLexicalBook] =
    useState<LoadedLexicalBook>({ bookId: '', data: null })
  const [lexicalSelection,setLexicalSelection] =
    useState<LexicalWordInfo|null>(null)
  const [selectedWeekday,setSelectedWeekday] = useState(today.getDay())
  const verseElements = useRef<Record<string,HTMLElement|null>>({})
  const menuTrigger = useRef<HTMLButtonElement|null>(null)
  const currentContentsItem = useRef<HTMLDivElement|null>(null)
  const pendingScroll = useRef<
    { kind: 'top' } | { kind: 'verse'; verseId: string } | null
  >(null)
  const lexicalAnchor = useRef<HTMLButtonElement|null>(null)
  const visibleVerseIdRef = useRef<string|null>(null)
  const readerLoadToken = useRef(0)

  const progressivePlan = useSelectedReadingPlan(
    'progressive',
    progress.planSelections.progressive,
  )
  const challengePlan = useSelectedReadingPlan(
    'challenge',
    progress.planSelections.challenge,
  )
  const planCandidates = useMemo<ReadHistoryCandidates>(() => ({
    progressive: progressivePlan.readings,
    challenge: challengePlan.readings,
  }), [challengePlan.readings, progressivePlan.readings])
  const progressiveReading = progressivePlan.readings[
    progress.streams.progressive.assignmentIndex
  ] ?? null
  const challengeReading = challengePlan.readings[
    progress.streams.challenge.assignmentIndex
  ] ?? null
  const progressiveBook = bookForCorpus(
    progress.planSelections.progressive.corpus,
    progress.planSelections.progressive.bookId,
  )
  const challengeBook = bookForCorpus(
    progress.planSelections.challenge.corpus,
    progress.planSelections.challenge.bookId,
  )
  const psalmNumber = (progress.streams.psalm.assignmentIndex % PSALM_COUNT) + 1
  const activeStream = streamForEntry(activeEntry)
  const contentsItems = useMemo(
    ()=>activeStream
      ? readingContentsItems(
          activeStream,
          progress.streams[activeStream].assignmentIndex,
          progress.streams[activeStream].completedAssignmentIds,
          planCandidates,
        )
      : [],
    [activeStream,planCandidates,progress],
  )
  const latestCompletedId = activeStream
    ? progress.streams[activeStream].completedAssignmentIds.at(-1) ?? null
    : null
  const activeAssignmentIndex = activeStream
    ? progress.streams[activeStream].assignmentIndex
    : null
  const currentAssignmentId = activeStream && activeAssignmentIndex !== null
    ? assignmentIdForStreamIndex(
        activeStream,
        activeAssignmentIndex,
        planCandidates,
      )
    : null
  const previousAssignmentId = activeStream
    && activeAssignmentIndex !== null
    && activeAssignmentIndex > 0
    ? assignmentIdForStreamIndex(
        activeStream,
        activeAssignmentIndex - 1,
        planCandidates,
      )
    : null
  const canUndoLatestCompletion = (
    latestCompletedId !== null
    && latestCompletedId === previousAssignmentId
  )
  const activePlanComplete = activeStream !== null
    && activeStream !== 'psalm'
    && planCandidates[activeStream].length > 0
    && progress.streams[activeStream].assignmentIndex
      >= planCandidates[activeStream].length
  const displayedEntry = freeReadingEntry
    ?? reviewEntry
    ?? readerScriptureEntry
    ?? activeEntry
  const scriptureReading = displayedEntry?.kind === 'scripture'
    ? displayedEntry
    : null
  const displayedVerseIndex = freeReadingEntry
    ? freeReadingVerseIndex
    : reviewEntry
      ? reviewVerseIndex
      : readerScriptureEntry
        ? readerScriptureVerseIndex
        : currentVerseIndex
  const displayedCorpus = readerScriptureEntry
    && !freeReadingEntry
    && !reviewEntry
    ? readerScriptureCorpus
    : scriptureReading
      ? corpusForReading(scriptureReading)
      : 'sblgnt'
  const selectedVerse = scriptureReading?.verses[displayedVerseIndex] ?? null
  const visibleVerseIndex = scriptureReading
    ? scriptureReading.verses.findIndex(verse => verse.id === visibleVerseId)
    : -1
  const displayedVerse = visibleVerseIndex >= 0
    ? scriptureReading?.verses[visibleVerseIndex] ?? selectedVerse
    : selectedVerse
  const displayedBookId = displayedVerse
    ? bookIdFromVerseId(displayedVerse.id)
    : scriptureReading
      ? bookIdForReading(scriptureReading)
      : null
  const displayedBook = bookForCorpus(displayedCorpus, displayedBookId)
  const firstDisplayedBookId = scriptureReading
    ? bookIdForReading(scriptureReading)
    : null
  const isDisplayedPsalm = firstDisplayedBookId === 'psalms'
  const isLongForm = freeReadingEntry
    ? !isDisplayedPsalm
    : activeStream === 'progressive' || activeStream === 'challenge'
  const lexicalContext = freeReadingEntry !== null
    ? 'free-reading'
    : activeStream
  const lexicalEnabled = displayedBookId !== null
    && lexicalAssistanceApplies(displayedCorpus, lexicalContext)
  const lexicalBook = lexicalEnabled
    && loadedLexicalBook.bookId === displayedBookId
    ? loadedLexicalBook.data
    : null
  const scriptureBrowserBooks = booksForCorpus(scriptureBrowserCorpus)
  const scriptureBrowserBook = bookForCorpus(
    scriptureBrowserCorpus,
    scriptureBrowserBookId,
  )
  const chapterGroups = useMemo(
    () => scriptureReading
      ? groupVersesByChapter(scriptureReading.verses)
      : [],
    [scriptureReading],
  )
  const activeEndpointId = activeEntry?.kind === 'scripture'
    ? activeEntry.verses.at(-1)?.id ?? null
    : null

  useEffect(()=>{ localStorage.setItem(OPTIONS_KEY,JSON.stringify(options)) },[options])
  useEffect(()=>saveProgress(progress),[progress])
  useEffect(()=>{ if(!options.showPsalm)return; let cancelled=false; loadPsalm(psalmNumber).then(r=>{if(!cancelled){setPsalmReading(r);setPsalmError(null)}}).catch((e:unknown)=>{if(!cancelled)setPsalmError(e instanceof Error?e.message:'Unable to load the Psalm.')}); return()=>{cancelled=true} },[options.showPsalm,psalmNumber])
  useEffect(() => {
    if (!lexicalEnabled || !displayedBookId) return
    let cancelled = false
    loadSblgntLexicalBook(displayedBookId)
      .then((data) => {
        if (!cancelled) setLoadedLexicalBook({ bookId: displayedBookId, data })
      })
      .catch(() => {
        if (!cancelled) setLoadedLexicalBook({ bookId: displayedBookId, data: null })
      })
    return () => { cancelled = true }
  }, [displayedBookId, lexicalEnabled])
  const setCurrentVisibleVerse = useCallback((verseId: string | null) => {
    visibleVerseIdRef.current = verseId
    setVisibleVerseId(verseId)
  }, [])
  const persistVisibleVerse = useCallback((verse: ScriptureVerse) => {
    const bookId = bookIdFromVerseId(verse.id)
    if (!bookId) return

    if (freeReadingEntry) {
      const location: FreeReadingLocation = {
        corpus: displayedCorpus,
        bookId,
        chapter: verse.chapter,
        verseId: verse.id,
      }
      setFreeReadingLocation(location)
      saveFreeReadingLocation(location)
      return
    }

    if (reviewEntry || !activeStream || !remembersVersePosition(activeStream)) {
      return
    }

    const allowedCorpus = activeStream === 'psalm'
      ? 'lxx'
      : progress.planSelections[activeStream].corpus
    const allowedBookId = activeStream === 'psalm'
      ? 'psalms'
      : progress.planSelections[activeStream].bookId
    if (displayedCorpus !== allowedCorpus || bookId !== allowedBookId) return

    setProgress(current => updateStreamPosition(
      current,
      activeStream,
      verse.id,
    ))
  }, [
    activeStream,
    displayedCorpus,
    freeReadingEntry,
    progress.planSelections,
    reviewEntry,
  ])
  useEffect(() => {
    if (view !== 'reader' || !scriptureReading) return
    let frame = 0
    let persistenceTimer: ReturnType<typeof setTimeout> | null = null

    const updateVisibleVerse = () => {
      const headerBottom = document.querySelector('.reader-header')
        ?.getBoundingClientRect().bottom ?? 0
      const targetY = headerBottom + 24
      let candidate = scriptureReading.verses[0] ?? null

      for (const verse of scriptureReading.verses) {
        const element = verseElements.current[verse.id]
        if (!element) continue
        const rect = element.getBoundingClientRect()
        if (rect.top <= targetY) candidate = verse
        else break
      }

      if (!candidate || candidate.id === visibleVerseIdRef.current) return
      setCurrentVisibleVerse(candidate.id)
      if (persistenceTimer) window.clearTimeout(persistenceTimer)
      persistenceTimer = window.setTimeout(
        () => persistVisibleVerse(candidate),
        180,
      )
    }

    const onScroll = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateVisibleVerse)
    }

    frame = window.requestAnimationFrame(updateVisibleVerse)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.cancelAnimationFrame(frame)
      if (persistenceTimer) window.clearTimeout(persistenceTimer)
    }
  }, [
    persistVisibleVerse,
    scriptureReading,
    setCurrentVisibleVerse,
    view,
  ])
  useLayoutEffect(() => {
    if (!readHistoryOpen) return
    currentContentsItem.current?.scrollIntoView({
      behavior: 'auto',
      block: 'center',
    })
  }, [readHistoryOpen, activeStream])
  useLayoutEffect(() => {
    const request = pendingScroll.current
    if (!request) return

    pendingScroll.current = null
    if (request.kind === 'top') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }

    verseElements.current[request.verseId]?.scrollIntoView({
      behavior: 'auto',
      block: 'center',
    })
  }, [displayedEntry, displayedVerseIndex, view])

  const closeLexicalPopup = useCallback(() => {
    const anchor = lexicalAnchor.current
    setLexicalSelection(null)
    requestAnimationFrame(() => anchor?.focus())
  }, [])

  function openLexicalPopup(
    info: LexicalWordInfo,
    anchor: HTMLButtonElement,
  ) {
    lexicalAnchor.current = anchor
    setLexicalSelection(info)
  }

  function renderVerseText(verse: ScriptureVerse) {
    if (!lexicalEnabled || !lexicalBook) {
      return <span>{verse.displayText}</span>
    }
    const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
    const words = lexicalWordsForVerse(lexicalBook, verse.id, surfaces)
    return <span className="lexical-text">{surfaces.map((surface, index) => {
      const info = words.get(index)
      return <span key={`${verse.id}:${index}`}>
        {info
          ? <LexicalWord
              info={info}
              expanded={lexicalSelection?.key === info.key}
              onOpen={openLexicalPopup}
            />
          : <span>{surface}</span>}
        {index < surfaces.length - 1 ? ' ' : ''}
      </span>
    })}</span>
  }

  async function loadReaderChapter(
    corpus: ScriptureCorpusId,
    bookId: string,
    chapter: ScriptureReferencePart,
  ) {
    return corpus === 'lxx'
      ? loadLxxChapter(bookId, chapter)
      : loadSblgntChapter(bookId, chapter)
  }
  async function prepareReaderEntry(
    entry: ScriptureReading,
    targetVerseId: string,
  ) {
    const token = ++readerLoadToken.current
    const corpus = corpusForReading(entry)
    let base = entry
    const targetParts = targetVerseId.split('.')
    const targetBookId = targetParts[0]
    const targetChapter = targetParts[1]

    try {
      if (
        targetBookId
        && targetChapter
        && !entry.verses.some(verse => verse.id === targetVerseId)
      ) {
        const chapterReading = await loadReaderChapter(
          corpus,
          targetBookId,
          targetChapter,
        )
        base = {
          ...chapterReading,
          id: `reader:${entry.id}:${targetChapter}`,
          sectionGreek: entry.sectionGreek,
          sectionEnglish: entry.sectionEnglish,
        }
      }
      const expanded = await buildReadingWithContinuation(
        base,
        corpus,
        loadReaderChapter,
      )
      if (token !== readerLoadToken.current) return
      const targetIndex = Math.max(
        expanded.verses.findIndex(verse => verse.id === targetVerseId),
        0,
      )
      const verse = expanded.verses[targetIndex]
      setReaderScriptureCorpus(corpus)
      setReaderScriptureEntry(expanded)
      setReaderScriptureVerseIndex(targetIndex)
      setCurrentVerseIndex(targetIndex)
      setCurrentVisibleVerse(verse?.id ?? null)
      pendingScroll.current = verse
        ? { kind: 'verse', verseId: verse.id }
        : { kind: 'top' }
    } catch {
      if (token !== readerLoadToken.current) return
      const targetIndex = Math.max(
        entry.verses.findIndex(verse => verse.id === targetVerseId),
        0,
      )
      const verse = entry.verses[targetIndex]
      setReaderScriptureCorpus(corpus)
      setReaderScriptureEntry(entry)
      setReaderScriptureVerseIndex(targetIndex)
      setCurrentVerseIndex(targetIndex)
      setCurrentVisibleVerse(verse?.id ?? null)
    }
  }
  function openEntry(entry: OfficeEntry){
    setLexicalSelection(null)
    setReferenceNavigatorOpen(false)
    const stream=streamForEntry(entry)
    const savedVerseId=entry.kind==='scripture'&&stream
      ? progress.streams[stream].lastVerseId
      : null
    const nextIndex=entry.kind==='scripture'&&stream
      ? restoredVerseIndex(
          stream,
          savedVerseId,
          entry.verses.map(verse=>verse.id),
        )
      : 0
    const targetVerseId=entry.kind==='scripture'
      ? savedVerseId ?? entry.verses[nextIndex]?.id ?? null
      : null
    if(entry.kind==='scripture'&&remembersVersePosition(stream)&&targetVerseId){
      setProgress(c=>updateStreamPosition(c,stream,targetVerseId))
    }
    pendingScroll.current=targetVerseId&&entry.kind==='scripture'
      && entry.verses.some(verse=>verse.id===targetVerseId)
      ? {kind:'verse',verseId:targetVerseId}
      : {kind:'top'}
    setFreeReadingEntry(null)
    setReviewEntry(null)
    setReaderMenuOpen(false)
    setReadHistoryOpen(false)
    setScriptureBrowserOpen(false)
    setCurrentVerseIndex(nextIndex)
    if(entry.kind==='scripture'){
      setReaderScriptureEntry(entry)
      setReaderScriptureVerseIndex(nextIndex)
      setReaderScriptureCorpus(corpusForReading(entry))
      setCurrentVisibleVerse(targetVerseId)
      if(targetVerseId)void prepareReaderEntry(entry,targetVerseId)
    }else{
      readerLoadToken.current+=1
      setReaderScriptureEntry(null)
      setCurrentVisibleVerse(null)
    }
    if(entry.id.startsWith('weekday-prayer:'))setSelectedWeekday(today.getDay())
    setActiveEntry(entry)
    setView('reader')
  }
  function moveToVerse(index:number){
    if(!scriptureReading)return
    setLexicalSelection(null)
    const nextIndex=Math.min(Math.max(index,0),scriptureReading.verses.length-1)
    const nextVerse=scriptureReading.verses[nextIndex]
    setCurrentVisibleVerse(nextVerse.id)
    persistVisibleVerse(nextVerse)
    if(nextIndex===displayedVerseIndex){
      verseElements.current[nextVerse.id]?.scrollIntoView({
        behavior:'auto',
        block:'center',
      })
      return
    }
    pendingScroll.current={kind:'verse',verseId:nextVerse.id}
    if(freeReadingEntry)setFreeReadingVerseIndex(nextIndex)
    else if(reviewEntry)setReviewVerseIndex(nextIndex)
    else if(readerScriptureEntry){
      setReaderScriptureVerseIndex(nextIndex)
      setCurrentVerseIndex(nextIndex)
    }else setCurrentVerseIndex(nextIndex)
  }
  async function openContentsItem(item: ReadingContentsItem) {
    setHistoryError(null)
    setHistoryLoadingId(item.id)
    try {
      const reading = item.reading ?? (
        item.psalmNumber ? await loadPsalm(item.psalmNumber) : null
      )
      if (!reading) throw new Error('Unable to load this reading.')

      if (item.isCurrent) {
        setFreeReadingEntry(null)
        openEntry(reading)
        return
      }

      const currentIndex =
        progress.streams[item.streamId].assignmentIndex
      const shouldMakeCurrent = (
        !item.isCompleted
        || item.assignmentIndex > currentIndex
      )

      if (shouldMakeCurrent) {
        setProgress((current) => selectStreamAssignment(
          current,
          item.streamId,
          item.assignmentIndex,
        ))
        if (item.streamId === 'psalm') setPsalmReading(reading)
        pendingScroll.current = { kind: 'top' }
        setFreeReadingEntry(null)
        setActiveEntry(reading)
        setReviewEntry(null)
        setReaderScriptureEntry(reading)
        setReaderScriptureCorpus(corpusForReading(reading))
        setReaderScriptureVerseIndex(0)
        setCurrentVisibleVerse(reading.verses[0]?.id ?? null)
        if(reading.verses[0])void prepareReaderEntry(reading,reading.verses[0].id)
        setCurrentVerseIndex(0)
        setReaderMenuOpen(false)
        setReadHistoryOpen(false)
        setView('reader')
        return
      }

      pendingScroll.current = { kind: 'top' }
      setFreeReadingEntry(null)
      setReviewEntry(reading)
      setReviewVerseIndex(0)
      setReadHistoryOpen(false)
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'Unable to load this reading.',
      )
    } finally {
      setHistoryLoadingId(null)
    }
  }
  async function completeHistoryItem(item: ReadingContentsItem) {
    if (!item.isCurrent || item.isCompleted) {
      setHistoryError('Only the current reading can be completed.')
      return
    }

    const expectedAssignmentIndex = item.assignmentIndex
    if (
      progress.streams[item.streamId].assignmentIndex
      !== expectedAssignmentIndex
    ) {
      setHistoryError('The current reading has already changed.')
      return
    }

    setHistoryError(null)
    setHistoryLoadingId(item.id)
    try {
      const nextAssignmentIndex = expectedAssignmentIndex + 1
      const nextReading = item.streamId === 'psalm'
        ? await loadPsalm((nextAssignmentIndex % PSALM_COUNT) + 1)
        : planCandidates[item.streamId][nextAssignmentIndex] ?? null

      if (item.streamId === 'psalm') setPsalmReading(null)
      setProgress((current) => {
        if (
          current.streams[item.streamId].assignmentIndex
          !== expectedAssignmentIndex
        ) {
          return current
        }

        return markDailySection(
          completeStreamAssignment(current, item.streamId, item.id),
          officeDate.iso,
          item.streamId,
        )
      })

      if (nextReading) {
        if (item.streamId === 'psalm') setPsalmReading(nextReading)
        pendingScroll.current = { kind: 'top' }
        setFreeReadingEntry(null)
        setReviewEntry(null)
        setActiveEntry(nextReading)
        setReaderScriptureEntry(nextReading)
        setReaderScriptureCorpus(corpusForReading(nextReading))
        setReaderScriptureVerseIndex(0)
        setCurrentVisibleVerse(nextReading.verses[0]?.id ?? null)
        if(nextReading.verses[0])void prepareReaderEntry(nextReading,nextReading.verses[0].id)
        setCurrentVerseIndex(0)
      }
      setReaderMenuOpen(false)
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Unable to open the next reading.',
      )
    } finally {
      setHistoryLoadingId(null)
    }
  }

  async function undoHistoryItem(item: ReadingContentsItem) {
    const stream = progress.streams[item.streamId]

    if (
      stream.assignmentIndex < 1
      || stream.completedAssignmentIds.at(-1) !== item.id
      || assignmentIdForStreamIndex(
        item.streamId,
        stream.assignmentIndex - 1,
        planCandidates,
      ) !== item.id
    ) {
      setHistoryError('Only the latest completed reading can be restored.')
      return
    }

    setHistoryError(null)
    setHistoryUndoingId(item.id)
    try {
      const reading = item.reading ?? (
        item.psalmNumber ? await loadPsalm(item.psalmNumber) : null
      )
      if (!reading) throw new Error('Unable to restore this reading.')

      setProgress((current) => {
        const undone = undoLastStreamCompletion(
          current,
          item.streamId,
          item.id,
        )

        return undone === current
          ? current
          : unmarkDailySection(
              undone,
              officeDate.iso,
              item.streamId,
            )
      })
      if (item.streamId === 'psalm') setPsalmReading(reading)
      pendingScroll.current = { kind: 'top' }
      setFreeReadingEntry(null)
      setActiveEntry(reading)
      setReviewEntry(null)
      setReaderScriptureEntry(reading)
      setReaderScriptureCorpus(corpusForReading(reading))
      setReaderScriptureVerseIndex(0)
      setCurrentVisibleVerse(reading.verses[0]?.id ?? null)
      if(reading.verses[0])void prepareReaderEntry(reading,reading.verses[0].id)
      setCurrentVerseIndex(0)
      setView('reader')
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'Unable to restore this reading.',
      )
    } finally {
      setHistoryUndoingId(null)
    }
  }
  function openScriptureBrowser() {
    setReaderMenuOpen(false)
    setReferenceNavigatorOpen(true)
  }
  async function openFreeReading() {
    if (!freeReadingLocation) {
      openFreeReadingBrowser()
      return
    }

    const book = bookForCorpus(
      freeReadingLocation.corpus,
      freeReadingLocation.bookId,
    )
    if (!book) {
      openFreeReadingBrowser()
      return
    }

    try {
      const chapter = await loadReaderChapter(
        freeReadingLocation.corpus,
        book.id,
        freeReadingLocation.chapter,
      )
      const reading = await buildReadingWithContinuation(
        chapter,
        freeReadingLocation.corpus,
        loadReaderChapter,
      )
      const verseIndex = Math.max(
        reading.verses.findIndex(verse=>verse.id===freeReadingLocation.verseId),
        0,
      )
      const verseId = reading.verses[verseIndex]?.id
      pendingScroll.current = verseId
        ? { kind: 'verse', verseId }
        : { kind: 'top' }
      readerLoadToken.current+=1
      setReaderScriptureEntry(null)
      setFreeReadingEntry(reading)
      setFreeReadingVerseIndex(verseIndex)
      setCurrentVisibleVerse(verseId ?? null)
      setReviewEntry(null)
      setScriptureBrowserOpen(false)
      setReaderMenuOpen(false)
      setReadHistoryOpen(false)
      setReferenceNavigatorOpen(false)
      setView('reader')
    } catch {
      openFreeReadingBrowser()
      setScriptureBrowserError('Unable to restore the saved reading.')
    }
  }
  function openFreeReadingBrowser() {
    setPlanSelectorStream(null)
    setScriptureBrowserBookId(null)
    setScriptureBrowserView('books')
    setScriptureBrowserError(null)
    setMenuOpen(false)
    setReaderMenuOpen(false)
    setScriptureBrowserOpen(true)
  }
  function openPlanSelector(streamId: ReadingPlanStreamId) {
    const selection = progress.planSelections[streamId]
    setPlanSelectorStream(streamId)
    setScriptureBrowserCorpus(selection.corpus)
    setScriptureBrowserBookId(null)
    setScriptureBrowserView('books')
    setScriptureBrowserError(null)
    setMenuOpen(false)
    setReaderMenuOpen(false)
    setScriptureBrowserOpen(true)
  }
  function selectScriptureBrowserCorpus(corpus: ScriptureCorpusId) {
    setScriptureBrowserCorpus(corpus)
    setScriptureBrowserBookId(null)
    setScriptureBrowserView('books')
    setScriptureBrowserError(null)
  }
  function selectScriptureBrowserBook(book: ScriptureBookOption) {
    if (planSelectorStream) {
      setProgress((current) => switchReadingPlan(
        current,
        planSelectorStream,
        { corpus: scriptureBrowserCorpus, bookId: book.id },
      ))
      setScriptureBrowserOpen(false)
      setPlanSelectorStream(null)
      setActiveEntry(null)
      setReviewEntry(null)
      setFreeReadingEntry(null)
      setReaderScriptureEntry(null)
      setCurrentVisibleVerse(null)
      pendingScroll.current = { kind: 'top' }
      setView('office')
      return
    }

    setScriptureBrowserBookId(book.id)
    setScriptureBrowserView('chapters')
    setScriptureBrowserError(null)
  }
  function restartPlan(streamId: ReadingPlanStreamId) {
    setProgress((current) => restartReadingPlan(current, streamId))
    const firstReading = planCandidates[streamId][0]

    if (view === 'reader' && firstReading) {
      pendingScroll.current = { kind: 'top' }
      setFreeReadingEntry(null)
      setReviewEntry(null)
      setActiveEntry(firstReading)
      setReaderScriptureEntry(firstReading)
      setReaderScriptureCorpus(corpusForReading(firstReading))
      setReaderScriptureVerseIndex(0)
      setCurrentVisibleVerse(firstReading.verses[0]?.id ?? null)
      if(firstReading.verses[0])void prepareReaderEntry(firstReading,firstReading.verses[0].id)
      setCurrentVerseIndex(0)
    }
  }
  async function openLibraryChapter(
    book: ScriptureBookOption,
    chapterNumber: ScriptureReferencePart,
  ) {
    const loadingKey =
      `${scriptureBrowserCorpus}:${book.id}:${chapterNumber}`
    setScriptureBrowserLoadingKey(loadingKey)
    setScriptureBrowserError(null)

    try {
      const chapter = await loadReaderChapter(
        scriptureBrowserCorpus,
        book.id,
        chapterNumber,
      )
      const reading = await buildReadingWithContinuation(
        chapter,
        scriptureBrowserCorpus,
        loadReaderChapter,
      )

      pendingScroll.current = { kind: 'top' }
      readerLoadToken.current+=1
      setReaderScriptureEntry(null)
      setFreeReadingEntry(reading)
      setFreeReadingVerseIndex(0)
      const firstVerse = reading.verses[0]
      if (firstVerse) {
        const location: FreeReadingLocation = {
          corpus: scriptureBrowserCorpus,
          bookId: book.id,
          chapter: chapterNumber,
          verseId: firstVerse.id,
        }
        setFreeReadingLocation(location)
        saveFreeReadingLocation(location)
        setCurrentVisibleVerse(firstVerse.id)
      }
      setReviewEntry(null)
      setScriptureBrowserOpen(false)
      setReaderMenuOpen(false)
      setReadHistoryOpen(false)
      setView('reader')
    } catch (error) {
      setScriptureBrowserError(
        error instanceof Error
          ? error.message
          : 'Unable to open this chapter.',
      )
    } finally {
      setScriptureBrowserLoadingKey(null)
    }
  }
  async function selectReaderReference(
    selection: ReaderNavigatorSelection,
  ) {
    setReferenceNavigatorOpen(false)
    setLexicalSelection(null)
    const token = ++readerLoadToken.current
    let reading = selection.reading
    try {
      reading = await buildReadingWithContinuation(
        selection.reading,
        selection.corpus,
        loadReaderChapter,
      )
    } catch {
      // The selected chapter itself is still safe to open.
    }
    if (token != readerLoadToken.current) return
    const verseIndex = Math.max(
      reading.verses.findIndex(verse => verse.id === selection.verseId),
      0,
    )
    const verse = reading.verses[verseIndex]
    pendingScroll.current = verse
      ? { kind: 'verse', verseId: verse.id }
      : { kind: 'top' }
    setCurrentVisibleVerse(verse?.id ?? null)

    if (activeStream && activeEntry?.kind === 'scripture') {
      setFreeReadingEntry(null)
      setReviewEntry(null)
      setReaderScriptureCorpus(selection.corpus)
      setReaderScriptureEntry({
        ...reading,
        sectionGreek: activeEntry.sectionGreek,
        sectionEnglish: activeEntry.sectionEnglish,
      })
      setReaderScriptureVerseIndex(verseIndex)
      setCurrentVerseIndex(verseIndex)
      if (verse) persistVisibleVerse(verse)
      return
    }

    setReaderScriptureEntry(null)
    setReviewEntry(null)
    setFreeReadingEntry(reading)
    setFreeReadingVerseIndex(verseIndex)
    if (verse) {
      const location: FreeReadingLocation = {
        corpus: selection.corpus,
        bookId: selection.book.id,
        chapter: selection.chapter,
        verseId: verse.id,
      }
      setFreeReadingLocation(location)
      saveFreeReadingLocation(location)
    }
  }
  function leaveReader(){
    readerLoadToken.current+=1
    pendingScroll.current={kind:'top'}
    setFreeReadingEntry(null)
    setReviewEntry(null)
    setReaderScriptureEntry(null)
    setCurrentVisibleVerse(null)
    setActiveEntry(null)
    setReaderMenuOpen(false)
    setReadHistoryOpen(false)
    setScriptureBrowserOpen(false)
    setReferenceNavigatorOpen(false)
    setPlanSelectorStream(null)
    setLexicalSelection(null)
    setView('office')
  }
  function completeActiveEntry(){
    if(!activeEntry)return
    if(activeStream){
      const expectedAssignmentIndex=progress.streams[activeStream].assignmentIndex
      if(activeStream==='psalm')setPsalmReading(null)
      setProgress((current)=>{
        if(
          current.streams[activeStream].assignmentIndex
          !== expectedAssignmentIndex
        ){
          return current
        }
        return markDailySection(
          completeStreamAssignment(current,activeStream,activeEntry.id),
          officeDate.iso,
          activeStream,
        )
      })
    } else if(activeEntry.kind==='prayer'&&!activeEntry.id.startsWith('meal:')){
      setProgress(c=>markDailySection(c,officeDate.iso,activeEntry.id))
    }
  }
  function proceed(){ if(!activeStream)return; const next=activeStream==='psalm'?psalmReading:planCandidates[activeStream][progress.streams[activeStream].assignmentIndex]; if(next)openEntry(next) }
  const markedToday=(id:string)=>isDailySectionMarked(progress,officeDate.iso,id)
  const scriptureBrowserDialog = scriptureBrowserOpen&&<div className="options-backdrop reader-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setScriptureBrowserOpen(false)}}>
    <section className="options-menu scripture-browser-menu" role="dialog" aria-modal="true" aria-labelledby="scripture-browser-title">
      <header className="options-menu-header">
        <h2 id="scripture-browser-title"><VoiceText term={planSelectorStream ? {greek:planSelectorStream==='progressive'?'Πρόοδος':'Ἄσκησις',english:planSelectorStream==='progressive'?'Choose Progressive book':'Choose Challenge book'} : {greek:'Γραφαί',english:'Free reading'}} showGloss={options.showGloss}/></h2>
        <button className="options-close" type="button" onClick={()=>setScriptureBrowserOpen(false)}>×</button>
      </header>
      <nav className="scripture-corpus-tabs" aria-label="Scripture corpus">
        <button className={scriptureBrowserCorpus==='sblgnt'?'is-selected':''} type="button" onClick={()=>selectScriptureBrowserCorpus('sblgnt')}><span>SBLGNT</span>{options.showGloss&&<small>New Testament</small>}</button>
        <button className={scriptureBrowserCorpus==='lxx'?'is-selected':''} type="button" onClick={()=>selectScriptureBrowserCorpus('lxx')}><span>Ἑβδομήκοντα</span>{options.showGloss&&<small>Septuagint</small>}</button>
      </nav>
      <div className="scripture-browser-body">
        {scriptureBrowserView==='books'
          ? <><div className="scripture-browser-heading"><span>{scriptureBrowserCorpus==='sblgnt'?'Καινὴ Διαθήκη':'Ἑβδομήκοντα'}</span>{options.showGloss&&<small>{planSelectorStream?'Choose the book for this reading plan':scriptureBrowserCorpus==='sblgnt'?'Choose a book':'Choose a Septuagint book'}</small>}</div><div className="scripture-book-grid">{scriptureBrowserBooks.map((book)=><button className="scripture-book-choice" type="button" key={`${scriptureBrowserCorpus}:${book.id}`} onClick={()=>selectScriptureBrowserBook(book)}><span>{book.titleGreek}</span><small>{options.showGloss&&book.titleEnglish?`${book.titleEnglish} · `:''}{book.code} · {book.chapterNumbers.length}</small></button>)}</div></>
          : scriptureBrowserBook&&<><div className="scripture-browser-heading scripture-chapter-heading"><button className="scripture-browser-back" type="button" onClick={()=>{setScriptureBrowserBookId(null);setScriptureBrowserView('books');setScriptureBrowserError(null)}} aria-label="Back to books">‹</button><span>{scriptureBrowserBook.titleGreek}</span>{options.showGloss&&<small>{scriptureBrowserBook.code} · Choose a chapter</small>}</div><div className="scripture-chapter-grid">{chapterNumbers(scriptureBrowserBook).map((chapterNumber)=>{const loadingKey=`${scriptureBrowserCorpus}:${scriptureBrowserBook.id}:${String(chapterNumber)}`;return <button className="scripture-chapter-choice" type="button" key={loadingKey} disabled={scriptureBrowserLoadingKey!==null} onClick={()=>void openLibraryChapter(scriptureBrowserBook,chapterNumber)}>{scriptureBrowserLoadingKey===loadingKey?'…':chapterNumber}</button>})}</div></>}
      </div>
      {scriptureBrowserError&&<p className="read-history-error" role="alert">{scriptureBrowserError}</p>}
    </section>
  </div>

  if(view==='office') return <main className="office-shell"><section className="office-card" aria-labelledby="office-title">
    <header className="office-toolbar"><button className="icon-button" type="button" ref={menuTrigger} aria-label="Ἐπιλογαί" onClick={()=>setMenuOpen(true)}><MenuIcon/></button><div className="office-brand"><p className="app-name">Ἀνάγνωσις</p>{options.showGloss&&<span className="app-name-gloss">Reading</span>}</div><time className="calendar-mark" dateTime={officeDate.iso}><span className="calendar-day">{officeDate.day}</span><span className="calendar-copy"><strong>{officeDate.weekdayGreek}</strong><span>{officeDate.monthGreek} {officeDate.year}</span>{options.showGloss&&<small>{officeDate.english}</small>}</span></time></header>
    <header className="office-heading" id="office-title"><VoiceText term={UI.todaysReading} showGloss={options.showGloss}/></header>
    <div className="office-list">
      <OfficeReadingButton entry={calendarOffice.openingPrayer} icon="prayer" showGloss={options.showGloss} complete={markedToday(calendarOffice.openingPrayer.id)} onOpen={openEntry}/>
      {options.showProgressive&&(progressiveReading
        ? <OfficeReadingButton entry={progressiveReading} icon="codex" showGloss={options.showGloss} complete={markedToday('progressive')} onOpen={openEntry}/>
        : <OfficePlanStatus streamId="progressive" icon="codex" book={progressiveBook} showGloss={options.showGloss} loading={progressivePlan.loading} error={progressivePlan.error} onChoose={()=>openPlanSelector('progressive')} onRestart={()=>restartPlan('progressive')}/>)}
      {options.showChallenge&&(challengeReading
        ? <OfficeReadingButton entry={challengeReading} icon="lamp" showGloss={options.showGloss} complete={markedToday('challenge')} onOpen={openEntry}/>
        : <OfficePlanStatus streamId="challenge" icon="lamp" book={challengeBook} showGloss={options.showGloss} loading={challengePlan.loading} error={challengePlan.error} onChoose={()=>openPlanSelector('challenge')} onRestart={()=>restartPlan('challenge')}/>)}
      {options.showPsalm&&(psalmReading?<OfficeReadingButton entry={psalmReading} icon="lyre" showGloss={options.showGloss} complete={markedToday('psalm')} onOpen={openEntry}/>:<div className="office-reading office-reading-status">{psalmError??`Ψαλμὸς ${psalmNumber}…`}</div>)}
      <OfficeReadingButton entry={calendarOffice.closingPrayer} icon="lampstand" showGloss={options.showGloss} complete={markedToday(calendarOffice.closingPrayer.id)} onOpen={openEntry}/>
    </div>
    <HomeReadingDock showGloss={options.showGloss} onOpenFreeReading={()=>void openFreeReading()} onOpenPrayer={openEntry}/>
    {menuOpen&&<div className="options-backdrop" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setMenuOpen(false)}}><section className="options-menu office-options-menu" role="dialog" aria-modal="true"><header className="options-menu-header"><h2><VoiceText term={UI.options} showGloss={options.showGloss}/></h2><button className="options-close" type="button" onClick={()=>setMenuOpen(false)}>×</button></header><div className="options-list">{([{key:'showGloss',term:UI.englishAids},{key:'showProgressive',term:UI.progressiveReading},{key:'showChallenge',term:UI.challengeReading},{key:'showPsalm',term:UI.psalm}] as const).map(({key,term})=><label className="option-switch" key={key}><VoiceText term={term} showGloss={options.showGloss}/><input type="checkbox" checked={options[key]} onChange={(e:ChangeEvent<HTMLInputElement>)=>setOptions(c=>({...c,[key]:e.target.checked}))}/><span className="switch-track" aria-hidden="true"/></label>)}<div className="plan-options" aria-label="Reading plan books"><button className="plan-option" type="button" onClick={()=>openPlanSelector('progressive')}><span><strong>Πρόοδος</strong>{options.showGloss&&<small>Progressive book</small>}</span><span><em>{progressiveBook?.titleGreek ?? 'Γραφαί'}</em><small>{progressiveBook?.code}</small></span><span aria-hidden="true">›</span></button><button className="plan-option" type="button" onClick={()=>openPlanSelector('challenge')}><span><strong>Ἄσκησις</strong>{options.showGloss&&<small>Challenge book</small>}</span><span><em>{challengeBook?.titleGreek ?? 'Γραφαί'}</em><small>{challengeBook?.code}</small></span><span aria-hidden="true">›</span></button></div></div><HelpPanel showGloss={options.showGloss}/><section className="about-panel" aria-labelledby="about-title"><h3 id="about-title"><span>Περί</span>{options.showGloss&&<small>About</small>}</h3><div className="about-sources"><p>Ἀνάγνωσις is a daily Greek Scripture reader with completion-based plans and open-text reading.</p><p>SBLGNT 1.2 · CC BY 4.0</p><p>LXX Swete / First1KGreek · CC BY-SA 4.0</p><p>Lexical metadata: <a href="https://www.stepbible.org/" target="_blank" rel="noreferrer">STEP Bible</a> TAGNT, TEGMC, and TBESG · CC BY 4.0</p><p>Word assistance applies only to SBLGNT Progressive, Challenge, and Open Text readings; LXX lexical assistance is not currently included.</p><p>Διδαχὴ 9–10 and traditional Greek prayers · public domain</p></div></section></section></div>}
    {scriptureBrowserDialog}
  </section></main>

  if(!displayedEntry)return null
  const isWeekdayPrayer=displayedEntry.kind==='prayer'&&displayedEntry.id.startsWith('weekday-prayer:')
  const isMealPrayer=displayedEntry.id.startsWith('meal:')
  const isMarked=activeStream
    ? activeEntry?.id !== currentAssignmentId
    : activeEntry
      ? markedToday(activeEntry.id)
      : false
  const readerBannerKind: ReaderBannerKind | null = isDisplayedPsalm
    ? 'psalm'
    : displayedEntry.id === 'meal:after'
      ? 'after-meal'
      : isMealPrayer
        ? 'meal'
        : displayedEntry.kind === 'prayer'
          ? 'altar'
          : null
  function readingCompletionBoundary(verseId: string) {
    if (
      !activeStream
      || !activeEndpointId
      || verseId !== activeEndpointId
      || reviewEntry
      || freeReadingEntry
    ) return null

    return <span className="reading-completion-boundary">
      <span className="reading-completion-label">
        <span>Τέλος τοῦ ἀναγνώσματος</span>
        {options.showGloss&&<small>Today’s reading ends here</small>}
      </span>
      {!isMarked
        ? <button className="reading-completion-button" type="button" onClick={completeActiveEntry}><strong>Σφράγισον</strong>{options.showGloss&&<small>Mark read</small>}</button>
        : <><span className="reading-completion-confirmed" role="status"><strong>Πεπλήρωται</strong>{options.showGloss&&<small>Marked read</small>}</span><span className="reading-completion-actions">{activeStream!=='psalm'&&activePlanComplete?<><button className="reading-completion-action" type="button" onClick={()=>openPlanSelector(activeStream)}><strong>Ἑλοῦ βιβλίου</strong>{options.showGloss&&<small>Choose next book</small>}</button><button className="reading-completion-action" type="button" onClick={()=>restartPlan(activeStream)}><strong>Ἀνάγνωθι πάλιν</strong>{options.showGloss&&<small>Read again</small>}</button></>:<button className="reading-completion-action" type="button" onClick={proceed}><strong>Πρόβαινε</strong>{options.showGloss&&<small>Continue</small>}</button>}<button className="reading-completion-action" type="button" onClick={()=>{pendingScroll.current={kind:'top'};setView('office')}}><strong>Οἶκος</strong>{options.showGloss&&<small>Home</small>}</button></span></>}
    </span>
  }
  function scriptureBookBoundary(bookId: string, previousBookId?: string) {
    if (!previousBookId || previousBookId === bookId) return null
    return <h2 className="reader-book-boundary">
      {bookForCorpus(displayedCorpus, bookId)?.titleGreek ?? bookId}
    </h2>
  }
  function renderScriptureBody() {
    if (!scriptureReading) return null

    if (isLongForm) {
      return <div className="long-form-text">{chapterGroups.map((group,groupIndex)=><div className="continuous-chapter-block" key={`${group.bookId}:${String(group.chapter)}`}>{scriptureBookBoundary(group.bookId,chapterGroups[groupIndex-1]?.bookId)}<section className="long-form-chapter"><span className="chapter-marker">{group.chapter}</span><p>{group.verses.map(verse=>{const index=scriptureReading.verses.findIndex(candidate=>candidate.id===verse.id);return <span className={index===displayedVerseIndex?'long-form-verse current-verse':'long-form-verse'} id={verse.id} key={verse.id} ref={element=>{verseElements.current[verse.id]=element}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(event:MouseEvent<HTMLButtonElement>)=>{event.stopPropagation();moveToVerse(index)}}>{verse.number}</button>{renderVerseText(verse)}{' '}{readingCompletionBoundary(verse.id)}</span>})}</p></section></div>)}</div>
    }

    if (chapterGroups.length > 1) {
      return <div className="chaptered-verse-list">{chapterGroups.map((group,groupIndex)=><section className="chaptered-verse-section" key={`${group.bookId}:${String(group.chapter)}`}>{scriptureBookBoundary(group.bookId,chapterGroups[groupIndex-1]?.bookId)}{groupIndex>0&&<span className="chapter-marker">{group.chapter}</span>}<div className="verse-list">{group.verses.map(verse=>{const index=scriptureReading.verses.findIndex(candidate=>candidate.id===verse.id);return <span key={verse.id}><p className={index===displayedVerseIndex?'verse current-verse':'verse'} id={verse.id} ref={element=>{verseElements.current[verse.id]=element}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(event:MouseEvent<HTMLButtonElement>)=>{event.stopPropagation();moveToVerse(index)}}>{verse.number}</button>{renderVerseText(verse)}</p>{readingCompletionBoundary(verse.id)}</span>})}</div></section>)}</div>
    }

    return <div className="verse-list">{scriptureReading.verses.map((verse,index)=><span key={verse.id}><p className={index===displayedVerseIndex?'verse current-verse':'verse'} id={verse.id} ref={element=>{verseElements.current[verse.id]=element}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(event:MouseEvent<HTMLButtonElement>)=>{event.stopPropagation();moveToVerse(index)}}>{verse.number}</button>{renderVerseText(verse)}</p>{readingCompletionBoundary(verse.id)}</span>)}</div>
  }
  return <main className={`reader-shell reader-shell-${displayedEntry.kind}`}>
    <header className="reader-header">
      <button className="text-button" type="button" onClick={leaveReader}>
        <VoiceText term={{greek:'Οἶκος',english:'Home'}} showGloss={options.showGloss}/>
      </button>
      {scriptureReading&&displayedVerse
        ? <button className="reader-reference-control" type="button" onClick={()=>setReferenceNavigatorOpen(true)}><strong>{displayedBook?.titleGreek ?? displayedEntry.titleGreek}</strong><span>{displayedBook?.code ?? displayedEntry.reference} {displayedVerse.chapter}:{displayedVerse.number}</span></button>
        : <div className="reader-title"><p>{displayedEntry.titleGreek}</p>{options.showGloss&&<span>{displayedEntry.reference}</span>}</div>}
      <div className="reader-header-actions">
        {scriptureReading&&<p className="reader-progress">{Math.max(visibleVerseIndex,displayedVerseIndex)+1} / {scriptureReading.verses.length}</p>}
        {activeStream?<button className="reader-menu-trigger icon-button" type="button" aria-label="Ἐπιλογαὶ ἀναγνώσεως" onClick={()=>setReaderMenuOpen(true)}><MenuIcon/></button>:freeReadingEntry&&<button className="reader-menu-trigger icon-button" type="button" aria-label="Τόπος ἀναγνώσεως" onClick={()=>setReferenceNavigatorOpen(true)}><BookIcon/></button>}
      </div>
    </header>
    {displayedEntry.kind==='prayer'
      ? <article className="prayer-reader" lang="grc">
          <p className="prayer-section">{displayedEntry.sectionGreek}</p>
          {isWeekdayPrayer&&<nav className="weekday-tabs">{weekdayTabs.map((day,index)=><button className={['weekday-tab',index===selectedWeekday?'is-selected':'',index===today.getDay()?'is-today':''].filter(Boolean).join(' ')} type="button" key={day.short} onClick={()=>{pendingScroll.current={kind:'top'};setSelectedWeekday(index);setActiveEntry(weeklyPrayerCycle[index])}}>{day.short}</button>)}</nav>}
          <div className="prayer-meta">
            {displayedEntry.weekdayGreek&&<p className="prayer-weekday">{displayedEntry.weekdayGreek}</p>}
            <h1 className="prayer-name">{displayedEntry.titleGreek}</h1>
            <p className="prayer-reference">{displayedEntry.reference}</p>
          </div>
          {readerBannerKind&&<ReaderBanner kind={readerBannerKind}/>}
          <p className="prayer-text">{displayedEntry.textGreek}</p>
          {displayedEntry.traditionalEnding&&<aside className="traditional-ending"><p className="traditional-ending-label">{displayedEntry.traditionalEnding.labelGreek}{options.showGloss&&<span lang="en">{displayedEntry.traditionalEnding.labelEnglish}</span>}</p><p>{displayedEntry.traditionalEnding.textGreek}</p></aside>}
          {options.showGloss&&<p className="prayer-gloss" lang="en">{displayedEntry.textEnglish}{displayedEntry.traditionalEnding&&<><br/>{displayedEntry.traditionalEnding.textEnglish}</>}</p>}
        </article>
      : <article className={`scripture${isLongForm?' scripture-long-form':''}`} lang="grc">
          <p className="reading-section">{displayedEntry.sectionGreek}</p>
          {reviewEntry&&<p className="history-review-label"><span>Ἀνεγνωσμένον</span>{options.showGloss&&<small>Previously read</small>}</p>}
          {freeReadingEntry&&<p className="history-review-label free-reading-label"><span>Ἐλευθέρα ἀνάγνωσις</span></p>}
          <h1>{displayedEntry.titleGreek}</h1>
          {options.showGloss&&<p className="reader-reference">{displayedEntry.reference}</p>}
          {readerBannerKind&&<ReaderBanner kind={readerBannerKind}/>}
          {renderScriptureBody()}
        </article>}
    {displayedEntry.kind==='prayer'&&!reviewEntry&&!freeReadingEntry&&!isMealPrayer&&<footer className={`completion-actions${isMarked?' is-complete':''}${activePlanComplete?' is-plan-complete':''}`}>{!isMarked?<button className="completion-button" type="button" onClick={completeActiveEntry}><span className="control-copy"><strong>Σφράγισον</strong>{options.showGloss&&<small>Mark complete</small>}</span></button>:<div className="completion-confirmed" role="status"><span className="completion-check" aria-hidden="true">✓</span><span className="control-copy"><strong>Πεπλήρωται</strong>{options.showGloss&&<small>Completed</small>}</span></div>}{isMarked&&activeStream&&activeStream!=='psalm'&&activePlanComplete?<div className="plan-complete-actions"><button className="proceed-button" type="button" onClick={()=>openPlanSelector(activeStream)}><span className="control-copy"><strong>Ἑλοῦ βιβλίου</strong>{options.showGloss&&<small>Choose next book</small>}</span><span className="action-chevron" aria-hidden="true">›</span></button><button className="home-button" type="button" onClick={()=>restartPlan(activeStream)}><span className="control-copy"><strong>Ἀνάγνωθι πάλιν</strong>{options.showGloss&&<small>Read again</small>}</span></button></div>:isMarked&&activeStream&&<button className="proceed-button" type="button" onClick={proceed}><span className="control-copy"><strong>Πρόβαινε</strong>{options.showGloss&&<small>Continue</small>}</span><span className="action-chevron" aria-hidden="true">›</span></button>}{isMarked&&<button className="home-button" type="button" onClick={()=>{pendingScroll.current={kind:'top'};setView('office')}}><span className="control-copy"><strong>Οἶκος</strong>{options.showGloss&&<small>Home</small>}</span></button>}</footer>}
    {readerMenuOpen&&<div className="options-backdrop reader-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setReaderMenuOpen(false)}}>
      <section className="options-menu reader-options-menu" role="dialog" aria-modal="true" aria-labelledby="reader-options-title">
        <header className="options-menu-header">
          <h2 id="reader-options-title"><VoiceText term={UI.options} showGloss={options.showGloss}/></h2>
          <button className="options-close" type="button" onClick={()=>setReaderMenuOpen(false)}>×</button>
        </header>
        {scriptureReading&&displayedVerse&&<button className="reader-location-item" type="button" onClick={openScriptureBrowser}>
          <span className="reader-location-copy">
            <strong>{displayedEntry.titleGreek} {displayedVerse.chapter}:{displayedVerse.number}</strong>
            <small>{displayedBook?.code ?? displayedEntry.reference} · {displayedCorpus==='lxx'?'Septuagint':'SBLGNT'}</small>
          </span>
          <span className="reader-location-chevron" aria-hidden="true">›</span>
        </button>}
        <button className="reader-menu-item" type="button" onClick={()=>{setReaderMenuOpen(false);setReadHistoryOpen(true)}}>
          <VoiceText term={UI.readHistory} showGloss={options.showGloss}/>
          <span className="reader-menu-count">
            {activePlanComplete
              ? contentsItems.length
              : contentsItems.findIndex(item=>item.isCurrent)+1} / {contentsItems.length}
          </span>
        </button>
      </section>
    </div>}
    {readHistoryOpen&&<div className="options-backdrop reader-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setReadHistoryOpen(false)}}>
      <section className="options-menu read-history-menu" role="dialog" aria-modal="true" aria-labelledby="read-history-title">
        <header className="options-menu-header">
          <h2 id="read-history-title"><VoiceText term={UI.readHistory} showGloss={options.showGloss}/></h2>
          <button className="options-close" type="button" onClick={()=>setReadHistoryOpen(false)}>×</button>
        </header>
        {contentsItems.length
          ? <div className="read-history-list">{contentsItems.map((item)=><div className={['read-history-row',item.isCurrent?'is-current':'',item.isCompleted?'is-completed':''].filter(Boolean).join(' ')} key={`${item.streamId}:${item.assignmentIndex}:${item.id}`} ref={item.isCurrent?currentContentsItem:undefined}><button className="read-history-item" type="button" aria-current={item.isCurrent?'page':undefined} disabled={historyLoadingId!==null||historyUndoingId!==null} onClick={()=>void openContentsItem(item)}><span>{item.titleGreek}</span><small>{historyLoadingId===item.id?'Ἀνοίγεται…':item.reference}</small><em>{item.isCurrent?'Νῦν':item.isCompleted?'Ἀνεγνώσθη':'Οὔπω'}{options.showGloss&&<small>{item.isCurrent?'Current':item.isCompleted?'Read':'Unread'}</small>}</em></button>{item.isCurrent&&!item.isCompleted&&<button className="read-history-undo" type="button" disabled={historyLoadingId!==null||historyUndoingId!==null} onClick={()=>void completeHistoryItem(item)}><span>Σφράγισον</span>{options.showGloss&&<small>Mark complete</small>}</button>}{canUndoLatestCompletion&&item.id===latestCompletedId&&!item.isCurrent&&<button className="read-history-undo" type="button" disabled={historyLoadingId!==null||historyUndoingId!==null} onClick={()=>void undoHistoryItem(item)}><span>{historyUndoingId===item.id?'Ἀνακαλεῖται…':'Ἀνακάλεσον'}</span>{options.showGloss&&<small>{historyUndoingId===item.id?'Restoring…':'Undo completion'}</small>}</button>}</div>)}</div>
          : <p className="read-history-empty"><span>Οὐκ εἰσὶν ἀναγνώσματα.</span>{options.showGloss&&<small>No readings are available.</small>}</p>}
        {historyError&&<p className="read-history-error" role="alert">{historyError}</p>}
      </section>
    </div>}
    <ReaderReferenceNavigator open={referenceNavigatorOpen} corpus={displayedCorpus} bookId={displayedBookId} chapter={displayedVerse?.chapter ?? null} verseId={displayedVerse?.id ?? null} showGloss={options.showGloss} onClose={()=>setReferenceNavigatorOpen(false)} onSelect={(selection)=>void selectReaderReference(selection)}/>
    {scriptureBrowserDialog}
    {lexicalSelection&&<LexicalPopup info={lexicalSelection} anchor={lexicalAnchor} showGloss={options.showGloss} onClose={closeLexicalPopup}/>}
  </main>
}
