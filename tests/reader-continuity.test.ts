import test from 'node:test'
import assert from 'node:assert/strict'
import type {
  ScriptureReading,
  ScriptureVerse,
} from '../src/data/dailyOffice.ts'
import {
  bookIdFromVerseId,
  buildReadingWithContinuation,
  mergeVerseSequences,
  type ReaderChapterLoader,
} from '../src/readerContinuity.ts'

function verse(
  id: string,
  chapter: number,
  number: number,
): ScriptureVerse {
  return {
    id,
    chapter,
    number,
    sourceText: id,
    displayText: id,
  }
}

function reading(
  id: string,
  titleGreek: string,
  reference: string,
  verses: ScriptureVerse[],
): ScriptureReading {
  return {
    id,
    kind: 'scripture',
    sectionGreek: 'Πρόοδος',
    sectionEnglish: 'Progressive Reading',
    titleGreek,
    reference,
    verses,
  }
}

test('verse IDs expose their canonical book without changing the text', () => {
  assert.equal(bookIdFromVerseId('mark.7.11'), 'mark')
  assert.equal(bookIdFromVerseId('1-corinthians.13.4'), '1-corinthians')
  assert.equal(bookIdFromVerseId('invalid'), null)
})

test('continuation merging preserves canonical order and removes duplicates', () => {
  const first = verse('mark.1.1', 1, 1)
  const second = verse('mark.1.2', 1, 2)
  const third = verse('mark.1.3', 1, 3)

  assert.deepEqual(
    mergeVerseSequences([first, second], [second, third]).map((item) => item.id),
    ['mark.1.1', 'mark.1.2', 'mark.1.3'],
  )
})

test('a reading-plan boundary is followed by the chapter remainder and next chapter', async () => {
  const markOne = [
    verse('mark.1.1', 1, 1),
    verse('mark.1.2', 1, 2),
    verse('mark.1.3', 1, 3),
  ]
  const markTwo = [
    verse('mark.2.1', 2, 1),
    verse('mark.2.2', 2, 2),
  ]
  const chapters = new Map([
    ['mark:1', reading('library:mark:1', 'Κατὰ Μᾶρκον', 'Mark 1', markOne)],
    ['mark:2', reading('library:mark:2', 'Κατὰ Μᾶρκον', 'Mark 2', markTwo)],
  ])
  const loader: ReaderChapterLoader = async (_corpus, bookId, chapter) => {
    const result = chapters.get(`${bookId}:${String(chapter)}`)
    if (!result) throw new Error('Missing chapter')
    return result
  }

  const expanded = await buildReadingWithContinuation(
    reading(
      'challenge:mark:1:1-2',
      'Κατὰ Μᾶρκον',
      'Mark 1:1–2',
      markOne.slice(0, 2),
    ),
    'sblgnt',
    loader,
  )

  assert.deepEqual(
    expanded.verses.map((item) => item.id),
    [
      'mark.1.1',
      'mark.1.2',
      'mark.1.3',
      'mark.2.1',
      'mark.2.2',
    ],
  )
})

test('the final chapter of a book continues into the next canonical book', async () => {
  const matthewFinal = [verse('matthew.28.20', 28, 20)]
  const markFirst = [
    verse('mark.1.1', 1, 1),
    verse('mark.1.2', 1, 2),
  ]
  const chapters = new Map([
    [
      'matthew:28',
      reading('library:matthew:28', 'Κατὰ Ματθαῖον', 'Matt 28', matthewFinal),
    ],
    [
      'mark:1',
      reading('library:mark:1', 'Κατὰ Μᾶρκον', 'Mark 1', markFirst),
    ],
  ])
  const loader: ReaderChapterLoader = async (_corpus, bookId, chapter) => {
    const result = chapters.get(`${bookId}:${String(chapter)}`)
    if (!result) throw new Error('Missing chapter')
    return result
  }

  const expanded = await buildReadingWithContinuation(
    reading(
      'progressive:matthew:chapters-27-28',
      'Κατὰ Ματθαῖον',
      'Matthew 27–28',
      matthewFinal,
    ),
    'sblgnt',
    loader,
  )

  assert.deepEqual(
    expanded.verses.map((item) => item.id),
    ['matthew.28.20', 'mark.1.1', 'mark.1.2'],
  )
})
