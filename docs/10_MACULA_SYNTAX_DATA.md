# MACULA Greek syntax data

Anagnosis displays the canonical SBLGNT 1.2 text unchanged. Its optional syntax layer is a compact, deterministic derivative of MACULA Greek and applies only to SBLGNT Progressive, Challenge, and Open Text readings. It is loaded one New Testament book at a time only after the reader explicitly opens Insight.

## Pinned source

- Repository: `Clear-Bible/macula-greek`
- Commit: `8423afe47b9e8f24b7772e808af45c7159a6fe7e`
- License: CC BY 4.0
- Source representation: `SBLGNT/lowfat/*.xml`

The exact source paths and SHA-256 checksums are recorded in `src/data/scripture/generated/sblgnt-syntax/manifest.json`. Raw MACULA files are not committed. To reproduce the derivative from a checkout at the pinned commit:

```sh
npm run scripture:import:syntax -- /path/to/macula-greek
npm run scripture:validate:syntax
```

The importer refuses any other Git revision or source checksum.

## Data boundary

The derivative copies only the tree nesting needed to produce clause groups, clause class, syntactic role, predication flag, and token reference. MACULA's normalized surface is used transiently for alignment validation and is not written to book bundles.

The E2 bundles do not copy surface text, lemmas, morphology, Strong's numbers, glosses, semantic domains, frames, referents, MARBLE links, or translation material. The Insight panel always reconstructs group text from Anagnosis's canonical SBLGNT display tokens.

## Alignment and omissions

The pinned baseline aligns all 137,741 SBLGNT display-token positions. Matching ignores case, accents, punctuation, sigma form, and explicit elision marks without changing displayed text. One reviewed edition spelling is recorded in the manifest: SBLGNT `Μωσῆς` and MACULA `Μωϋσῆς` at John 8:5 token 5.

Six upstream nodes contain diagnostic role values rather than a supported syntactic role. The importer discards those labels, descends into valid nested structure where possible, and records the omission count. Unsupported labels never enter generated bundles or the user interface.

## Compact schema

Each book stores a verse-to-clause map. A clause is `[flags, groups]`; a group is `[roleIndex, startTokenIndex, endTokenIndex]`. The static role table lives in the manifest. Flags identify only MACULA's verbless or elided predication and the importer's sentence-level grouping.

The validator checks the source pin metadata, generated checksums, all verse and token ranges, compact shape, conservative totals, forbidden copied fields, and absence of a committed raw MACULA checkout.

## Attribution

Syntax metadata: MACULA Greek Linguistic Datasets by Clear Bible, licensed CC BY 4.0. No endorsement by Clear Bible or the MACULA contributors is implied.
