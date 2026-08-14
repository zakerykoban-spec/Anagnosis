import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MACULA_COMMIT = '8423afe47b9e8f24b7772e808af45c7159a6fe7e'
const EXPECTED_ROLES = ['s', 'v', 'o', 'o2', 'io', 'p', 'adv', 'vc', 'aux', 'oc']
const EXPECTED_TOTALS = {
  displayTokens: 137741,
  alignedTokens: 137741,
  reviewedSurfaceExceptions: 1,
  versesWithSyntax: 7939,
  clauses: 30464,
  groups: 85103,
  discardedUnsupportedRoles: 6,
}
const FORBIDDEN_BOOK_FIELDS = [
  'after',
  'domain',
  'frame',
  'gloss',
  'lemma',
  'ln',
  'morph',
  'normalized',
  'referent',
  'strong',
  'unicode',
]

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const syntaxDirectory = path.join(
  repo,
  'src/data/scripture/generated/sblgnt-syntax',
)
const scriptureDirectory = path.join(
  repo,
  'src/data/scripture/generated/sblgnt',
)

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'))
}

function equalObject(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
  }
}

const manifest = readJson(path.join(syntaxDirectory, 'manifest.json'))
const scriptureManifest = readJson(path.join(scriptureDirectory, 'manifest.json'))

if (manifest.schemaVersion !== 1) throw new Error('Unexpected syntax manifest schema.')
if (manifest.source.maculaCommit !== MACULA_COMMIT) {
  throw new Error('The generated syntax data is not pinned to the reviewed MACULA commit.')
}
if (manifest.source.license !== 'CC BY 4.0') {
  throw new Error('The generated syntax data must retain the MACULA CC BY 4.0 license.')
}
equalObject(manifest.roles, EXPECTED_ROLES, 'syntax roles')
equalObject(manifest.totals, EXPECTED_TOTALS, 'syntax totals')

if (manifest.books.length !== 27 || scriptureManifest.books.length !== 27) {
  throw new Error('The syntax and SBLGNT manifests must both contain 27 books.')
}

const generatedTotals = Object.fromEntries(
  Object.keys(EXPECTED_TOTALS).map((key) => [key, 0]),
)

for (const scriptureBook of scriptureManifest.books) {
  const bookManifest = manifest.books.find((book) => book.id === scriptureBook.id)
  if (!bookManifest) throw new Error(`${scriptureBook.id}: missing syntax manifest entry`)

  const filename = path.join(syntaxDirectory, bookManifest.filename)
  const raw = fs.readFileSync(filename, 'utf8')
  if (sha256(raw) !== bookManifest.sha256) {
    throw new Error(`${scriptureBook.id}: generated syntax checksum mismatch`)
  }
  const lowerRaw = raw.toLowerCase()
  for (const field of FORBIDDEN_BOOK_FIELDS) {
    if (lowerRaw.includes(`"${field}"`)) {
      throw new Error(`${scriptureBook.id}: forbidden copied field ${field}`)
    }
  }

  const book = JSON.parse(raw)
  const scripture = readJson(path.join(scriptureDirectory, scriptureBook.filename))
  if (book.schemaVersion !== 1 || book.bookId !== scriptureBook.id) {
    throw new Error(`${scriptureBook.id}: invalid syntax book identity`)
  }
  if (
    book.source.maculaCommit !== MACULA_COMMIT
    || book.source.license !== 'CC BY 4.0'
    || book.source.alignmentStrategyVersion !== 1
  ) {
    throw new Error(`${scriptureBook.id}: invalid syntax source metadata`)
  }

  const displayVerses = new Map(scripture.chapters.flatMap(
    (chapter) => chapter.verses.map((verse) => [verse.id, verse]),
  ))
  const counts = {
    displayTokens: [...displayVerses.values()].reduce(
      (sum, verse) => sum + verse.displayText.split(/\s+/u).filter(Boolean).length,
      0,
    ),
    alignedTokens: book.counts.alignedTokens,
    reviewedSurfaceExceptions: book.counts.reviewedSurfaceExceptions,
    versesWithSyntax: Object.keys(book.verses).length,
    clauses: 0,
    groups: 0,
    discardedUnsupportedRoles: book.counts.discardedUnsupportedRoles,
  }

  for (const [verseId, clauses] of Object.entries(book.verses)) {
    const verse = displayVerses.get(verseId)
    if (!verse) throw new Error(`${verseId}: syntax references an unknown verse`)
    const tokenCount = verse.displayText.split(/\s+/u).filter(Boolean).length
    if (!Array.isArray(clauses) || clauses.length === 0) {
      throw new Error(`${verseId}: syntax verse must contain clauses`)
    }
    const seen = new Set()
    for (const clause of clauses) {
      if (
        !Array.isArray(clause)
        || clause.length !== 2
        || !Number.isInteger(clause[0])
        || ![0, 1, 2, 4].includes(clause[0])
        || !Array.isArray(clause[1])
        || clause[1].length === 0
      ) throw new Error(`${verseId}: invalid compact clause`)
      const key = JSON.stringify(clause)
      if (seen.has(key)) throw new Error(`${verseId}: duplicate compact clause`)
      seen.add(key)
      counts.clauses += 1
      for (const group of clause[1]) {
        if (
          !Array.isArray(group)
          || group.length !== 3
          || !Number.isInteger(group[0])
          || group[0] < 0
          || group[0] >= EXPECTED_ROLES.length
          || !Number.isInteger(group[1])
          || !Number.isInteger(group[2])
          || group[1] < 0
          || group[2] < group[1]
          || group[2] >= tokenCount
        ) throw new Error(`${verseId}: invalid compact syntax group`)
        counts.groups += 1
      }
    }
  }

  equalObject(counts, book.counts, `${scriptureBook.id} counts`)
  for (const key of Object.keys(generatedTotals)) generatedTotals[key] += counts[key]
}

equalObject(generatedTotals, EXPECTED_TOTALS, 'validated syntax totals')
if (fs.existsSync(path.join(repo, 'imports', 'scripture', 'macula-greek'))) {
  throw new Error('The external MACULA checkout must not be committed to the app.')
}

process.stdout.write(
  `Validated ${manifest.books.length} MACULA syntax books: ${JSON.stringify(generatedTotals)}\n`,
)
