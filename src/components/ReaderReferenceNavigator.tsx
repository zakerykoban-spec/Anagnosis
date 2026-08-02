import { useEffect, useState } from 'react'
import type { ScriptureReading } from '../data/dailyOffice'
import type { ScriptureReferencePart } from '../models/scripture'
import {
  bookForCorpus,
  booksForCorpus,
  chapterNumbers,
  type ScriptureBookOption,
  type ScriptureCorpusId,
} from '../scriptureCatalog'
import {
  loadLxxChapter,
  loadSblgntChapter,
} from '../scriptureLibrary'

export type ReaderNavigatorSelection = {
  corpus: ScriptureCorpusId
  book: ScriptureBookOption
  chapter: ScriptureReferencePart
  verseId: string
  reading: ScriptureReading
}

type NavigatorView = 'books' | 'chapters' | 'verses'

type ReaderReferenceNavigatorProps = {
  open: boolean
  corpus: ScriptureCorpusId
  bookId: string | null
  chapter: ScriptureReferencePart | null
  verseId: string | null
  showGloss: boolean
  onClose: () => void
  onSelect: (selection: ReaderNavigatorSelection) => void
}

async function loadChapter(
  corpus: ScriptureCorpusId,
  bookId: string,
  chapter: ScriptureReferencePart,
) {
  return corpus === 'lxx'
    ? loadLxxChapter(bookId, chapter)
    : loadSblgntChapter(bookId, chapter)
}

export function ReaderReferenceNavigator({
  open,
  corpus,
  bookId,
  chapter,
  verseId,
  showGloss,
  onClose,
  onSelect,
}: ReaderReferenceNavigatorProps) {
  const [selectedCorpus, setSelectedCorpus] =
    useState<ScriptureCorpusId>(corpus)
  const [selectedBookId, setSelectedBookId] =
    useState<string | null>(bookId)
  const [selectedChapter, setSelectedChapter] =
    useState<ScriptureReferencePart | null>(chapter)
  const [view, setView] = useState<NavigatorView>('books')
  const [preview, setPreview] = useState<ScriptureReading | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const currentBook = bookForCorpus(corpus, bookId)
    setSelectedCorpus(corpus)
    setSelectedBookId(currentBook?.id ?? null)
    setSelectedChapter(chapter)
    setPreview(null)
    setLoadingKey(null)
    setError(null)
    setView(currentBook ? 'chapters' : 'books')
  }, [bookId, chapter, corpus, open])

  if (!open) return null

  const books = booksForCorpus(selectedCorpus)
  const selectedBook = bookForCorpus(selectedCorpus, selectedBookId)

  function chooseCorpus(nextCorpus: ScriptureCorpusId) {
    setSelectedCorpus(nextCorpus)
    setSelectedBookId(null)
    setSelectedChapter(null)
    setPreview(null)
    setError(null)
    setView('books')
  }

  function chooseBook(book: ScriptureBookOption) {
    setSelectedBookId(book.id)
    setSelectedChapter(null)
    setPreview(null)
    setError(null)
    setView('chapters')
  }

  async function chooseChapter(
    book: ScriptureBookOption,
    chapterNumber: ScriptureReferencePart,
  ) {
    const key = `${selectedCorpus}:${book.id}:${String(chapterNumber)}`
    setLoadingKey(key)
    setError(null)
    try {
      const reading = await loadChapter(
        selectedCorpus,
        book.id,
        chapterNumber,
      )
      setSelectedChapter(chapterNumber)
      setPreview(reading)
      setView('verses')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to open this chapter.',
      )
    } finally {
      setLoadingKey(null)
    }
  }

  return <div
    className="options-backdrop reader-overlay"
    role="presentation"
    onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}
  >
    <section
      className="options-menu scripture-browser-menu reader-reference-navigator"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-reference-navigator-title"
    >
      <header className="options-menu-header">
        <h2 id="reader-reference-navigator-title">
          <span>Τόπος ἀναγνώσεως</span>
          {showGloss && <small>Reading location</small>}
        </h2>
        <button className="options-close" type="button" onClick={onClose}>×</button>
      </header>
      <nav className="scripture-corpus-tabs" aria-label="Scripture corpus">
        <button
          className={selectedCorpus === 'sblgnt' ? 'is-selected' : ''}
          type="button"
          onClick={() => chooseCorpus('sblgnt')}
        >
          <span>SBLGNT</span>
          {showGloss && <small>New Testament</small>}
        </button>
        <button
          className={selectedCorpus === 'lxx' ? 'is-selected' : ''}
          type="button"
          onClick={() => chooseCorpus('lxx')}
        >
          <span>Ἑβδομήκοντα</span>
          {showGloss && <small>Septuagint</small>}
        </button>
      </nav>
      <div className="scripture-browser-body">
        {view === 'books' && <>
          <div className="scripture-browser-heading">
            <span>{selectedCorpus === 'sblgnt' ? 'Καινὴ Διαθήκη' : 'Ἑβδομήκοντα'}</span>
            {showGloss && <small>Choose a book</small>}
          </div>
          <div className="scripture-book-grid">
            {books.map((book) => <button
              className="scripture-book-choice"
              type="button"
              key={`${selectedCorpus}:${book.id}`}
              onClick={() => chooseBook(book)}
            >
              <span>{book.titleGreek}</span>
              <small>
                {showGloss && book.titleEnglish ? `${book.titleEnglish} · ` : ''}
                {book.code} · {book.chapterNumbers.length}
              </small>
            </button>)}
          </div>
        </>}
        {view === 'chapters' && selectedBook && <>
          <div className="scripture-browser-heading scripture-chapter-heading">
            <button
              className="scripture-browser-back"
              type="button"
              onClick={() => {
                setSelectedBookId(null)
                setSelectedChapter(null)
                setPreview(null)
                setError(null)
                setView('books')
              }}
              aria-label="Back to books"
            >‹</button>
            <span>{selectedBook.titleGreek}</span>
            {showGloss && <small>{selectedBook.code} · Choose a chapter</small>}
          </div>
          <div className="scripture-chapter-grid">
            {chapterNumbers(selectedBook).map((chapterNumber) => {
              const key = `${selectedCorpus}:${selectedBook.id}:${String(chapterNumber)}`
              const isCurrent = (
                selectedCorpus === corpus
                && selectedBook.id === bookId
                && String(chapterNumber) === String(chapter)
              )
              return <button
                className={`scripture-chapter-choice${isCurrent ? ' is-selected' : ''}`}
                type="button"
                key={key}
                disabled={loadingKey !== null}
                onClick={() => void chooseChapter(selectedBook, chapterNumber)}
              >{loadingKey === key ? '…' : chapterNumber}</button>
            })}
          </div>
        </>}
        {view === 'verses' && selectedBook && preview && selectedChapter !== null && <>
          <div className="scripture-browser-heading scripture-chapter-heading">
            <button
              className="scripture-browser-back"
              type="button"
              onClick={() => {
                setPreview(null)
                setError(null)
                setView('chapters')
              }}
              aria-label="Back to chapters"
            >‹</button>
            <span>{selectedBook.titleGreek} {selectedChapter}</span>
            {showGloss && <small>{selectedBook.code} · Choose a verse</small>}
          </div>
          <div className="scripture-verse-grid">
            {preview.verses.map((verse) => {
              const isCurrent = (
                selectedCorpus === corpus
                && selectedBook.id === bookId
                && verse.id === verseId
              )
              return <button
                className={`scripture-verse-choice${isCurrent ? ' is-selected' : ''}`}
                type="button"
                key={verse.id}
                onClick={() => onSelect({
                  corpus: selectedCorpus,
                  book: selectedBook,
                  chapter: selectedChapter,
                  verseId: verse.id,
                  reading: preview,
                })}
              >{verse.number}</button>
            })}
          </div>
        </>}
      </div>
      {error && <p className="read-history-error" role="alert">{error}</p>}
    </section>
  </div>
}
