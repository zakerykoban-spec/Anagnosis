import type { ScriptureReading } from './data/dailyOffice'
import type { ReadingStreamId } from './readingProgress'

export type ReadHistoryItem = {
  id: string
  streamId: ReadingStreamId
  titleGreek: string
  reference: string
  reading?: ScriptureReading
  psalmNumber?: number
}

export type ReadingContentsItem = ReadHistoryItem & {
  assignmentIndex: number
  isCompleted: boolean
  isCurrent: boolean
}

export type ReadHistoryCandidates = {
  progressive: ScriptureReading[]
  challenge: ScriptureReading[]
}

const PSALM_COUNT = 150

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function resolveCompletedReading(
  streamId: ReadingStreamId,
  assignmentId: string,
  candidates: ReadHistoryCandidates,
): ReadHistoryItem | null {
  if (streamId === 'psalm') {
    const match = /^psalm:(\d+)$/.exec(assignmentId)
    const psalmNumber = match ? Number.parseInt(match[1], 10) : Number.NaN

    if (!Number.isInteger(psalmNumber) || psalmNumber < 1 || psalmNumber > 150) {
      return null
    }

    return {
      id: assignmentId,
      streamId,
      titleGreek: `Ψαλμὸς ${psalmNumber}`,
      reference: `Psalm ${psalmNumber}`,
      psalmNumber,
    }
  }

  const readings = candidates[streamId]
  const reading = readings.find((candidate) => candidate.id === assignmentId)

  if (!reading) {
    return null
  }

  return {
    id: assignmentId,
    streamId,
    titleGreek: reading.titleGreek,
    reference: reading.reference,
    reading,
  }
}

export function readHistoryItems(
  streamId: ReadingStreamId,
  completedAssignmentIds: string[],
  candidates: ReadHistoryCandidates,
): ReadHistoryItem[] {
  const seen = new Set<string>()

  return completedAssignmentIds
    .slice()
    .reverse()
    .filter((assignmentId) => {
      if (seen.has(assignmentId)) {
        return false
      }

      seen.add(assignmentId)
      return true
    })
    .map((assignmentId) =>
      resolveCompletedReading(streamId, assignmentId, candidates),
    )
    .filter((item): item is ReadHistoryItem => item !== null)
}

export function readingContentsItems(
  streamId: ReadingStreamId,
  currentAssignmentIndex: number,
  completedAssignmentIds: string[],
  candidates: ReadHistoryCandidates,
): ReadingContentsItem[] {
  const readings: ReadHistoryItem[] = streamId === 'psalm'
    ? Array.from({ length: PSALM_COUNT }, (_, index) => ({
        id: `psalm:${index + 1}`,
        streamId,
        titleGreek: `Ψαλμὸς ${index + 1}`,
        reference: `Psalm ${index + 1}`,
        psalmNumber: index + 1,
      }))
    : candidates[streamId].map((reading) => ({
        id: reading.id,
        streamId,
        titleGreek: reading.titleGreek,
        reference: reading.reference,
        reading,
      }))

  if (readings.length === 0) return []

  const currentCycleIndex = streamId === 'psalm'
    ? positiveModulo(currentAssignmentIndex, readings.length)
    : currentAssignmentIndex
  const cycleStart = streamId === 'psalm'
    ? currentAssignmentIndex - currentCycleIndex
    : 0
  const completedIds = new Set(completedAssignmentIds)

  return readings.map((reading, index) => ({
    ...reading,
    assignmentIndex: cycleStart + index,
    isCompleted: completedIds.has(reading.id),
    isCurrent: index === currentCycleIndex,
  }))
}
