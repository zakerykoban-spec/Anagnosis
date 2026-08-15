import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LXX_ASSISTANCE_BOOK_IDS,
  LXX_ASSISTANCE_BOOKS,
} from './scripture/lxx-assistance-books.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.join(repo, 'src/data/scripture/generated/lxx-assistance')
const scriptureRoot = path.join(repo, 'src/data/scripture/generated/lxx')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))

if (manifest.schemaVersion !== 1
  || manifest.pilot !== false
  || manifest.scope !== 'reviewed-expansion'
  || manifest.minimumExactWitnessAlignmentPercent !== 99) {
  throw new Error('Invalid reviewed LXX assistance manifest.')
}

if (manifest.books.map((book) => book.id).join('\0') !== LXX_ASSISTANCE_BOOK_IDS.join('\0')) {
  throw new Error('The generated LXX assistance books do not match the explicit allowlist.')
}

const expectedFiles = new Set(['manifest.json'])
for (const entry of manifest.books) {
  const approved = LXX_ASSISTANCE_BOOKS[entry.id]
  if (!approved
    || entry.approvalTier !== approved.tier
    || entry.ogaFile !== approved.filename
    || entry.ogaFileSha256 !== approved.sha256) {
    throw new Error(`${entry.id}: source approval metadata mismatch.`)
  }
  const scripture = JSON.parse(fs.readFileSync(path.join(scriptureRoot, `${entry.id}.json`), 'utf8'))
  const verseLengths = new Map(scripture.chapters.flatMap((chapter) => (
    chapter.verses.map((verse) => [verse.id, verse.displayText.split(/\s+/u).filter(Boolean).length])
  )))
  const seenLexicalIndexes = new Map()
  let lexicalTokens = 0
  let versesWithSyntax = 0

  for (const file of entry.files) {
    if (expectedFiles.has(file.filename)) throw new Error(`${entry.id}: duplicate generated filename.`)
    expectedFiles.add(file.filename)
    const text = fs.readFileSync(path.join(root, file.filename), 'utf8')
    const checksum = crypto.createHash('sha256').update(text).digest('hex')
    if (checksum !== file.sha256) throw new Error(`${entry.id}: checksum mismatch.`)
    const book = JSON.parse(text)
    if (book.bookId !== entry.id
      || book.schemaVersion !== 1
      || book.source?.ogaFileSha256 !== approved.sha256
      || book.source?.approvalTier !== approved.tier) {
      throw new Error(`${entry.id}: invalid generated header.`)
    }
    for (const [verseId, tokens] of Object.entries(book.lexicalVerses)) {
      const verseLength = verseLengths.get(verseId)
      if (verseLength === undefined) throw new Error(`${verseId}: lexical data references an unknown verse.`)
      const seen = seenLexicalIndexes.get(verseId) ?? new Set()
      for (const token of tokens) {
        const [displayIndex, lemmaIndex, morphologyIndex] = token
        if (seen.has(displayIndex)) throw new Error(`${verseId}: ambiguous lexical alignment.`)
        seen.add(displayIndex)
        if (displayIndex < 0 || displayIndex >= verseLength
          || !book.lemmaTable[lemmaIndex]
          || !book.morphologyTable[morphologyIndex]) {
          throw new Error(`${verseId}: invalid lexical table reference.`)
        }
        lexicalTokens += 1
      }
      seenLexicalIndexes.set(verseId, seen)
    }
    for (const [verseId, clauses] of Object.entries(book.syntaxVerses)) {
      const verseLength = verseLengths.get(verseId)
      if (verseLength === undefined) throw new Error(`${verseId}: syntax data references an unknown verse.`)
      versesWithSyntax += 1
      for (const [, groups] of clauses) for (const [role, start, end] of groups) {
        if (!manifest.roles[role] || start < 0 || end < start || end >= verseLength) {
          throw new Error(`${verseId}: invalid syntax group.`)
        }
      }
    }
  }
  if (lexicalTokens !== entry.counts.lexicalTokens
    || versesWithSyntax !== entry.counts.versesWithSyntax) {
    throw new Error(`${entry.id}: generated totals do not match the manifest.`)
  }
}

const actualFiles = fs.readdirSync(root).filter((filename) => filename.endsWith('.json'))
if (actualFiles.some((filename) => !expectedFiles.has(filename))
  || actualFiles.length !== expectedFiles.size) {
  throw new Error('Unapproved or missing generated LXX assistance files detected.')
}

process.stdout.write(`Validated ${manifest.books.length} explicitly approved lazy LXX assistance bundles.\n`)
