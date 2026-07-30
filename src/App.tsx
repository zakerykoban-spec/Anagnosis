import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { VoiceText } from './components/VoiceText'
import {
  challengeAssignmentCount,
  loadPsalm,
  resolveChallengeReading,
  resolveDailyOffice,
  weekdayTabs,
  weeklyPrayerCycle,
  type OfficeEntry,
  type ScriptureReading,
  type ScriptureVerse,
} from './data/dailyOffice'
import { mealPrayers } from './data/mealPrayers'
import {
  progressiveAssignmentCount,
  resolveProgressiveReading,
} from './data/progressiveReadings'
import {
  readHistoryItems,
  type ReadHistoryItem,
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
  saveProgress,
  updateStreamPosition,
  type ReadingProgressState,
  type ReadingStreamId,
} from './readingProgress'
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
const READ_HISTORY_CANDIDATES = {
  progressive: Array.from(
    { length: progressiveAssignmentCount() },
    (_, index) => resolveProgressiveReading(index),
  ),
  challenge: Array.from(
    { length: challengeAssignmentCount() },
    (_, index) => resolveChallengeReading(index),
  ),
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
function groupVersesByChapter(verses: ScriptureVerse[]) {
  const groups: Array<{ chapter: number; verses: ScriptureVerse[] }> = []
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

function MealIcon({ kind }: { kind: MealIconKind }) { return <span className="meal-icon" aria-hidden="true"><img className="canonical-icon" src={MEAL_ICONS[kind]} alt=""/></span> }
function ReaderBanner({ kind }: { kind: ReaderBannerKind }) { return <img className={`reader-banner reader-banner-${kind} manuscript-art`} src={READER_BANNERS[kind]} alt="" aria-hidden="true"/> }

function OfficeReadingButton({ entry, icon, showGloss, complete, onOpen }: { entry: OfficeEntry; icon: OfficeIconKind; showGloss: boolean; complete: boolean; onOpen: (entry: OfficeEntry) => void }) {
  return <button className="office-reading" type="button" onClick={() => onOpen(entry)}><OfficeIcon kind={icon}/><span className="office-reading-copy"><VoiceText term={{ greek: entry.sectionGreek, english: entry.sectionEnglish }} showGloss={showGloss}/><span className="office-reading-title">{entry.titleGreek}</span><span className="office-reading-reference">{entry.reference}</span></span><Seal complete={complete}/></button>
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
  const [historyLoadingId,setHistoryLoadingId] = useState<string|null>(null)
  const [historyError,setHistoryError] = useState<string|null>(null)
  const [selectedWeekday,setSelectedWeekday] = useState(today.getDay())
  const verseElements = useRef<Record<string,HTMLElement|null>>({})
  const menuTrigger = useRef<HTMLButtonElement|null>(null)
  const pendingScroll = useRef<
    { kind: 'top' } | { kind: 'verse'; verseId: string } | null
  >(null)

  const progressiveReading = useMemo(()=>resolveProgressiveReading(progress.streams.progressive.assignmentIndex),[progress.streams.progressive.assignmentIndex])
  const challengeReading = useMemo(()=>resolveChallengeReading(progress.streams.challenge.assignmentIndex),[progress.streams.challenge.assignmentIndex])
  const psalmNumber = (progress.streams.psalm.assignmentIndex % PSALM_COUNT) + 1
  const activeStream = streamForEntry(activeEntry)
  const historyItems = useMemo(
    ()=>activeStream
      ? readHistoryItems(
          activeStream,
          progress.streams[activeStream].completedAssignmentIds,
          READ_HISTORY_CANDIDATES,
        )
      : [],
    [activeStream,progress],
  )
  const displayedEntry = reviewEntry ?? activeEntry
  const scriptureReading = displayedEntry?.kind === 'scripture' ? displayedEntry : null
  const displayedVerseIndex = reviewEntry ? reviewVerseIndex : currentVerseIndex
  const isLongForm = activeStream === 'progressive' || activeStream === 'challenge'
  const chapterGroups = useMemo(()=>scriptureReading ? groupVersesByChapter(scriptureReading.verses) : [],[scriptureReading])

  useEffect(()=>{ localStorage.setItem(OPTIONS_KEY,JSON.stringify(options)) },[options])
  useEffect(()=>saveProgress(progress),[progress])
  useEffect(()=>{ if(!options.showPsalm)return; let cancelled=false; loadPsalm(psalmNumber).then(r=>{if(!cancelled){setPsalmReading(r);setPsalmError(null)}}).catch((e:unknown)=>{if(!cancelled)setPsalmError(e instanceof Error?e.message:'Unable to load the Psalm.')}); return()=>{cancelled=true} },[options.showPsalm,psalmNumber])
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
    setReviewEntry(null)
    setReaderMenuOpen(false)
    setReadHistoryOpen(false)
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
    if(reviewEntry)setReviewVerseIndex(nextIndex)
    else {
      setCurrentVerseIndex(nextIndex)
      if(remembersVersePosition(activeStream)){
        setProgress(c=>updateStreamPosition(c,activeStream,nextVerse.id))
      }
    }
  }
  async function openHistoryItem(item: ReadHistoryItem) {
    setHistoryError(null)
    setHistoryLoadingId(item.id)
    try {
      const reading = item.reading ?? (
        item.psalmNumber ? await loadPsalm(item.psalmNumber) : null
      )
      if (!reading) throw new Error('Unable to load this reading.')
      pendingScroll.current = { kind: 'top' }
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
  function leaveReader(){
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
  function completeActiveEntry(){ if(!activeEntry)return; if(activeStream){if(activeStream==='psalm')setPsalmReading(null);setProgress(c=>markDailySection(completeStreamAssignment(c,activeStream,activeEntry.id),officeDate.iso,activeStream))} else if(activeEntry.kind==='prayer'&&!activeEntry.id.startsWith('meal:'))setProgress(c=>markDailySection(c,officeDate.iso,activeEntry.id)) }
  function proceed(){ if(!activeStream)return; const next=activeStream==='progressive'?resolveProgressiveReading(progress.streams.progressive.assignmentIndex):activeStream==='challenge'?resolveChallengeReading(progress.streams.challenge.assignmentIndex):psalmReading; if(next)openEntry(next) }
  const markedToday=(id:string)=>isDailySectionMarked(progress,officeDate.iso,id)

  if(view==='office') return <main className="office-shell"><section className="office-card" aria-labelledby="office-title">
    <header className="office-toolbar"><button className="icon-button" type="button" ref={menuTrigger} aria-label="Ἐπιλογαί" onClick={()=>setMenuOpen(true)}><MenuIcon/></button><div className="office-brand"><p className="app-name">Ἀνάγνωσις</p>{options.showGloss&&<span className="app-name-gloss">Reading</span>}</div><time className="calendar-mark" dateTime={officeDate.iso}><span className="calendar-day">{officeDate.day}</span><span className="calendar-copy"><strong>{officeDate.weekdayGreek}</strong><span>{officeDate.monthGreek} {officeDate.year}</span>{options.showGloss&&<small>{officeDate.english}</small>}</span></time></header>
    <header className="office-heading" id="office-title"><VoiceText term={UI.todaysReading} showGloss={options.showGloss}/></header><div className="office-list"><OfficeReadingButton entry={calendarOffice.openingPrayer} icon="prayer" showGloss={options.showGloss} complete={markedToday(calendarOffice.openingPrayer.id)} onOpen={openEntry}/>{options.showProgressive&&<OfficeReadingButton entry={progressiveReading} icon="codex" showGloss={options.showGloss} complete={markedToday('progressive')} onOpen={openEntry}/>} {options.showChallenge&&<OfficeReadingButton entry={challengeReading} icon="lamp" showGloss={options.showGloss} complete={markedToday('challenge')} onOpen={openEntry}/>} {options.showPsalm&&(psalmReading?<OfficeReadingButton entry={psalmReading} icon="lyre" showGloss={options.showGloss} complete={markedToday('psalm')} onOpen={openEntry}/>:<div className="office-reading office-reading-status">{psalmError??`Ψαλμὸς ${psalmNumber}…`}</div>)}<OfficeReadingButton entry={calendarOffice.closingPrayer} icon="lampstand" showGloss={options.showGloss} complete={markedToday(calendarOffice.closingPrayer.id)} onOpen={openEntry}/></div><MealPrayerDock showGloss={options.showGloss} onOpen={openEntry}/>
    {menuOpen&&<div className="options-backdrop" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setMenuOpen(false)}}><section className="options-menu" role="dialog" aria-modal="true"><header className="options-menu-header"><h2><VoiceText term={UI.options} showGloss={options.showGloss}/></h2><button className="options-close" type="button" onClick={()=>setMenuOpen(false)}>×</button></header><div className="options-list">{([{key:'showGloss',term:UI.englishAids},{key:'showProgressive',term:UI.progressiveReading},{key:'showChallenge',term:UI.challengeReading},{key:'showPsalm',term:UI.psalm}] as const).map(({key,term})=><label className="option-switch" key={key}><VoiceText term={term} showGloss={options.showGloss}/><input type="checkbox" checked={options[key]} onChange={(e:ChangeEvent<HTMLInputElement>)=>setOptions(c=>({...c,[key]:e.target.checked}))}/><span className="switch-track" aria-hidden="true"/></label>)}</div><section className="about-panel" aria-labelledby="about-title"><h3 id="about-title"><span>Περί</span>{options.showGloss&&<small>About</small>}</h3><div className="about-sources"><p>SBLGNT 1.2 · CC BY 4.0</p><p>LXX Swete / First1KGreek · CC BY-SA 4.0</p><p>Διδαχὴ 9–10 and traditional Greek prayers · public domain</p></div></section></section></div>}
  </section></main>

  if(!activeEntry || !displayedEntry)return null
  const isWeekdayPrayer=displayedEntry.kind==='prayer'&&displayedEntry.id.startsWith('weekday-prayer:')
  const isMealPrayer=displayedEntry.id.startsWith('meal:')
  const isMarked=activeStream?markedToday(activeStream):markedToday(activeEntry.id)
  const readerBannerKind: ReaderBannerKind | null = activeStream === 'psalm'
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
        {activeStream&&<button className="reader-menu-trigger icon-button" type="button" aria-label="Ἐπιλογαὶ ἀναγνώσεως" onClick={()=>setReaderMenuOpen(true)}><MenuIcon/></button>}
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
    {!reviewEntry&&!isMealPrayer&&<footer className={`completion-actions${isMarked?' is-complete':''}`}>{!isMarked?<button className="completion-button" type="button" onClick={completeActiveEntry}><span className="control-copy"><strong>Σφράγισον</strong>{options.showGloss&&<small>Mark complete</small>}</span></button>:<div className="completion-confirmed" role="status"><span className="completion-check" aria-hidden="true">✓</span><span className="control-copy"><strong>Πεπλήρωται</strong>{options.showGloss&&<small>Completed</small>}</span></div>}{isMarked&&activeStream&&<button className="proceed-button" type="button" onClick={proceed}><span className="control-copy"><strong>Πρόβαινε</strong>{options.showGloss&&<small>Continue</small>}</span><span className="action-chevron" aria-hidden="true">›</span></button>}{isMarked&&<button className="home-button" type="button" onClick={()=>{pendingScroll.current={kind:'top'};setView('office')}}><span className="control-copy"><strong>Οἶκος</strong>{options.showGloss&&<small>Home</small>}</span></button>}</footer>}
    {readerMenuOpen&&<div className="options-backdrop reader-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setReaderMenuOpen(false)}}>
      <section className="options-menu reader-options-menu" role="dialog" aria-modal="true" aria-labelledby="reader-options-title">
        <header className="options-menu-header">
          <h2 id="reader-options-title"><VoiceText term={UI.options} showGloss={options.showGloss}/></h2>
          <button className="options-close" type="button" onClick={()=>setReaderMenuOpen(false)}>×</button>
        </header>
        <button className="reader-menu-item" type="button" onClick={()=>{setReaderMenuOpen(false);setReadHistoryOpen(true)}}>
          <VoiceText term={UI.readHistory} showGloss={options.showGloss}/>
          <span className="reader-menu-count">{historyItems.length}</span>
        </button>
      </section>
    </div>}
    {readHistoryOpen&&<div className="options-backdrop reader-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setReadHistoryOpen(false)}}>
      <section className="options-menu read-history-menu" role="dialog" aria-modal="true" aria-labelledby="read-history-title">
        <header className="options-menu-header">
          <h2 id="read-history-title"><VoiceText term={UI.readHistory} showGloss={options.showGloss}/></h2>
          <button className="options-close" type="button" onClick={()=>setReadHistoryOpen(false)}>×</button>
        </header>
        {historyItems.length
          ? <div className="read-history-list">{historyItems.map(item=><button className="read-history-item" type="button" key={item.id} disabled={historyLoadingId!==null} onClick={()=>void openHistoryItem(item)}><span>{item.titleGreek}</span><small>{historyLoadingId===item.id?'Ἀνοίγεται…':item.reference}</small></button>)}</div>
          : <p className="read-history-empty"><span>Οὔπω ἀνάγνωσμα πεπλήρωται.</span>{options.showGloss&&<small>No completed readings yet.</small>}</p>}
        {historyError&&<p className="read-history-error" role="alert">{historyError}</p>}
      </section>
    </div>}
  </main>
}
