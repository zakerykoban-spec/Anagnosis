# Unified reader navigation

This pass unifies Scripture movement across Progressive, Challenge, Psalms, and Free Reading without changing completion semantics.

## Reader behavior

- Scripture remains a continuous manuscript-style scroll rather than a sequence of verse cards.
- The reader preloads the adjacent canonical chapter so the text continues naturally beyond the current assignment or chapter boundary.
- The header follows the verse currently visible beneath the sticky reader toolbar.
- Tapping the header location opens one shared Book → Chapter → Verse navigator.
- Explicit assignment completion remains attached to the assigned endpoint; scrolling beyond it does not mark or advance the plan.
- STEP lexical assistance, verse-number selection, saved reading positions, read history, and plan-book selection remain available.

## Validation

The repository test suite, Scripture validation, STEP lexical validation, and production build must all pass before merge.
