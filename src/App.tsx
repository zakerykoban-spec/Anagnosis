import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { VoiceText } from './components/VoiceText'
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
import prayerHandsIcon from './assets/icons/icon-prayer.png'
import scrollIcon from './assets/icons/icon-scroll.png'
import sealMarkIcon from './assets/icons/seal-pending.png'
import waxSealIcon from './assets/icons/seal-complete.png'
import './App.css'
import './pass1.css'
import './pass2.css'
import './pass3.css'
import './artwork.css'

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

const OPTIONS_KEY = 'anagnosis.options.v1'
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
    chapter: ScriptureReferencePart
    verses: ScriptureVerse[]
  }> = []
  verses.forEach((verse) => {
    const last = groups[groups.length - 1]
    if (!last || last.chapter !== verse.chapter) groups.push({ chapter: verse.chapter, verses: [verse] })
    else last.verses.push(verse)
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
  const [selectedWeekday,setSelectedWeekday] = useState(today.getDay())
  const verseElements = useRef<Record<string,HTMLElement|null>>({})
  const menuTrigger = useRef<HTMLButtonElement|null>(null)
  const currentContentsItem = useRef<HTMLDivElement|null>(null)
  const pendingScroll = useRef<
    { kind: 'top' } | { kind: 'verse'; verseId: string } | null
  >(null)

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
  const displayedEntry = freeReadingEntry ?? reviewEntry ?? activeEntry
  const scriptureReading = displayedEntry?.kind === 'scripture' ? displayedEntry : null
  const displayedVerseIndex = freeReadingEntry
    ? freeReadingVerseIndex
    : reviewEntry
      ? reviewVerseIndex
      : currentVerseIndex
  const displayedCorpus = scriptureReading
    ? corpusForReading(scriptureReading)
    : 'sblgnt'
  const displayedVerse = scriptureReading?.verses[displayedVerseIndex] ?? null
  const displayedBookId = scriptureReading
    ? bookIdForReading(scriptureReading)
    : null
  const displayedBook = bookForCorpus(displayedCorpus, displayedBookId)
  const isDisplayedPsalm = displayedBookId === 'psalms'
  const isLongForm = freeReadingEntry
    ? !isDisplayedPsalm
    : activeStream === 'progressive' || activeStream === 'challenge'
  const scriptureBrowserBooks = booksForCorpus(scriptureBrowserCorpus)
  const scriptureBrowserBook = bookForCorpus(
    scriptureBrowserCorpus,
    scriptureBrowserBookId,
  )
  const chapterGroups = useMemo(()=>scriptureReading ? groupVersesByChapter(scriptureReading.verses) : [],[scriptureReading])

  useEffect(()=>{ localStorage.setItem(OPTIONS_KEY,JSON.stringify(options)) },[options])
  useEffect(()=>saveProgress(progress),[progress])
  useEffect(()=>{ if(!options.showPsalm)return; let cancelled=false; loadPsalm(psalmNumber).then(r=>{if(!cancelled){setPsalmReading(r);setPsalmError(null)}}).catch((e:unknown)=>{if(!cancelled)setPsalmError(e instanceof Error?e.message:'Unable to load the Psalm.')}); return()=>{cancelled=true} },[options.showPsalm,psalmNumber])
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

  function openEntry(entry: OfficeEntry){
    const stream=streamForEntry(entry)
    const nextIndex=entry.kind==='scripture'&&stream
      ? restoredVerseIndex(
          stream,
          progress.streams[stream].lastVerseId,
          entry.verses.map(verse=>verse.id),
        )
      : 0
    const rememberedVerseId=nextIndex>0&&entry.kind==='scripture'
      ? entry.verses[nextIndex].id
      : null
    if(entry.kind==='scripture'&&remembersVersePosition(stream)){
      setProgress(c=>updateStreamPosition(c,stream,entry.verses[nextIndex].id))
    }
    pendingScroll.current=rememberedVerseId
      ? {kind:'verse',verseId:rememberedVerseId}
      : {kind:'top'}
    setFreeReadingEntry(null)
    setReviewEntry(null)
    setReaderMenuOpen(false)
    setReadHistoryOpen(false)
    setScriptureBrowserOpen(false)
    setCurrentVerseIndex(nextIndex)
    if(entry.id.startsWith('weekday-prayer:'))setSelectedWeekday(today.getDay())
    setActiveEntry(entry)
    setView('reader')
  }
  function moveToVerse(index:number){
    if(!scriptureReading)return
    const nextIndex=Math.min(Math.max(index,0),scriptureReading.verses.length-1)
    const nextVerse=scriptureReading.verses[nextIndex]
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
    else {
      setCurrentVerseIndex(nextIndex)
      if(remembersVersePosition(activeStream)){
        setProgress(c=>updateStreamPosition(c,activeStream,nextVerse.id))
      }
    }
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
    setPlanSelectorStream(null)
    setScriptureBrowserCorpus(displayedCorpus)
    setScriptureBrowserBookId(null)
    setScriptureBrowserView('books')
    setScriptureBrowserError(null)
    setReaderMenuOpen(false)
    setScriptureBrowserOpen(true)
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
      const reading = scriptureBrowserCorpus === 'lxx'
        ? await loadLxxChapter(book.id, chapterNumber)
        : await loadSblgntChapter(book.id, chapterNumber)

      pendingScroll.current = { kind: 'top' }
      setFreeReadingEntry(reading)
      setFreeReadingVerseIndex(0)
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
  function leaveReader(){
    if(freeReadingEntry){
      const activeVerse=activeEntry?.kind==='scripture'
        ? activeEntry.verses[currentVerseIndex]
        : null
      pendingScroll.current=remembersVersePosition(activeStream)&&activeVerse
        ? {kind:'verse',verseId:activeVerse.id}
        : {kind:'top'}
      setFreeReadingEntry(null)
      setScriptureBrowserOpen(false)
      if(!activeEntry)setView('office')
      return
    }
    if(reviewEntry){
      const activeVerse=activeEntry?.kind==='scripture'
        ? activeEntry.verses[currentVerseIndex]
        : null
      pendingScroll.current=remembersVersePosition(activeStream)&&activeVerse
        ? {kind:'verse',verseId:activeVerse.id}
        : {kind:'top'}
      setReviewEntry(null)
      setReadHistoryOpen(true)
      return
    }
    pendingScroll.current={kind:'top'}
    setReaderMenuOpen(false)
    setReadHistoryOpen(false)
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
    <header className="office-toolbar"><button className="icon-button" type="button" ref={menuTrigger} aria-label="Ἐπιλογαί" onClick={()=>setMenuOpen(true)}><MenuIcon/></button><div className="office-brand"><p className="app-name">Ἀνάγνωσις</p>{options.showGloss&&<span className="app-name-gloss">Reading</span>}</div><time className="calendar-mark" dateTime={officeDate.iso}><span className="calendar-day">{officeDate.day}</span><span className="calendar-copy"><strong>{officeDate.weekdayGreek}</strong><span>{officeDate.monthGreek} {officeDate.year}</span>{options.showGloss&&<small>{officeDate.english}</small>}</span></time><button className="icon-button free-reading-trigger" type="button" aria-label="Ἐλευθέρα ἀνάγνωσις · Free reading" title="Free reading" onClick={openFreeReadingBrowser}><BookIcon/></button></header>
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
    <MealPrayerDock showGloss={options.showGloss} onOpen={openEntry}/>
    {menuOpen&&<div className="options-backdrop" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setMenuOpen(false)}}><section className="options-menu" role="dialog" aria-modal="true"><header className="options-menu-header"><h2><VoiceText term={UI.options} showGloss={options.showGloss}/></h2><button className="options-close" type="button" onClick={()=>setMenuOpen(false)}>×</button></header><div className="options-list">{([{key:'showGloss',term:UI.englishAids},{key:'showProgressive',term:UI.progressiveReading},{key:'showChallenge',term:UI.challengeReading},{key:'showPsalm',term:UI.psalm}] as const).map(({key,term})=><label className="option-switch" key={key}><VoiceText term={term} showGloss={options.showGloss}/><input type="checkbox" checked={options[key]} onChange={(e:ChangeEvent<HTMLInputElement>)=>setOptions(c=>({...c,[key]:e.target.checked}))}/><span className="switch-track" aria-hidden="true"/></label>)}<div className="plan-options" aria-label="Reading plan books"><button className="plan-option" type="button" onClick={()=>openPlanSelector('progressive')}><span><strong>Πρόοδος</strong>{options.showGloss&&<small>Progressive book</small>}</span><span><em>{progressiveBook?.titleGreek ?? 'Γραφαί'}</em><small>{progressiveBook?.code}</small></span><span aria-hidden="true">›</span></button><button className="plan-option" type="button" onClick={()=>openPlanSelector('challenge')}><span><strong>Ἄσκησις</strong>{options.showGloss&&<small>Challenge book</small>}</span><span><em>{challengeBook?.titleGreek ?? 'Γραφαί'}</em><small>{challengeBook?.code}</small></span><span aria-hidden="true">›</span></button></div></div><section className="about-panel" aria-labelledby="about-title"><h3 id="about-title"><span>Περί</span>{options.showGloss&&<small>About</small>}</h3><div className="about-sources"><p>SBLGNT 1.2 · CC BY 4.0</p><p>LXX Swete / First1KGreek · CC BY-SA 4.0</p><p>Διδαχὴ 9–10 and traditional Greek prayers · public domain</p></div></section></section></div>}
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
  return <main className={`reader-shell reader-shell-${displayedEntry.kind}`}>
    <header className="reader-header">
      <button className="text-button" type="button" onClick={leaveReader}>
        <VoiceText term={UI.back} showGloss={options.showGloss}/>
      </button>
      <div className="reader-title">
        <p>{displayedEntry.titleGreek}</p>
        {options.showGloss&&<span>{displayedEntry.reference}</span>}
      </div>
      <div className="reader-header-actions">
        {scriptureReading&&<p className="reader-progress">{displayedVerseIndex+1} / {scriptureReading.verses.length}</p>}
        {activeStream?<button className="reader-menu-trigger icon-button" type="button" aria-label="Ἐπιλογαὶ ἀναγνώσεως" onClick={()=>setReaderMenuOpen(true)}><MenuIcon/></button>:freeReadingEntry&&<button className="reader-menu-trigger icon-button" type="button" aria-label="Γραφαί · Free reading contents" onClick={openFreeReadingBrowser}><BookIcon/></button>}
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
          {freeReadingEntry&&<p className="history-review-label free-reading-label"><span>Ἐλευθέρα ἀνάγνωσις</span>{options.showGloss&&<small>Free reading · devotional progress unchanged</small>}</p>}
          <h1>{displayedEntry.titleGreek}</h1>
          {options.showGloss&&<p className="reader-reference">{displayedEntry.reference}</p>}
          {readerBannerKind&&<ReaderBanner kind={readerBannerKind}/>}
          {isLongForm
            ? <div className="long-form-text">{chapterGroups.map(ch=><section className="long-form-chapter" key={ch.chapter}><span className="chapter-marker">{ch.chapter}</span><p>{ch.verses.map(verse=>{const index=displayedEntry.verses.findIndex(v=>v.id===verse.id);return <span className={index===displayedVerseIndex?'long-form-verse current-verse':'long-form-verse'} id={verse.id} key={verse.id} ref={el=>{verseElements.current[verse.id]=el}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(e:MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();moveToVerse(index)}}>{verse.number}</button><span>{verse.displayText}</span>{' '}</span>})}</p></section>)}</div>
            : <div className="verse-list">{displayedEntry.verses.map((verse,index)=><p className={index===displayedVerseIndex?'verse current-verse':'verse'} id={verse.id} key={verse.id} ref={el=>{verseElements.current[verse.id]=el}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(e:MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();moveToVerse(index)}}>{verse.number}</button><span>{verse.displayText}</span></p>)}</div>}
        </article>}
    {scriptureReading&&<nav className="reader-navigation" aria-label="Πλοήγησις στίχων">
      <button className="navigation-button navigation-button-back" type="button" disabled={displayedVerseIndex===0} onClick={()=>moveToVerse(displayedVerseIndex-1)}><span className="navigation-chevron" aria-hidden="true">‹</span><span className="control-copy"><strong>Ὀπίσω</strong>{options.showGloss&&<small>Previous verse</small>}</span></button>
      <button className="navigation-button navigation-button-next" type="button" disabled={displayedVerseIndex===scriptureReading.verses.length-1} onClick={()=>moveToVerse(displayedVerseIndex+1)}><span className="control-copy"><strong>Ἔμπροσθεν</strong>{options.showGloss&&<small>Next verse</small>}</span><span className="navigation-chevron" aria-hidden="true">›</span></button>
    </nav>}
    {!reviewEntry&&!freeReadingEntry&&!isMealPrayer&&<footer className={`completion-actions${isMarked?' is-complete':''}${activePlanComplete?' is-plan-complete':''}`}>{!isMarked?<button className="completion-button" type="button" onClick={completeActiveEntry}><span className="control-copy"><strong>Σφράγισον</strong>{options.showGloss&&<small>Mark complete</small>}</span></button>:<div className="completion-confirmed" role="status"><span className="completion-check" aria-hidden="true">✓</span><span className="control-copy"><strong>Πεπλήρωται</strong>{options.showGloss&&<small>Completed</small>}</span></div>}{isMarked&&activeStream&&activeStream!=='psalm'&&activePlanComplete?<div className="plan-complete-actions"><button className="proceed-button" type="button" onClick={()=>openPlanSelector(activeStream)}><span className="control-copy"><strong>Ἑλοῦ βιβλίου</strong>{options.showGloss&&<small>Choose next book</small>}</span><span className="action-chevron" aria-hidden="true">›</span></button><button className="home-button" type="button" onClick={()=>restartPlan(activeStream)}><span className="control-copy"><strong>Ἀνάγνωθι πάλιν</strong>{options.showGloss&&<small>Read again</small>}</span></button></div>:isMarked&&activeStream&&<button className="proceed-button" type="button" onClick={proceed}><span className="control-copy"><strong>Πρόβαινε</strong>{options.showGloss&&<small>Continue</small>}</span><span className="action-chevron" aria-hidden="true">›</span></button>}{isMarked&&<button className="home-button" type="button" onClick={()=>{pendingScroll.current={kind:'top'};setView('office')}}><span className="control-copy"><strong>Οἶκος</strong>{options.showGloss&&<small>Home</small>}</span></button>}</footer>}
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
          ? <div className="read-history-list">{contentsItems.map((item)=><div className={['read-history-row',item.isCurrent?'is-current':'',item.isCompleted?'is-completed':''].filter(Boolean).join(' ')} key={`${item.streamId}:${item.assignmentIndex}:${item.id}`} ref={item.isCurrent?currentContentsItem:undefined}><button className="read-history-item" type="button" aria-current={item.isCurrent?'page':undefined} disabled={historyLoadingId!==null||historyUndoingId!==null} onClick={()=>void openContentsItem(item)}><span>{item.titleGreek}</span><small>{historyLoadingId===item.id?'Ἀνοίγεται…':item.reference}</small><em>{item.isCurrent?'Νῦν':item.isCompleted?'Ἀνεγνώσθη':'Οὔπω'}{options.showGloss&&<small>{item.isCurrent?'Current':item.isCompleted?'Read':'Unread'}</small>}</em></button>{canUndoLatestCompletion&&item.id===latestCompletedId&&!item.isCurrent&&<button className="read-history-undo" type="button" disabled={historyLoadingId!==null||historyUndoingId!==null} onClick={()=>void undoHistoryItem(item)}><span>{historyUndoingId===item.id?'Ἀνακαλεῖται…':'Ἀνακάλεσον'}</span>{options.showGloss&&<small>{historyUndoingId===item.id?'Restoring…':'Undo completion'}</small>}</button>}</div>)}</div>
          : <p className="read-history-empty"><span>Οὐκ εἰσὶν ἀναγνώσματα.</span>{options.showGloss&&<small>No readings are available.</small>}</p>}
        {historyError&&<p className="read-history-error" role="alert">{historyError}</p>}
      </section>
    </div>}
    {scriptureBrowserDialog}
  </main>
}
