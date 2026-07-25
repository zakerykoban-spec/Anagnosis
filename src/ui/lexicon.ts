export interface UiTerm {
  greek: string
  english: string
}

export const UI = {
  read: {
    greek: 'Ἀνάγνωθι',
    english: 'Read',
  },
  back: {
    greek: 'Ὀπίσω',
    english: 'Back',
  },
  next: {
    greek: 'Ἐφεξῆς',
    english: 'Next',
  },
  todaysReading: {
    greek: 'Ἡμερινὴ Ἀνάγνωσις',
    english: "Today's Reading",
  },
  options: {
    greek: 'Ἐπιλογαί',
    english: 'Options',
  },
  englishAids: {
    greek: 'Ἀγγλικὰ βοηθήματα',
    english: 'English aids',
  },
  darkMode: {
    greek: 'Σκοτεινὴ ὄψις',
    english: 'Dark mode',
  },
  progressiveReading: {
    greek: 'Πρόοδος',
    english: 'Progressive reading',
  },
  challengeReading: {
    greek: 'Ἄσκησις',
    english: 'Challenge reading',
  },
  psalm: {
    greek: 'Ψαλμός',
    english: 'Psalm',
  },
} satisfies Record<string, UiTerm>
