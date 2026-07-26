import actsData from './scripture/generated/sblgnt/acts.json'
import johnData from './scripture/generated/sblgnt/john.json'
import markData from './scripture/generated/sblgnt/mark.json'
import type { ScriptureReading, ScriptureVerse } from './dailyOffice'

type ScriptureBookData = {
  book: {
    id: string
    titleGreek: string
  }
  chapters: Array<{
    number: number
    verses: ScriptureVerse[]
  }>
}

type ProgressiveBook = {
  data: ScriptureBookData
  english: string
}

const CHAPTERS_PER_READING = 2

const progressiveBooks: ProgressiveBook[] = [
  { data: markData as ScriptureBookData, english: 'Mark' },
  { data: johnData as ScriptureBookData, english: 'John' },
  { data: actsData as ScriptureBookData, english: 'Acts' },
]

function assignmentCount(book: ScriptureBookData) {
  return Math.ceil(book.chapters.length / CHAPTERS_PER_READING)
}

function formatReference(
  bookName: string,
  firstVerse: ScriptureVerse,
  lastVerse: ScriptureVerse,
) {
  if (firstVerse.chapter === lastVerse.chapter) {
    return `${bookName} ${firstVerse.chapter}`
  }

  return `${bookName} ${firstVerse.chapter}–${lastVerse.chapter}`
}

export function progressiveAssignmentCount() {
  return progressiveBooks.reduce(
    (total, book) => total + assignmentCount(book.data),
    0,
  )
}

export function resolveProgressiveReading(
  assignmentIndex: number,
): ScriptureReading {
  const cycleLength = progressiveAssignmentCount()
  let cycleIndex = ((assignmentIndex % cycleLength) + cycleLength) % cycleLength

  for (const book of progressiveBooks) {
    const bookAssignmentCount = assignmentCount(book.data)

    if (cycleIndex < bookAssignmentCount) {
      const startChapterIndex = cycleIndex * CHAPTERS_PER_READING
      const selectedChapters = book.data.chapters.slice(
        startChapterIndex,
        startChapterIndex + CHAPTERS_PER_READING,
      )
      const verses = selectedChapters.flatMap((chapter) => chapter.verses)
      const firstVerse = verses[0]
      const lastVerse = verses[verses.length - 1]

      if (!firstVerse || !lastVerse) {
        throw new Error('The configured progressive reading is empty.')
      }

      return {
        id: `progressive:${book.data.book.id}:chapters-${firstVerse.chapter}-${lastVerse.chapter}`,
        kind: 'scripture',
        sectionGreek: 'Πρόοδος',
        sectionEnglish: 'Progressive Reading',
        titleGreek: book.data.book.titleGreek,
        reference: formatReference(book.english, firstVerse, lastVerse),
        verses,
      }
    }

    cycleIndex -= bookAssignmentCount
  }

  throw new Error('Unable to resolve the progressive reading.')
}
