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

export type ReadHistoryCandidates = {
  progressive: ScriptureReading[]
  challenge: ScriptureReading[]
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
