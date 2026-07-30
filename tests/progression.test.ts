import test from 'node:test'
import assert from 'node:assert/strict'
import {
  completeStreamAssignment,
  createDefaultProgress,
  isLatestStreamAssignmentCompleted,
  isDailySectionMarked,
  markDailySection,
  selectStreamAssignment,
  undoLastStreamCompletion,
  unmarkDailySection,
  updateStreamPosition,
} from '../src/readingProgress.ts'
import {
  readHistoryItems,
  readingContentsItems,
} from '../src/readHistory.ts'
import {
  remembersVersePosition,
  restoredVerseIndex,
} from '../src/readingNavigation.ts'

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

test('repeated readings remain completable after a plan cycle wraps', () => {
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
    4,
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
        assignmentIndex: 3,
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'progressive:mark:chapters-3-4',
        assignmentIndex: 4,
        isCompleted: false,
        isCurrent: true,
      },
      {
        id: 'progressive:mark:chapters-5-6',
        assignmentIndex: 5,
        isCompleted: false,
        isCurrent: false,
      },
    ],
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
