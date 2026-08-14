export type VerseMoveIntent = 'navigation' | 'verse-number'

export function explicitVerseSelectionAfterMove(
  verseId: string,
  intent: VerseMoveIntent,
): string | null {
  return intent === 'verse-number' ? verseId : null
}

export function isExplicitVerseSelected(
  selectedVerseId: string | null,
  verseId: string,
) {
  return selectedVerseId === verseId
}
