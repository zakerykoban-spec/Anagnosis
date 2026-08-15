import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { readerBannerKindForEntry } from '../src/readerPresentation.ts'

test('daily Psalm retains the devotional banner', () => {
  assert.equal(readerBannerKindForEntry({
    bookId: 'psalms',
    context: 'daily-office',
    entryId: 'psalm:1',
    entryKind: 'scripture',
  }), 'psalm')
})

test('navigated and Free Reading Psalms have no devotional banner', () => {
  assert.equal(readerBannerKindForEntry({
    bookId: 'psalms',
    context: 'navigation',
    entryId: 'lxx:psalms:1',
    entryKind: 'scripture',
  }), null)
  assert.equal(readerBannerKindForEntry({
    bookId: 'psalms',
    context: 'navigation',
    entryId: 'psalm:1',
    entryKind: 'scripture',
  }), null)
})

test('other established Scripture and prayer banners remain unchanged', () => {
  assert.equal(readerBannerKindForEntry({
    bookId: 'mark',
    context: 'daily-office',
    entryId: 'progressive:mark:1',
    entryKind: 'scripture',
  }), null)
  assert.equal(readerBannerKindForEntry({
    bookId: null,
    context: 'daily-office',
    entryId: 'meal:before',
    entryKind: 'prayer',
  }), 'meal')
  assert.equal(readerBannerKindForEntry({
    bookId: null,
    context: 'daily-office',
    entryId: 'meal:after',
    entryKind: 'prayer',
  }), 'after-meal')
  assert.equal(readerBannerKindForEntry({
    bookId: null,
    context: 'daily-office',
    entryId: 'opening-prayer',
    entryKind: 'prayer',
  }), 'altar')
})

test('reader navigation explicitly changes presentation context', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(app, /isDisplayedPsalm/u)
  assert.match(app, /openEntry\(reading, 'navigation'\)/u)
  assert.match(
    app,
    /if \(displayedDestinationIndex >= 0\) \{\s*setReaderEntryContext\('navigation'\)/u,
  )
  assert.match(
    app,
    /setFreeReadingEntry\(reading\)\s*setReaderEntryContext\('navigation'\)/u,
  )
})
