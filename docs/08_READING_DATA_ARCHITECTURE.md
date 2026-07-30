# Reading Data Architecture

## Status

Frozen for initial implementation.

This document defines the canonical relationship between Scripture text, discourse units, reading plans, daily offices, and locally stored progress.

## Core Principle

The application does not treat arbitrary verse counts as the primary unit of reading.

The canonical hierarchy is:

1. Scripture source
2. Verse-addressable Scripture data
3. Authored discourse units
4. Reading-plan assignments
5. Daily offices
6. Local completion state

Scripture remains verse-addressable for stable reference and retrieval.

The daily reading experience is discourse-unit driven.

## Scripture Layer

The Scripture layer contains normalized data generated from preserved upstream source files.

For the Greek New Testament, the canonical source is SBLGNT version 1.2.

For the Septuagint and related Greek Old Testament works, the canonical
collection is the frozen First1KGreek `tlg0527` revision documented in
`07_SCRIPTURE_SOURCES.md`.

Generated Scripture data is written beneath:

`src/data/scripture/generated/sblgnt/`

and:

`src/data/scripture/generated/lxx/`

Generated Scripture files must never be edited manually.

They are recreated through:

`npm run scripture:import`

### Stable Verse Identifiers

Every verse has a stable identifier using:

`bookId.chapter.verse`

Examples:

- `mark.1.1`
- `luke.2.1`
- `john.1.14`
- `genesis.1.1`
- `esther.prologue.1a`

The identifier is an internal application address. Chapter and verse parts are
numeric where the adopted source is numeric, but source labels such as
`prologue`, `iva`, and `35a` are retained when present.

It does not replace the structured book, chapter, and verse fields.

### Source and Display Text

Every generated verse contains:

- `sourceText`
- `displayText`

`sourceText` preserves the transformed upstream content, including supported textual apparatus marks.

`displayText` is the reader-facing form.

The display transformation may remove visual apparatus marks and normalize whitespace.

It must not silently rewrite, modernize, paraphrase, or otherwise alter the adopted Greek text.

## Discourse-Unit Layer

A discourse unit is an authored, meaningful reading segment.

Examples may include:

- a narrative scene
- a speech
- a controversy account
- a parable
- a prayer
- a psalm movement
- a letter section

A discourse unit references an inclusive Scripture range.

It does not duplicate the Scripture text.

Example:

    {
      id: "mark.calling-first-disciples",
      corpus: "nt",
      bookId: "mark",
      titleGreek: "Ἡ κλῆσις τῶν πρώτων μαθητῶν",
      titleEnglish: "The Calling of the First Disciples",
      kind: "narrative",
      passage: {
        start: {
          bookId: "mark",
          chapter: 1,
          verse: 16
        },
        end: {
          bookId: "mark",
          chapter: 1,
          verse: 20
        }
      },
      order: 4
    }

### Discourse-Unit Rules

A discourse unit:

- must have a stable semantic identifier
- must remain within one biblical book
- may cross chapter boundaries
- must use an inclusive range
- must not contain copied Scripture text
- must not be generated solely from a fixed verse count
- must preserve meaningful literary or discourse boundaries
- may include an editorial note that is never shown to the reader

Changing a unit's title does not require changing its identifier.

Changing the actual passage represented by a unit should be treated as an authored content revision.

## Journey Layer

The initial office contains three reading journeys:

### Familiar

A returning or already familiar biblical text.

This journey supports fluency, recognition, and repeated reading.

Identifier:

`familiar`

### Progressive

The primary forward-moving reading sequence.

This journey advances through complete biblical books while preserving narrative and literary continuity.

Identifier:

`progressive`

### Prayer

A psalm, canticle, or biblical prayer used as meditation and prayer.

Identifier:

`prayer`

## Reading Assignments

A reading assignment connects one journey to one discourse unit.

It does not directly contain a verse range.

Example:

    {
      id: "ordinary-001-progressive",
      journey: "progressive",
      discourseUnitId: "luke.prologue"
    }

The discourse unit owns the Scripture range.

This prevents reading plans from duplicating or redefining passage boundaries.

## Daily Office

A daily office is the ordered collection of reading assignments presented for one day.

Example:

    {
      id: "ordinary-001",
      day: 1,
      assignments: [
        {
          id: "ordinary-001-familiar",
          journey: "familiar",
          discourseUnitId: "mark.beginning-of-the-gospel"
        },
        {
          id: "ordinary-001-progressive",
          journey: "progressive",
          discourseUnitId: "luke.prologue"
        },
        {
          id: "ordinary-001-prayer",
          journey: "prayer",
          discourseUnitId: "psalms.blessed-man"
        }
      ]
    }

Opening and closing prayers belong to the office presentation and prayer-data layers.

They are not Scripture reading assignments unless the prayer itself is an assigned biblical passage.

## Reading Plan

A reading plan is an ordered set of daily offices.

It contains:

- a stable identifier
- a Greek title
- an optional English assistance title
- an authored version number
- ordered daily offices

A plan version increases only when authored plan content changes.

Generated timestamps must not be used as plan versions.

## Progress

Progress is stored locally.

The canonical completion target is the reading assignment, not the individual verse.

A completed assignment records:

- assignment identifier
- completion timestamp

The application must not implement:

- streaks
- achievements
- points
- competitive progress
- shame-based incomplete states

Completion exists only to preserve the reader's place and determine the current office.

## Separation of Responsibilities

### Scripture source

Owns the Greek text.

### Importer

Transforms upstream data into normalized application data.

### Scripture models

Define generated text structure and stable references.

### Discourse units

Define meaningful reading boundaries.

### Reading plans

Schedule discourse units into journeys and daily offices.

### Progress store

Records local completion.

### Presentation layer

Displays the current office and reader interface.

No layer may silently redefine the responsibilities of another layer.

## Deterministic Generation

Running the Scripture importer multiple times against unchanged input must produce byte-equivalent generated Scripture files.

Generated data therefore must not contain:

- generation timestamps
- machine-specific paths
- random identifiers
- environment-specific metadata

## Initial Implementation Sequence

1. Preserve and verify SBLGNT.
2. Generate normalized verse-addressable data.
3. Validate the complete generated corpus.
4. Author New Testament discourse units.
5. Author the first reading plan.
6. Resolve the current daily office.
7. Render the Today view.
8. Render assigned passages in the reading view.
9. Persist completion locally.
10. Freeze the Septuagint source, edition choices, and versification.
11. Generate and validate the complete available LXX corpus.
12. Expose both corpora through non-mutating free reading while leaving the
    authored devotional journeys independent.
