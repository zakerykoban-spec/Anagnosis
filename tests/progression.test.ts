import test from 'node:test'
import assert from 'node:assert/strict'
import {
  completeStreamAssignment,
  createDefaultProgress,
  isDailySectionMarked,
  markDailySection,
  updateStreamPosition,
} from '../src/readingProgress.ts'

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
