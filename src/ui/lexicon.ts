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
  readHistory: {
    greek: 'Ἀνεγνωσμένα',
    english: 'Read',
  },
  englishAids: {
    greek: 'Ἀγγλικὰ βοηθήματα',
    english: 'English aids',
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
