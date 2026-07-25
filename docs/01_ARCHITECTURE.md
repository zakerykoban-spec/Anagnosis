# Ἀνάγνωσις — Architecture

## Architectural Goal

The architecture must remain proportionate to the application.

Ἀνάγνωσις is intentionally small. Its internal structure should make reading plans, progress, and presentation easy to maintain without introducing unnecessary frameworks or abstractions.

## Technology

* React
* TypeScript
* Vite
* vite-plugin-pwa
* browser-local persistence
* static bundled content

## Non-Goals

The application will not require:

* a backend
* an API server
* authentication
* remote databases
* cloud storage
* Redux
* complex routing
* server-side rendering
* runtime Scripture downloads

## Architectural Principles

### Offline First

All essential application code, reading plans, prayers, and Scripture content must be available locally after installation.

The app must not depend on a live server for ordinary use.

### Data, Not Code

Reading plans and daily assignments should be represented as data.

The engine interprets authored plans. It should not attempt to automatically divide biblical books through opaque algorithms.

### Local State

User progress and preferences remain on the device.

Initial persistence may use `localStorage`.

IndexedDB should only be introduced if the final bundled text volume or persistence requirements clearly justify it.

### Feature Isolation

Application features should remain locally understandable.

Preferred structure:

```text
src/
  app/
  data/
    plans/
    prayers/
    readings/
  engine/
  features/
    today/
    reading/
    journey/
    calendar/
    settings/
  models/
  shared/
    components/
    icons/
    styles/
    utils/
```

### Minimal Dependencies

Dependencies should only be added when they provide clear value that cannot be achieved cleanly with the browser platform or a small internal implementation.

Custom application icons should use local SVG assets or React SVG components.

## Application Layers

### App Layer

Responsibilities:

* application startup
* global theme
* navigation state
* settings initialization
* shared layout

### Data Layer

Contains authored static content:

* Scripture text
* prayers
* reading plans
* book metadata
* discourse units

The data layer should not contain presentation logic.

### Model Layer

Defines stable TypeScript contracts for:

* books
* passages
* discourse units
* reading assignments
* daily offices
* journeys
* completion records
* settings

### Reading Engine

Responsibilities:

* determine the active day
* resolve today’s assignments
* advance through authored plans
* determine journey completion
* expose the next reading position

The engine should remain deterministic and testable.

### Progress Engine

Responsibilities:

* record completed reading units
* record completed daily offices
* restore the current journey
* calculate book and journey position
* provide calendar completion data

### Presentation Features

Each feature owns its screen-specific components and styles.

Initial features:

* Today
* Reading
* Journey
* Calendar
* Settings

### Shared Layer

Contains only genuinely reusable elements:

* app shell
* typography primitives
* divider
* abstract scroll icon
* navigation icons
* theme tokens
* persistence helpers

## Navigation Model

The app launches directly into Today.

Primary destinations:

1. Σήμερον
2. Ὁδός
3. Ἡμερολόγιον
4. Ρυθμίσεις

Navigation must remain shallow.

The reading screen may temporarily replace the primary view while a passage is open.

## Scripture Source

Scripture text must be bundled locally from a source whose licensing permits inclusion and redistribution.

The application must not scrape or fetch live text from external Bible websites.

The exact source and license must be documented before Scripture content is committed.

## Persistence Model

Version 1 persistence should include:

* selected appearance
* English assistance state
* current journeys
* completed assignments
* completed daily offices
* calendar completion dates

Persistence should be versioned so future schema changes can be migrated deliberately.

## PWA Model

The PWA must cache:

* application shell
* JavaScript and CSS
* local fonts
* icons
* reading-plan data
* prayers
* bundled Scripture content

Updates should be controlled and tested to prevent a new service worker from disrupting an existing offline installation.

## Error Philosophy

The application should fail quietly and recoverably.

A persistence error must not prevent Scripture from opening.

Static reading content should remain usable even if progress restoration fails.

## Testing Priorities

Tests should focus on:

* plan resolution
* day advancement
* discourse-unit boundaries
* completion persistence
* journey restoration
* date behavior
* offline production build

Visual implementation should be verified on an actual iPhone-sized viewport throughout development.

## Development Milestones

### Milestone 0 — The Empty Office

Static visual shell:

* Today screen
* light mode
* dark mode
* typography
* bottom navigation
* icons
* spacing
* static reading entries

No functioning reading engine or persistence.

### Milestone 1 — The Reading Chair

* reading screen
* locally bundled sample text
* passage navigation
* completion action

### Milestone 2 — The Daily Office

* authored sample plan
* daily assignment resolution
* prayer sequence
* local completion state

### Milestone 3 — The Journey

* journey progress
* book completion
* current-position restoration

### Milestone 4 — The Quiet Calendar

* completion calendar
* history
* settings
* complete offline PWA verification
