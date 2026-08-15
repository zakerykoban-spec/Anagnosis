import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { lexicalWordsForVerse } from '../src/models/lexical.ts'
import { syntaxInsightForVerse } from '../src/models/syntax.ts'

const root = 'src/data/scripture/generated/lxx-assistance'
const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'))
const load = (book: string) => {
  const entry = manifest.books.find((item: { id: string }) => item.id === book)
  const parts = entry.files.map((file: { filename: string }) => JSON.parse(fs.readFileSync(`${root}/${file.filename}`, 'utf8')))
  return { ...parts[0], lexicalVerses: Object.assign({}, ...parts.map((part) => part.lexicalVerses)), syntaxVerses: Object.assign({}, ...parts.map((part) => part.syntaxVerses)) }
}

test('LXX expansion is frozen to 34 explicitly approved attributed lazy bundles', () => {
  assert.equal(manifest.pilot, false)
  assert.equal(manifest.scope, 'reviewed-expansion')
  assert.equal(manifest.minimumExactWitnessAlignmentPercent, 99)
  assert.equal(manifest.books.length, 34)
  assert.deepEqual(
    manifest.books.filter((book: { approvalTier: string }) => book.approvalTier === 'accepted-pilot').map((book: { id: string }) => book.id),
    ['psalms', 'isaiah'],
  )
  assert.equal(manifest.books.find((book: { id: string }) => book.id === 'genesis').approvalTier, 'accepted-pilot-exception')
  assert.equal(manifest.books.filter((book: { approvalTier: string }) => book.approvalTier === 'exact-witness-expansion').length, 31)
  for (const held of ['exodus', 'judith', 'sirach', 'lamentations', 'bel-and-the-dragon-theodotion']) {
    assert.equal(manifest.books.some((book: { id: string }) => book.id === held), false)
  }
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
    ['1-chronicles', '1-chronicles.12.33', 'ἐκπορευόμενοι'],
    ['1-esdras', '1-esdras.5.55', 'ἐθεμελίωσαν'],
    ['amos', 'amos.5.15', 'ὴγαπήκαμεν'],
    ['malachi', 'malachi.2.14', 'διεμαρτύρατο'],
    ['letter-of-jeremiah', 'letter-of-jeremiah.1.37', 'χήραν'],
    ['daniel-old-greek', 'daniel-old-greek.5.4', 'ηὐλόγουν'],
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

test('sampled expansion phrases are reconstructed from canonical LXX text', () => {
  for (const bookId of manifest.books.map((book: { id: string }) => book.id)) {
    const book = load(bookId)
    const scripture = JSON.parse(fs.readFileSync(`src/data/scripture/generated/lxx/${bookId}.json`, 'utf8'))
    const verses = scripture.chapters.flatMap((chapter: { verses: Array<{ id: string; displayText: string }> }) => chapter.verses)
    const sampleIndexes = [...new Set([0, Math.floor(verses.length / 2), verses.length - 1])]
    for (const verse of sampleIndexes.map((index) => verses[index])) {
      const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
      for (const clause of syntaxInsightForVerse(book, verse.id, surfaces)) {
        for (const group of clause.groups) assert.equal(group.text, surfaces.slice(group.startTokenIndex, group.endTokenIndex + 1).join(' '))
      }
    }
  }
})
