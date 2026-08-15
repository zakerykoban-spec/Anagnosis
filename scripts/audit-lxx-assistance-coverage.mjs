import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ogaDirectory = process.argv[2] ? path.resolve(process.argv[2]) : null
if (!ogaDirectory) {
  throw new Error('Usage: node scripts/audit-lxx-assistance-coverage.mjs <OGA conllu directory>')
}
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'src/data/scripture/generated/lxx/manifest.json'), 'utf8'))
const ogaFiles = fs.readdirSync(ogaDirectory)

function normalize(value) {
  return value.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase('el')
    .replace(/ς/gu, 'σ').replace(/[ʼ’‘'᾽᾿]/gu, '').replace(/[^\p{L}]+/gu, '')
}

function sourceTokens(filename) {
  return fs.readFileSync(path.join(ogaDirectory, filename), 'utf8')
    .split(/\r?\n/u).filter((line) => /^\d+\t/u.test(line))
    .map((line) => line.split('\t')[1]).filter((value) => value !== '[0]' && normalize(value))
}

function canonicalTokens(book) {
  const data = JSON.parse(fs.readFileSync(path.join(repo, 'src/data/scripture/generated/lxx', book.filename), 'utf8'))
  return data.chapters.flatMap((chapter) => chapter.verses.flatMap((verse) => verse.displayText.split(/\s+/u).filter(Boolean)))
    .map((surface) => ({ surface, normalized: normalize(surface) }))
}

function align(canonical, source) {
  let canonicalIndex = 0
  let aligned = 0
  let sourceSpans = 0
  for (const surface of source) {
    if (canonicalIndex >= canonical.length) break
    const target = normalize(surface)
    if (target === canonical[canonicalIndex].normalized) {
      aligned += 1
      canonicalIndex += 1
      continue
    }
    if (canonicalIndex + 1 < canonical.length
      && target === canonical[canonicalIndex].normalized + canonical[canonicalIndex + 1].normalized) {
      sourceSpans += 1
      canonicalIndex += 2
      continue
    }
    let found = -1
    for (let look = canonicalIndex + 1; look < Math.min(canonical.length, canonicalIndex + 9); look += 1) {
      if (canonical[look].normalized === target) {
        found = look
        break
      }
    }
    if (found >= 0) {
      canonicalIndex = found + 1
      aligned += 1
    }
  }
  return { aligned, sourceSpans }
}

const results = manifest.books.map((book) => {
  const candidates = ogaFiles.filter((filename) => filename.startsWith(`tlg0527.${book.workId}.`))
  const expectedEdition = book.sourceFile.match(/\.(1st1K-grc\d+)\.xml$/u)?.[1]
  const filename = candidates.find((candidate) => expectedEdition && candidate.includes(`.${expectedEdition}.`)) ?? candidates[0]
  if (!filename) return { book: book.id, status: 'missing' }
  const canonical = canonicalTokens(book)
  const source = sourceTokens(filename)
  const counts = align(canonical, source)
  const exactWitness = expectedEdition ? filename.includes(`.${expectedEdition}.`) : false
  return {
    book: book.id,
    witness: filename.split('.tok01')[0],
    status: exactWitness ? 'exact-witness' : 'alternate-witness',
    canonicalTokens: canonical.length,
    sourceTokens: source.length,
    alignedTokens: counts.aligned,
    alignmentPercent: Number((100 * counts.aligned / canonical.length).toFixed(2)),
    sourceSpans: counts.sourceSpans,
  }
})

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
