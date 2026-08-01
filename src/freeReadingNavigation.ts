import {
  booksForCorpus,
  type ScriptureCorpusId,
} from './scriptureCatalog.ts'
import type { ScriptureReferencePart } from './models/scripture.ts'

export type FreeReadingBoundaryDirection = 'previous' | 'next'

export type FreeReadingBoundaryDestination = {
  corpus: ScriptureCorpusId
  bookId: string
  chapter: ScriptureReferencePart
  verseEdge: 'first' | 'last'
  kind: 'chapter' | 'book'
}

export function resolveFreeReadingBoundary(
  corpus: ScriptureCorpusId,
  bookId: string,
  chapter: ScriptureReferencePart,
  direction: FreeReadingBoundaryDirection,
): FreeReadingBoundaryDestination | null {
  const books = booksForCorpus(corpus)
  const bookIndex = books.findIndex((book) => book.id === bookId)
  const book = books[bookIndex]
  if (!book) return null

  const chapterIndex = book.chapterNumbers.findIndex(
    (candidate) => String(candidate) === String(chapter),
  )
  if (chapterIndex < 0) return null

  if (direction === 'previous') {
    const previousChapter = book.chapterNumbers[chapterIndex - 1]
    if (previousChapter !== undefined) {
      return {
        corpus,
        bookId,
        chapter: previousChapter,
        verseEdge: 'last',
        kind: 'chapter',
      }
    }

    const previousBook = books[bookIndex - 1]
    const finalChapter = previousBook?.chapterNumbers.at(-1)
    return previousBook && finalChapter !== undefined
      ? {
          corpus,
          bookId: previousBook.id,
          chapter: finalChapter,
          verseEdge: 'last',
          kind: 'book',
        }
      : null
  }

  const nextChapter = book.chapterNumbers[chapterIndex + 1]
  if (nextChapter !== undefined) {
    return {
      corpus,
      bookId,
      chapter: nextChapter,
      verseEdge: 'first',
      kind: 'chapter',
    }
  }

  const nextBook = books[bookIndex + 1]
  const firstChapter = nextBook?.chapterNumbers[0]
  return nextBook && firstChapter !== undefined
    ? {
        corpus,
        bookId: nextBook.id,
        chapter: firstChapter,
        verseEdge: 'first',
        kind: 'book',
      }
    : null
}
