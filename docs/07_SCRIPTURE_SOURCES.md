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

A Greek Old Testament source has not yet been selected.

Its edition, versification, provenance, and redistribution license must be reviewed and documented before any Septuagint text is committed.
