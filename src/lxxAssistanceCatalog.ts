import manifestData from './data/scripture/generated/lxx-assistance/manifest.json' with { type: 'json' }

interface LxxAssistanceManifest {
  schemaVersion: number
  scope: string
  books: Array<{
    id: string
    files: Array<{ filename: string; sha256: string }>
  }>
}

const manifest = manifestData as LxxAssistanceManifest

export function lxxAssistanceEntry(bookId: string) {
  if (manifest.schemaVersion !== 1 || manifest.scope !== 'reviewed-expansion') return null
  return manifest.books.find((book) => book.id === bookId) ?? null
}

export function lxxAssistanceApplies(
  context: 'progressive' | 'challenge' | 'free-reading' | 'psalm' | 'prayer' | null,
  bookId?: string | null,
) {
  if (!bookId || !lxxAssistanceEntry(bookId)) return false
  return context === 'free-reading' || (context === 'psalm' && bookId === 'psalms')
}
