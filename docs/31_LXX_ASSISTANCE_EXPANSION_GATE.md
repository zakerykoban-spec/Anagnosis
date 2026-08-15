# LXX Assistance Expansion Gate

Pass F2b measured OGA v0.2.0 CoNLL-U annotations against every LXX work currently displayed by Anagnosis. The audit used `scripts/audit-lxx-assistance-coverage.mjs`; it did not alter the canonical First1KGreek/Swete text.

## Decision

- **GO:** preserve the accepted Genesis–Psalms–Isaiah pilot.
- **GO for a later exact-witness tier:** 33 works use the same named First1KGreek witness and align at or above 99%.
- **NO-GO:** enabling assistance across the whole LXX corpus without book-specific review.
- **NO-GO:** Sirach with the available OGA file. Anagnosis displays `grc2`; OGA provides `grc1`, producing only 44.68% alignment.

## Exact-witness candidates at or above 99%

1 Chronicles, 2 Chronicles, 1 Esdras, 2 Esdras, Esther, Tobit, 1–4 Maccabees, Psalms, Proverbs, Song of Songs, Psalms of Solomon, Amos, Micah, Joel, Obadiah, Jonah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi, Isaiah, Jeremiah, Baruch, Letter of Jeremiah, Ezekiel, Daniel Old Greek, Daniel Theodotion, and Bel and the Dragon Old Greek.

Psalms and Isaiah are already in the accepted pilot. The remaining 31 candidates require the same semantic sampling and fail-closed generation used in F2a before exposure.

Pass F2c completed that sampled review and implemented the accepted allowlist;
see `docs/32_LXX_ASSISTANCE_EXPANSION.md`.

## Held books

- Genesis is retained only as the already reviewed pilot exception: OGA uses an alternate `opp-grc2` witness and aligns at 98.99%.
- Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, and 1–4 Kingdoms use alternate OGA witnesses. Their numeric alignment is often high, but they require witness-specific review.
- Judith, Odes, Job, Wisdom, Hosea, Susanna Old Greek, and Susanna Theodotion use the expected witness but fall below the 99% expansion threshold.
- Lamentations and Bel and the Dragon Theodotion fall below 96%.
- Sirach is excluded because the available annotation is for the wrong edition.

## Reader presentation

F2b also removes the Psalms-only stacked verse presentation. Daily Psalms and free-reading Psalms now use the same continuous manuscript flow as every other Scripture reading. Psalm assignment order, completion state, verse navigation, lexical popups, and Insight behavior remain unchanged.
