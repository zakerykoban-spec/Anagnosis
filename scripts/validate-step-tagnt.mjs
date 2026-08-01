import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lexicalDirectory = path.join(repo, 'src/data/scripture/generated/sblgnt-lexical')
const scriptureDirectory = path.join(repo, 'src/data/scripture/generated/sblgnt')
const manifest = JSON.parse(fs.readFileSync(path.join(lexicalDirectory, 'manifest.json'), 'utf8'))

if (manifest.schemaVersion !== 1 || manifest.books.length !== 27) {
  throw new Error('The lexical manifest must contain all 27 SBLGNT books.')
}

const totals = { displayTokens: 0, alignedTokens: 0, rareTokens: 0, unresolvedTokens: 0 }
for (const entry of manifest.books) {
  const lexical = JSON.parse(fs.readFileSync(path.join(lexicalDirectory, entry.filename), 'utf8'))
  const scripture = JSON.parse(fs.readFileSync(path.join(scriptureDirectory, `${entry.id}.json`), 'utf8'))
  if (lexical.schemaVersion !== 1 || lexical.bookId !== entry.id) {
    throw new Error(`${entry.id}: invalid lexical header`)
  }

  const scriptureVerses = new Map(scripture.chapters.flatMap(
    (chapter) => chapter.verses.map((verse) => [verse.id, verse]),
  ))
  let aligned = 0
  for (const [verseId, tokens] of Object.entries(lexical.verses)) {
    const verse = scriptureVerses.get(verseId)
    if (!verse) throw new Error(`${entry.id}: unknown verse ${verseId}`)
    const displayTokenCount = verse.displayText.split(/\s+/u).filter(Boolean).length
    const seen = new Set()
    for (const token of tokens) {
      const [displayIndex, lemmaIndex, morphologyIndex, sourcePosition, flags] = token
      if (!Number.isInteger(displayIndex) || displayIndex < 0 || displayIndex >= displayTokenCount) {
        throw new Error(`${verseId}: invalid display token index ${displayIndex}`)
      }
      if (seen.has(displayIndex)) throw new Error(`${verseId}: duplicate display token ${displayIndex}`)
      seen.add(displayIndex)
      if (!lexical.lemmaTable[lemmaIndex] || !lexical.morphologyTable[morphologyIndex]) {
        throw new Error(`${verseId}: invalid table index`)
      }
      if (!Number.isInteger(sourcePosition) || sourcePosition < 1 || !Number.isInteger(flags)) {
        throw new Error(`${verseId}: invalid STEP source identity`)
      }
      const morphology = lexical.morphologyTable[morphologyIndex]
      if (morphology.length !== 4 || morphology.some((value, index) => index < 2 && !value)) {
        throw new Error(`${verseId}: incomplete morphology display`)
      }
      aligned += 1
    }
  }
  if (aligned !== lexical.counts.alignedTokens) {
    throw new Error(`${entry.id}: aligned count mismatch`)
  }
  for (const key of Object.keys(totals)) totals[key] += lexical.counts[key]
}

if (JSON.stringify(totals) !== JSON.stringify(manifest.totals)) {
  throw new Error('Lexical manifest totals do not match book totals.')
}
if (totals.alignedTokens !== 136637 || totals.displayTokens !== 137741) {
  throw new Error(`Alignment baseline changed: ${JSON.stringify(totals)}`)
}
process.stdout.write(`Validated STEP lexical data: ${JSON.stringify(totals)}\n`)
