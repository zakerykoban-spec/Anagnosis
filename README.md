# Ἀνάγνωσις

Ἀνάγνωσις is an offline-first Greek Scripture reader and daily devotional
office. It combines completion-based reading journeys, a calendar-based prayer
cycle, table prayers, reading history, and non-mutating free reading.

## Scripture

- SBLGNT 1.2: 27 New Testament books, licensed CC BY 4.0.
- OpenGreekAndLatin First1KGreek: 55 Septuagint and related Greek Old
  Testament works, licensed CC BY-SA 4.0.
- Ecclesiastes is the one documented LXX omission because the frozen upstream
  revision contains metadata but no corresponding Greek text XML.

Both corpora are normalized into deterministic, chapter-addressable JSON and
bundled into the PWA for offline use. See
`docs/07_SCRIPTURE_SOURCES.md` for provenance, editorial choices, and
attribution.

## Commands

```text
npm install
npm run dev
npm test
npm run lint
npm run build
npm run scripture:validate
```

Rebuilding the generated LXX data additionally requires the frozen
First1KGreek source checkout:

```text
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/OpenGreekAndLatin/First1KGreek.git \
  imports/scripture/first1k-lxx

git -C imports/scripture/first1k-lxx \
  sparse-checkout set data/tlg0527

npm run scripture:import:lxx
```

The importer refuses to run unless the source checkout is at the revision
recorded in `scripts/scripture/lxx-source-map.mjs`.
