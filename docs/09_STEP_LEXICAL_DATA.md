# STEP lexical data

Anagnosis displays its canonical SBLGNT and LXX text unchanged. Its optional word-level lexical layer is a compact derivative of STEP Bible data. It applies to SBLGNT Progressive, Challenge, and Open Text readings, plus the explicitly reviewed LXX witnesses recorded in `docs/32_LXX_ASSISTANCE_EXPANSION.md`. Unsupported LXX witnesses, prayers, and table prayers are not enriched.

## Pinned sources

- Repository: `STEPBible/STEPBible-Data`
- Commit: `b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39` (2026-06-09)
- License: CC BY 4.0
- Data: TAGNT Mat–John, TAGNT Acts–Revelation, TEGMC, and TBESG

The exact source paths and SHA-256 checksums are recorded in `src/data/scripture/generated/sblgnt-lexical/manifest.json`. Raw STEP files are not committed. To reproduce the derivative from a checkout at the pinned commit:

```sh
npm run scripture:import:step -- /path/to/STEPBible-Data
npm run scripture:validate:step
```

The LXX importer uses `scripts/data/lxx-step-glossary.json`, a compact reviewed
gloss map recovered from already committed derivatives of that same pinned
TBESG source. This keeps the LXX expansion reproducible without committing the
raw multi-megabyte lexicon. OGA supplies the LXX lemma, morphology, and syntax;
STEP supplies only an optional brief dictionary gloss.

## Alignment policy

Metadata never replaces or rewrites displayed SBLGNT text. Within each verse, the importer accepts only:

1. NFC-equivalent surface forms.
2. A matching-only normalization of case, accents, punctuation, sigma, and explicit elision marks.
3. Controlled movable-nu equivalence.

The importer performs the alignment in both directions and keeps only token pairs common to both results. Repeated-word ambiguities, edition differences, reordered words, and unresolved tokens receive no metadata and no uncommon-word mark.

The pinned baseline is 136,637 safely aligned tokens out of 137,741 displayed tokens. Lemma frequency is computed over TAGNT rows explicitly containing the SBL edition. Proper-name and title tokens are excluded from uncommon marking. The threshold is 30 New Testament occurrences.

## Grammar display

The raw STEP morphology code is preserved in the derivative. The importer validates every used code against TEGMC and generates a Greek-first display based on Randall Buth’s course metalanguage:

- Indicative verbs use `χρόνος` abbreviations.
- Subjunctives, optatives, imperatives, infinitives, and participles use `ὄψις` abbreviations.
- STEP “deponent” labels are not reproduced; the formal middle or passive disposition is shown.
- A STEP middle/passive ambiguity remains explicitly middle/passive.

Dictionary lemmas and brief glosses remain identified as STEP lexical source forms. They are reference aids, not replacements for Buth’s recommended spoken vocabulary forms.

## Attribution

Lexical metadata: STEP Bible TAGNT, TEGMC, and TBESG, licensed CC BY 4.0. Users should be directed to [STEPBible.org](https://www.stepbible.org/) and the upstream `STEPBible-Data` repository for the source data.
