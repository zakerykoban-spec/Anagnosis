export type ReaderBannerKind = 'altar' | 'meal' | 'after-meal' | 'psalm'

export type ReaderEntryContext = 'daily-office' | 'navigation'

export function readerBannerKindForEntry({
  bookId,
  context,
  entryId,
  entryKind,
}: {
  bookId: string | null
  context: ReaderEntryContext
  entryId: string
  entryKind: 'scripture' | 'prayer'
}): ReaderBannerKind | null {
  if (
    context === 'daily-office'
    && entryKind === 'scripture'
    && entryId.startsWith('psalm:')
    && bookId === 'psalms'
  ) return 'psalm'

  if (entryId === 'meal:after') return 'after-meal'
  if (entryId.startsWith('meal:')) return 'meal'
  if (entryKind === 'prayer') return 'altar'
  return null
}
