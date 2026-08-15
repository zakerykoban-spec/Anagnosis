import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  explicitVerseSelectionAfterMove,
  isExplicitVerseSelected,
} from '../src/verseSelection.ts'

test('verse-number movement creates an explicit verse selection', () => {
  const selected = explicitVerseSelectionAfterMove(
    'mark.9.2',
    'verse-number',
  )

  assert.equal(selected, 'mark.9.2')
  assert.equal(isExplicitVerseSelected(selected, 'mark.9.2'), true)
  assert.equal(isExplicitVerseSelected(selected, 'mark.9.3'), false)
})

test('ordinary verse navigation never carries explicit selection', () => {
  assert.equal(
    explicitVerseSelectionAfterMove('mark.9.3', 'navigation'),
    null,
  )
})

test('verse-number hit slop remains invisible and text keeps priority', () => {
  const css = readFileSync(
    new URL('../src/App.css', import.meta.url),
    'utf8',
  )

  assert.match(css, /\.verse-number::before\s*{[^}]*width:\s*44px;/s)
  assert.match(css, /\.verse-number::before\s*{[^}]*height:\s*44px;/s)
  assert.match(css, /\.verse-text\s*{[^}]*z-index:\s*2;/s)
})

test('every Scripture surface, including daily Psalms, uses manuscript flow', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  assert.match(app, /const isLongForm = scriptureReading !== null/u)
  assert.doesNotMatch(app, /freeReadingEntry\s*\?\s*!isDisplayedPsalm/u)
})
