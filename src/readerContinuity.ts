import type { ScriptureReading, ScriptureVerse } from './data/dailyOffice'
import {
  resolveFreeReadingBoundary,
  type FreeReadingBoundaryDestination,
} from './freeReadingNavigation'
import type {
  ScriptureReferencePart,
} from './models/scripture'
import type { ScriptureCorpusId } from './scriptureCatalog'

export type ReaderChapterLoader = (
  corpus: ScriptureCorpusId,
  bookId: string,
  chapter: ScriptureReferencePart,
) => Promise<ScriptureReading>

export function bookIdFromVerseId(verseId: string) {
  const separator = verseId.indexOf('.')
  return separator > 0 ? verseId.slice(0, separator) : null
}

export function mergeVerseSequences(
  base: ScriptureVerse[],
  additions: ScriptureVerse[],
) {
  const seen = new Set(base.map((verse) => verse.id))
  return [
    ...base,
    ...additions.filter((verse) => {
      if (seen.has(verse.id)) return false
      seen.add(verse.id)
      return true
    }),
  ]
}

async function loadDestination(
  destination: FreeReadingBoundaryDestination | null,
  loadChapter: ReaderChapterLoader,
) {
  if (!destination) return null

  try {
    return await loadChapter(
      destination.corpus,
      destination.bookId,
      destination.chapter,
    )
  } catch {
    return null
  }
}

export async function buildReadingWithContinuation(
  reading: ScriptureReading,
  corpus: ScriptureCorpusId,
  loadChapter: ReaderChapterLoader,
): Promise<ScriptureReading> {
  const lastVerse = reading.verses.at(-1)
  const bookId = lastVerse ? bookIdFromVerseId(lastVerse.id) : null
  if (!lastVerse || !bookId) return reading

  let additions: ScriptureVerse[] = []

  try {
    const currentChapter = await loadChapter(
      corpus,
      bookId,
      lastVerse.chapter,
    )
    const lastIndex = currentChapter.verses.findIndex(
      (verse) => verse.id === lastVerse.id,
    )
    if (lastIndex >= 0) {
      additions = currentChapter.verses.slice(lastIndex + 1)
    }
  } catch {
    // The assigned text remains usable even if continuity cannot be expanded.
  }

  const destination = resolveFreeReadingBoundary(
    corpus,
    bookId,
    lastVerse.chapter,
    'next',
  )
  const nextChapter = await loadDestination(destination, loadChapter)
  if (nextChapter) additions.push(...nextChapter.verses)

  const verses = mergeVerseSequences(reading.verses, additions)
  return verses.length === reading.verses.length
    ? reading
    : {
        ...reading,
        id: `continuous:${reading.id}`,
        verses,
      }
}
