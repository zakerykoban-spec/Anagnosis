import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPassageReference,
  loadRecentPassages,
  LOGOS_BOOK_ALIAS_TARGETS,
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

test('Logos-style punctuation and spacing resolve the same destination', () => {
  const expected = {
    destination: {
      corpus: 'sblgnt' as const,
      bookId: 'luke',
      chapter: 3,
      verseNumber: 6,
    },
  }

  assert.deepEqual(parsePassageReference('Lk 3.6'), expected)
  assert.deepEqual(parsePassageReference('Lk 3:6'), expected)
  assert.deepEqual(parsePassageReference('Lk 3 6'), expected)
  assert.deepEqual(parsePassageReference('Lk. 3 . 6'), expected)
})

test('Logos numbered-book forms resolve with ordinals and Roman numerals', () => {
  const expected = {
    destination: {
      corpus: 'sblgnt' as const,
      bookId: '1-john',
      chapter: 1,
      verseNumber: 3,
    },
  }

  assert.deepEqual(parsePassageReference('1jo 1 3'), expected)
  assert.deepEqual(parsePassageReference('1st John 1.3'), expected)
  assert.deepEqual(parsePassageReference('I John 1:3'), expected)
  assert.deepEqual(parsePassageReference('First John 1:3'), expected)
})

test('every documented Logos alias with a direct Anagnosis work resolves', () => {
  for (const target of LOGOS_BOOK_ALIAS_TARGETS) {
    for (const alias of target.aliases) {
      assert.deepEqual(
        parsePassageReference(`${alias} 1`),
        {
          destination: {
            corpus: target.corpus,
            bookId: target.bookId,
            chapter: 1,
          },
        },
        `${alias} should resolve to ${target.bookId}`,
      )
    }
  }
})

test('Logos canonical names map Samuel and Kings to LXX Kingdoms', () => {
  assert.deepEqual(parsePassageReference('1 Sam 3:4'), {
    destination: {
      corpus: 'lxx',
      bookId: '1-kingdoms',
      chapter: 3,
      verseNumber: 4,
    },
  })
  assert.deepEqual(parsePassageReference('2 Kgs 5.14'), {
    destination: {
      corpus: 'lxx',
      bookId: '4-kingdoms',
      chapter: 5,
      verseNumber: 14,
    },
  })
})

test('plain Daniel-family Logos aliases choose the Theodotion reader', () => {
  assert.deepEqual(parsePassageReference('Dan 3:16'), {
    destination: {
      corpus: 'lxx',
      bookId: 'daniel-theodotion',
      chapter: 3,
      verseNumber: 16,
    },
  })
  assert.deepEqual(parsePassageReference('Sus 1:1'), {
    destination: {
      corpus: 'lxx',
      bookId: 'susanna-theodotion',
      chapter: 1,
      verseNumber: 1,
    },
  })
  assert.deepEqual(parsePassageReference('Bel 1:1'), {
    destination: {
      corpus: 'lxx',
      bookId: 'bel-and-the-dragon-theodotion',
      chapter: 1,
      verseNumber: 1,
    },
  })
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
