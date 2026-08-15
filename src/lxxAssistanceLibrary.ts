import type { LxxAssistanceBook } from './models/lexical'
import { lxxAssistanceEntry } from './lxxAssistanceCatalog'

const MODULES = import.meta.glob<{ default: LxxAssistanceBook }>([
  './data/scripture/generated/lxx-assistance/*.json',
  '!./data/scripture/generated/lxx-assistance/manifest.json',
])

export async function loadLxxAssistanceBook(bookId: string) {
  const entry = lxxAssistanceEntry(bookId)
  if (!entry) throw new Error(`LXX assistance is unavailable for ${bookId}.`)
  const loads = entry.files.map(({ filename }) => (
    MODULES[`./data/scripture/generated/lxx-assistance/${filename}`]
  ))
  if (loads.some((load) => !load)) throw new Error(`LXX assistance is unavailable for ${bookId}.`)
  const parts = await Promise.all(loads.map(async (load) => (await load()).default))
  if (parts.some((book) => book.schemaVersion !== 1 || book.bookId !== bookId)) {
    throw new Error(`LXX assistance is invalid for ${bookId}.`)
  }
  return {
    ...parts[0],
    lexicalVerses: Object.assign({}, ...parts.map((book) => book.lexicalVerses)),
    syntaxVerses: Object.assign({}, ...parts.map((book) => book.syntaxVerses)),
  }
}
