import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  syntaxAssistanceApplies,
  syntaxInsightForVerse,
  syntaxRoleLabel,
} from '../src/models/syntax.ts'
import markScripture from '../src/data/scripture/generated/sblgnt/mark.json' with { type: 'json' }
import markSyntax from '../src/data/scripture/generated/sblgnt-syntax/mark.json' with { type: 'json' }
import syntaxManifest from '../src/data/scripture/generated/sblgnt-syntax/manifest.json' with { type: 'json' }

test('generated MACULA syntax preserves the reviewed full-corpus baseline', () => {
  assert.equal(syntaxManifest.schemaVersion, 1)
  assert.equal(
    syntaxManifest.source.maculaCommit,
    '8423afe47b9e8f24b7772e808af45c7159a6fe7e',
  )
  assert.equal(syntaxManifest.source.license, 'CC BY 4.0')
  assert.deepEqual(syntaxManifest.totals, {
    displayTokens: 137741,
    alignedTokens: 137741,
    reviewedSurfaceExceptions: 1,
    versesWithSyntax: 7939,
    clauses: 30464,
    groups: 85103,
    discardedUnsupportedRoles: 6,
  })
  assert.equal(syntaxManifest.books.length, 27)
  assert.equal(fs.existsSync('imports/scripture/macula-greek'), false)
})

test('generated book bundles contain structure but no copied lexical or surface fields', () => {
  assert.equal(markSyntax.counts.displayTokens, 11286)
  assert.equal(markSyntax.counts.alignedTokens, 11286)
  assert.equal(markSyntax.counts.versesWithSyntax, 673)
  assert.equal(markSyntax.counts.clauses, 2694)

  const raw = fs.readFileSync(
    'src/data/scripture/generated/sblgnt-syntax/mark.json',
    'utf8',
  ).toLowerCase()
  for (const field of [
    'domain',
    'frame',
    'gloss',
    'lemma',
    'morph',
    'normalized',
    'referent',
    'strong',
    'unicode',
  ]) assert.doesNotMatch(raw, new RegExp(`"${field}"`, 'u'))
})

test('Insight phrases are reconstructed only from canonical SBLGNT tokens', () => {
  const verse = markScripture.chapters[0].verses[0]
  const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
  const clauses = syntaxInsightForVerse(markSyntax, verse.id, surfaces)

  assert.equal(verse.id, 'mark.1.1')
  assert.equal(clauses.length, 1)
  assert.equal(clauses[0].groups.length, 1)
  assert.equal(clauses[0].groups[0].role, 'p')
  assert.equal(clauses[0].groups[0].text, verse.displayText)
  assert.deepEqual(clauses[0].observations, [{
    greek: 'Σύνταξις περιόδου',
    english: 'Sentence-level grouping',
  }])
})

test('syntax roles have deterministic Greek-first labels', () => {
  assert.deepEqual(syntaxRoleLabel('s'), {
    greek: 'Ὑποκείμενον',
    english: 'Subject',
  })
  assert.deepEqual(syntaxRoleLabel('v'), {
    greek: 'Ῥῆμα',
    english: 'Verb',
  })
  assert.deepEqual(syntaxRoleLabel('adv'), {
    greek: 'Ἐπιρρηματικὸς ὅρος',
    english: 'Adverbial',
  })
})

test('syntax assistance includes only approved NT and LXX reading surfaces', () => {
  assert.equal(syntaxAssistanceApplies('sblgnt', 'progressive'), true)
  assert.equal(syntaxAssistanceApplies('sblgnt', 'challenge'), true)
  assert.equal(syntaxAssistanceApplies('sblgnt', 'free-reading'), true)
  assert.equal(syntaxAssistanceApplies('sblgnt', 'psalm'), false)
  assert.equal(syntaxAssistanceApplies('sblgnt', 'prayer'), false)
  assert.equal(syntaxAssistanceApplies('lxx', 'progressive'), false)
  assert.equal(syntaxAssistanceApplies('lxx', 'free-reading', 'genesis'), true)
  assert.equal(syntaxAssistanceApplies('lxx', 'psalm', 'psalms'), true)
  assert.equal(syntaxAssistanceApplies('lxx', 'free-reading', 'exodus'), false)
  assert.equal(syntaxAssistanceApplies('lxx', 'prayer'), false)
})

test('Insight requires explicit verse-number selection and a separate action', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8')
  const css = fs.readFileSync('src/syntax.css', 'utf8')
  const panel = fs.readFileSync('src/components/InsightPanel.tsx', 'utf8')

  assert.match(app, /moveToVerse\(index,'verse-number'\)/u)
  assert.match(app, /className="insight-action"[^>]*onClick=\{\(\)=>void openInsight\(\)\}/u)
  assert.doesNotMatch(app, /onDoubleClick|onContextMenu|onTouchStart/u)
  assert.match(css, /\.insight-action\s*\{[^}]*position:\s*fixed;/su)
  assert.match(css, /\.insight-panel\s*\{[^}]*overscroll-behavior:\s*contain;/su)
  assert.match(panel, /bodyStyle\.position = 'fixed'/u)
  assert.match(panel, /window\.scrollTo\(\{ top: scrollY/u)
})
