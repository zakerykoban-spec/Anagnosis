import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPassageReference,
  loadRecentPassages,
  parsePassageReference,
  recordRecentPassage,
  type PassageDestination,
} from '../src/passageNavigator.ts'

test('reference input resolves a book and chapter', () => {
  assert.deepEqual(parsePassageReference('Mark 9'), {
    destination: {
      corpus: 'sblgnt',
      bookId: 'mark',
      chapter: 9,
    },
  })
})

test('reference input resolves an exact verse', () => {
  const result = parsePassageReference('Mark 9:2')

  assert.deepEqual(result, {
    destination: {
      corpus: 'sblgnt',
      bookId: 'mark',
      chapter: 9,
      verseNumber: 2,
    },
  })
  assert.equal(
    result.destination && formatPassageReference(result.destination),
    'Mark 9:2',
  )
})

test('spaced numbered books and LXX books use the existing catalog', () => {
  assert.deepEqual(parsePassageReference('1 John 2:3'), {
    destination: {
      corpus: 'sblgnt',
      bookId: '1-john',
      chapter: 2,
      verseNumber: 3,
    },
  })
  assert.deepEqual(parsePassageReference('Genesis 12'), {
    destination: {
      corpus: 'lxx',
      bookId: 'genesis',
      chapter: 12,
    },
  })
})

test('invalid references do not produce a destination', () => {
  assert.match(parsePassageReference('Mark').error ?? '', /Mark 9/u)
  assert.match(parsePassageReference('Unknown 3').error ?? '', /not available/u)
  assert.match(parsePassageReference('Mark 99').error ?? '', /chapters 1–16/u)
  assert.match(parsePassageReference('Mark 9:0').error ?? '', /1 or greater/u)
})

test('recent passages keep the latest location per chapter', () => {
  const markNine: PassageDestination = {
    corpus: 'sblgnt',
    bookId: 'mark',
    chapter: 9,
    verseNumber: 2,
  }
  const markTen: PassageDestination = {
    corpus: 'sblgnt',
    bookId: 'mark',
    chapter: 10,
  }

  const passages = recordRecentPassage(
    recordRecentPassage([markNine], markTen),
    { ...markNine, verseNumber: 7 },
  )

  assert.deepEqual(passages, [
    { ...markNine, verseNumber: 7 },
    markTen,
  ])
})

test('stored recent passages discard malformed and unavailable entries', () => {
  const stored = JSON.stringify([
    { corpus: 'sblgnt', bookId: 'mark', chapter: 9, verseNumber: 2 },
    { corpus: 'sblgnt', bookId: 'mark', chapter: 99 },
    { corpus: 'unknown', bookId: 'mark', chapter: 9 },
  ])

  assert.deepEqual(loadRecentPassages(stored), [
    { corpus: 'sblgnt', bookId: 'mark', chapter: 9, verseNumber: 2 },
  ])
  assert.deepEqual(loadRecentPassages('{'), [])
})
