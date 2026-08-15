import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseTegmc, renderButhMorphology } from '../scripts/step/buth-morphology.mjs'
import {
  lexicalAssistanceApplies,
  lexicalWordsForVerse,
} from '../src/models/lexical.ts'
import { createSingleFlightGuard } from '../src/singleFlight.ts'
import markScripture from '../src/data/scripture/generated/sblgnt/mark.json' with { type: 'json' }
import markLexical from '../src/data/scripture/generated/sblgnt-lexical/mark.json' with { type: 'json' }

const tegmcSample = [
  'N-ASM\tFunction=Noun; Case=Accusative; Number=Singular; Gender=Masculine',
  'V-AAI-3S\tFunction=Verb; Tense=Aorist; Voice=Active; Mood=Indicative; Person=3rd; Number=Singular',
  'V-AAS-3S\tFunction=Verb; Tense=Aorist; Voice=Active; Mood=Subjunctive; Person=3rd; Number=Singular',
  'V-PAP-NSM\tFunction=Verb; Tense=Present; Voice=Active; Form=Participle; Case=Nominative; Number=Singular; Gender=Masculine',
  'V-ADI-3S\tFunction=Verb; Tense=Aorist; Voice=Middle Deponent; Mood=Indicative; Person=3rd; Number=Singular',
].join('\n')

test('Buth morphology distinguishes indicative tense from non-indicative aspect', () => {
  const codes = parseTegmc(tegmcSample)
  assert.equal(
    renderButhMorphology('V-AAI-3S', codes).compact,
    '3ε, αορσ ενερ ορστ',
  )
  assert.equal(
    renderButhMorphology('V-AAS-3S', codes).compact,
    '3ε, αορ ενερ υποτ',
  )
  assert.equal(
    renderButhMorphology('V-PAP-NSM', codes).compact,
    'ορ α ε, πρτ ενερ μετχ',
  )
})

test('Buth nominal morphology uses case, gender, number order', () => {
  const codes = parseTegmc(tegmcSample)
  assert.equal(renderButhMorphology('N-ASM', codes).compact, 'αι α ε')
})

test('Buth morphology removes the deponent label without changing formal disposition', () => {
  const rendered = renderButhMorphology('V-ADI-3S', parseTegmc(tegmcSample))
  assert.equal(rendered.compact, '3ε, αορσ μεση ορστ')
  assert.doesNotMatch(rendered.expanded, /deponent/iu)
})

test('generated Mark lexical metadata preserves the conservative baseline', () => {
  assert.equal(markLexical.schemaVersion, 1)
  assert.equal(markLexical.bookId, 'mark')
  assert.equal(markLexical.source.rareLemmaThreshold, 30)
  assert.equal(markLexical.counts.displayTokens, 11286)
  assert.equal(markLexical.counts.alignedTokens, 11072)
  assert.equal(markLexical.verses['mark.1.1'].length, 5)
  assert.equal(markLexical.lemmaTable[markLexical.verses['mark.1.1'][0][1]][0], 'ἀρχή')
  assert.equal(fs.existsSync('imports/scripture/step'), false)
})

test('lexical assistance includes only approved NT and LXX reading surfaces', () => {
  assert.equal(lexicalAssistanceApplies('sblgnt', 'progressive'), true)
  assert.equal(lexicalAssistanceApplies('sblgnt', 'challenge'), true)
  assert.equal(lexicalAssistanceApplies('sblgnt', 'free-reading'), true)
  assert.equal(lexicalAssistanceApplies('sblgnt', 'psalm'), false)
  assert.equal(lexicalAssistanceApplies('sblgnt', 'prayer'), false)
  assert.equal(lexicalAssistanceApplies('lxx', 'progressive'), false)
  assert.equal(lexicalAssistanceApplies('lxx', 'free-reading', 'genesis'), true)
  assert.equal(lexicalAssistanceApplies('lxx', 'psalm', 'psalms'), true)
  assert.equal(lexicalAssistanceApplies('lxx', 'free-reading', 'proverbs'), true)
  assert.equal(lexicalAssistanceApplies('lxx', 'free-reading', 'jeremiah'), true)
  assert.equal(lexicalAssistanceApplies('lxx', 'free-reading', 'exodus'), false)
  assert.equal(lexicalAssistanceApplies('lxx', 'free-reading', 'sirach'), false)
  assert.equal(lexicalAssistanceApplies('lxx', 'psalm', 'proverbs'), false)
  assert.equal(lexicalAssistanceApplies('lxx', 'prayer'), false)
})

test('every conservatively aligned Mark word is selectable while proper names are not marked uncommon', () => {
  const verse = markScripture.chapters[0].verses[1]
  const surfaces = verse.displayText.split(/\s+/u).filter(Boolean)
  const words = lexicalWordsForVerse(markLexical, verse.id, surfaces)
  const isaiah = words.get(4)
  assert.equal(words.size, markLexical.verses[verse.id].length)
  assert.equal(isaiah?.lemma, 'Ἡσαΐας')
  assert.equal(isaiah?.proper, true)
  assert.equal(isaiah?.ntFrequency, 22)
  assert.equal(isaiah?.uncommon, false)
})

test('single-flight guard rejects repeat activation until the first action settles', async () => {
  const guard = createSingleFlightGuard()
  let release = () => {}
  let calls = 0
  const pending = guard.run(async () => {
    calls += 1
    await new Promise<void>((resolve) => { release = resolve })
  })
  const repeated = await guard.run(async () => { calls += 1 })
  assert.equal(repeated, false)
  assert.equal(calls, 1)
  assert.equal(guard.isActive(), true)
  release()
  assert.equal(await pending, true)
  assert.equal(guard.isActive(), false)
})
