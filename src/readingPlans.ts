import type { ScriptureReading } from './data/dailyOffice'
import type { ScriptureBook, ScriptureVerse } from './models/scripture'
import type {
  ScriptureBookOption,
  ScriptureCorpusId,
} from './scriptureCatalog'

export type ReadingPlanStreamId = 'progressive' | 'challenge'

const CHAPTERS_PER_PROGRESSIVE_READING = 2
const CHALLENGE_TARGET_VERSES = 20
const CHALLENGE_MAX_VERSES = 25

const LEGACY_LUKE_RANGES = [
  [1, 1, 4],
  [1, 5, 25],
  [1, 26, 38],
  [1, 39, 56],
  [1, 57, 80],
  [2, 1, 20],
  [2, 21, 40],
  [2, 41, 52],
] as const

function bookLabel(book: ScriptureBookOption) {
  return book.titleEnglish ?? book.code
}

function formatChapterReference(
  book: ScriptureBookOption,
  firstVerse: ScriptureVerse,
  lastVerse: ScriptureVerse,
) {
  if (String(firstVerse.chapter) === String(lastVerse.chapter)) {
    return `${bookLabel(book)} ${firstVerse.chapter}`
  }

  return `${bookLabel(book)} ${firstVerse.chapter}–${lastVerse.chapter}`
}

function formatVerseReference(
  book: ScriptureBookOption,
  firstVerse: ScriptureVerse,
  lastVerse: ScriptureVerse,
) {
  if (String(firstVerse.chapter) === String(lastVerse.chapter)) {
    return `${bookLabel(book)} ${firstVerse.chapter}:${firstVerse.number}–${lastVerse.number}`
  }

  return `${bookLabel(book)} ${firstVerse.chapter}:${firstVerse.number}–${lastVerse.chapter}:${lastVerse.number}`
}

function reading(
  streamId: ReadingPlanStreamId,
  id: string,
  book: ScriptureBookOption,
  verses: ScriptureVerse[],
  reference: string,
): ScriptureReading {
  if (verses.length === 0) {
    throw new Error(`The ${streamId} plan contains an empty assignment.`)
  }

  return {
    id,
    kind: 'scripture',
    sectionGreek: streamId === 'progressive' ? 'Πρόοδος' : 'Ἄσκησις',
    sectionEnglish: streamId === 'progressive'
      ? 'Progressive Reading'
      : 'Challenge Reading',
    titleGreek: book.titleGreek,
    reference,
    verses,
  }
}

export function buildProgressivePlan(
  corpus: ScriptureCorpusId,
  book: ScriptureBookOption,
  data: ScriptureBook,
): ScriptureReading[] {
  const assignments: ScriptureReading[] = []

  for (
    let index = 0;
    index < data.chapters.length;
    index += CHAPTERS_PER_PROGRESSIVE_READING
  ) {
    const chapters = data.chapters.slice(
      index,
      index + CHAPTERS_PER_PROGRESSIVE_READING,
    )
    const verses = chapters.flatMap((chapter) => chapter.verses)
    const firstVerse = verses[0]
    const lastVerse = verses.at(-1)
    if (!firstVerse || !lastVerse) continue

    assignments.push(reading(
      'progressive',
      `progressive:${book.id}:chapters-${String(firstVerse.chapter)}-${String(lastVerse.chapter)}`,
      book,
      verses,
      formatChapterReference(book, firstVerse, lastVerse),
    ))
  }

  if (assignments.length === 0) {
    throw new Error(`${book.code} has no Progressive assignments.`)
  }

  // Corpus is part of the saved plan key even though canonical book IDs keep
  // existing Mark/John/Acts completion history backward-compatible.
  void corpus
  return assignments
}

function balancedChapterChunks(verses: ScriptureVerse[]) {
  if (verses.length <= CHALLENGE_MAX_VERSES) return [verses]

  const chunkCount = Math.max(
    2,
    Math.round(verses.length / CHALLENGE_TARGET_VERSES),
    Math.ceil(verses.length / CHALLENGE_MAX_VERSES),
  )
  const baseSize = Math.floor(verses.length / chunkCount)
  const remainder = verses.length % chunkCount
  const chunks: ScriptureVerse[][] = []
  let offset = 0

  for (let index = 0; index < chunkCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0)
    chunks.push(verses.slice(offset, offset + size))
    offset += size
  }

  return chunks.filter((chunk) => chunk.length > 0)
}

function legacyLukeAssignments(
  book: ScriptureBookOption,
  data: ScriptureBook,
) {
  const verses = data.chapters
    .filter((chapter) => Number(chapter.number) <= 2)
    .flatMap((chapter) => chapter.verses)

  return LEGACY_LUKE_RANGES.map(([chapter, start, end], index) => {
    const selected = verses.filter((verse) => (
      Number(verse.chapter) === chapter
      && Number(verse.number) >= start
      && Number(verse.number) <= end
    ))
    const firstVerse = selected[0]
    const lastVerse = selected.at(-1)
    if (!firstVerse || !lastVerse) {
      throw new Error('The legacy Luke Challenge plan could not be restored.')
    }

    return reading(
      'challenge',
      `challenge:luke:${index + 1}`,
      book,
      selected,
      formatVerseReference(book, firstVerse, lastVerse),
    )
  })
}

export function buildChallengePlan(
  corpus: ScriptureCorpusId,
  book: ScriptureBookOption,
  data: ScriptureBook,
): ScriptureReading[] {
  const preservesLegacyLuke = corpus === 'sblgnt' && book.id === 'luke'
  const assignments = preservesLegacyLuke
    ? legacyLukeAssignments(book, data)
    : []
  const chapters = preservesLegacyLuke
    ? data.chapters.filter((chapter) => Number(chapter.number) > 2)
    : data.chapters

  chapters.forEach((chapter) => {
    balancedChapterChunks(chapter.verses).forEach((verses) => {
      const firstVerse = verses[0]
      const lastVerse = verses.at(-1)
      if (!firstVerse || !lastVerse) return

      assignments.push(reading(
        'challenge',
        `challenge:${book.id}:${String(chapter.number)}:${String(firstVerse.number)}-${String(lastVerse.number)}`,
        book,
        verses,
        formatVerseReference(book, firstVerse, lastVerse),
      ))
    })
  })

  if (assignments.length === 0) {
    throw new Error(`${book.code} has no Challenge assignments.`)
  }

  return assignments
}

export function buildReadingPlan(
  streamId: ReadingPlanStreamId,
  corpus: ScriptureCorpusId,
  book: ScriptureBookOption,
  data: ScriptureBook,
) {
  return streamId === 'progressive'
    ? buildProgressivePlan(corpus, book, data)
    : buildChallengePlan(corpus, book, data)
}
