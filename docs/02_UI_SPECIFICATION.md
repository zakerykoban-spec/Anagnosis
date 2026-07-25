# Ἀνάγνωσις — UI Specification

## Design Goal

The interface should feel like a quiet reading office rather than a software dashboard.

The design language is influenced by the restraint, spacing, and clarity of Apple Books, Apple Journal, and Apple Notes without imitating any single application.

## Core Design Principles

* Scripture is the visual center.
* Interface elements should recede.
* Whitespace is structural.
* Ornament should be minimal.
* Navigation should be immediately understandable.
* Completion should produce quiet rather than celebration.

## Platform

Primary target:

* iPhone
* portrait orientation
* installed PWA

Desktop presentation may remain functional for development but is not the primary design target.

## Themes

Exactly two appearance modes:

* Light
* Dark

There is no System mode.

### Light Mode

Character:

* warm
* soft
* paper-like without simulating parchment
* high readability
* muted contrast

### Dark Mode

Character:

* deep charcoal rather than absolute black
* warm light text
* restrained gold accents
* comfortable for early-morning or evening reading

## Color Direction

The palette should remain almost monochrome.

Primary accent:

* muted warm gold

Avoid:

* bright blue
* saturated accent colors
* ornamental gradients
* glowing effects
* decorative parchment textures

Final color values will be established during Milestone 0 and stored as shared design tokens.

## Typography

Typography defines the boundary between interface and Scripture.

### Interface Typography

Use the native Apple-oriented system font stack where available:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "SF Pro Display",
  system-ui,
  sans-serif;
```

Used for:

* dates
* navigation
* settings
* supporting labels
* progress text
* controls

### Greek Display and Scripture Typography

Use an elegant Greek serif with excellent polytonic support.

Used for:

* app title
* major Greek headings
* biblical book names
* prayers
* Scripture text

Scripture typography should feel distinct from the software layer.

The final bundled serif font must be locally hosted and licensed appropriately.

## App Identity

Application name:

> Ἀνάγνωσις

No English subtitle is shown in the primary interface.

## Icon System

Icons should resemble restrained first-party platform symbols:

* thin strokes
* rounded geometry
* monochrome
* simple silhouettes
* consistent optical weight

### Primary Identity Icon

A thin circular outline containing an abstract rolled manuscript.

The scroll must be:

* geometric
* minimal
* symbolic
* recognizable at small sizes

It must not appear as:

* an emoji
* a realistic parchment
* a decorative historical illustration

## Layout

Avoid heavy card-based layouts.

Preferred structure:

* open background
* generous margins
* strong typographic hierarchy
* thin separators
* small icons
* restrained controls

Cards should only be introduced where grouping cannot be communicated through spacing and dividers.

## Today View

The Today view is the application’s default launch destination.

It contains:

* date or day marker
* opening prayer
* familiar reading
* progressive reading
* Psalm or biblical prayer
* closing prayer
* completion control

Each item should emphasize the actual text or book rather than the category label.

Example hierarchy:

```text
Εὐχερής

Κατὰ Μᾶρκον

1–5
```

The book name is the visual hero.

## Reading Entries

Each reading entry may include:

* small abstract scroll icon
* quiet category label
* book or prayer title
* passage range
* completion state

Entries are separated primarily by whitespace and thin rules.

## Reading Screen

The reading screen should contain as little visible interface as possible.

Primary elements:

* back control
* book title
* passage reference
* Greek text
* subtle position indicator
* completion control

Avoid persistent toolbars, study tools, annotation controls, or floating action menus.

## Scripture Text

Scripture should be displayed in a readable Greek serif with:

* comfortable line height
* generous horizontal margins
* clear paragraph or discourse-unit breaks
* no unnecessary verse-number dominance

Verse numbers, when included, should be visually subordinate.

## Completion

The completion action should be restrained.

Avoid a large promotional-style button.

Preferred direction:

```text
✓

Τετέλεσται
```

After all daily elements are complete, the Today view should resolve to:

> Εἰρήνη σοι.

No confetti, animations of reward, streak notices, or additional prompts.

## Bottom Navigation

Four destinations:

* Σήμερον
* Ὁδός
* Ἡμερολόγιον
* Ρυθμίσεις

The icon system must remain abstract and visually consistent.

Greek labels are shown by default.

The possibility of icon-only navigation may be evaluated during Milestone 0, but discoverability and accessibility take priority.

## English Assistance

A single English toggle exists in Settings.

When OFF:

* the interface is Greek

When ON:

* concise English assistance appears beneath or beside Greek interface labels

Scripture remains Greek in both states.

The toggle should assist comprehension without turning the app into a bilingual reading environment.

## Journey View

The Journey view communicates position without gamification.

It may show:

* current book
* current journey
* completed books
* remaining authored units
* recent journey history

Avoid percentages and conventional productivity progress bars where possible.

Preferred language is positional:

* Day 8 of 18
* 10 readings remain
* 3 books completed

## Calendar View

The calendar should be quiet and nonjudgmental.

It records completed offices without labeling missed days as failures.

Avoid:

* streak counts
* red missed-day markers
* warnings
* pressure language

## Settings View

Initial settings:

* Light / Dark
* English assistance ON / OFF
* local progress reset
* application information
* Scripture source and licensing information

Settings should remain short.

## Motion

Motion should be subtle and functional.

Allowed:

* gentle view transitions
* small opacity changes
* restrained completion-state transition

Avoid:

* bouncing
* dramatic page animation
* celebration effects
* decorative parallax
* continuous motion

## Accessibility

The interface must support:

* readable contrast
* Dynamic Type-friendly sizing where practical
* large touch targets
* visible focus states
* semantic controls
* reduced-motion preferences
* VoiceOver labels for icon-only controls

Greek diacritics must render clearly at all supported text sizes.

## Milestone 0 Acceptance Criteria

The Empty Office is complete when:

* the application launches directly into Today
* Light mode is visually complete
* Dark mode is visually complete
* typography hierarchy is approved
* the abstract scroll identity icon is approved
* bottom navigation is approved
* spacing and dividers are approved
* the static daily sequence is fully represented
* the production build passes
* the screen has been reviewed at an iPhone portrait size

No reading logic, persistence, calendar logic, or functional settings are required for this milestone.
