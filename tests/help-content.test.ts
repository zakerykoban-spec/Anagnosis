import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  INSIGHT_HELP_OBSERVATIONS,
  INSIGHT_HELP_TERMS,
  UNSUPPORTED_LXX_HELP_GROUPS,
} from '../src/helpContent.ts'
import {
  SYNTAX_CLAUSE_LABEL,
  SYNTAX_OBSERVATION_LABELS,
  SYNTAX_ROLES,
  syntaxRoleLabel,
} from '../src/models/syntax.ts'
import { LXX_BOOKS } from '../src/scriptureCatalog.ts'

const assistanceManifest = JSON.parse(fs.readFileSync(
  'src/data/scripture/generated/lxx-assistance/manifest.json',
  'utf8',
)) as { books: Array<{ id: string }> }

test('Help terminology remains synchronized with Insight labels', () => {
  assert.deepEqual(INSIGHT_HELP_TERMS, [
    SYNTAX_CLAUSE_LABEL,
    ...SYNTAX_ROLES.map(syntaxRoleLabel),
  ])
  assert.deepEqual(
    INSIGHT_HELP_OBSERVATIONS,
    SYNTAX_OBSERVATION_LABELS.map(({ greek, english }) => ({ greek, english })),
  )
})

test('Help unsupported LXX statement is the exact assistance allowlist complement', () => {
  const supported = new Set(assistanceManifest.books.map((book) => book.id))
  const expectedUnsupported = LXX_BOOKS
    .map((book) => book.id)
    .filter((bookId) => !supported.has(bookId))
    .sort()
  const documentedUnsupported = UNSUPPORTED_LXX_HELP_GROUPS
    .flatMap((group) => [...group.ids])
    .sort()

  assert.deepEqual(documentedUnsupported, expectedUnsupported)
})
