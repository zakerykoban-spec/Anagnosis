export interface UiTerm {
  greek: string
  english: string
}

export const UI = {
  read: {
    greek: "Ἀνάγνωθι",
    english: "Read",
  },

  back: {
    greek: "Ὀπίσω",
    english: "Back",
  },

  study: {
    greek: "Μελέτα",
    english: "Study",
  },

  seek: {
    greek: "Ζήτει",
    english: "Seek",
  },

  help: {
    greek: "Βοήθει",
    english: "Help",
  },

  about: {
    greek: "Περί",
    english: "About",
  },

  remember: {
    greek: "Μνήσθητι",
    english: "Remember",
  },

  todaysReading: {
    greek: "Ἡμερινὴ Ἀνάγνωσις",
    english: "Today's Reading",
  },
} satisfies Record<string, UiTerm>