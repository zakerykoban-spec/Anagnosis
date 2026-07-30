import lxxManifestData from './data/scripture/generated/lxx/manifest.json' with { type: 'json' }
import type { ScriptureReferencePart } from './models/scripture'

export type ScriptureCorpusId = 'sblgnt' | 'lxx'

export type ScriptureBookOption = {
  id: string
  code: string
  titleGreek: string
  titleEnglish?: string
  chapterNumbers: ScriptureReferencePart[]
}

const SBLGNT_BOOK_COUNTS = [
  { id: 'matthew', code: 'Matt', titleGreek: 'Κατὰ Ματθαῖον', chapters: 28 },
  { id: 'mark', code: 'Mark', titleGreek: 'Κατὰ Μᾶρκον', chapters: 16 },
  { id: 'luke', code: 'Luke', titleGreek: 'Κατὰ Λουκᾶν', chapters: 24 },
  { id: 'john', code: 'John', titleGreek: 'Κατὰ Ἰωάννην', chapters: 21 },
  { id: 'acts', code: 'Acts', titleGreek: 'Πράξεις Ἀποστόλων', chapters: 28 },
  { id: 'romans', code: 'Rom', titleGreek: 'Πρὸς Ῥωμαίους', chapters: 16 },
  { id: '1-corinthians', code: '1Cor', titleGreek: 'Πρὸς Κορινθίους Αʹ', chapters: 16 },
  { id: '2-corinthians', code: '2Cor', titleGreek: 'Πρὸς Κορινθίους Βʹ', chapters: 13 },
  { id: 'galatians', code: 'Gal', titleGreek: 'Πρὸς Γαλάτας', chapters: 6 },
  { id: 'ephesians', code: 'Eph', titleGreek: 'Πρὸς Ἐφεσίους', chapters: 6 },
  { id: 'philippians', code: 'Phil', titleGreek: 'Πρὸς Φιλιππησίους', chapters: 4 },
  { id: 'colossians', code: 'Col', titleGreek: 'Πρὸς Κολοσσαεῖς', chapters: 4 },
  { id: '1-thessalonians', code: '1Thess', titleGreek: 'Πρὸς Θεσσαλονικεῖς Αʹ', chapters: 5 },
  { id: '2-thessalonians', code: '2Thess', titleGreek: 'Πρὸς Θεσσαλονικεῖς Βʹ', chapters: 3 },
  { id: '1-timothy', code: '1Tim', titleGreek: 'Πρὸς Τιμόθεον Αʹ', chapters: 6 },
  { id: '2-timothy', code: '2Tim', titleGreek: 'Πρὸς Τιμόθεον Βʹ', chapters: 4 },
  { id: 'titus', code: 'Titus', titleGreek: 'Πρὸς Τίτον', chapters: 3 },
  { id: 'philemon', code: 'Phlm', titleGreek: 'Πρὸς Φιλήμονα', chapters: 1 },
  { id: 'hebrews', code: 'Heb', titleGreek: 'Πρὸς Ἑβραίους', chapters: 13 },
  { id: 'james', code: 'Jas', titleGreek: 'Ἰακώβου', chapters: 5 },
  { id: '1-peter', code: '1Pet', titleGreek: 'Πέτρου Αʹ', chapters: 5 },
  { id: '2-peter', code: '2Pet', titleGreek: 'Πέτρου Βʹ', chapters: 3 },
  { id: '1-john', code: '1John', titleGreek: 'Ἰωάννου Αʹ', chapters: 5 },
  { id: '2-john', code: '2John', titleGreek: 'Ἰωάννου Βʹ', chapters: 1 },
  { id: '3-john', code: '3John', titleGreek: 'Ἰωάννου Γʹ', chapters: 1 },
  { id: 'jude', code: 'Jude', titleGreek: 'Ἰούδα', chapters: 1 },
  { id: 'revelation', code: 'Rev', titleGreek: 'Ἀποκάλυψις Ἰωάννου', chapters: 22 },
]

export const SBLGNT_BOOKS: ScriptureBookOption[] =
  SBLGNT_BOOK_COUNTS.map(({ chapters, ...book }) => ({
    ...book,
    chapterNumbers: Array.from(
      { length: chapters },
      (_, index) => index + 1,
    ),
  }))

type LxxManifest = {
  books: Array<{
    id: string
    code: string
    titleGreek: string
    titleEnglish: string
    chapterNumbers: ScriptureReferencePart[]
  }>
}

const lxxManifest = lxxManifestData as LxxManifest

export const LXX_BOOKS: ScriptureBookOption[] =
  lxxManifest.books.map((book) => ({
    id: book.id,
    code: book.code,
    titleGreek: book.titleGreek,
    titleEnglish: book.titleEnglish,
    chapterNumbers: book.chapterNumbers,
  }))

export function booksForCorpus(corpus: ScriptureCorpusId) {
  return corpus === 'sblgnt' ? SBLGNT_BOOKS : LXX_BOOKS
}

export function bookForCorpus(
  corpus: ScriptureCorpusId,
  bookId: string | null,
) {
  if (!bookId) return null
  return booksForCorpus(corpus).find((book) => book.id === bookId) ?? null
}

export function chapterNumbers(book: ScriptureBookOption | null) {
  if (!book) return []
  return book.chapterNumbers
}
