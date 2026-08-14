import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { SaxesParser } from 'saxes'

const MACULA_REPOSITORY = 'https://github.com/Clear-Bible/macula-greek'
const MACULA_COMMIT = '8423afe47b9e8f24b7772e808af45c7159a6fe7e'
const ALIGNMENT_STRATEGY_VERSION = 1
const OUTPUT_SCHEMA_VERSION = 1
const ROLE_CODES = ['s', 'v', 'o', 'o2', 'io', 'p', 'adv', 'vc', 'aux', 'oc']
const ROLE_INDEX = new Map(ROLE_CODES.map((role, index) => [role, index]))
const SOURCE_FILES = {
  matthew: ['01-matthew.xml', '83082bb2a094f06a4f9fd03e1f5a4b2af3977622a5c705ab65ab15ba74986de5'],
  mark: ['02-mark.xml', '1906a855c55c00c4048de8d919caa81a35ebb7726a82b9031830e3dd9c266db8'],
  luke: ['03-luke.xml', '10efdbb0415c1020cc288e25496496683c54ec884eb1cdee3f0ea47a0409e81b'],
  john: ['04-john.xml', '071d44e5a0e6c4b9c7e65944d924aed47d2b53c1774ed3ea9043b2651057715c'],
  acts: ['05-acts.xml', '8b3093174e5cdf8d6846c316e1dc76e4dfd9d3599d6044b3419d692bcd5df37d'],
  romans: ['06-romans.xml', 'b4553cdfab04484617196657a82d596fb135ac82b252b0b55e0a3655513b7134'],
  '1-corinthians': ['07-1corinthians.xml', '701972e038bfb04c262a59e27ac73b9948800c6b67ac17e09cf3238dd41ecba2'],
  '2-corinthians': ['08-2corinthians.xml', 'b675686f0a69744be1ff4057994860ee59c923fbd662bf2435841cf93ea71522'],
  galatians: ['09-galatians.xml', '33b390ff9f22fda1d7d27b9d234bc7f7cdd111efff9e72398da763cfce3b772b'],
  ephesians: ['10-ephesians.xml', '0ad9968729285b856f5a8b0e51a3845a7d7256ab03abe31a47b827bf3b078824'],
  philippians: ['11-philippians.xml', '59d5843599152524b66b43ece2364b91b8155c92fadd832860086e71066f5daa'],
  colossians: ['12-colossians.xml', '10646a85185273b4df4d8e2f9019ca5748cced50fbe3348d5fffb0dd83ae0035'],
  '1-thessalonians': ['13-1thessalonians.xml', '71baa51b9f4e90d63cef7a7dba05c31d08359ce7349f03afaa7745ffab12a467'],
  '2-thessalonians': ['14-2thessalonians.xml', 'd4546f7b670aa74bdc171497ea97f44c3b59fb89b5d2d529b1c6791d77018186'],
  '1-timothy': ['15-1timothy.xml', '968be311bf38e20dbb74ca56f78bd81fe3490066aec524ed328b0c45f057c86b'],
  '2-timothy': ['16-2timothy.xml', 'ac85240a120687404dc192fed630b81ddf906a5aa9b3e27d465fce66c9d3ff2d'],
  titus: ['17-titus.xml', '7a9af3c04636e2d558b06e7685a289cdd7982f920a946f96417e252e3fc8f708'],
  philemon: ['18-philemon.xml', '3782b340f3946192829fe07c229c2201390790bef2536d0223180f28bfaa756d'],
  hebrews: ['19-hebrews.xml', 'd993eed41dc40e2b920021735853499ddaa136b5a373c7be294a87cf383fe077'],
  james: ['20-james.xml', 'b65a8516c3f263ad907ba3c6061ca9b524ced71ae7c2cbc753ba58e4a2cac6ef'],
  '1-peter': ['21-1peter.xml', '5884b7c028e716535ac6a23b454cd23b19dbcc9519416f2f7f128f38de978cd2'],
  '2-peter': ['22-2peter.xml', 'd382f7cf9151419ce68cf8250a33436b5aba09ea6109b3bbf202271a0a1a99fc'],
  '1-john': ['23-1john.xml', 'cd7e151003667ceaec07b2276b2a75f8dbc6f2c57d5e5e5f09149ceffdf86b5e'],
  '2-john': ['24-2john.xml', 'de822aa64dc6374ba1a0920fe85e44639b26d6a74e671c49b167334c17291a47'],
  '3-john': ['25-3john.xml', 'bf5737c05c54083f315d777e7b8f0056c893fff8632a82d6186258872b07f579'],
  jude: ['26-jude.xml', '096aaad13159b9354399e640344c07f4ba52ea28e14e26db4d17c4050ee63e80'],
  revelation: ['27-revelation.xml', '21d60a5eefce0b30a0c9d9426b07faa659a2a59953cdabb11b84964068715df5'],
}
const REVIEWED_SURFACE_EXCEPTIONS = new Map([
  ['john.8.5:4', { canonical: 'Μωσῆς', macula: 'Μωϋσῆς' }],
])

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const maculaDirectory = process.argv[2] ? path.resolve(process.argv[2]) : null
if (!maculaDirectory) {
  throw new Error('Usage: node scripts/import-macula-syntax.mjs <macula-greek checkout>')
}

const outputDirectory = path.join(
  repo,
  'src/data/scripture/generated/sblgnt-syntax',
)
const scriptureDirectory = path.join(
  repo,
  'src/data/scripture/generated/sblgnt',
)

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function sha256File(filename) {
  return sha256Buffer(fs.readFileSync(filename))
}

function attribute(tag, name) {
  const value = tag.attributes[name]
  return typeof value === 'string' ? value : value?.value ?? null
}

function matchNormalize(value) {
  return value.normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('el')
    .replace(/ς/gu, 'σ')
    .replace(/[ʼ’‘'᾽᾿]/gu, '')
    .replace(/[^\p{L}\p{M}]+/gu, '')
}

function sourceRevision() {
  try {
    return execFileSync(
      'git',
      ['-C', maculaDirectory, 'rev-parse', 'HEAD'],
      { encoding: 'utf8' },
    ).trim()
  } catch {
    throw new Error('The MACULA source directory must be a Git checkout.')
  }
}

function verifiedSourceFile(bookId) {
  const [basename, expectedSha256] = SOURCE_FILES[bookId] ?? []
  if (!basename || !expectedSha256) {
    throw new Error(`No reviewed MACULA source file is configured for ${bookId}.`)
  }
  const relative = path.join('SBLGNT', 'lowfat', basename)
  const filename = path.join(maculaDirectory, relative)
  const actualSha256 = sha256File(filename)
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${relative}: expected ${expectedSha256}, received ${actualSha256}`,
    )
  }
  return { filename, relative: relative.replaceAll(path.sep, '/'), sha256: actualSha256 }
}

function parseReference(bookId, value) {
  const match = value?.match(/^[A-Z0-9]{3} (\d+):(\d+)!(\d+)$/u)
  if (!match) throw new Error(`${bookId}: invalid MACULA word reference ${value}`)
  return {
    verseId: `${bookId}.${Number(match[1])}.${Number(match[2])}`,
    tokenIndex: Number(match[3]) - 1,
  }
}

function runsForWords(words) {
  const indexes = [...new Set(words.map((word) => word.tokenIndex))]
    .sort((left, right) => left - right)
  const runs = []
  for (const index of indexes) {
    const last = runs.at(-1)
    if (last && index === last[1] + 1) last[1] = index
    else runs.push([index, index])
  }
  return runs
}

function parseSyntaxBook(xml, bookId) {
  const parser = new SaxesParser()
  const sourceWords = new Map()
  const syntaxByVerse = new Map()
  const syntaxKeysByVerse = new Map()
  const wordsCache = new WeakMap()
  let discardedUnsupportedRoles = 0
  let sentenceRoot = null
  let stack = []

  function reviewedRole(value) {
    if (!value || ROLE_INDEX.has(value)) return value
    discardedUnsupportedRoles += 1
    return null
  }

  function wordsForNode(node) {
    const cached = wordsCache.get(node)
    if (cached) return cached
    const words = node.kind === 'word'
      ? [node]
      : node.children.flatMap(wordsForNode)
    wordsCache.set(node, words)
    return words
  }

  function nearestRoleNodes(node, stopAtClause) {
    const groups = []
    for (const child of node.children) {
      if (child.role) {
        groups.push(child)
        continue
      }
      if (child.kind === 'word') continue
      if (stopAtClause && child.className === 'cl') continue
      groups.push(...nearestRoleNodes(child, stopAtClause))
    }
    return groups
  }

  function appendClause(node, implicit = false) {
    const roleNodes = nearestRoleNodes(node, true)
    if (roleNodes.length === 0) return
    const touchedVerses = new Set(
      roleNodes.flatMap(wordsForNode).map((word) => word.verseId),
    )
    const flags = node.predication === 'verbless'
      ? 1
      : node.predication === 'elided'
        ? 2
        : implicit
          ? 4
          : 0

    for (const verseId of touchedVerses) {
      const groups = []
      for (const roleNode of roleNodes) {
        const words = wordsForNode(roleNode).filter(
          (word) => word.verseId === verseId,
        )
        if (words.length === 0) continue
        for (const [start, end] of runsForWords(words)) {
          groups.push([ROLE_INDEX.get(roleNode.role), start, end])
        }
      }
      groups.sort((left, right) => left[1] - right[1] || left[2] - right[2])
      if (groups.length === 0) continue
      const clause = [flags, groups]
      const key = JSON.stringify(clause)
      const seen = syntaxKeysByVerse.get(verseId) ?? new Set()
      if (seen.has(key)) continue
      seen.add(key)
      syntaxKeysByVerse.set(verseId, seen)
      const clauses = syntaxByVerse.get(verseId) ?? []
      clauses.push(clause)
      syntaxByVerse.set(verseId, clauses)
    }
  }

  function processSentence(root) {
    appendClause(root, true)
    function visit(node) {
      if (node.kind === 'group' && node.className === 'cl') appendClause(node)
      if (node.kind !== 'word') node.children.forEach(visit)
    }
    root.children.forEach(visit)
  }

  parser.on('opentag', (tag) => {
    if (tag.name === 'sentence') {
      if (sentenceRoot) throw new Error(`${bookId}: nested sentence element`)
      sentenceRoot = {
        kind: 'sentence',
        role: null,
        className: null,
        predication: null,
        children: [],
      }
      stack = [sentenceRoot]
      return
    }
    if (!sentenceRoot || (tag.name !== 'wg' && tag.name !== 'w')) return
    const parent = stack.at(-1)
    if (!parent || parent.kind === 'word') {
      throw new Error(`${bookId}: invalid lowfat tree nesting`)
    }

    if (tag.name === 'wg') {
      const node = {
        kind: 'group',
        role: reviewedRole(attribute(tag, 'role')),
        className: attribute(tag, 'class'),
        predication: attribute(tag, 'predication'),
        children: [],
      }
      parent.children.push(node)
      stack.push(node)
      return
    }

    const ref = parseReference(bookId, attribute(tag, 'ref'))
    const node = {
      kind: 'word',
      role: reviewedRole(attribute(tag, 'role')),
      className: attribute(tag, 'class'),
      predication: null,
      normalized: attribute(tag, 'normalized') ?? '',
      ...ref,
    }
    const verseWords = sourceWords.get(node.verseId) ?? []
    if (verseWords[node.tokenIndex]) {
      throw new Error(
        `${node.verseId}: duplicate MACULA token ${node.tokenIndex + 1}`,
      )
    }
    verseWords[node.tokenIndex] = node
    sourceWords.set(node.verseId, verseWords)
    parent.children.push(node)
    stack.push(node)
  })

  parser.on('closetag', (tag) => {
    const name = typeof tag === 'string' ? tag : tag.name
    if (name === 'w' && stack.at(-1)?.kind === 'word') {
      stack.pop()
      return
    }
    if (name === 'wg' && stack.at(-1)?.kind === 'group') {
      stack.pop()
      return
    }
    if (name === 'sentence' && sentenceRoot) {
      processSentence(sentenceRoot)
      sentenceRoot = null
      stack = []
    }
  })

  parser.write(xml).close()
  if (sentenceRoot) throw new Error(`${bookId}: unclosed sentence element`)
  return { sourceWords, syntaxByVerse, discardedUnsupportedRoles }
}

function validateAlignment(bookId, scripture, sourceWords) {
  const scriptureVerses = new Map(scripture.chapters.flatMap(
    (chapter) => chapter.verses.map((verse) => [verse.id, verse]),
  ))
  const counts = {
    displayTokens: 0,
    alignedTokens: 0,
    reviewedSurfaceExceptions: 0,
  }

  for (const [verseId, verse] of scriptureVerses) {
    const displayTokens = verse.displayText.split(/\s+/u).filter(Boolean)
    const maculaWords = sourceWords.get(verseId) ?? []
    counts.displayTokens += displayTokens.length
    if (maculaWords.length !== displayTokens.length || maculaWords.some((word) => !word)) {
      throw new Error(
        `${verseId}: expected ${displayTokens.length} MACULA tokens, received ${maculaWords.filter(Boolean).length}`,
      )
    }
    for (let index = 0; index < displayTokens.length; index += 1) {
      const canonical = displayTokens[index]
      const macula = maculaWords[index].normalized
      if (matchNormalize(canonical) !== matchNormalize(macula)) {
        const exception = REVIEWED_SURFACE_EXCEPTIONS.get(`${verseId}:${index}`)
        if (!exception || canonical !== exception.canonical || macula !== exception.macula) {
          throw new Error(
            `${verseId}:${index + 1}: unreviewed surface mismatch ${canonical} / ${macula}`,
          )
        }
        counts.reviewedSurfaceExceptions += 1
      }
      counts.alignedTokens += 1
    }
  }

  for (const verseId of sourceWords.keys()) {
    if (!scriptureVerses.has(verseId)) {
      throw new Error(`${bookId}: MACULA contains unknown verse ${verseId}`)
    }
  }
  return counts
}

if (sourceRevision() !== MACULA_COMMIT) {
  throw new Error(`MACULA checkout must be at ${MACULA_COMMIT}.`)
}

const scriptureManifest = JSON.parse(
  fs.readFileSync(path.join(scriptureDirectory, 'manifest.json'), 'utf8'),
)
if (scriptureManifest.sourceVersion !== '1.2' || scriptureManifest.books.length !== 27) {
  throw new Error('The canonical SBLGNT 1.2 manifest must contain all 27 books.')
}

fs.rmSync(outputDirectory, { recursive: true, force: true })
fs.mkdirSync(outputDirectory, { recursive: true })

const manifestBooks = []
const sourceFileManifest = {}
const totals = {
  displayTokens: 0,
  alignedTokens: 0,
  reviewedSurfaceExceptions: 0,
  versesWithSyntax: 0,
  clauses: 0,
  groups: 0,
  discardedUnsupportedRoles: 0,
}

for (const manifestBook of scriptureManifest.books) {
  const source = verifiedSourceFile(manifestBook.id)
  const scripture = JSON.parse(
    fs.readFileSync(path.join(scriptureDirectory, manifestBook.filename), 'utf8'),
  )
  const { sourceWords, syntaxByVerse, discardedUnsupportedRoles } = parseSyntaxBook(
    fs.readFileSync(source.filename, 'utf8'),
    manifestBook.id,
  )
  const alignment = validateAlignment(manifestBook.id, scripture, sourceWords)
  const verses = Object.fromEntries(syntaxByVerse)
  const counts = {
    ...alignment,
    versesWithSyntax: Object.keys(verses).length,
    clauses: Object.values(verses).reduce((sum, clauses) => sum + clauses.length, 0),
    groups: Object.values(verses).reduce(
      (sum, clauses) => sum + clauses.reduce(
        (clauseSum, clause) => clauseSum + clause[1].length,
        0,
      ),
      0,
    ),
    discardedUnsupportedRoles,
  }
  for (const key of Object.keys(totals)) totals[key] += counts[key]

  const payload = {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    bookId: manifestBook.id,
    source: {
      maculaCommit: MACULA_COMMIT,
      license: 'CC BY 4.0',
      alignmentStrategyVersion: ALIGNMENT_STRATEGY_VERSION,
    },
    counts,
    verses,
  }
  const filename = `${manifestBook.id}.json`
  const content = JSON.stringify(payload)
  const generatedSha256 = sha256Buffer(content)
  fs.writeFileSync(path.join(outputDirectory, filename), content)
  manifestBooks.push({
    id: manifestBook.id,
    filename,
    sha256: generatedSha256,
    ...counts,
  })
  sourceFileManifest[manifestBook.id] = {
    path: source.relative,
    sha256: source.sha256,
  }
}

const manifest = {
  schemaVersion: OUTPUT_SCHEMA_VERSION,
  source: {
    name: 'MACULA Greek Linguistic Datasets',
    repository: MACULA_REPOSITORY,
    maculaCommit: MACULA_COMMIT,
    license: 'CC BY 4.0',
    attribution: `MACULA Greek Linguistic Datasets, available at ${MACULA_REPOSITORY}/`,
    alignmentStrategyVersion: ALIGNMENT_STRATEGY_VERSION,
    copiedFields: ['tree nesting', 'wg@class=cl', '@role', '@predication', 'w@ref'],
    alignmentOnlyFields: ['w@normalized'],
    reviewedSurfaceExceptions: [...REVIEWED_SURFACE_EXCEPTIONS].map(
      ([key, value]) => ({ key, ...value }),
    ),
    files: sourceFileManifest,
  },
  roles: ROLE_CODES,
  totals,
  books: manifestBooks,
}
fs.writeFileSync(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)
process.stdout.write(
  `Generated ${manifestBooks.length} MACULA syntax books: ${JSON.stringify(totals)}\n`,
)
