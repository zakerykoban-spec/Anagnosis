import type { ScriptureReading } from './data/dailyOffice'
import type {
  ScriptureBook,
  ScriptureReferencePart,
} from './models/scripture'
import {
  bookForCorpus,
  type ScriptureCorpusId,
} from './scriptureCatalog'

const SBLGNT_MODULES = import.meta.glob<{ default: ScriptureBook }>(
  './data/scripture/generated/sblgnt/*.json',
)

const LXX_MODULES = import.meta.glob<{ default: ScriptureBook }>(
  './data/scripture/generated/lxx/*.json',
)

export async function loadScriptureBook(
  corpus: ScriptureCorpusId,
  bookId: string,
): Promise<ScriptureBook> {
  const bookOption = bookForCorpus(corpus, bookId)
  if (!bookOption) {
    throw new Error('That Scripture book is not available.')
  }

  const modules = corpus === 'lxx' ? LXX_MODULES : SBLGNT_MODULES
  const modulePath = corpus === 'lxx'
    ? `./data/scripture/generated/lxx/${bookId}.json`
    : `./data/scripture/generated/sblgnt/${bookId}.json`
  const loadModule = modules[modulePath]
  if (!loadModule) {
    throw new Error(`${bookOption.code} is missing from the reader.`)
  }

  const { default: book } = await loadModule()
  return book
}

export async function loadSblgntChapter(
  bookId: string,
  chapterNumber: ScriptureReferencePart,
): Promise<ScriptureReading> {
  const bookOption = bookForCorpus('sblgnt', bookId)
  if (!bookOption) {
    throw new Error('That SBLGNT book is not available.')
  }

  const book = await loadScriptureBook('sblgnt', bookId)
  const chapter = book.chapters.find(
    (candidate) => String(candidate.number) === String(chapterNumber),
  )
  if (!chapter) {
    throw new Error(
      `${bookOption.code} ${chapterNumber} is missing from the reader.`,
    )
  }

  return {
    id: `library:sblgnt:${bookId}:${chapterNumber}`,
    kind: 'scripture',
    sectionGreek: 'Καινὴ Διαθήκη',
    sectionEnglish: 'SBLGNT 1.2',
    titleGreek: book.book.titleGreek,
    reference: `${bookOption.code} ${chapterNumber}`,
    verses: chapter.verses,
  }
}

export async function loadLxxChapter(
  bookId: string,
  chapterNumber: ScriptureReferencePart,
): Promise<ScriptureReading> {
  const bookOption = bookForCorpus('lxx', bookId)
  if (!bookOption) {
    throw new Error('That Septuagint book is not available.')
  }

  const book = await loadScriptureBook('lxx', bookId)
  const chapter = book.chapters.find(
    (candidate) => String(candidate.number) === String(chapterNumber),
  )
  if (!chapter) {
    throw new Error(
      `${bookOption.code} ${chapterNumber} is missing from the reader.`,
    )
  }

  return {
    id: `library:lxx:${bookId}:${String(chapterNumber)}`,
    kind: 'scripture',
    sectionGreek: 'Ἑβδομήκοντα',
    sectionEnglish: 'Septuagint · First1KGreek',
    titleGreek: book.book.titleGreek,
    reference: `${bookOption.code} ${chapterNumber}`,
    verses: chapter.verses,
  }
}
