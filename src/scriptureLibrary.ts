import type { ScriptureReading } from './data/dailyOffice'
import type { ScriptureBook } from './models/scripture'
import { bookForCorpus } from './scriptureCatalog'

const SBLGNT_MODULES = import.meta.glob<{ default: ScriptureBook }>(
  './data/scripture/generated/sblgnt/*.json',
)

export async function loadSblgntChapter(
  bookId: string,
  chapterNumber: number,
): Promise<ScriptureReading> {
  const bookOption = bookForCorpus('sblgnt', bookId)
  if (!bookOption) {
    throw new Error('That SBLGNT book is not available.')
  }

  const modulePath =
    `./data/scripture/generated/sblgnt/${bookId}.json`
  const loadModule = SBLGNT_MODULES[modulePath]
  if (!loadModule) {
    throw new Error(`${bookOption.code} is missing from the reader.`)
  }

  const { default: book } = await loadModule()
  const chapter = book.chapters.find(
    (candidate) => candidate.number === chapterNumber,
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
