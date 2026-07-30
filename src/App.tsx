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
  type ScriptureVerse,
} from './data/dailyOffice'
import { mealPrayers } from './data/mealPrayers'
import { resolveProgressiveReading } from './data/progressiveReadings'
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
import arrowLeftIcon from './assets/icons/arrow-left.png'
import arrowRightIcon from './assets/icons/arrow-right.png'
import homeIcon from './assets/icons/icon-home.png'
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
const OFFICE_START = new Date(2026, 6, 25)
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

function dateForAssignment(index: number) { const date = new Date(OFFICE_START); date.setDate(date.getDate() + index); return date }
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
  const [selectedWeekday,setSelectedWeekday] = useState(today.getDay())
  const verseElements = useRef<Record<string,HTMLElement|null>>({})
  const menuTrigger = useRef<HTMLButtonElement|null>(null)

  const progressiveReading = useMemo(()=>resolveProgressiveReading(progress.streams.progressive.assignmentIndex),[progress.streams.progressive.assignmentIndex])
  const challengeReading = useMemo(()=>resolveDailyOffice(dateForAssignment(progress.streams.challenge.assignmentIndex)).challengeReading,[progress.streams.challenge.assignmentIndex])
  const psalmNumber = (progress.streams.psalm.assignmentIndex % PSALM_COUNT) + 1
  const scriptureReading = activeEntry?.kind === 'scripture' ? activeEntry : null
  const currentVerse = scriptureReading?.verses[currentVerseIndex]
  const activeStream = streamForEntry(activeEntry)
  const isLongForm = activeStream === 'progressive' || activeStream === 'challenge'
  const chapterGroups = useMemo(()=>scriptureReading ? groupVersesByChapter(scriptureReading.verses) : [],[scriptureReading])

  useEffect(()=>{ localStorage.setItem(OPTIONS_KEY,JSON.stringify(options)); document.documentElement.dataset.theme='light' },[options])
  useEffect(()=>saveProgress(progress),[progress])
  useEffect(()=>{ if(!options.showPsalm)return; let cancelled=false; setPsalmReading(null); loadPsalm(psalmNumber).then(r=>{if(!cancelled){setPsalmReading(r);setPsalmError(null)}}).catch((e:unknown)=>{if(!cancelled)setPsalmError(e instanceof Error?e.message:'Unable to load the Psalm.')}); return()=>{cancelled=true} },[options.showPsalm,psalmNumber])
  useEffect(()=>{ if(view==='reader'&&scriptureReading&&currentVerse&&activeStream)setProgress(c=>updateStreamPosition(c,activeStream,currentVerse.id)) },[activeStream,currentVerse,scriptureReading,view])
  useEffect(()=>{ if(view!=='reader'||!scriptureReading)return; const verse=scriptureReading.verses[currentVerseIndex]; requestAnimationFrame(()=>verseElements.current[verse.id]?.scrollIntoView({behavior:'smooth',block:'center'})) },[currentVerseIndex,scriptureReading,view])

  function openEntry(entry: OfficeEntry){ const stream=streamForEntry(entry); if(entry.kind==='scripture'&&stream){const saved=progress.streams[stream].lastVerseId;setCurrentVerseIndex(Math.max(0,entry.verses.findIndex(v=>v.id===saved)))}else setCurrentVerseIndex(0); if(entry.id.startsWith('weekday-prayer:'))setSelectedWeekday(today.getDay());setActiveEntry(entry);setView('reader') }
  function moveToVerse(index:number){ if(scriptureReading)setCurrentVerseIndex(Math.min(Math.max(index,0),scriptureReading.verses.length-1)) }
  function completeActiveEntry(){ if(!activeEntry)return; if(activeStream)setProgress(c=>markDailySection(completeStreamAssignment(c,activeStream,activeEntry.id),officeDate.iso,activeStream)); else if(activeEntry.kind==='prayer'&&!activeEntry.id.startsWith('meal:'))setProgress(c=>markDailySection(c,officeDate.iso,activeEntry.id)) }
  function proceed(){ if(!activeStream)return; const next=activeStream==='progressive'?resolveProgressiveReading(progress.streams.progressive.assignmentIndex):activeStream==='challenge'?resolveDailyOffice(dateForAssignment(progress.streams.challenge.assignmentIndex)).challengeReading:psalmReading; if(next)openEntry(next) }
  const markedToday=(id:string)=>isDailySectionMarked(progress,officeDate.iso,id)

  if(view==='office') return <main className="office-shell"><section className="office-card" aria-labelledby="office-title">
    <header className="office-toolbar"><button className="icon-button" type="button" ref={menuTrigger} aria-label="Ἐπιλογαί" onClick={()=>setMenuOpen(true)}><MenuIcon/></button><div className="office-brand"><p className="app-name">Ἀνάγνωσις</p>{options.showGloss&&<span className="app-name-gloss">Reading</span>}</div><time className="calendar-mark" dateTime={officeDate.iso}><span className="calendar-day">{officeDate.day}</span><span className="calendar-copy"><strong>{officeDate.weekdayGreek}</strong><span>{officeDate.monthGreek} {officeDate.year}</span>{options.showGloss&&<small>{officeDate.english}</small>}</span></time></header>
    <header className="office-heading" id="office-title"><VoiceText term={UI.todaysReading} showGloss={options.showGloss}/></header><div className="office-list"><OfficeReadingButton entry={calendarOffice.openingPrayer} icon="prayer" showGloss={options.showGloss} complete={markedToday(calendarOffice.openingPrayer.id)} onOpen={openEntry}/>{options.showProgressive&&<OfficeReadingButton entry={progressiveReading} icon="codex" showGloss={options.showGloss} complete={markedToday('progressive')} onOpen={openEntry}/>} {options.showChallenge&&<OfficeReadingButton entry={challengeReading} icon="lamp" showGloss={options.showGloss} complete={markedToday('challenge')} onOpen={openEntry}/>} {options.showPsalm&&(psalmReading?<OfficeReadingButton entry={psalmReading} icon="lyre" showGloss={options.showGloss} complete={markedToday('psalm')} onOpen={openEntry}/>:<div className="office-reading office-reading-status">{psalmError??`Ψαλμὸς ${psalmNumber}…`}</div>)}<OfficeReadingButton entry={calendarOffice.closingPrayer} icon="lampstand" showGloss={options.showGloss} complete={markedToday(calendarOffice.closingPrayer.id)} onOpen={openEntry}/></div><MealPrayerDock showGloss={options.showGloss} onOpen={openEntry}/>
    {menuOpen&&<div className="options-backdrop" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setMenuOpen(false)}}><section className="options-menu" role="dialog" aria-modal="true"><header className="options-menu-header"><h2><VoiceText term={UI.options} showGloss={options.showGloss}/></h2><button className="options-close" type="button" onClick={()=>setMenuOpen(false)}>×</button></header><div className="options-list">{([{key:'showGloss',term:UI.englishAids},{key:'showProgressive',term:UI.progressiveReading},{key:'showChallenge',term:UI.challengeReading},{key:'showPsalm',term:UI.psalm}] as const).map(({key,term})=><label className="option-switch" key={key}><VoiceText term={term} showGloss={options.showGloss}/><input type="checkbox" checked={options[key]} onChange={(e:ChangeEvent<HTMLInputElement>)=>setOptions(c=>({...c,[key]:e.target.checked}))}/><span className="switch-track" aria-hidden="true"/></label>)}</div><section className="about-panel" aria-labelledby="about-title"><h3 id="about-title"><span>Περί</span>{options.showGloss&&<small>About</small>}</h3><div className="about-sources"><p>SBLGNT 1.2 · CC BY 4.0</p><p>LXX Swete / First1KGreek · CC BY-SA 4.0</p><p>Διδαχὴ 9–10 and traditional Greek prayers · public domain</p></div></section></section></div>}
  </section></main>

  if(!activeEntry)return null
  const isWeekdayPrayer=activeEntry.kind==='prayer'&&activeEntry.id.startsWith('weekday-prayer:')
  const isMealPrayer=activeEntry.id.startsWith('meal:')
  const isMarked=activeStream?markedToday(activeStream):markedToday(activeEntry.id)
  const readerBannerKind: ReaderBannerKind | null = activeStream === 'psalm'
    ? 'psalm'
    : activeEntry.id === 'meal:after'
      ? 'after-meal'
      : isMealPrayer
        ? 'meal'
        : activeEntry.kind === 'prayer'
          ? 'altar'
          : null
  return <main className="reader-shell"><header className="reader-header"><button className="text-button" type="button" onClick={()=>setView('office')}><VoiceText term={UI.back} showGloss={options.showGloss}/></button><div className="reader-title"><p>{activeEntry.titleGreek}</p>{options.showGloss&&<span>{activeEntry.reference}</span>}</div>{scriptureReading?<p className="reader-progress">{currentVerseIndex+1} / {scriptureReading.verses.length}</p>:<span/>}</header>
    {activeEntry.kind==='prayer'?<article className="prayer-reader" lang="grc"><p className="prayer-section">{activeEntry.sectionGreek}</p>{isWeekdayPrayer&&<nav className="weekday-tabs">{weekdayTabs.map((day,index)=><button className={['weekday-tab',index===selectedWeekday?'is-selected':'',index===today.getDay()?'is-today':''].filter(Boolean).join(' ')} type="button" key={day.short} onClick={()=>{setSelectedWeekday(index);setActiveEntry(weeklyPrayerCycle[index])}}>{day.short}</button>)}</nav>}<div className="prayer-meta">{activeEntry.weekdayGreek&&<p className="prayer-weekday">{activeEntry.weekdayGreek}</p>}<h1 className="prayer-name">{activeEntry.titleGreek}</h1><p className="prayer-reference">{activeEntry.reference}</p></div>{readerBannerKind&&<ReaderBanner kind={readerBannerKind}/>}<p className="prayer-text">{activeEntry.textGreek}</p>{activeEntry.traditionalEnding&&<aside className="traditional-ending"><p className="traditional-ending-label">{activeEntry.traditionalEnding.labelGreek}{options.showGloss&&<span lang="en">{activeEntry.traditionalEnding.labelEnglish}</span>}</p><p>{activeEntry.traditionalEnding.textGreek}</p></aside>}{options.showGloss&&<p className="prayer-gloss" lang="en">{activeEntry.textEnglish}{activeEntry.traditionalEnding&&<><br/>{activeEntry.traditionalEnding.textEnglish}</>}</p>}</article>:<article className={`scripture${isLongForm?' scripture-long-form':''}`} lang="grc"><p className="reading-section">{activeEntry.sectionGreek}</p><h1>{activeEntry.titleGreek}</h1>{options.showGloss&&<p className="reader-reference">{activeEntry.reference}</p>}{readerBannerKind&&<ReaderBanner kind={readerBannerKind}/>} {isLongForm?<div className="long-form-text">{chapterGroups.map(ch=><section className="long-form-chapter" key={ch.chapter}><span className="chapter-marker">{ch.chapter}</span><p>{ch.verses.map(verse=>{const index=activeEntry.verses.findIndex(v=>v.id===verse.id);return <span className={index===currentVerseIndex?'long-form-verse current-verse':'long-form-verse'} id={verse.id} key={verse.id} ref={el=>{verseElements.current[verse.id]=el}} onClick={()=>setCurrentVerseIndex(index)}><button className="verse-number" type="button" onClick={(e:MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();moveToVerse(index)}}>{verse.number}</button><span>{verse.displayText}</span>{' '}</span>})}</p></section>)}</div>:<div className="verse-list">{activeEntry.verses.map((verse,index)=><p className={index===currentVerseIndex?'verse current-verse':'verse'} id={verse.id} key={verse.id} ref={el=>{verseElements.current[verse.id]=el}} onClick={()=>setCurrentVerseIndex(index)}><button className="verse-number" type="button" onClick={(e:MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();moveToVerse(index)}}>{verse.number}</button><span>{verse.displayText}</span></p>)}</div>}</article>}
    {scriptureReading&&<nav className="reader-navigation" aria-label="Πλοήγησις στίχων"><button className="navigation-button navigation-button-back" type="button" disabled={currentVerseIndex===0} onClick={()=>moveToVerse(currentVerseIndex-1)}><img className="navigation-art" src={arrowLeftIcon} alt="" aria-hidden="true"/><span><strong>Ὀπίσω</strong>{options.showGloss&&<small>Previous verse</small>}</span></button><button className="navigation-button navigation-button-next" type="button" disabled={currentVerseIndex===scriptureReading.verses.length-1} onClick={()=>moveToVerse(currentVerseIndex+1)}><span><strong>Ἔμπροσθεν</strong>{options.showGloss&&<small>Next verse</small>}</span><img className="navigation-art" src={arrowRightIcon} alt="" aria-hidden="true"/></button></nav>}
    {!isMealPrayer&&<footer className="completion-actions">{!isMarked?<button className="completion-button" type="button" onClick={completeActiveEntry}><Seal complete={false}/><span>Σφράγισον</span>{options.showGloss&&<small>Mark complete</small>}</button>:<div className="completion-confirmed"><Seal complete/><span>Πεπλήρωται</span></div>}{isMarked&&activeStream&&<button className="proceed-button" type="button" onClick={proceed}><span>Πρόβαινε</span><span>›</span></button>}{isMarked&&<button className="home-button" type="button" onClick={()=>setView('office')}><img className="home-art" src={homeIcon} alt="" aria-hidden="true"/><span>Οἶκος</span></button>}</footer>}
  </main>
}
