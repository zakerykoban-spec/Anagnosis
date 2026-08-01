import type { NtLexicalBook } from './models/lexical'

const LEXICAL_MODULES = import.meta.glob<{ default: NtLexicalBook }>(
  './data/scripture/generated/sblgnt-lexical/*.json',
)

export async function loadSblgntLexicalBook(bookId: string) {
  const modulePath =
    `./data/scripture/generated/sblgnt-lexical/${bookId}.json`
  const loadModule = LEXICAL_MODULES[modulePath]
  if (!loadModule) {
    throw new Error(`Lexical data is unavailable for ${bookId}.`)
  }
  const { default: book } = await loadModule()
  if (book.schemaVersion !== 1 || book.bookId !== bookId) {
    throw new Error(`Lexical data is invalid for ${bookId}.`)
  }
  return book
}
