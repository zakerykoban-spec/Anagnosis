import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { lexicalWordsForVerse } from '../src/models/lexical.ts'
import { syntaxInsightForVerse } from '../src/models/syntax.ts'

const root = 'src/data/scripture/generated/lxx-assistance'
const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'))
const load = (book: string) => {
  const parts = [1, 2].map((part) => JSON.parse(fs.readFileSync(`${root}/${book}-${part}.json`, 'utf8')))
  return { ...parts[0], lexicalVerses: Object.assign({}, ...parts.map((part) => part.lexicalVerses)), syntaxVerses: Object.assign({}, ...parts.map((part) => part.syntaxVerses)) }
}

test('LXX pilot is frozen to exactly three attributed lazy bundles', () => {
  assert.deepEqual(manifest.books.map((book: { id: string }) => book.id), ['genesis', 'psalms', 'isaiah'])
  assert.equal(manifest.source.ogaVersion, '0.2.0')
  assert.equal(manifest.source.ogaLicense, 'CC BY-SA 4.0')
  assert.equal(manifest.source.stepLicense, 'CC BY 4.0')
})

test('known OGA corruption and conflicting analysis fail closed', () => {
  const cases = [
    ['genesis', 'genesis.1.3', 'Γενηθήτω'],
    ['psalms', 'psalms.1.1', 'ΜΑΚAPΙΟΣ'],
    ['isaiah', 'isaiah.1.1', 'OPAΣΙΣ'],
    ['isaiah', 'isaiah.1.2', 'ὕψωσα'],
  ] as const
  for (const [bookId, verseId, rejectedSurface] of cases) {
    const book = load(bookId)
    const scripture = JSON.parse(fs.readFileSync(`src/data/scripture/generated/lxx/${bookId}.json`, 'utf8'))
    const verse = scripture.chapters.flatMap((chapter: { verses: Array<{ id: string }> }) => chapter.verses).find((item: { id: string }) => item.id === verseId)
    const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
    const words = lexicalWordsForVerse(book, verseId, surfaces)
    const rejectedIndex = surfaces.findIndex((surface: string) => surface.includes(rejectedSurface))
    assert.equal(words.has(rejectedIndex), false, `${verseId} should omit ${rejectedSurface}`)
  }
})

test('pilot phrases are reconstructed from canonical LXX text', () => {
  for (const bookId of ['genesis', 'psalms', 'isaiah']) {
    const book = load(bookId)
    const scripture = JSON.parse(fs.readFileSync(`src/data/scripture/generated/lxx/${bookId}.json`, 'utf8'))
    const verses = scripture.chapters.flatMap((chapter: { verses: Array<{ id: string; displayText: string }> }) => chapter.verses)
    for (const verse of verses.filter((_verse: unknown, index: number) => index % Math.max(1, Math.floor(verses.length / 34)) === 0).slice(0, 34)) {
      const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
      for (const clause of syntaxInsightForVerse(book, verse.id, surfaces)) {
        for (const group of clause.groups) assert.equal(group.text, surfaces.slice(group.startTokenIndex, group.endTokenIndex + 1).join(' '))
      }
    }
  }
})
