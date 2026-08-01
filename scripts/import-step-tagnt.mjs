import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { parseTegmc, renderButhMorphology } from './step/buth-morphology.mjs'

const STEP_COMMIT = 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39'
const MATCH_VERSION = 1
const RARE_THRESHOLD = 30
const FILES = {
  tagntGospels: {
    relative: 'Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    sha256: 'ab8eaaeb68e17a1dcfa34e1e9350358f22f03bc2a97244d848750ad81044bc8e',
  },
  tagntActsRevelation: {
    relative: 'Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    sha256: '524e32375361e6d3fa2f7ef00b87605fdc4317a762f395651a05fdc31ad031b7',
  },
  tegmc: {
    relative: 'Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt',
    sha256: '5f0416f7617019a6082285214903bde569a980d5fd3b88b8d7020d944e94de82',
  },
  tbesg: {
    relative: 'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
    sha256: '312f723d7b8ef263bbdfb0451c9b8057125804dfff390b6f8544cff2a84b57f4',
  },
}

const BOOK_MAP = new Map(Object.entries({
  Mat: 'matthew', Mrk: 'mark', Luk: 'luke', Jhn: 'john', Act: 'acts',
  Rom: 'romans', '1Co': '1-corinthians', '2Co': '2-corinthians',
  Gal: 'galatians', Eph: 'ephesians', Php: 'philippians', Col: 'colossians',
  '1Th': '1-thessalonians', '2Th': '2-thessalonians',
  '1Ti': '1-timothy', '2Ti': '2-timothy', Tit: 'titus', Phm: 'philemon',
  Heb: 'hebrews', Jas: 'james', '1Pe': '1-peter', '2Pe': '2-peter',
  '1Jn': '1-john', '2Jn': '2-john', '3Jn': '3-john', Jud: 'jude', Rev: 'revelation',
}))

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stepDir = process.argv[2] ? path.resolve(process.argv[2]) : null
if (!stepDir) {
  throw new Error('Usage: node scripts/import-step-tagnt.mjs <STEPBible-Data checkout>')
}

const outputDirectory = path.join(repo, 'src/data/scripture/generated/sblgnt-lexical')
const scriptureDirectory = path.join(repo, 'src/data/scripture/generated/sblgnt')
const punctuationPattern = /[^\p{L}\p{M}]+/gu

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
}

function verifiedFile(file) {
  const filename = path.join(stepDir, file.relative)
  const actual = sha256(filename)
  if (actual !== file.sha256) {
    throw new Error(`${file.relative}: expected ${file.sha256}, received ${actual}`)
  }
  return filename
}

function displayNormalize(value) {
  return value.normalize('NFC').trim()
}

function matchNormalize(value) {
  return value.normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('el')
    .replace(/ς/gu, 'σ')
    .replace(/[ʼ’‘'᾽᾿]/gu, '')
    .replace(punctuationPattern, '')
}

function movableNuEquivalent(left, right) {
  const a = matchNormalize(left)
  const b = matchNormalize(right)
  return a.length > 2 && b.length > 2 && (a === `${b}ν` || b === `${a}ν`)
}

function matchTier(left, right) {
  if (displayNormalize(left) === displayNormalize(right)) return 0
  if (matchNormalize(left) === matchNormalize(right)) return 1
  if (movableNuEquivalent(left, right)) return 2
  return null
}

function lcsAlign(left, right) {
  const dp = Array.from(
    { length: left.length + 1 },
    () => new Uint16Array(right.length + 1),
  )
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      dp[i][j] = matchTier(left[i], right[j].surface) !== null
        ? 1 + dp[i + 1][j + 1]
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const pairs = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    const tier = matchTier(left[i], right[j].surface)
    if (tier !== null && dp[i][j] === 1 + dp[i + 1][j + 1]) {
      pairs.push({ sblIndex: i, tagIndex: j, tier })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1
    } else {
      j += 1
    }
  }
  return pairs
}

function reverseAlignment(left, right) {
  return lcsAlign([...left].reverse(), [...right].reverse()).map((pair) => ({
    sblIndex: left.length - 1 - pair.sblIndex,
    tagIndex: right.length - 1 - pair.tagIndex,
    tier: pair.tier,
  })).reverse()
}

function surfaceFromTagnt(value) {
  return value.replace(/\s+\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$/u, '').trim()
}

function parseLemmaGloss(value) {
  const equals = value.indexOf('=')
  return equals < 0
    ? { lemma: value.trim(), gloss: '' }
    : { lemma: value.slice(0, equals).trim(), gloss: value.slice(equals + 1).trim() }
}

function isProperGrammar(grammar) {
  return /-(?:P|L|T|PG|LG|TG)(?:$|[ +/])/u.test(grammar)
}

function parseTagnt(filenames) {
  const verses = new Map()
  for (const filename of filenames) {
    const text = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/u, '')
    for (const line of text.split(/\r?\n/u)) {
      const fields = line.split('\t')
      const match = fields[0]?.match(/^([123]?[A-Z][a-z]{1,2})\.(\d+)\.(\d+)#(\d+)=([^\t]+)$/u)
      if (!match) continue
      const editions = fields[5] ?? ''
      if (!editions.split('+').some((edition) => edition.trim().startsWith('SBL'))) continue
      const bookId = BOOK_MAP.get(match[1])
      if (!bookId) throw new Error(`Unknown TAGNT book: ${match[1]}`)
      const grammarField = fields[3] ?? ''
      const equals = grammarField.indexOf('=')
      const grammar = equals < 0 ? '' : grammarField.slice(equals + 1).trim()
      const { lemma, gloss } = parseLemmaGloss(fields[4] ?? '')
      const verseId = `${bookId}.${Number(match[2])}.${Number(match[3])}`
      const list = verses.get(verseId) ?? []
      list.push({
        position: Number(match[4]),
        surface: surfaceFromTagnt(fields[1] ?? ''),
        grammar,
        lemma,
        gloss,
        proper: isProperGrammar(grammar),
      })
      verses.set(verseId, list)
    }
  }
  for (const list of verses.values()) list.sort((a, b) => a.position - b.position)
  return verses
}

function parseScripture() {
  const manifest = JSON.parse(fs.readFileSync(path.join(scriptureDirectory, 'manifest.json'), 'utf8'))
  const books = new Map()
  for (const entry of manifest.books) {
    const book = JSON.parse(fs.readFileSync(path.join(scriptureDirectory, entry.filename), 'utf8'))
    books.set(entry.id, book)
  }
  return { manifest, books }
}

const resolvedFiles = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, verifiedFile(file)]))
const tagnt = parseTagnt([resolvedFiles.tagntGospels, resolvedFiles.tagntActsRevelation])
const scripture = parseScripture()
const tegmc = parseTegmc(fs.readFileSync(resolvedFiles.tegmc, 'utf8'))
const lemmaFrequency = new Map()
for (const tokens of tagnt.values()) {
  for (const token of tokens) {
    const key = matchNormalize(token.lemma)
    lemmaFrequency.set(key, (lemmaFrequency.get(key) ?? 0) + 1)
  }
}

fs.mkdirSync(outputDirectory, { recursive: true })
const manifestBooks = []
const totals = { displayTokens: 0, alignedTokens: 0, rareTokens: 0, unresolvedTokens: 0 }

for (const manifestBook of scripture.manifest.books) {
  const book = scripture.books.get(manifestBook.id)
  const lemmaTable = []
  const lemmaIndex = new Map()
  const morphologyTable = []
  const morphologyIndex = new Map()
  const verses = {}
  const counts = { displayTokens: 0, alignedTokens: 0, rareTokens: 0, unresolvedTokens: 0 }

  for (const chapter of book.chapters) {
    for (const verse of chapter.verses) {
      const displayTokens = verse.displayText.split(/\s+/u).filter(Boolean)
      const tagTokens = tagnt.get(verse.id) ?? []
      counts.displayTokens += displayTokens.length
      const forward = lcsAlign(displayTokens, tagTokens)
      const reversePairs = new Set(reverseAlignment(displayTokens, tagTokens).map(
        (pair) => `${pair.sblIndex}:${pair.tagIndex}`,
      ))
      const conservative = forward.filter(
        (pair) => reversePairs.has(`${pair.sblIndex}:${pair.tagIndex}`),
      )

      for (const pair of conservative) {
        const token = tagTokens[pair.tagIndex]
        const frequency = lemmaFrequency.get(matchNormalize(token.lemma)) ?? 0
        const lemmaKey = `${token.lemma}\u0000${token.gloss}\u0000${frequency}`
        let lemma = lemmaIndex.get(lemmaKey)
        if (lemma === undefined) {
          lemma = lemmaTable.length
          lemmaIndex.set(lemmaKey, lemma)
          lemmaTable.push([token.lemma, token.gloss, frequency])
        }

        let morphology = morphologyIndex.get(token.grammar)
        if (morphology === undefined) {
          const rendered = renderButhMorphology(token.grammar, tegmc)
          morphology = morphologyTable.length
          morphologyIndex.set(token.grammar, morphology)
          morphologyTable.push([
            token.grammar,
            rendered.partOfSpeech,
            rendered.compact,
            rendered.expanded,
          ])
        }

        const flags = (token.proper ? 1 : 0) | (pair.tier << 1)
        ;(verses[verse.id] ??= []).push([
          pair.sblIndex,
          lemma,
          morphology,
          token.position,
          flags,
        ])
        counts.alignedTokens += 1
        if (!token.proper && frequency <= RARE_THRESHOLD) counts.rareTokens += 1
      }
      counts.unresolvedTokens += displayTokens.length - conservative.length
    }
  }

  for (const key of Object.keys(totals)) totals[key] += counts[key]
  const payload = {
    schemaVersion: 1,
    bookId: manifestBook.id,
    source: {
      stepCommit: STEP_COMMIT,
      license: 'CC BY 4.0',
      matchingStrategyVersion: MATCH_VERSION,
      rareLemmaThreshold: RARE_THRESHOLD,
    },
    counts,
    lemmaTable,
    morphologyTable,
    verses,
  }
  const filename = `${manifestBook.id}.json`
  fs.writeFileSync(path.join(outputDirectory, filename), JSON.stringify(payload))
  manifestBooks.push({ id: manifestBook.id, filename, ...counts })
}

const manifest = {
  schemaVersion: 1,
  source: {
    name: 'STEP Bible TAGNT, TEGMC, and TBESG',
    stepCommit: STEP_COMMIT,
    license: 'CC BY 4.0',
    matchingStrategyVersion: MATCH_VERSION,
    rareLemmaThreshold: RARE_THRESHOLD,
    files: Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, {
      path: file.relative,
      sha256: file.sha256,
    }])),
  },
  totals,
  books: manifestBooks,
}
fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
process.stdout.write(`Generated ${manifestBooks.length} lexical books: ${JSON.stringify(totals)}\n`)
