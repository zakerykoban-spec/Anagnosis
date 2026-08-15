import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const ICON_PATH = 'icons/apple-touch-icon-anagnosis-alpha.png'
const ICON_SHA256 = 'ce24ec6b9b697951ccb91e1bf346b3badc6abe50f040f4a00deebf7d7cc66cd4'

test('dedicated iPhone icon is wired into the document and PWA assets', async () => {
  const [html, viteConfig] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../vite.config.ts', import.meta.url), 'utf8'),
  ])

  assert.ok(
    html.includes(
      `rel="apple-touch-icon" sizes="180x180" href="/Anagnosis/${ICON_PATH}"`,
    ),
  )
  assert.ok(viteConfig.includes(`includeAssets: ['${ICON_PATH}']`))
})

test('dedicated iPhone icon is the approved 180 by 180 alpha artwork', async () => {
  const icon = await readFile(
    new URL(`../public/${ICON_PATH}`, import.meta.url),
  )

  assert.deepEqual(
    [...icon.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  )
  assert.equal(icon.readUInt32BE(16), 180)
  assert.equal(icon.readUInt32BE(20), 180)
  assert.equal(createHash('sha256').update(icon).digest('hex'), ICON_SHA256)
})
