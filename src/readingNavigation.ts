import type { ReadingStreamId } from './readingProgress'

export function remembersVersePosition(
  streamId: ReadingStreamId | null,
): streamId is 'progressive' | 'challenge' {
  return streamId === 'progressive' || streamId === 'challenge'
}

export function restoredVerseIndex(
  streamId: ReadingStreamId | null,
  savedVerseId: string | null,
  verseIds: string[],
) {
  if (!remembersVersePosition(streamId) || !savedVerseId) return 0

  const savedIndex = verseIds.indexOf(savedVerseId)
  return savedIndex >= 0 ? savedIndex : 0
}
