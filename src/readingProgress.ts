export type ReadingStreamId = 'progressive' | 'challenge' | 'psalm'

export type ReadingStreamProgress = {
  assignmentIndex: number
  lastVerseId: string | null
  status: 'not-started' | 'in-progress'
  completedAssignmentIds: string[]
}

export type ReadingProgressState = {
  version: 2
  streams: Record<ReadingStreamId, ReadingStreamProgress>
  dailyMarks: Record<string, string[]>
}

const PROGRESS_KEY = 'anagnosis.progress.v2'

const createStream = (): ReadingStreamProgress => ({
  assignmentIndex: 0,
  lastVerseId: null,
  status: 'not-started',
  completedAssignmentIds: [],
})

export const createDefaultProgress = (): ReadingProgressState => ({
  version: 2,
  streams: {
    progressive: createStream(),
    challenge: createStream(),
    psalm: createStream(),
  },
  dailyMarks: {},
})

export function loadProgress(): ReadingProgressState {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY)

    if (!stored) {
      return createDefaultProgress()
    }

    const parsed = JSON.parse(stored) as Partial<ReadingProgressState>
    const defaults = createDefaultProgress()

    return {
      version: 2,
      streams: {
        progressive: {
          ...defaults.streams.progressive,
          ...parsed.streams?.progressive,
        },
        challenge: {
          ...defaults.streams.challenge,
          ...parsed.streams?.challenge,
        },
        psalm: {
          ...defaults.streams.psalm,
          ...parsed.streams?.psalm,
        },
      },
      dailyMarks: parsed.dailyMarks ?? {},
    }
  } catch {
    return createDefaultProgress()
  }
}

export function saveProgress(progress: ReadingProgressState) {
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function updateStreamPosition(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  verseId: string,
): ReadingProgressState {
  return {
    ...progress,
    streams: {
      ...progress.streams,
      [streamId]: {
        ...progress.streams[streamId],
        lastVerseId: verseId,
        status: 'in-progress',
      },
    },
  }
}

export function completeStreamAssignment(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  assignmentId: string,
): ReadingProgressState {
  const stream = progress.streams[streamId]
  const completedAssignmentIds = stream.completedAssignmentIds.includes(assignmentId)
    ? stream.completedAssignmentIds
    : [...stream.completedAssignmentIds, assignmentId]

  return {
    ...progress,
    streams: {
      ...progress.streams,
      [streamId]: {
        assignmentIndex: stream.assignmentIndex + 1,
        lastVerseId: null,
        status: 'not-started',
        completedAssignmentIds,
      },
    },
  }
}

export function markDailySection(
  progress: ReadingProgressState,
  dateIso: string,
  sectionId: string,
): ReadingProgressState {
  const current = progress.dailyMarks[dateIso] ?? []

  if (current.includes(sectionId)) {
    return progress
  }

  return {
    ...progress,
    dailyMarks: {
      ...progress.dailyMarks,
      [dateIso]: [...current, sectionId],
    },
  }
}

export function isDailySectionMarked(
  progress: ReadingProgressState,
  dateIso: string,
  sectionId: string,
) {
  return progress.dailyMarks[dateIso]?.includes(sectionId) ?? false
}
