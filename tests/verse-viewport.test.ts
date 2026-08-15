import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { verseViewportScrollDelta } from '../src/verseViewport.ts'

function assertClose(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 0.001, `${actual} ≉ ${expected}`)
}

test('verse navigation leaves a comfortably visible verse stationary', () => {
  assert.equal(verseViewportScrollDelta({
    verseTop: 260,
    verseBottom: 330,
    viewportTop: 64,
    viewportBottom: 776,
  }), 0)
})

test('verse navigation scrolls only enough near the lower edge', () => {
  assertClose(verseViewportScrollDelta({
    verseTop: 650,
    verseBottom: 720,
    viewportTop: 64,
    viewportBottom: 776,
  }), 29.44)
})

test('verse navigation scrolls only enough near the upper edge', () => {
  assertClose(verseViewportScrollDelta({
    verseTop: 105,
    verseBottom: 170,
    viewportTop: 64,
    viewportBottom: 776,
  }), -44.44)
})

test('restored positions keep their centered scroll path while step navigation is edge-aware', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  assert.match(
    app,
    /pendingScroll\.current=rememberedVerseId\s*\? \{kind:'verse',verseId:rememberedVerseId\}/u,
  )
  assert.match(
    app,
    /pendingScroll\.current=intent==='navigation'\s*\? \{kind:'verse',verseId:nextVerse\.id,edgeAware:true\}/u,
  )
  assert.match(app, /keepVerseComfortablyVisible\(verseElement\)/u)
})
