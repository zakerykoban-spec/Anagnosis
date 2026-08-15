import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  LXX_BOOKS,
  SBLGNT_BOOKS,
} from '../src/scriptureCatalog.ts'
import {
  scriptureBookAriaLabel,
  scriptureBookTile,
} from '../src/scriptureBrowserPresentation.ts'

test('every scripture book has a compact Greek tile and category', () => {
  for (const [corpus, books] of [
    ['sblgnt', SBLGNT_BOOKS],
    ['lxx', LXX_BOOKS],
  ] as const) {
    for (const book of books) {
      const tile = scriptureBookTile(corpus, book)
      assert.notEqual(tile.labelGreek, book.code)
      assert.ok(tile.group)
      assert.ok(scriptureBookAriaLabel(book).startsWith(book.titleGreek))
    }
  }
})

test('canonical book order remains row-major', () => {
  assert.deepEqual(SBLGNT_BOOKS.slice(0, 5).map((book) => book.id), [
    'matthew', 'mark', 'luke', 'john', 'acts',
  ])
  assert.deepEqual(LXX_BOOKS.slice(0, 5).map((book) => book.id), [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  ])
})

test('book grid and Help disclosure preserve the intended visual flow', async () => {
  const [appCss, lexicalCss] = await Promise.all([
    readFile(new URL('../src/App.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/lexical.css', import.meta.url), 'utf8'),
  ])

  assert.match(appCss, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
  assert.match(appCss, /grid-auto-flow: row/)
  assert.doesNotMatch(appCss, /scripture-book-choice:nth-child\(2n\)/)
  assert.match(lexicalCss, /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(lexicalCss, /justify-self: end/)
})
