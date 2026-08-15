import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assistanceRoot = path.join(repo, 'src/data/scripture/generated/lxx-assistance')
const scriptureRoot = path.join(repo, 'src/data/scripture/generated/lxx')
const manifest = JSON.parse(fs.readFileSync(path.join(assistanceRoot, 'manifest.json'), 'utf8'))

const results = manifest.books.map((entry) => {
  const parts = entry.files.map((file) => (
    JSON.parse(fs.readFileSync(path.join(assistanceRoot, file.filename), 'utf8'))
  ))
  const lexicalVerses = Object.assign({}, ...parts.map((part) => part.lexicalVerses))
  const syntaxVerses = Object.assign({}, ...parts.map((part) => part.syntaxVerses))
  const scripture = JSON.parse(fs.readFileSync(path.join(scriptureRoot, `${entry.id}.json`), 'utf8'))
  const verses = scripture.chapters.flatMap((chapter) => chapter.verses)
  const sampleIndexes = [...new Set([0, Math.floor(verses.length / 2), verses.length - 1])]
  const samples = sampleIndexes.map((index) => {
    const verse = verses[index]
    const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
    const lexical = lexicalVerses[verse.id] ?? []
    const syntax = syntaxVerses[verse.id] ?? []
    for (const [displayIndex] of lexical) {
      if (displayIndex < 0 || displayIndex >= surfaces.length) {
        throw new Error(`${verse.id}: sampled lexical token is outside canonical text.`)
      }
    }
    for (const [, groups] of syntax) for (const [, start, end] of groups) {
      const phrase = surfaces.slice(start, end + 1).join(' ')
      if (!phrase) throw new Error(`${verse.id}: sampled syntax cannot reconstruct canonical text.`)
    }
    return {
      verseId: verse.id,
      displayTokens: surfaces.length,
      lexicalTokens: lexical.length,
      syntaxClauses: syntax.length,
    }
  })
  return { bookId: entry.id, approvalTier: entry.approvalTier, samples }
})

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
