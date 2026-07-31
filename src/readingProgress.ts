import type { ScriptureCorpusId } from './scriptureCatalog'

export type ReadingStreamId = 'progressive' | 'challenge' | 'psalm'
export type ReadingPlanStreamId = Exclude<ReadingStreamId, 'psalm'>

export type ReadingStreamProgress = {
  assignmentIndex: number
  lastVerseId: string | null
  status: 'not-started' | 'in-progress'
  completedAssignmentIds: string[]
}

export type ReadingPlanSelection = {
  corpus: ScriptureCorpusId
  bookId: string
}

export type ReadingProgressState = {
  version: 3
  streams: Record<ReadingStreamId, ReadingStreamProgress>
  planSelections: Record<ReadingPlanStreamId, ReadingPlanSelection>
  savedPlanProgress: Record<
    ReadingPlanStreamId,
    Record<string, ReadingStreamProgress>
  >
  dailyMarks: Record<string, string[]>
}

type LegacyReadingProgressState = {
  version?: 2
  streams?: Partial<Record<ReadingStreamId, Partial<ReadingStreamProgress>>>
  dailyMarks?: Record<string, string[]>
}

const PROGRESS_KEY = 'anagnosis.progress.v3'
const LEGACY_PROGRESS_KEY = 'anagnosis.progress.v2'

export const DEFAULT_PLAN_SELECTIONS: Record<
  ReadingPlanStreamId,
  ReadingPlanSelection
> = {
  progressive: { corpus: 'sblgnt', bookId: 'mark' },
  challenge: { corpus: 'sblgnt', bookId: 'luke' },
}

const LEGACY_PROGRESSIVE_BOOKS = [
  { bookId: 'mark', assignments: 8 },
  { bookId: 'john', assignments: 11 },
  { bookId: 'acts', assignments: 14 },
] as const

const createStream = (): ReadingStreamProgress => ({
  assignmentIndex: 0,
  lastVerseId: null,
  status: 'not-started',
  completedAssignmentIds: [],
})

function sanitizeStream(
  value: Partial<ReadingStreamProgress> | undefined,
): ReadingStreamProgress {
  const assignmentIndex = Number.isSafeInteger(value?.assignmentIndex)
    && Number(value?.assignmentIndex) >= 0
    ? Number(value?.assignmentIndex)
    : 0
  const completedAssignmentIds = Array.isArray(value?.completedAssignmentIds)
    ? value.completedAssignmentIds.filter(
        (id): id is string => typeof id === 'string',
      )
    : []

  return {
    assignmentIndex,
    lastVerseId: typeof value?.lastVerseId === 'string'
      ? value.lastVerseId
      : null,
    status: value?.status === 'in-progress' ? 'in-progress' : 'not-started',
    completedAssignmentIds,
  }
}

export function readingPlanKey(selection: ReadingPlanSelection) {
  return `${selection.corpus}:${selection.bookId}`
}

export const createDefaultProgress = (): ReadingProgressState => ({
  version: 3,
  streams: {
    progressive: createStream(),
    challenge: createStream(),
    psalm: createStream(),
  },
  planSelections: {
    progressive: { ...DEFAULT_PLAN_SELECTIONS.progressive },
    challenge: { ...DEFAULT_PLAN_SELECTIONS.challenge },
  },
  savedPlanProgress: {
    progressive: {},
    challenge: {},
  },
  dailyMarks: {},
})

function progressiveBookAtLegacyIndex(assignmentIndex: number) {
  const cycleLength = LEGACY_PROGRESSIVE_BOOKS.reduce(
    (total, book) => total + book.assignments,
    0,
  )
  let index = ((assignmentIndex % cycleLength) + cycleLength) % cycleLength

  for (const book of LEGACY_PROGRESSIVE_BOOKS) {
    if (index < book.assignments) {
      return { ...book, assignmentIndex: index }
    }
    index -= book.assignments
  }

  return { ...LEGACY_PROGRESSIVE_BOOKS[0], assignmentIndex: 0 }
}

function completedForBook(ids: string[], bookId: string) {
  return ids.filter((id) => id.startsWith(`progressive:${bookId}:`))
}

export function migrateLegacyProgress(
  legacy: LegacyReadingProgressState,
): ReadingProgressState {
  const defaults = createDefaultProgress()
  const oldProgressive = sanitizeStream(legacy.streams?.progressive)
  const oldChallenge = sanitizeStream(legacy.streams?.challenge)
  const oldPsalm = sanitizeStream(legacy.streams?.psalm)
  const currentBook = progressiveBookAtLegacyIndex(
    oldProgressive.assignmentIndex,
  )
  const savedProgressive: Record<string, ReadingStreamProgress> = {}

  LEGACY_PROGRESSIVE_BOOKS.forEach((book) => {
    const completedAssignmentIds = completedForBook(
      oldProgressive.completedAssignmentIds,
      book.bookId,
    )
    savedProgressive[`sblgnt:${book.bookId}`] = {
      assignmentIndex: book.bookId === currentBook.bookId
        ? currentBook.assignmentIndex
        : Math.min(completedAssignmentIds.length, book.assignments),
      lastVerseId: book.bookId === currentBook.bookId
        && oldProgressive.lastVerseId?.startsWith(`${book.bookId}.`)
        ? oldProgressive.lastVerseId
        : null,
      status: book.bookId === currentBook.bookId
        ? oldProgressive.status
        : 'not-started',
      completedAssignmentIds,
    }
  })

  const progressiveKey = `sblgnt:${currentBook.bookId}`
  const challengeKey = readingPlanKey(DEFAULT_PLAN_SELECTIONS.challenge)

  return {
    ...defaults,
    streams: {
      progressive: savedProgressive[progressiveKey],
      challenge: oldChallenge,
      psalm: oldPsalm,
    },
    planSelections: {
      progressive: { corpus: 'sblgnt', bookId: currentBook.bookId },
      challenge: { ...DEFAULT_PLAN_SELECTIONS.challenge },
    },
    savedPlanProgress: {
      progressive: savedProgressive,
      challenge: { [challengeKey]: oldChallenge },
    },
    dailyMarks: legacy.dailyMarks ?? {},
  }
}

function parseCurrentProgress(value: unknown): ReadingProgressState | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<ReadingProgressState>
  if (parsed.version !== 3) return null
  const defaults = createDefaultProgress()
  const progressiveSelection = parsed.planSelections?.progressive
  const challengeSelection = parsed.planSelections?.challenge

  return {
    version: 3,
    streams: {
      progressive: sanitizeStream(parsed.streams?.progressive),
      challenge: sanitizeStream(parsed.streams?.challenge),
      psalm: sanitizeStream(parsed.streams?.psalm),
    },
    planSelections: {
      progressive: progressiveSelection?.corpus
        && progressiveSelection.bookId
        ? progressiveSelection
        : defaults.planSelections.progressive,
      challenge: challengeSelection?.corpus
        && challengeSelection.bookId
        ? challengeSelection
        : defaults.planSelections.challenge,
    },
    savedPlanProgress: {
      progressive: parsed.savedPlanProgress?.progressive ?? {},
      challenge: parsed.savedPlanProgress?.challenge ?? {},
    },
    dailyMarks: parsed.dailyMarks ?? {},
  }
}

export function loadProgress(): ReadingProgressState {
  try {
    const current = window.localStorage.getItem(PROGRESS_KEY)
    if (current) {
      return parseCurrentProgress(JSON.parse(current))
        ?? createDefaultProgress()
    }

    const legacy = window.localStorage.getItem(LEGACY_PROGRESS_KEY)
    return legacy
      ? migrateLegacyProgress(JSON.parse(legacy) as LegacyReadingProgressState)
      : createDefaultProgress()
  } catch {
    return createDefaultProgress()
  }
}

export function saveProgress(progress: ReadingProgressState) {
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

function updateStream(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  stream: ReadingStreamProgress,
): ReadingProgressState {
  return {
    ...progress,
    streams: {
      ...progress.streams,
      [streamId]: stream,
    },
  }
}

export function switchReadingPlan(
  progress: ReadingProgressState,
  streamId: ReadingPlanStreamId,
  selection: ReadingPlanSelection,
): ReadingProgressState {
  const currentSelection = progress.planSelections[streamId]
  const currentKey = readingPlanKey(currentSelection)
  const nextKey = readingPlanKey(selection)
  if (currentKey === nextKey) return progress

  const saved = {
    ...progress.savedPlanProgress[streamId],
    [currentKey]: progress.streams[streamId],
  }

  return {
    ...progress,
    streams: {
      ...progress.streams,
      [streamId]: sanitizeStream(saved[nextKey]),
    },
    planSelections: {
      ...progress.planSelections,
      [streamId]: selection,
    },
    savedPlanProgress: {
      ...progress.savedPlanProgress,
      [streamId]: saved,
    },
  }
}

export function restartReadingPlan(
  progress: ReadingProgressState,
  streamId: ReadingPlanStreamId,
): ReadingProgressState {
  return updateStream(progress, streamId, {
    ...progress.streams[streamId],
    assignmentIndex: 0,
    lastVerseId: null,
    status: 'not-started',
  })
}

export function updateStreamPosition(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  verseId: string,
): ReadingProgressState {
  return updateStream(progress, streamId, {
    ...progress.streams[streamId],
    lastVerseId: verseId,
    status: 'in-progress',
  })
}

export function completeStreamAssignment(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  assignmentId: string,
): ReadingProgressState {
  const stream = progress.streams[streamId]

  return updateStream(progress, streamId, {
    assignmentIndex: stream.assignmentIndex + 1,
    lastVerseId: null,
    status: 'not-started',
    completedAssignmentIds: [
      ...stream.completedAssignmentIds,
      assignmentId,
    ],
  })
}

export function selectStreamAssignment(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  assignmentIndex: number,
): ReadingProgressState {
  if (!Number.isSafeInteger(assignmentIndex) || assignmentIndex < 0) {
    return progress
  }

  const stream = progress.streams[streamId]
  if (
    stream.assignmentIndex === assignmentIndex
    && stream.lastVerseId === null
    && stream.status === 'not-started'
  ) {
    return progress
  }

  return updateStream(progress, streamId, {
    ...stream,
    assignmentIndex,
    lastVerseId: null,
    status: 'not-started',
  })
}

export function isLatestStreamAssignmentCompleted(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  assignmentId: string,
) {
  return progress.streams[streamId].completedAssignmentIds.at(-1)
    === assignmentId
}

export function undoLastStreamCompletion(
  progress: ReadingProgressState,
  streamId: ReadingStreamId,
  assignmentId: string,
): ReadingProgressState {
  const stream = progress.streams[streamId]
  const latestCompletedId = stream.completedAssignmentIds.at(-1)

  if (stream.assignmentIndex < 1 || latestCompletedId !== assignmentId) {
    return progress
  }

  return updateStream(progress, streamId, {
    assignmentIndex: stream.assignmentIndex - 1,
    lastVerseId: null,
    status: 'not-started',
    completedAssignmentIds: stream.completedAssignmentIds.slice(0, -1),
  })
}

export function markDailySection(
  progress: ReadingProgressState,
  dateIso: string,
  sectionId: string,
): ReadingProgressState {
  const current = progress.dailyMarks[dateIso] ?? []
  if (current.includes(sectionId)) return progress

  return {
    ...progress,
    dailyMarks: {
      ...progress.dailyMarks,
      [dateIso]: [...current, sectionId],
    },
  }
}

export function unmarkDailySection(
  progress: ReadingProgressState,
  dateIso: string,
  sectionId: string,
): ReadingProgressState {
  const current = progress.dailyMarks[dateIso] ?? []
  if (!current.includes(sectionId)) return progress

  const remaining = current.filter((id) => id !== sectionId)
  const dailyMarks = { ...progress.dailyMarks }
  if (remaining.length > 0) dailyMarks[dateIso] = remaining
  else delete dailyMarks[dateIso]

  return { ...progress, dailyMarks }
}

export function isDailySectionMarked(
  progress: ReadingProgressState,
  dateIso: string,
  sectionId: string,
) {
  return progress.dailyMarks[dateIso]?.includes(sectionId) ?? false
}
