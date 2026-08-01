import test from 'node:test'
import assert from 'node:assert/strict'
import {
  completeStreamAssignment,
  createDefaultProgress,
  isLatestStreamAssignmentCompleted,
  isDailySectionMarked,
  markDailySection,
  migrateLegacyProgress,
  restartReadingPlan,
  selectStreamAssignment,
  switchReadingPlan,
  undoLastStreamCompletion,
  unmarkDailySection,
  updateStreamPosition,
} from '../src/readingProgress.ts'
import {
  buildChallengePlan,
  buildProgressivePlan,
} from '../src/readingPlans.ts'
import {
  readHistoryItems,
  readingContentsItems,
} from '../src/readHistory.ts'
import {
  remembersVersePosition,
  restoredVerseIndex,
} from '../src/readingNavigation.ts'
import { resolveFreeReadingBoundary } from '../src/freeReadingNavigation.ts'
import {
  bookForCorpus,
  booksForCorpus,
  chapterNumbers,
} from '../src/scriptureCatalog.ts'
import genesisData from '../src/data/scripture/generated/lxx/genesis.json' with { type: 'json' }
import lukeData from '../src/data/scripture/generated/sblgnt/luke.json' with { type: 'json' }
import type { ScriptureBook } from '../src/models/scripture.ts'

test('daily prayer marks are calendar-scoped', () => {
  const july26 = '2026-07-26'
  const july27 = '2026-07-27'
  const prayerId = 'weekday-prayer:0'

  const progress = markDailySection(createDefaultProgress(), july26, prayerId)

  assert.equal(isDailySectionMarked(progress, july26, prayerId), true)
  assert.equal(isDailySectionMarked(progress, july27, prayerId), false)
})

test('a new calendar day does not advance unfinished reading streams', () => {
  const started = updateStreamPosition(
    createDefaultProgress(),
    'progressive',
    'mark.3.10',
  )

  const nextDayPrayerMarked = markDailySection(
    started,
    '2026-07-27',
    'weekday-prayer:1',
  )

  assert.equal(nextDayPrayerMarked.streams.progressive.assignmentIndex, 0)
  assert.equal(nextDayPrayerMarked.streams.progressive.lastVerseId, 'mark.3.10')
  assert.equal(nextDayPrayerMarked.streams.progressive.status, 'in-progress')
})

test('reading streams advance only after explicit completion', () => {
  const started = updateStreamPosition(
    createDefaultProgress(),
    'challenge',
    'luke.1.12',
  )

  assert.equal(started.streams.challenge.assignmentIndex, 0)

  const completed = completeStreamAssignment(
    started,
    'challenge',
    'challenge:luke:2',
  )

  assert.equal(completed.streams.challenge.assignmentIndex, 1)
  assert.equal(completed.streams.challenge.lastVerseId, null)
  assert.equal(completed.streams.challenge.status, 'not-started')
  assert.deepEqual(completed.streams.challenge.completedAssignmentIds, [
    'challenge:luke:2',
  ])
})

test('several assignments can be completed in one reading session', () => {
  const dateIso = '2026-07-30'
  const firstId = 'progressive:mark:chapters-1-2'
  const secondId = 'progressive:mark:chapters-3-4'

  const firstCompleted = markDailySection(
    completeStreamAssignment(
      createDefaultProgress(),
      'progressive',
      firstId,
    ),
    dateIso,
    'progressive',
  )

  assert.equal(firstCompleted.streams.progressive.assignmentIndex, 1)
  assert.equal(
    isLatestStreamAssignmentCompleted(
      firstCompleted,
      'progressive',
      firstId,
    ),
    true,
  )
  assert.equal(
    isLatestStreamAssignmentCompleted(
      firstCompleted,
      'progressive',
      secondId,
    ),
    false,
  )

  const secondCompleted = markDailySection(
    completeStreamAssignment(firstCompleted, 'progressive', secondId),
    dateIso,
    'progressive',
  )

  assert.equal(secondCompleted.streams.progressive.assignmentIndex, 2)
  assert.equal(
    isLatestStreamAssignmentCompleted(
      secondCompleted,
      'progressive',
      secondId,
    ),
    true,
  )
  assert.equal(
    isDailySectionMarked(secondCompleted, dateIso, 'progressive'),
    true,
  )
  assert.deepEqual(
    secondCompleted.streams.progressive.completedAssignmentIds,
    [firstId, secondId],
  )
})

test('stream completions remain ordered until the plan UI reaches book end', () => {
  const firstId = 'challenge:luke:1'
  const secondId = 'challenge:luke:2'
  const firstCycle = completeStreamAssignment(
    completeStreamAssignment(
      createDefaultProgress(),
      'challenge',
      firstId,
    ),
    'challenge',
    secondId,
  )
  const repeated = completeStreamAssignment(
    firstCycle,
    'challenge',
    firstId,
  )

  assert.equal(repeated.streams.challenge.assignmentIndex, 3)
  assert.deepEqual(
    repeated.streams.challenge.completedAssignmentIds,
    [firstId, secondId, firstId],
  )
  assert.equal(
    isLatestStreamAssignmentCompleted(repeated, 'challenge', firstId),
    true,
  )
})

test('each reading stream progresses independently', () => {
  const initial = createDefaultProgress()
  const progressiveComplete = completeStreamAssignment(
    initial,
    'progressive',
    'progressive:mark:1-2',
  )

  assert.equal(progressiveComplete.streams.progressive.assignmentIndex, 1)
  assert.equal(progressiveComplete.streams.challenge.assignmentIndex, 0)
  assert.equal(progressiveComplete.streams.psalm.assignmentIndex, 0)
})

test('contents navigation can select any unread assignment without marking it read', () => {
  const started = updateStreamPosition(
    completeStreamAssignment(
      createDefaultProgress(),
      'progressive',
      'progressive:mark:chapters-1-2',
    ),
    'progressive',
    'mark.3.8',
  )

  const selected = selectStreamAssignment(started, 'progressive', 6)

  assert.equal(selected.streams.progressive.assignmentIndex, 6)
  assert.equal(selected.streams.progressive.lastVerseId, null)
  assert.equal(selected.streams.progressive.status, 'not-started')
  assert.deepEqual(
    selected.streams.progressive.completedAssignmentIds,
    ['progressive:mark:chapters-1-2'],
  )
})

test('only the latest completion in a stream can be undone', () => {
  const firstComplete = completeStreamAssignment(
    createDefaultProgress(),
    'progressive',
    'progressive:mark:chapters-1-2',
  )
  const secondComplete = completeStreamAssignment(
    firstComplete,
    'progressive',
    'progressive:mark:chapters-3-4',
  )

  const refusedOlderUndo = undoLastStreamCompletion(
    secondComplete,
    'progressive',
    'progressive:mark:chapters-1-2',
  )

  assert.equal(refusedOlderUndo, secondComplete)

  const undone = undoLastStreamCompletion(
    secondComplete,
    'progressive',
    'progressive:mark:chapters-3-4',
  )

  assert.equal(undone.streams.progressive.assignmentIndex, 1)
  assert.equal(undone.streams.progressive.lastVerseId, null)
  assert.equal(undone.streams.progressive.status, 'not-started')
  assert.deepEqual(undone.streams.progressive.completedAssignmentIds, [
    'progressive:mark:chapters-1-2',
  ])
  assert.equal(undone.streams.challenge.assignmentIndex, 0)
  assert.equal(undone.streams.psalm.assignmentIndex, 0)
})

test('undo can remove today’s completion mark without disturbing other marks', () => {
  const dateIso = '2026-07-30'
  const marked = markDailySection(
    markDailySection(
      createDefaultProgress(),
      dateIso,
      'weekday-prayer:4',
    ),
    dateIso,
    'psalm',
  )

  const unmarked = unmarkDailySection(marked, dateIso, 'psalm')

  assert.equal(isDailySectionMarked(unmarked, dateIso, 'psalm'), false)
  assert.equal(
    isDailySectionMarked(unmarked, dateIso, 'weekday-prayer:4'),
    true,
  )
})

test('read history shows completed assignments newest first', () => {
  const candidates = {
    progressive: [
      {
        id: 'progressive:mark:chapters-1-2',
        kind: 'scripture' as const,
        sectionGreek: 'Πρόοδος',
        sectionEnglish: 'Progressive Reading',
        titleGreek: 'ΚΑΤΑ ΜΑΡΚΟΝ',
        reference: 'Mark 1–2',
        verses: [],
      },
      {
        id: 'progressive:mark:chapters-3-4',
        kind: 'scripture' as const,
        sectionGreek: 'Πρόοδος',
        sectionEnglish: 'Progressive Reading',
        titleGreek: 'ΚΑΤΑ ΜΑΡΚΟΝ',
        reference: 'Mark 3–4',
        verses: [],
      },
    ],
    challenge: [],
  }
  const items = readHistoryItems('progressive', [
    'progressive:mark:chapters-1-2',
    'progressive:mark:chapters-3-4',
  ], candidates)

  assert.deepEqual(
    items.map((item) => item.reference),
    ['Mark 3–4', 'Mark 1–2'],
  )
})

test('read history resolves Psalms and ignores invalid saved IDs', () => {
  const items = readHistoryItems('psalm', [
    'psalm:1',
    'legacy:unknown',
    'psalm:150',
  ], { progressive: [], challenge: [] })

  assert.deepEqual(
    items.map((item) => item.psalmNumber),
    [150, 1],
  )
})

test('the readings menu combines canonical contents with progress state', () => {
  const readings = [
    {
      id: 'progressive:mark:chapters-1-2',
      kind: 'scripture' as const,
      sectionGreek: 'Πρόοδος',
      sectionEnglish: 'Progressive Reading',
      titleGreek: 'ΚΑΤΑ ΜΑΡΚΟΝ',
      reference: 'Mark 1–2',
      verses: [],
    },
    {
      id: 'progressive:mark:chapters-3-4',
      kind: 'scripture' as const,
      sectionGreek: 'Πρόοδος',
      sectionEnglish: 'Progressive Reading',
      titleGreek: 'ΚΑΤΑ ΜΑΡΚΟΝ',
      reference: 'Mark 3–4',
      verses: [],
    },
    {
      id: 'progressive:mark:chapters-5-6',
      kind: 'scripture' as const,
      sectionGreek: 'Πρόοδος',
      sectionEnglish: 'Progressive Reading',
      titleGreek: 'ΚΑΤΑ ΜΑΡΚΟΝ',
      reference: 'Mark 5–6',
      verses: [],
    },
  ]
  const items = readingContentsItems(
    'progressive',
    1,
    ['progressive:mark:chapters-1-2'],
    { progressive: readings, challenge: [] },
  )

  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      assignmentIndex: item.assignmentIndex,
      isCompleted: item.isCompleted,
      isCurrent: item.isCurrent,
    })),
    [
      {
        id: 'progressive:mark:chapters-1-2',
        assignmentIndex: 0,
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'progressive:mark:chapters-3-4',
        assignmentIndex: 1,
        isCompleted: false,
        isCurrent: true,
      },
      {
        id: 'progressive:mark:chapters-5-6',
        assignmentIndex: 2,
        isCompleted: false,
        isCurrent: false,
      },
    ],
  )
})

test('a completed finite book has no silently wrapped current assignment', () => {
  const readings = [
    {
      id: 'progressive:mark:chapters-1-2',
      kind: 'scripture' as const,
      sectionGreek: 'Πρόοδος',
      sectionEnglish: 'Progressive Reading',
      titleGreek: 'Κατὰ Μᾶρκον',
      reference: 'Mark 1–2',
      verses: [],
    },
  ]
  const items = readingContentsItems(
    'progressive',
    readings.length,
    [readings[0].id],
    { progressive: readings, challenge: [] },
  )

  assert.equal(items[0].isCompleted, true)
  assert.equal(items[0].isCurrent, false)
  assert.equal(items[0].assignmentIndex, 0)
})

test('new users default to Mark and Luke plans', () => {
  const progress = createDefaultProgress()

  assert.deepEqual(progress.planSelections.progressive, {
    corpus: 'sblgnt',
    bookId: 'mark',
  })
  assert.deepEqual(progress.planSelections.challenge, {
    corpus: 'sblgnt',
    bookId: 'luke',
  })
})

test('switching plan books preserves independent progress and verse position', () => {
  const markStarted = updateStreamPosition(
    completeStreamAssignment(
      createDefaultProgress(),
      'progressive',
      'progressive:mark:chapters-1-2',
    ),
    'progressive',
    'mark.3.8',
  )
  const genesisSelected = switchReadingPlan(
    markStarted,
    'progressive',
    { corpus: 'lxx', bookId: 'genesis' },
  )
  const genesisStarted = updateStreamPosition(
    genesisSelected,
    'progressive',
    'genesis.1.5',
  )
  const markRestored = switchReadingPlan(
    genesisStarted,
    'progressive',
    { corpus: 'sblgnt', bookId: 'mark' },
  )
  const genesisRestored = switchReadingPlan(
    markRestored,
    'progressive',
    { corpus: 'lxx', bookId: 'genesis' },
  )

  assert.equal(markRestored.streams.progressive.assignmentIndex, 1)
  assert.equal(markRestored.streams.progressive.lastVerseId, 'mark.3.8')
  assert.deepEqual(
    markRestored.streams.progressive.completedAssignmentIds,
    ['progressive:mark:chapters-1-2'],
  )
  assert.equal(genesisRestored.streams.progressive.assignmentIndex, 0)
  assert.equal(genesisRestored.streams.progressive.lastVerseId, 'genesis.1.5')
})

test('read again returns a completed book to its first assignment', () => {
  const completed = completeStreamAssignment(
    createDefaultProgress(),
    'progressive',
    'progressive:mark:chapters-15-16',
  )
  const selectedEnd = selectStreamAssignment(completed, 'progressive', 8)
  const restarted = restartReadingPlan(selectedEnd, 'progressive')

  assert.equal(restarted.streams.progressive.assignmentIndex, 0)
  assert.equal(restarted.streams.progressive.lastVerseId, null)
  assert.deepEqual(
    restarted.streams.progressive.completedAssignmentIds,
    ['progressive:mark:chapters-15-16'],
  )
})

test('legacy Progressive state migrates to its actual current book', () => {
  const migrated = migrateLegacyProgress({
    version: 2,
    streams: {
      progressive: {
        assignmentIndex: 9,
        lastVerseId: 'john.3.4',
        status: 'in-progress',
        completedAssignmentIds: [
          'progressive:mark:chapters-1-2',
          'progressive:john:chapters-1-2',
        ],
      },
    },
    dailyMarks: { '2026-07-31': ['progressive'] },
  })

  assert.deepEqual(migrated.planSelections.progressive, {
    corpus: 'sblgnt',
    bookId: 'john',
  })
  assert.equal(migrated.streams.progressive.assignmentIndex, 1)
  assert.equal(migrated.streams.progressive.lastVerseId, 'john.3.4')
  assert.deepEqual(
    migrated.savedPlanProgress.progressive['sblgnt:mark']
      .completedAssignmentIds,
    ['progressive:mark:chapters-1-2'],
  )
  assert.deepEqual(migrated.dailyMarks, {
    '2026-07-31': ['progressive'],
  })
})

test('Progressive plans cover one selected book in two-chapter assignments', () => {
  const genesis = bookForCorpus('lxx', 'genesis')
  assert.ok(genesis)

  const plan = buildProgressivePlan(
    'lxx',
    genesis,
    genesisData as ScriptureBook,
  )

  assert.equal(plan.length, 25)
  assert.equal(plan[0].reference, 'Genesis 1–2')
  assert.equal(plan.at(-1)?.reference, 'Genesis 49–50')
})

test('Challenge keeps Luke history then continues through the whole book', () => {
  const luke = bookForCorpus('sblgnt', 'luke')
  assert.ok(luke)

  const plan = buildChallengePlan(
    'sblgnt',
    luke,
    lukeData as ScriptureBook,
  )

  assert.deepEqual(
    plan.slice(0, 8).map((reading) => reading.id),
    Array.from({ length: 8 }, (_, index) => `challenge:luke:${index + 1}`),
  )
  assert.equal(plan[0].reference, 'Luke 1:1–4')
  assert.equal(plan.at(-1)?.verses.at(-1)?.chapter, 24)
  assert.ok(
    plan.slice(8).every((reading) => (
      reading.verses.length <= 25
      && new Set(reading.verses.map((verse) => verse.chapter)).size === 1
    )),
  )
})

test('the Scripture browser exposes the complete SBLGNT and approved LXX corpus', () => {
  assert.equal(booksForCorpus('sblgnt').length, 27)
  assert.equal(booksForCorpus('lxx').length, 55)
  assert.equal(booksForCorpus('lxx').at(0)?.id, 'genesis')
  assert.equal(
    booksForCorpus('lxx').at(-1)?.id,
    'bel-and-the-dragon-theodotion',
  )
  assert.equal(
    bookForCorpus('sblgnt', 'mark')?.chapterNumbers.length,
    16,
  )
  assert.equal(
    bookForCorpus('lxx', 'psalms')?.chapterNumbers.length,
    151,
  )
  assert.equal(bookForCorpus('lxx', 'genesis')?.titleGreek, 'Γένεσις')
  assert.equal(bookForCorpus('lxx', 'ecclesiastes'), null)
})

test('the Scripture browser derives selectable chapters from catalog metadata', () => {
  const mark = bookForCorpus('sblgnt', 'mark')
  const psalms = bookForCorpus('lxx', 'psalms')

  assert.deepEqual(chapterNumbers(mark), [
    1, 2, 3, 4, 5, 6, 7, 8,
    9, 10, 11, 12, 13, 14, 15, 16,
  ])
  assert.equal(chapterNumbers(psalms).at(-1), 151)
  assert.deepEqual(chapterNumbers(null), [])
})

test('Free Reading resolves chapter and book boundaries within one corpus', () => {
  assert.deepEqual(
    resolveFreeReadingBoundary('sblgnt', 'mark', 2, 'previous'),
    {
      corpus: 'sblgnt',
      bookId: 'mark',
      chapter: 1,
      verseEdge: 'last',
      kind: 'chapter',
    },
  )
  assert.deepEqual(
    resolveFreeReadingBoundary('sblgnt', 'mark', 1, 'previous'),
    {
      corpus: 'sblgnt',
      bookId: 'matthew',
      chapter: 28,
      verseEdge: 'last',
      kind: 'book',
    },
  )
  assert.deepEqual(
    resolveFreeReadingBoundary('sblgnt', 'mark', 15, 'next'),
    {
      corpus: 'sblgnt',
      bookId: 'mark',
      chapter: 16,
      verseEdge: 'first',
      kind: 'chapter',
    },
  )
  assert.deepEqual(
    resolveFreeReadingBoundary('sblgnt', 'mark', 16, 'next'),
    {
      corpus: 'sblgnt',
      bookId: 'luke',
      chapter: 1,
      verseEdge: 'first',
      kind: 'book',
    },
  )
})

test('Free Reading stops at corpus boundaries', () => {
  assert.equal(
    resolveFreeReadingBoundary('sblgnt', 'matthew', 1, 'previous'),
    null,
  )
  assert.equal(
    resolveFreeReadingBoundary('sblgnt', 'revelation', 22, 'next'),
    null,
  )
  assert.equal(
    resolveFreeReadingBoundary('lxx', 'genesis', 1, 'previous'),
    null,
  )
  assert.equal(
    resolveFreeReadingBoundary(
      'lxx',
      'bel-and-the-dragon-theodotion',
      1,
      'next',
    ),
    null,
  )
})

test('Free Reading resolves representative LXX chapter and book boundaries', () => {
  assert.deepEqual(
    resolveFreeReadingBoundary('lxx', 'genesis', 2, 'previous'),
    {
      corpus: 'lxx',
      bookId: 'genesis',
      chapter: 1,
      verseEdge: 'last',
      kind: 'chapter',
    },
  )
  assert.deepEqual(
    resolveFreeReadingBoundary('lxx', 'genesis', 1, 'next'),
    {
      corpus: 'lxx',
      bookId: 'genesis',
      chapter: 2,
      verseEdge: 'first',
      kind: 'chapter',
    },
  )
  assert.deepEqual(
    resolveFreeReadingBoundary('lxx', 'exodus', 1, 'previous'),
    {
      corpus: 'lxx',
      bookId: 'genesis',
      chapter: 50,
      verseEdge: 'last',
      kind: 'book',
    },
  )
  assert.deepEqual(
    resolveFreeReadingBoundary('lxx', 'genesis', 50, 'next'),
    {
      corpus: 'lxx',
      bookId: 'exodus',
      chapter: 1,
      verseEdge: 'first',
      kind: 'book',
    },
  )
})

test('every LXX book boundary resolves through the available catalog order', () => {
  const books = booksForCorpus('lxx')

  books.forEach((book, index) => {
    const firstChapter = book.chapterNumbers[0]
    const finalChapter = book.chapterNumbers.at(-1)
    assert.notEqual(firstChapter, undefined)
    assert.notEqual(finalChapter, undefined)

    const previous = resolveFreeReadingBoundary(
      'lxx',
      book.id,
      firstChapter!,
      'previous',
    )
    const previousBook = books[index - 1]
    if (previousBook) {
      assert.equal(previous?.bookId, previousBook.id)
      assert.equal(previous?.chapter, previousBook.chapterNumbers.at(-1))
      assert.equal(previous?.kind, 'book')
    } else {
      assert.equal(previous, null)
    }

    const next = resolveFreeReadingBoundary(
      'lxx',
      book.id,
      finalChapter!,
      'next',
    )
    const nextBook = books[index + 1]
    if (nextBook) {
      assert.equal(next?.bookId, nextBook.id)
      assert.equal(next?.chapter, nextBook.chapterNumbers[0])
      assert.equal(next?.kind, 'book')
    } else {
      assert.equal(next, null)
    }
  })
})

test('the LXX catalog preserves source chapter labels and textual variants', () => {
  assert.equal(
    chapterNumbers(bookForCorpus('lxx', 'esther')).at(0),
    'prologue',
  )
  assert.deepEqual(
    chapterNumbers(bookForCorpus('lxx', 'odes')).slice(3, 5),
    ['iva', 'ivb'],
  )
  assert.equal(
    bookForCorpus('lxx', 'daniel-old-greek')?.titleGreek,
    'Δανιήλ (Οʹ)',
  )
  assert.equal(
    bookForCorpus('lxx', 'daniel-theodotion')?.titleGreek,
    'Δανιήλ (Θʹ)',
  )
})

test('current Scripture streams restore a saved verse', () => {
  const verseIds = ['mark.1.1', 'mark.1.2', 'mark.1.3']

  assert.equal(remembersVersePosition('progressive'), true)
  assert.equal(remembersVersePosition('challenge'), true)
  assert.equal(remembersVersePosition('psalm'), true)
  assert.equal(
    restoredVerseIndex('progressive', 'mark.1.2', verseIds),
    1,
  )
  assert.equal(
    restoredVerseIndex('challenge', 'mark.1.3', verseIds),
    2,
  )
  assert.equal(
    restoredVerseIndex('psalm', 'mark.1.3', verseIds),
    2,
  )
})

test('completing a Psalm clears its saved verse for the next assignment', () => {
  const started = updateStreamPosition(
    createDefaultProgress(),
    'psalm',
    'psalms.1.4',
  )

  const completed = completeStreamAssignment(started, 'psalm', 'psalm:1')

  assert.equal(completed.streams.psalm.assignmentIndex, 1)
  assert.equal(completed.streams.psalm.lastVerseId, null)
  assert.equal(
    restoredVerseIndex(
      'psalm',
      completed.streams.psalm.lastVerseId,
      ['psalms.2.1', 'psalms.2.2'],
    ),
    0,
  )
})

test('a missing saved verse falls back to the reading top', () => {
  assert.equal(
    restoredVerseIndex(
      'progressive',
      'mark.9.99',
      ['mark.1.1', 'mark.1.2'],
    ),
    0,
  )
})
