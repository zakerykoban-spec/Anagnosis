import type { NtSyntaxBook } from './models/syntax'

const SYNTAX_MODULES = import.meta.glob<{ default: NtSyntaxBook }>(
  './data/scripture/generated/sblgnt-syntax/*.json',
)

export async function loadSblgntSyntaxBook(bookId: string) {
  const modulePath =
    `./data/scripture/generated/sblgnt-syntax/${bookId}.json`
  const loadModule = SYNTAX_MODULES[modulePath]
  if (!loadModule) throw new Error(`Syntax data is unavailable for ${bookId}.`)

  const { default: book } = await loadModule()
  if (book.schemaVersion !== 1 || book.bookId !== bookId) {
    throw new Error(`Syntax data is invalid for ${bookId}.`)
  }
  return book
}
