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

type LogosBookAliasTarget = {
  corpus: ScriptureCorpusId
  bookId: string
  aliases: readonly string[]
}

// English aliases documented by Logos Help, mapped to the directly
// corresponding works available in Anagnosis. The Kingdoms mappings follow
// the Septuagint titles: 1–2 Kingdoms = 1–2 Samuel and 3–4 Kingdoms = 1–2 Kings.
export const LOGOS_BOOK_ALIAS_TARGETS: readonly LogosBookAliasTarget[] = [
  { corpus: 'lxx', bookId: 'genesis', aliases: ['Gen', 'Ge', 'Gn'] },
  { corpus: 'lxx', bookId: 'exodus', aliases: ['Exod', 'Exo', 'Ex'] },
  { corpus: 'lxx', bookId: 'leviticus', aliases: ['Lev', 'Le', 'Lv'] },
  { corpus: 'lxx', bookId: 'numbers', aliases: ['Num', 'Nu', 'Nm', 'Nb'] },
  { corpus: 'lxx', bookId: 'deuteronomy', aliases: ['Deut', 'De', 'Dt'] },
  { corpus: 'lxx', bookId: 'joshua', aliases: ['Josh', 'Jos', 'Jsh'] },
  { corpus: 'lxx', bookId: 'judges', aliases: ['Judg', 'Jdg', 'Jg', 'Jdgs'] },
  { corpus: 'lxx', bookId: 'ruth', aliases: ['Rth', 'Ru'] },
  {
    corpus: 'lxx',
    bookId: '1-kingdoms',
    aliases: [
      '1 Samuel', '1 Sam', '1 Sa', '1S', 'I Sa', '1 Sm', '1Sa', '1Sam',
      '1st Sam', '1st Samuel', 'First Sam', 'First Samuel',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '2-kingdoms',
    aliases: [
      '2 Samuel', '2 Sam', '2 Sa', '2S', 'II Sa', '2 Sm', '2Sa', 'II Sam', 'IISam',
      '2Sam', '2nd Sam', '2nd Samuel', 'Second Sam', 'Second Samuel',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '3-kingdoms',
    aliases: [
      '1 Kings', '1 Kgs', '1 Ki', '1K', 'I Kgs', '1Kgs', 'I Ki', '1Ki', '1Kin',
      '1st Kgs', '1st Kings', 'First Kgs', 'First Kings',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '4-kingdoms',
    aliases: [
      '2 Kings', '2 Kgs', '2 Ki', '2K', 'II Kgs', '2Kgs', 'II Ki', '2Ki', '2Kin',
      '2nd Kgs', '2nd Kings', 'Second Kgs', 'Second Kings',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '1-chronicles',
    aliases: [
      '1 Chron', '1 Ch', 'I Ch', '1Ch', '1 Chr', 'I Chr', '1Chr',
      'I Chron', '1Chron', '1st Chron', '1st Chronicles', 'First Chron',
      'First Chronicles',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '2-chronicles',
    aliases: [
      '2 Chron', '2 Ch', 'II Ch', '2Ch', 'II Chr', '2Chr', 'II Chron',
      '2Chron', '2nd Chron', '2nd Chronicles', 'Second Chron',
      'Second Chronicles',
    ],
  },
  { corpus: 'lxx', bookId: 'esther', aliases: ['Esth', 'Es'] },
  { corpus: 'lxx', bookId: 'job', aliases: ['Jb'] },
  {
    corpus: 'lxx',
    bookId: 'psalms',
    aliases: ['Psalm', 'Pslm', 'Ps', 'Psa', 'Psm', 'Pss'],
  },
  {
    corpus: 'lxx',
    bookId: 'proverbs',
    aliases: ['Prov', 'Pro', 'Pr', 'Prv'],
  },
  {
    corpus: 'lxx',
    bookId: 'song-of-songs',
    aliases: [
      'Song of Solomon', 'Song of Songs', 'Song', 'So', 'SOS',
      'Canticle of Canticles', 'Canticles', 'Cant',
    ],
  },
  { corpus: 'lxx', bookId: 'isaiah', aliases: ['Isa', 'Is'] },
  { corpus: 'lxx', bookId: 'jeremiah', aliases: ['Jer', 'Je', 'Jr'] },
  { corpus: 'lxx', bookId: 'lamentations', aliases: ['Lam', 'La'] },
  { corpus: 'lxx', bookId: 'ezekiel', aliases: ['Ezek', 'Eze', 'Ezk'] },
  {
    corpus: 'lxx',
    bookId: 'daniel-theodotion',
    aliases: ['Daniel', 'Dan', 'Da', 'Dn'],
  },
  { corpus: 'lxx', bookId: 'hosea', aliases: ['Hos', 'Ho'] },
  { corpus: 'lxx', bookId: 'joel', aliases: ['Joe', 'Jl'] },
  { corpus: 'lxx', bookId: 'amos', aliases: ['Am'] },
  { corpus: 'lxx', bookId: 'obadiah', aliases: ['Obad', 'Ob'] },
  { corpus: 'lxx', bookId: 'jonah', aliases: ['Jnh', 'Jon'] },
  { corpus: 'lxx', bookId: 'micah', aliases: ['Micah', 'Mic', 'Mc'] },
  { corpus: 'lxx', bookId: 'nahum', aliases: ['Nah', 'Na'] },
  { corpus: 'lxx', bookId: 'habakkuk', aliases: ['Hab', 'Hb'] },
  { corpus: 'lxx', bookId: 'zephaniah', aliases: ['Zeph', 'Zep', 'Zp'] },
  { corpus: 'lxx', bookId: 'haggai', aliases: ['Haggai', 'Hag', 'Hg'] },
  { corpus: 'lxx', bookId: 'zechariah', aliases: ['Zech', 'Zec', 'Zc'] },
  { corpus: 'lxx', bookId: 'malachi', aliases: ['Mal', 'Ml'] },
  { corpus: 'lxx', bookId: 'tobit', aliases: ['Tobit', 'Tob', 'Tb'] },
  { corpus: 'lxx', bookId: 'judith', aliases: ['Jdth', 'Jdt', 'Jth'] },
  {
    corpus: 'lxx',
    bookId: 'wisdom',
    aliases: ['Wisdom of Solomon', 'Wisd of Sol', 'Wis', 'Ws', 'Wisdom'],
  },
  {
    corpus: 'lxx',
    bookId: 'sirach',
    aliases: ['Sirach', 'Sir', 'Ecclesiasticus', 'Ecclus'],
  },
  { corpus: 'lxx', bookId: 'baruch', aliases: ['Baruch', 'Bar'] },
  {
    corpus: 'lxx',
    bookId: 'letter-of-jeremiah',
    aliases: ['Letter of Jeremiah', 'Let Jer', 'Ltr Jer', 'LJe'],
  },
  {
    corpus: 'lxx',
    bookId: 'susanna-theodotion',
    aliases: ['Susanna', 'Sus'],
  },
  {
    corpus: 'lxx',
    bookId: 'bel-and-the-dragon-theodotion',
    aliases: ['Bel and the Dragon', 'Bel'],
  },
  {
    corpus: 'lxx',
    bookId: '1-maccabees',
    aliases: [
      '1 Macc', '1 Mac', '1M', 'I Ma', '1Ma', 'I Mac', '1Mac', 'I Macc',
      '1Macc', 'I Maccabees', '1Maccabees', '1st Maccabees',
      'First Maccabees',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '2-maccabees',
    aliases: [
      '2 Macc', '2 Mac', '2M', 'II Ma', '2Ma', 'II Mac', '2Mac', 'II Macc',
      '2Macc', 'II Maccabees', '2Maccabees', '2nd Maccabees',
      'Second Maccabees',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '1-esdras',
    aliases: [
      '1 Esdr', '1 Esd', 'I Es', '1Es', 'I Esd', '1Esd', 'I Esdr',
      '1Esdr', 'I Esdras', '1Esdras', '1st Esdras', 'First Esdras',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '3-maccabees',
    aliases: [
      '3 Macc', '3 Mac', 'III Ma', '3Ma', 'III Mac', '3Mac', 'III Macc',
      '3Macc', 'III Maccabees', '3rd Maccabees', 'Third Maccabees',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '2-esdras',
    aliases: [
      '2 Esdr', '2 Esd', 'II Es', '2Es', 'II Esd', '2Esd', 'II Esdr',
      '2Esdr', 'II Esdras', '2Esdras', '2nd Esdras', 'Second Esdras',
    ],
  },
  {
    corpus: 'lxx',
    bookId: '4-maccabees',
    aliases: [
      '4 Macc', '4 Mac', 'IV Ma', '4Ma', 'IV Mac', '4Mac', 'IV Macc',
      '4Macc', 'IV Maccabees', 'IIII Maccabees', '4Maccabees',
      '4th Maccabees', 'Fourth Maccabees',
    ],
  },
  { corpus: 'lxx', bookId: 'odes', aliases: ['Ode'] },
  {
    corpus: 'lxx',
    bookId: 'psalms-of-solomon',
    aliases: ['Psalms of Solomon', 'Ps Solomon', 'Ps Sol', 'Psalms Solomon', 'PsSol'],
  },
  { corpus: 'sblgnt', bookId: 'matthew', aliases: ['Matt', 'Mt'] },
  { corpus: 'sblgnt', bookId: 'mark', aliases: ['Mrk', 'Mar', 'Mk', 'Mr'] },
  { corpus: 'sblgnt', bookId: 'luke', aliases: ['Luk', 'Lk'] },
  { corpus: 'sblgnt', bookId: 'john', aliases: ['John', 'Joh', 'Jhn', 'Jn'] },
  { corpus: 'sblgnt', bookId: 'acts', aliases: ['Act', 'Ac'] },
  { corpus: 'sblgnt', bookId: 'romans', aliases: ['Rom', 'Ro', 'Rm'] },
  {
    corpus: 'sblgnt',
    bookId: '1-corinthians',
    aliases: [
      '1 Cor', '1 Co', 'I Co', '1Co', 'I Cor', '1Cor', 'I Corinthians',
      '1Corinthians', '1st Cor', '1st Corinthians', 'First Cor',
      'First Corinthians',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '2-corinthians',
    aliases: [
      '2 Cor', '2 Co', 'II Co', '2Co', 'II Cor', '2Cor', 'II Corinthians',
      '2Corinthians', '2nd Corinthians', 'Second Corinthians',
    ],
  },
  { corpus: 'sblgnt', bookId: 'galatians', aliases: ['Gal', 'Ga'] },
  { corpus: 'sblgnt', bookId: 'ephesians', aliases: ['Ephes', 'Eph'] },
  { corpus: 'sblgnt', bookId: 'philippians', aliases: ['Phil', 'Php', 'Pp'] },
  { corpus: 'sblgnt', bookId: 'colossians', aliases: ['Col', 'Co'] },
  {
    corpus: 'sblgnt',
    bookId: '1-thessalonians',
    aliases: [
      '1 Thess', '1 Th', 'I Th', '1Th', 'I Thes', '1Thes', 'I Thess',
      '1Thess', 'I Thessalonians', '1Thessalonians', '1st Thess',
      '1st Thessalonians', 'First Thess', 'First Thessalonians',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '2-thessalonians',
    aliases: [
      '2 Thess', '2 Th', 'II Th', '2Th', 'II Thes', '2Thes', 'II Thess',
      '2Thess', 'II Thessalonians', '2Thessalonians', '2nd Thess',
      '2nd Thessalonians', 'Second Thess', 'Second Thessalonians',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '1-timothy',
    aliases: [
      '1 Tim', '1 Ti', 'I Ti', '1Ti', 'I Tim', '1Tim', 'I Timothy',
      '1Timothy', '1st Tim', '1st Timothy', 'First Tim', 'First Timothy',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '2-timothy',
    aliases: [
      '2 Tim', '2 Ti', 'II Ti', '2Ti', 'II Tim', '2Tim', 'II Timothy',
      '2Timothy', '2nd Tim', '2nd Timothy', 'Second Tim', 'Second Timothy',
    ],
  },
  { corpus: 'sblgnt', bookId: 'titus', aliases: ['Titus', 'Tit', 'Ti'] },
  { corpus: 'sblgnt', bookId: 'philemon', aliases: ['Philem', 'Phm', 'Pm'] },
  { corpus: 'sblgnt', bookId: 'hebrews', aliases: ['Hebrews', 'Heb'] },
  { corpus: 'sblgnt', bookId: 'james', aliases: ['James', 'Jas', 'Jm'] },
  {
    corpus: 'sblgnt',
    bookId: '1-peter',
    aliases: [
      '1 Pet', '1 Pe', 'I Pe', '1Pe', 'I Pet', '1Pet', 'I Pt', '1 Pt',
      '1Pt', '1 P', '1P', 'I Peter', '1Peter', '1st Peter', 'First Peter',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '2-peter',
    aliases: [
      '2 Pet', '2 Pe', 'II Pe', '2Pe', 'II Pet', '2Pet', 'II Pt', '2 Pt',
      '2Pt', '2 P', '2P', 'II Peter', '2Peter', '2nd Peter', 'Second Peter',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '1-john',
    aliases: [
      '1 John', '1 Jn', 'I Jn', '1Jn', 'I Jo', '1Jo', 'I Joh', '1Joh',
      'I Jhn', '1 Jhn', '1Jhn', '1 J', '1J', 'I John', '1John',
      '1st John', 'First John',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '2-john',
    aliases: [
      '2 John', '2 Jn', 'II Jn', '2Jn', 'II Jo', '2Jo', 'II Joh', '2Joh',
      'II Jhn', '2 Jhn', '2Jhn', '2 J', '2J', 'II John', '2John',
      '2nd John', 'Second John',
    ],
  },
  {
    corpus: 'sblgnt',
    bookId: '3-john',
    aliases: [
      '3 John', '3 Jn', 'III Jn', '3Jn', 'III Jo', '3Jo', 'III Joh',
      '3Joh', 'III Jhn', '3 Jhn', '3Jhn', '3 J', '3J', 'III John',
      '3John', '3rd John', 'Third John',
    ],
  },
  { corpus: 'sblgnt', bookId: 'jude', aliases: ['Jude', 'Jud', 'Jd'] },
  {
    corpus: 'sblgnt',
    bookId: 'revelation',
    aliases: ['Rev', 'Re', 'The Revelation'],
  },
]

function normalizedBookName(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .replace(/\./gu, '')
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function bookAliases(corpus: ScriptureCorpusId, book: ScriptureBookOption) {
  const logosAliases = LOGOS_BOOK_ALIAS_TARGETS.find(
    (target) => target.corpus === corpus && target.bookId === book.id,
  )?.aliases ?? []

  return [book.id, book.code, book.titleEnglish, ...logosAliases]
    .filter((value): value is string => Boolean(value))
    .map(normalizedBookName)
}

function findBook(value: string) {
  const normalized = normalizedBookName(value)
  const matches = CORPORA.flatMap((corpus) =>
    booksForCorpus(corpus)
      .filter((book) => bookAliases(corpus, book).includes(normalized))
      .map((book) => ({ corpus, book })),
  )

  return matches.length === 1 ? matches[0] : null
}

export function parsePassageReference(input: string): PassageReferenceResult {
  const match = input
    .trim()
    .match(/^(.+?)\s+(\d+)(?:(?:\s*[:.]\s*|\s+)(\d+))?$/u)
  if (!match) {
    return { error: 'Enter a reference such as Mark 9, Mark 9:2, or Mk 9.2.' }
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
