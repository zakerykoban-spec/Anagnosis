import type { ScriptureReferencePart } from './models/scripture.ts'
import {
  bookForCorpus,
  booksForCorpus,
  type ScriptureBookOption,
  type ScriptureCorpusId,
} from './scriptureCatalog.ts'

export type PassageDestination = {
  corpus: ScriptureCorpusId
  bookId: string
  chapter: ScriptureReferencePart
  verseNumber?: number
}

export type PassageReferenceResult =
  | { destination: PassageDestination; error?: never }
  | { destination?: never; error: string }

const CORPORA: ScriptureCorpusId[] = ['sblgnt', 'lxx']
const MAX_RECENT_PASSAGES = 8

function normalizedBookName(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .replace(/[.\s_-]+/gu, '')
}

function bookAliases(book: ScriptureBookOption) {
  return [book.id, book.code, book.titleEnglish]
    .filter((value): value is string => Boolean(value))
    .map(normalizedBookName)
}

function findBook(value: string) {
  const normalized = normalizedBookName(value)
  const matches = CORPORA.flatMap((corpus) =>
    booksForCorpus(corpus)
      .filter((book) => bookAliases(book).includes(normalized))
      .map((book) => ({ corpus, book })),
  )

  return matches.length === 1 ? matches[0] : null
}

export function parsePassageReference(input: string): PassageReferenceResult {
  const match = input.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/u)
  if (!match) {
    return { error: 'Enter a reference such as Mark 9 or Mark 9:2.' }
  }

  const [, bookInput, chapterInput, verseInput] = match
  const matchBook = findBook(bookInput)
  if (!matchBook) {
    return { error: 'That book is not available. Try a name such as Mark.' }
  }

  const chapter = Number(chapterInput)
  const verseNumber = verseInput === undefined ? undefined : Number(verseInput)
  const chapterExists = matchBook.book.chapterNumbers.some(
    (candidate) => String(candidate) === String(chapter),
  )
  if (!chapterExists) {
    const firstChapter = matchBook.book.chapterNumbers[0]
    const lastChapter = matchBook.book.chapterNumbers.at(-1)
    return {
      error: `${matchBook.book.code} has chapters ${String(firstChapter)}–${String(lastChapter)}.`,
    }
  }
  if (verseNumber !== undefined && verseNumber < 1) {
    return { error: 'The verse number must be 1 or greater.' }
  }

  return {
    destination: {
      corpus: matchBook.corpus,
      bookId: matchBook.book.id,
      chapter,
      ...(verseNumber === undefined ? {} : { verseNumber }),
    },
  }
}

export function formatPassageReference(destination: PassageDestination) {
  const book = bookForCorpus(destination.corpus, destination.bookId)
  const bookName = book?.code ?? destination.bookId
  const verse = destination.verseNumber === undefined
    ? ''
    : `:${destination.verseNumber}`
  return `${bookName} ${String(destination.chapter)}${verse}`
}

function isPassageDestination(value: unknown): value is PassageDestination {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PassageDestination>
  if (
    (candidate.corpus !== 'sblgnt' && candidate.corpus !== 'lxx')
    || typeof candidate.bookId !== 'string'
    || (typeof candidate.chapter !== 'number'
      && typeof candidate.chapter !== 'string')
    || (candidate.verseNumber !== undefined
      && (!Number.isInteger(candidate.verseNumber) || candidate.verseNumber < 1))
  ) return false

  const book = bookForCorpus(candidate.corpus, candidate.bookId)
  return Boolean(book?.chapterNumbers.some(
    (chapter) => String(chapter) === String(candidate.chapter),
  ))
}

export function loadRecentPassages(serialized: string | null) {
  if (!serialized) return []
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPassageDestination).slice(0, MAX_RECENT_PASSAGES)
  } catch {
    return []
  }
}

export function recordRecentPassage(
  passages: PassageDestination[],
  destination: PassageDestination,
) {
  const sameChapter = (candidate: PassageDestination) =>
    candidate.corpus === destination.corpus
    && candidate.bookId === destination.bookId
    && String(candidate.chapter) === String(destination.chapter)

  return [destination, ...passages.filter((candidate) => !sameChapter(candidate))]
    .slice(0, MAX_RECENT_PASSAGES)
}
