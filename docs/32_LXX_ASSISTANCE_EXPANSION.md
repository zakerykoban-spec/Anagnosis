# LXX Assistance Expansion

Pass F2c expands the accepted Genesis–Psalms–Isaiah assistance pilot only to
the 31 exact-witness books that passed the F2b 99% alignment gate. This is an
explicit allowlist, not an automatic corpus-wide opt-in.

## Exposed books

The accepted pilot remains Genesis, Psalms, and Isaiah. The expansion adds:

1–2 Chronicles, 1–2 Esdras, Esther, Tobit, 1–4 Maccabees, Proverbs, Song of
Songs, Psalms of Solomon, Amos, Micah, Joel, Obadiah, Jonah, Nahum, Habakkuk,
Zephaniah, Haggai, Zechariah, Malachi, Jeremiah, Baruch, Letter of Jeremiah,
Ezekiel, Daniel Old Greek, Daniel Theodotion, and Bel and the Dragon Old Greek.

Every other LXX work remains unannotated. This includes all alternate-witness
Pentateuch/history candidates, every exact-witness work below the threshold,
Lamentations, Bel and the Dragon Theodotion, and the edition-mismatched Sirach.

## Safety and review

- Each approved OGA file is pinned by filename and SHA-256 in
  `scripts/scripture/lxx-assistance-books.mjs`.
- The generator refuses any substituted source file and the validator refuses
  any generated book outside the allowlist.
- Thirty-one representative mid-book lexical and syntax samples were reviewed.
  Six bad source analyses found in that review, plus the accepted Isaiah pilot
  rejection, are omitted explicitly and fail closed.
- A deterministic first/middle/last sample for all 34 exposed books verifies
  that lexical indexes and syntax phrases resolve only against canonical LXX
  display tokens. Run `npm run scripture:audit:lxx-assistance:samples`.
- The full validator checks generated checksums, source hashes, approval tiers,
  canonical verse/index bounds, allowlist identity, and unexpected files. The
  F2b coverage audit separately reproduces the 99% selection gate.

The metadata never changes Scripture text, reading progression, completion,
navigation, or the Psalms manuscript presentation.

## Loading behavior

Assistance remains optional and lazy by book. Opening an approved LXX reading
loads only that book's two emitted assistance chunks; no other LXX book's data
is loaded with it. The same book data supplies word popups and is reused when a
selected verse opens Insight.
