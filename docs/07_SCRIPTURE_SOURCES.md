# Scripture Sources

## Greek New Testament

### Edition

The Greek New Testament: SBL Edition (SBLGNT)

Editor: Michael W. Holmes

Source repository:

https://github.com/Faithlife/SBLGNT

Imported source version:

SBLGNT v1.2

The upstream source files are preserved without modification in:

`imports/scripture/sblgnt/`

Generated application data must be written separately beneath:

`src/data/scripture/generated/`

Generated files must never be edited manually.

## Copyright and License

Copyright 2010 by the Society of Biblical Literature and Logos Bible Software.

The SBLGNT is licensed under the Creative Commons Attribution 4.0 International License.

License:

https://creativecommons.org/licenses/by/4.0/

The application must retain appropriate attribution and indicate any transformations made to the source text or data format.

## Application Use

The application may:

- reproduce the SBLGNT
- bundle it for offline use
- transform the source format into application JSON
- divide the text into locally authored reading units
- redistribute the resulting application with attribution

The application must not imply endorsement by the Society of Biblical Literature, Faithlife, or Logos Bible Software.

## Data Policy

The imported upstream files are canonical source material.

The application pipeline is:

1. Official SBLGNT source files
2. Deterministic import script
3. Normalized generated Scripture data
4. Authored discourse units
5. Daily reading plans

Verse references remain the stable addressing layer.

Discourse units and daily reading assignments are separate authored data and must not modify the underlying Scripture text.

## Septuagint

### Collection and Revision

OpenGreekAndLatin, First1KGreek:

https://github.com/OpenGreekAndLatin/First1KGreek

Frozen source revision:

`4c9c843d80ee94b4371f52add5f7d68bbfe7ba4c`

The selected source directory is:

`data/tlg0527/`

The application includes all 55 Greek text works available in that directory
at the frozen revision. This includes the deuterocanonical works, Psalms of
Solomon, and separately labeled Old Greek and Theodotion forms of Susanna,
Daniel, and Bel and the Dragon.

### Edition Selection

Most works contain one Greek edition and use that file.

Two works require an explicit choice:

- Sirach uses `tlg0527.tlg034.1st1K-grc2.xml`, the Henry Barclay Swete
  edition.
- Isaiah uses `tlg0527.tlg048.1st1K-grc1.xml`, the Henry Barclay Swete
  edition.

The choices and permitted omissions are enforced by:

`scripts/scripture/lxx-source-map.mjs`

### Known Omission

First1KGreek contains CTS metadata for Ecclesiastes (`tlg030`) but no Greek
text XML at the frozen revision. The importer records the omission and
continues. Ecclesiastes must not appear as an available book until a reviewed,
redistributable Greek source is added deliberately.

### Versification

Source chapter and verse labels are preserved as application addresses.
They are not silently converted to another canon's numbering.

This is necessary for source features such as:

- Psalm 151
- Esther's `prologue` chapter
- Odes `iva` and `ivb`
- lettered verse labels in several historical and wisdom books

The Letter of Jeremiah has no chapter wrapper in the source and is normalized
as chapter 1.

### Transformation

The deterministic importer:

- selects the configured Greek edition
- removes critical notes, running headers, and page-break metadata
- converts line and milestone breaks to spacing
- normalizes whitespace and reader punctuation spacing
- preserves readable Greek text and source reference labels
- omits four empty verse containers while recording their IDs in the
  generated manifest
- writes one lazy-loadable JSON file per work plus a corpus manifest

Generated LXX data is stored beneath:

`src/data/scripture/generated/lxx/`

The generated data must not be edited manually.

### Copyright and License

The First1KGreek source files are available under the Creative Commons
Attribution-ShareAlike 4.0 International License:

https://creativecommons.org/licenses/by-sa/4.0/

The transformed generated LXX data is likewise offered under CC BY-SA 4.0.
Attribution is retained in the application, this source record, each generated
book's metadata, and the generated manifest. No endorsement by
OpenGreekAndLatin, First1KGreek, the University of Leipzig, or the source
editors is implied.
