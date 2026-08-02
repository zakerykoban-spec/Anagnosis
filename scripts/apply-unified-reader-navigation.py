from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match, found {count}: {old[:120]!r}')
    text = text.replace(old, new, 1)


replace_once(
    "import { LexicalWord } from './components/LexicalWord'\n",
    "import { LexicalWord } from './components/LexicalWord'\n"
    "import {\n"
    "  ReaderReferenceNavigator,\n"
    "  type ReaderNavigatorSelection,\n"
    "} from './components/ReaderReferenceNavigator'\n",
)
replace_once(
    "import { buildReadingPlan } from './readingPlans'\n"
    "import {\n"
    "  resolveFreeReadingBoundary,\n"
    "  type FreeReadingBoundaryDirection,\n"
    "} from './freeReadingNavigation'\n",
    "import { buildReadingPlan } from './readingPlans'\n"
    "import {\n"
    "  bookIdFromVerseId,\n"
    "  buildReadingWithContinuation,\n"
    "} from './readerContinuity'\n",
)
replace_once("import { createSingleFlightGuard } from './singleFlight'\n", "")
replace_once(
    "import './lexical.css'\n",
    "import './lexical.css'\nimport './reader-navigation.css'\n",
)

replace_once(
    "function groupVersesByChapter(verses: ScriptureVerse[]) {\n"
    "  const groups: Array<{\n"
    "    chapter: ScriptureReferencePart\n"
    "    verses: ScriptureVerse[]\n"
    "  }> = []\n"
    "  verses.forEach((verse) => {\n"
    "    const last = groups[groups.length - 1]\n"
    "    if (!last || last.chapter !== verse.chapter) groups.push({ chapter: verse.chapter, verses: [verse] })\n"
    "    else last.verses.push(verse)\n"
    "  })\n"
    "  return groups\n"
    "}\n",
    "function groupVersesByChapter(verses: ScriptureVerse[]) {\n"
    "  const groups: Array<{\n"
    "    bookId: string\n"
    "    chapter: ScriptureReferencePart\n"
    "    verses: ScriptureVerse[]\n"
    "  }> = []\n"
    "  verses.forEach((verse) => {\n"
    "    const bookId = bookIdFromVerseId(verse.id) ?? 'unknown'\n"
    "    const last = groups[groups.length - 1]\n"
    "    if (\n"
    "      !last\n"
    "      || last.bookId !== bookId\n"
    "      || String(last.chapter) !== String(verse.chapter)\n"
    "    ) {\n"
    "      groups.push({ bookId, chapter: verse.chapter, verses: [verse] })\n"
    "    } else {\n"
    "      last.verses.push(verse)\n"
    "    }\n"
    "  })\n"
    "  return groups\n"
    "}\n",
)

replace_once(
    "  const [freeReadingVerseIndex,setFreeReadingVerseIndex] = useState(0)\n"
    "  const [freeReadingLocation,setFreeReadingLocation] =\n"
    "    useState<FreeReadingLocation|null>(()=>loadFreeReadingLocation())\n",
    "  const [freeReadingVerseIndex,setFreeReadingVerseIndex] = useState(0)\n"
    "  const [freeReadingLocation,setFreeReadingLocation] =\n"
    "    useState<FreeReadingLocation|null>(()=>loadFreeReadingLocation())\n"
    "  const [readerScriptureEntry,setReaderScriptureEntry] =\n"
    "    useState<ScriptureReading|null>(null)\n"
    "  const [readerScriptureVerseIndex,setReaderScriptureVerseIndex] =\n"
    "    useState(0)\n"
    "  const [readerScriptureCorpus,setReaderScriptureCorpus] =\n"
    "    useState<ScriptureCorpusId>('sblgnt')\n"
    "  const [visibleVerseId,setVisibleVerseId] = useState<string|null>(null)\n"
    "  const [referenceNavigatorOpen,setReferenceNavigatorOpen] = useState(false)\n",
)
replace_once(
    "  const [freeReadingBoundaryLoading,setFreeReadingBoundaryLoading] =\n"
    "    useState<FreeReadingBoundaryDirection|null>(null)\n"
    "  const [freeReadingBoundaryError,setFreeReadingBoundaryError] =\n"
    "    useState<string|null>(null)\n",
    "",
)
replace_once(
    "  const freeReadingBoundaryGuard = useRef(createSingleFlightGuard())\n"
    "  const lexicalAnchor = useRef<HTMLButtonElement|null>(null)\n",
    "  const lexicalAnchor = useRef<HTMLButtonElement|null>(null)\n"
    "  const visibleVerseIdRef = useRef<string|null>(null)\n"
    "  const readerLoadToken = useRef(0)\n",
)

old_derived = '''  const displayedEntry = freeReadingEntry ?? reviewEntry ?? activeEntry
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
  const previousFreeReadingBoundary = freeReadingEntry
    && displayedBookId
    && displayedVerse
    ? resolveFreeReadingBoundary(
        displayedCorpus,
        displayedBookId,
        displayedVerse.chapter,
        'previous',
      )
    : null
  const nextFreeReadingBoundary = freeReadingEntry
    && displayedBookId
    && displayedVerse
    ? resolveFreeReadingBoundary(
        displayedCorpus,
        displayedBookId,
        displayedVerse.chapter,
        'next',
      )
    : null
  const isDisplayedPsalm = displayedBookId === 'psalms'
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
  const chapterGroups = useMemo(()=>scriptureReading ? groupVersesByChapter(scriptureReading.verses) : [],[scriptureReading])
'''
new_derived = '''  const displayedEntry = freeReadingEntry
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
'''
replace_once(old_derived, new_derived)

hook_anchor = '''  useEffect(() => {
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
'''
new_hooks = hook_anchor + '''  const setCurrentVisibleVerse = useCallback((verseId: string | null) => {
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
'''
replace_once(hook_anchor, new_hooks)

old_functions = '''  function openEntry(entry: OfficeEntry){
    setLexicalSelection(null)
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
    setLexicalSelection(null)
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
    if(freeReadingEntry){
      setFreeReadingVerseIndex(nextIndex)
      if(displayedBookId){
        const location: FreeReadingLocation = {
          corpus: displayedCorpus,
          bookId: displayedBookId,
          chapter: nextVerse.chapter,
          verseId: nextVerse.id,
        }
        setFreeReadingLocation(location)
        saveFreeReadingLocation(location)
      }
    }
    else if(reviewEntry)setReviewVerseIndex(nextIndex)
    else {
      setCurrentVerseIndex(nextIndex)
      if(remembersVersePosition(activeStream)){
        setProgress(c=>updateStreamPosition(c,activeStream,nextVerse.id))
      }
    }
  }
'''
new_functions = '''  async function loadReaderChapter(
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
'''
replace_once(old_functions, new_functions)

# Keep the expanded active reader synchronized in branches that previously
# assigned activeEntry directly instead of calling openEntry.
replace_once(
    "        setActiveEntry(reading)\n"
    "        setReviewEntry(null)\n"
    "        setCurrentVerseIndex(0)\n",
    "        setActiveEntry(reading)\n"
    "        setReviewEntry(null)\n"
    "        setReaderScriptureEntry(reading)\n"
    "        setReaderScriptureCorpus(corpusForReading(reading))\n"
    "        setReaderScriptureVerseIndex(0)\n"
    "        setCurrentVisibleVerse(reading.verses[0]?.id ?? null)\n"
    "        if(reading.verses[0])void prepareReaderEntry(reading,reading.verses[0].id)\n"
    "        setCurrentVerseIndex(0)\n",
)
replace_once(
    "        setActiveEntry(nextReading)\n"
    "        setCurrentVerseIndex(0)\n",
    "        setActiveEntry(nextReading)\n"
    "        setReaderScriptureEntry(nextReading)\n"
    "        setReaderScriptureCorpus(corpusForReading(nextReading))\n"
    "        setReaderScriptureVerseIndex(0)\n"
    "        setCurrentVisibleVerse(nextReading.verses[0]?.id ?? null)\n"
    "        if(nextReading.verses[0])void prepareReaderEntry(nextReading,nextReading.verses[0].id)\n"
    "        setCurrentVerseIndex(0)\n",
)
replace_once(
    "      setActiveEntry(reading)\n"
    "      setReviewEntry(null)\n"
    "      setCurrentVerseIndex(0)\n"
    "      setView('reader')\n",
    "      setActiveEntry(reading)\n"
    "      setReviewEntry(null)\n"
    "      setReaderScriptureEntry(reading)\n"
    "      setReaderScriptureCorpus(corpusForReading(reading))\n"
    "      setReaderScriptureVerseIndex(0)\n"
    "      setCurrentVisibleVerse(reading.verses[0]?.id ?? null)\n"
    "      if(reading.verses[0])void prepareReaderEntry(reading,reading.verses[0].id)\n"
    "      setCurrentVerseIndex(0)\n"
    "      setView('reader')\n",
)

replace_once(
    '''  function openScriptureBrowser() {
    setPlanSelectorStream(null)
    setScriptureBrowserCorpus(displayedCorpus)
    setScriptureBrowserBookId(null)
    setScriptureBrowserView('books')
    setScriptureBrowserError(null)
    setReaderMenuOpen(false)
    setScriptureBrowserOpen(true)
  }
''',
    '''  function openScriptureBrowser() {
    setReaderMenuOpen(false)
    setReferenceNavigatorOpen(true)
  }
''',
)

old_open_free = '''  async function openFreeReading() {
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
      const reading = freeReadingLocation.corpus === 'lxx'
        ? await loadLxxChapter(book.id, freeReadingLocation.chapter)
        : await loadSblgntChapter(book.id, freeReadingLocation.chapter)
      const verseIndex = Math.max(
        reading.verses.findIndex(verse=>verse.id===freeReadingLocation.verseId),
        0,
      )
      const verseId = reading.verses[verseIndex]?.id
      pendingScroll.current = verseId
        ? { kind: 'verse', verseId }
        : { kind: 'top' }
      setFreeReadingEntry(reading)
      setFreeReadingVerseIndex(verseIndex)
      setReviewEntry(null)
      setScriptureBrowserOpen(false)
      setReaderMenuOpen(false)
      setReadHistoryOpen(false)
      setView('reader')
    } catch {
      openFreeReadingBrowser()
      setScriptureBrowserError('Unable to restore the saved reading.')
    }
  }
'''
new_open_free = '''  async function openFreeReading() {
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
'''
replace_once(old_open_free, new_open_free)

replace_once(
    "      setFreeReadingEntry(null)\n"
    "      pendingScroll.current = { kind: 'top' }\n"
    "      setView('office')\n",
    "      setFreeReadingEntry(null)\n"
    "      setReaderScriptureEntry(null)\n"
    "      setCurrentVisibleVerse(null)\n"
    "      pendingScroll.current = { kind: 'top' }\n"
    "      setView('office')\n",
)

replace_once(
    "      setFreeReadingBoundaryError(null)\n\n"
    "    try {\n"
    "      const reading = scriptureBrowserCorpus === 'lxx'\n"
    "        ? await loadLxxChapter(book.id, chapterNumber)\n"
    "        : await loadSblgntChapter(book.id, chapterNumber)\n\n"
    "      pendingScroll.current = { kind: 'top' }\n"
    "      setFreeReadingEntry(reading)\n",
    "\n    try {\n"
    "      const chapter = await loadReaderChapter(\n"
    "        scriptureBrowserCorpus,\n"
    "        book.id,\n"
    "        chapterNumber,\n"
    "      )\n"
    "      const reading = await buildReadingWithContinuation(\n"
    "        chapter,\n"
    "        scriptureBrowserCorpus,\n"
    "        loadReaderChapter,\n"
    "      )\n\n"
    "      pendingScroll.current = { kind: 'top' }\n"
    "      readerLoadToken.current+=1\n"
    "      setReaderScriptureEntry(null)\n"
    "      setFreeReadingEntry(reading)\n",
)
replace_once(
    "        setFreeReadingLocation(location)\n"
    "        saveFreeReadingLocation(location)\n"
    "      }\n"
    "      setReviewEntry(null)\n"
    "      setScriptureBrowserOpen(false)\n",
    "        setFreeReadingLocation(location)\n"
    "        saveFreeReadingLocation(location)\n"
    "        setCurrentVisibleVerse(firstVerse.id)\n"
    "      }\n"
    "      setReviewEntry(null)\n"
    "      setScriptureBrowserOpen(false)\n",
)

start = text.index("  async function navigateFreeReadingBoundary(\n")
end = text.index("  function leaveReader(){\n", start)
text = text[:start] + '''  async function selectReaderReference(
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
''' + text[end:]

replace_once(
    "  function leaveReader(){\n"
    "    pendingScroll.current={kind:'top'}\n"
    "    setFreeReadingEntry(null)\n"
    "    setReviewEntry(null)\n"
    "    setActiveEntry(null)\n"
    "    setReaderMenuOpen(false)\n"
    "    setReadHistoryOpen(false)\n"
    "    setScriptureBrowserOpen(false)\n"
    "    setPlanSelectorStream(null)\n"
    "    setFreeReadingBoundaryError(null)\n"
    "    setLexicalSelection(null)\n"
    "    setView('office')\n"
    "  }\n",
    "  function leaveReader(){\n"
    "    readerLoadToken.current+=1\n"
    "    pendingScroll.current={kind:'top'}\n"
    "    setFreeReadingEntry(null)\n"
    "    setReviewEntry(null)\n"
    "    setReaderScriptureEntry(null)\n"
    "    setCurrentVisibleVerse(null)\n"
    "    setActiveEntry(null)\n"
    "    setReaderMenuOpen(false)\n"
    "    setReadHistoryOpen(false)\n"
    "    setScriptureBrowserOpen(false)\n"
    "    setReferenceNavigatorOpen(false)\n"
    "    setPlanSelectorStream(null)\n"
    "    setLexicalSelection(null)\n"
    "    setView('office')\n"
    "  }\n",
)

replace_once(
    "      setActiveEntry(firstReading)\n"
    "      setCurrentVerseIndex(0)\n",
    "      setActiveEntry(firstReading)\n"
    "      setReaderScriptureEntry(firstReading)\n"
    "      setReaderScriptureCorpus(corpusForReading(firstReading))\n"
    "      setReaderScriptureVerseIndex(0)\n"
    "      setCurrentVisibleVerse(firstReading.verses[0]?.id ?? null)\n"
    "      if(firstReading.verses[0])void prepareReaderEntry(firstReading,firstReading.verses[0].id)\n"
    "      setCurrentVerseIndex(0)\n",
)

# Header: current canonical reference becomes the shared navigator trigger.
replace_once(
    '''      <div className="reader-title">
        <p>{displayedEntry.titleGreek}</p>
        {options.showGloss&&<span>{displayedEntry.reference}</span>}
      </div>
      <div className="reader-header-actions">
        {scriptureReading&&<p className="reader-progress">{displayedVerseIndex+1} / {scriptureReading.verses.length}</p>}
        {activeStream?<button className="reader-menu-trigger icon-button" type="button" aria-label="Ἐπιλογαὶ ἀναγνώσεως" onClick={()=>setReaderMenuOpen(true)}><MenuIcon/></button>:freeReadingEntry&&<button className="reader-menu-trigger icon-button" type="button" aria-label="Γραφαί · Free reading contents" onClick={openFreeReadingBrowser}><BookIcon/></button>}
      </div>
''',
    '''      {scriptureReading&&displayedVerse
        ? <button className="reader-reference-control" type="button" onClick={()=>setReferenceNavigatorOpen(true)}><strong>{displayedBook?.titleGreek ?? displayedEntry.titleGreek}</strong><span>{displayedBook?.code ?? displayedEntry.reference} {displayedVerse.chapter}:{displayedVerse.number}</span></button>
        : <div className="reader-title"><p>{displayedEntry.titleGreek}</p>{options.showGloss&&<span>{displayedEntry.reference}</span>}</div>}
      <div className="reader-header-actions">
        {scriptureReading&&<p className="reader-progress">{Math.max(visibleVerseIndex,displayedVerseIndex)+1} / {scriptureReading.verses.length}</p>}
        {activeStream?<button className="reader-menu-trigger icon-button" type="button" aria-label="Ἐπιλογαὶ ἀναγνώσεως" onClick={()=>setReaderMenuOpen(true)}><MenuIcon/></button>:freeReadingEntry&&<button className="reader-menu-trigger icon-button" type="button" aria-label="Τόπος ἀναγνώσεως" onClick={()=>setReferenceNavigatorOpen(true)}><BookIcon/></button>}
      </div>
''',
)

# Insert rendering helpers after reader-banner selection and before the return.
render_anchor = '''  const readerBannerKind: ReaderBannerKind | null = isDisplayedPsalm
    ? 'psalm'
    : displayedEntry.id === 'meal:after'
      ? 'after-meal'
      : isMealPrayer
        ? 'meal'
        : displayedEntry.kind === 'prayer'
          ? 'altar'
          : null
'''
render_helpers = render_anchor + '''  function readingCompletionBoundary(verseId: string) {
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
'''
replace_once(render_anchor, render_helpers)

old_render = '''          {isLongForm
            ? <div className="long-form-text">{chapterGroups.map(ch=><section className="long-form-chapter" key={ch.chapter}><span className="chapter-marker">{ch.chapter}</span><p>{ch.verses.map(verse=>{const index=displayedEntry.verses.findIndex(v=>v.id===verse.id);return <span className={index===displayedVerseIndex?'long-form-verse current-verse':'long-form-verse'} id={verse.id} key={verse.id} ref={el=>{verseElements.current[verse.id]=el}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(e:MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();moveToVerse(index)}}>{verse.number}</button>{renderVerseText(verse)}{' '}</span>})}</p></section>)}</div>
            : <div className="verse-list">{displayedEntry.verses.map((verse,index)=><p className={index===displayedVerseIndex?'verse current-verse':'verse'} id={verse.id} key={verse.id} ref={el=>{verseElements.current[verse.id]=el}} onClick={()=>moveToVerse(index)}><button className="verse-number" type="button" onClick={(e:MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();moveToVerse(index)}}>{verse.number}</button>{renderVerseText(verse)}</p>)}</div>}
'''
replace_once(old_render, "          {renderScriptureBody()}\n")

# Delete obsolete fixed verse buttons.
nav_start = text.index("    {scriptureReading&&<nav className=\"reader-navigation\"")
nav_end = text.index("    {!reviewEntry&&!freeReadingEntry&&!isMealPrayer&&<footer", nav_start)
text = text[:nav_start] + text[nav_end:]
replace_once(
    "    {!reviewEntry&&!freeReadingEntry&&!isMealPrayer&&<footer",
    "    {displayedEntry.kind==='prayer'&&!reviewEntry&&!freeReadingEntry&&!isMealPrayer&&<footer",
)

# Add the shared navigator overlay before the legacy browser used by Home/options.
replace_once(
    "    {scriptureBrowserDialog}\n"
    "    {lexicalSelection&&<LexicalPopup",
    "    <ReaderReferenceNavigator open={referenceNavigatorOpen} corpus={displayedCorpus} bookId={displayedBookId} chapter={displayedVerse?.chapter ?? null} verseId={displayedVerse?.id ?? null} showGloss={options.showGloss} onClose={()=>setReferenceNavigatorOpen(false)} onSelect={(selection)=>void selectReaderReference(selection)}/>\n"
    "    {scriptureBrowserDialog}\n"
    "    {lexicalSelection&&<LexicalPopup",
)

# No obsolete boundary error remains below the scripture article.
text = text.replace(
    "    {freeReadingBoundaryError&&<p className=\"free-reading-boundary-error\" role=\"alert\">{freeReadingBoundaryError}</p>}\n",
    "",
)

path.write_text(text, encoding='utf-8')
print('Unified reader navigation integrated into src/App.tsx')
