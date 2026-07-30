import actsData from './scripture/generated/sblgnt/acts.json'
import johnData from './scripture/generated/sblgnt/john.json'
import lukeData from './scripture/generated/sblgnt/luke.json'
import markData from './scripture/generated/sblgnt/mark.json'
import matthewData from './scripture/generated/sblgnt/matthew.json'
import { loadLxxChapter } from '../scriptureLibrary'
import type { ScriptureReferencePart } from '../models/scripture'

export type ScriptureVerse = {
  id: string
  chapter: ScriptureReferencePart
  number: ScriptureReferencePart
  sourceText: string
  displayText: string
}

type ScriptureBookData = {
  book: {
    id: string
    titleGreek: string
  }
  chapters: Array<{
    number: number
    verses: ScriptureVerse[]
  }>
}

type OfficeEntryBase = {
  id: string
  sectionGreek: string
  sectionEnglish: string
  titleGreek: string
  reference: string
}

export type ScriptureReading = OfficeEntryBase & {
  kind: 'scripture'
  verses: ScriptureVerse[]
}

export type PrayerReading = OfficeEntryBase & {
  kind: 'prayer'
  textGreek: string
  textEnglish: string
  weekdayGreek?: string
  weekdayEnglish?: string
  traditionalEnding?: {
    labelGreek: string
    labelEnglish: string
    textGreek: string
    textEnglish: string
  }
}

export type OfficeEntry = ScriptureReading | PrayerReading

export type DailyOffice = {
  dayNumber: number
  psalmNumber: number
  openingPrayer: PrayerReading
  progressiveReading: ScriptureReading
  challengeReading: ScriptureReading
  closingPrayer: PrayerReading
}

type PassageRange = {
  startChapter: number
  startVerse: number
  endChapter: number
  endVerse: number
}

const OFFICE_START = Date.UTC(2026, 6, 25)
const DAY_IN_MS = 24 * 60 * 60 * 1000
const PSALM_COUNT = 150
const progressiveBooks = [
  { data: markData as ScriptureBookData, english: 'Mark', days: 3 },
  { data: johnData as ScriptureBookData, english: 'John', days: 4 },
  { data: actsData as ScriptureBookData, english: 'Acts', days: 7 },
] as const

export const weekdayTabs = [
  { short: 'ΚΥΡ', greek: 'Κυριακή', english: 'Sunday' },
  { short: 'ΔΕΥ', greek: 'Δευτέρα', english: 'Monday' },
  { short: 'ΤΡΙ', greek: 'Τρίτη', english: 'Tuesday' },
  { short: 'ΤΕΤ', greek: 'Τετάρτη', english: 'Wednesday' },
  { short: 'ΠΕΜ', greek: 'Πέμπτη', english: 'Thursday' },
  { short: 'ΠΑΡ', greek: 'Παρασκευή', english: 'Friday' },
  { short: 'ΣΑΒ', greek: 'Σάββατον', english: 'Saturday' },
] as const

const challengeRanges: PassageRange[] = [
  { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 4 },
  { startChapter: 1, startVerse: 5, endChapter: 1, endVerse: 25 },
  { startChapter: 1, startVerse: 26, endChapter: 1, endVerse: 38 },
  { startChapter: 1, startVerse: 39, endChapter: 1, endVerse: 56 },
  { startChapter: 1, startVerse: 57, endChapter: 1, endVerse: 80 },
  { startChapter: 2, startVerse: 1, endChapter: 2, endVerse: 20 },
  { startChapter: 2, startVerse: 21, endChapter: 2, endVerse: 40 },
  { startChapter: 2, startVerse: 41, endChapter: 2, endVerse: 52 },
]

export function challengeAssignmentCount() {
  return challengeRanges.length
}

function localDateValue(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

function dayNumberFor(date: Date) {
  return Math.max(
    0,
    Math.floor((localDateValue(date) - OFFICE_START) / DAY_IN_MS),
  )
}

function flattenBook(book: ScriptureBookData) {
  return book.chapters.flatMap((chapter) => chapter.verses)
}

function passageText(
  book: ScriptureBookData,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
) {
  const verses = flattenBook(book)
  const startId = `${book.book.id}.${startChapter}.${startVerse}`
  const endId = `${book.book.id}.${endChapter}.${endVerse}`
  const startIndex = verses.findIndex((verse) => verse.id === startId)
  const endIndex = verses.findIndex((verse) => verse.id === endId)

  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`Invalid configured prayer passage: ${startId}–${endId}`)
  }

  return verses
    .slice(startIndex, endIndex + 1)
    .map((verse) => verse.displayText)
    .join('\n')
}

function scripturePrayer({
  weekday,
  titleGreek,
  reference,
  book,
  startChapter,
  startVerse,
  endChapter,
  endVerse,
  englishAid,
}: {
  weekday: number
  titleGreek: string
  reference: string
  book: ScriptureBookData
  startChapter: number
  startVerse: number
  endChapter: number
  endVerse: number
  englishAid: string
}): PrayerReading {
  const day = weekdayTabs[weekday]

  return {
    id: `weekday-prayer:${weekday}`,
    kind: 'prayer',
    sectionGreek: 'Προσευχὴ ἡμέρας',
    sectionEnglish: 'Prayer of the day',
    titleGreek,
    reference,
    textGreek: passageText(
      book,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
    ),
    textEnglish: englishAid,
    weekdayGreek: day.greek,
    weekdayEnglish: day.english,
  }
}

function traditionalPrayer({
  weekday,
  titleGreek,
  reference,
  textGreek,
  textEnglish,
}: {
  weekday: number
  titleGreek: string
  reference: string
  textGreek: string
  textEnglish: string
}): PrayerReading {
  const day = weekdayTabs[weekday]

  return {
    id: `weekday-prayer:${weekday}`,
    kind: 'prayer',
    sectionGreek: 'Προσευχὴ ἡμέρας',
    sectionEnglish: 'Prayer of the day',
    titleGreek,
    reference,
    textGreek,
    textEnglish,
    weekdayGreek: day.greek,
    weekdayEnglish: day.english,
  }
}

export const weeklyPrayerCycle: PrayerReading[] = [
  {
    ...scripturePrayer({
      weekday: 0,
      titleGreek: 'Πάτερ ἡμῶν',
      reference: 'Matthew 6:9–13',
      book: matthewData as ScriptureBookData,
      startChapter: 6,
      startVerse: 9,
      endChapter: 6,
      endVerse: 13,
      englishAid: "The Lord's Prayer · Matthew 6:9–13",
    }),
    traditionalEnding: {
      labelGreek: 'Παραδεδομένη δοξολογία',
      labelEnglish: 'Traditional doxology · not part of the base SBLGNT text',
      textGreek:
        'ὅτι σοῦ ἐστιν ἡ βασιλεία καὶ ἡ δύναμις καὶ ἡ δόξα εἰς τοὺς αἰῶνας. Ἀμήν.',
      textEnglish:
        'For yours is the kingdom and the power and the glory forever. Amen.',
    },
  },
  traditionalPrayer({
    weekday: 1,
    titleGreek: 'Τρισάγιον',
    reference: 'Παραδεδομένη προσευχή · λέγεται τρίς',
    textGreek:
      'Ἅγιος ὁ Θεός,\nἅγιος Ἰσχυρός,\nἅγιος Ἀθάνατος,\nἐλέησον ἡμᾶς.',
    textEnglish:
      'Holy God,\nHoly Mighty,\nHoly Immortal,\nhave mercy on us.',
  }),
  traditionalPrayer({
    weekday: 2,
    titleGreek: 'Εὐχὴ τοῦ Ἰησοῦ',
    reference: 'Παραδεδομένη προσευχή · Jesus Prayer',
    textGreek:
      'Κύριε Ἰησοῦ Χριστέ,\nΥἱὲ τοῦ Θεοῦ,\nἐλέησόν με τὸν ἁμαρτωλόν.',
    textEnglish:
      'Lord Jesus Christ,\nSon of God,\nhave mercy on me, a sinner.',
  }),
  traditionalPrayer({
    weekday: 3,
    titleGreek: 'Βασιλεῦ οὐράνιε',
    reference: 'Παραδεδομένη προσευχὴ τοῦ Ἁγίου Πνεύματος',
    textGreek:
      'Βασιλεῦ οὐράνιε, Παράκλητε,\nτὸ Πνεῦμα τῆς ἀληθείας,\nὁ πανταχοῦ παρὼν καὶ τὰ πάντα πληρῶν,\nὁ θησαυρὸς τῶν ἀγαθῶν καὶ ζωῆς χορηγός,\nἐλθὲ καὶ σκήνωσον ἐν ἡμῖν,\nκαὶ καθάρισον ἡμᾶς ἀπὸ πάσης κηλῖδος,\nκαὶ σῶσον, Ἀγαθέ, τὰς ψυχὰς ἡμῶν.',
    textEnglish:
      'O Heavenly King, Comforter,\nSpirit of truth,\nwho are everywhere present and fill all things,\nTreasury of good things and Giver of life,\ncome and dwell in us,\ncleanse us from every stain,\nand save our souls, O Good One.',
  }),
  traditionalPrayer({
    weekday: 4,
    titleGreek: 'Δόξα Πατρί',
    reference: 'Μικρὰ δοξολογία · Lesser Doxology',
    textGreek:
      'Δόξα Πατρὶ καὶ Υἱῷ καὶ Ἁγίῳ Πνεύματι,\nκαὶ νῦν καὶ ἀεὶ καὶ εἰς τοὺς αἰῶνας τῶν αἰώνων.\nἈμήν.',
    textEnglish:
      'Glory to the Father and to the Son and to the Holy Spirit,\nboth now and ever and unto ages of ages.\nAmen.',
  }),
  traditionalPrayer({
    weekday: 5,
    titleGreek: 'Εὐχὴ τοῦ Ἁγίου Ἐφραίμ',
    reference: 'Κύριε καὶ Δέσποτα τῆς ζωῆς μου',
    textGreek:
      'Κύριε καὶ Δέσποτα τῆς ζωῆς μου,\nπνεῦμα ἀργίας, περιεργίας, φιλαρχίας καὶ ἀργολογίας μή μοι δῷς.\nΠνεῦμα δὲ σωφροσύνης, ταπεινοφροσύνης, ὑπομονῆς καὶ ἀγάπης χάρισαί μοι τῷ σῷ δούλῳ.\nΝαί, Κύριε Βασιλεῦ, δώρησαί μοι τοῦ ὁρᾶν τὰ ἐμὰ πταίσματα καὶ μὴ κατακρίνειν τὸν ἀδελφόν μου·\nὅτι εὐλογητὸς εἶ εἰς τοὺς αἰῶνας τῶν αἰώνων.\nἈμήν.',
    textEnglish:
      'O Lord and Master of my life, give me not a spirit of idleness, meddling, love of power, and idle talk.\nBut grant to me, your servant, a spirit of chastity, humility, patience, and love.\nYes, Lord and King, grant me to see my own faults and not to condemn my brother;\nfor you are blessed unto ages of ages.\nAmen.',
  }),
  traditionalPrayer({
    weekday: 6,
    titleGreek: 'Φῶς ἱλαρόν',
    reference: 'Ἀρχαῖος ὕμνος ἑσπερινός · Ancient evening hymn',
    textGreek:
      'Φῶς ἱλαρὸν ἁγίας δόξης\nἀθανάτου Πατρός,\nοὐρανίου, ἁγίου, μάκαρος,\nἸησοῦ Χριστέ,\nἐλθόντες ἐπὶ τὴν ἡλίου δύσιν,\nἰδόντες φῶς ἑσπερινόν,\nὑμνοῦμεν Πατέρα, Υἱόν,\nκαὶ Ἅγιον Πνεῦμα, Θεόν.\nἌξιόν σε ἐν πᾶσι καιροῖς\nὑμνεῖσθαι φωναῖς αἰσίαις,\nΥἱὲ Θεοῦ, ζωὴν ὁ διδούς,\nδιὸ ὁ κόσμος σὲ δοξάζει.',
    textEnglish:
      'O Gladsome Light of the holy glory\nof the immortal Father,\nheavenly, holy, blessed Jesus Christ:\nhaving come to the setting of the sun\nand having seen the evening light,\nwe praise Father, Son,\nand Holy Spirit, God.\nIt is fitting at all times\nto praise you with joyful voices,\nO Son of God, Giver of life;\ntherefore the world glorifies you.',
  }),
]

function formatReference(
  bookName: string,
  firstVerse: ScriptureVerse,
  lastVerse: ScriptureVerse,
) {
  if (firstVerse.chapter === lastVerse.chapter) {
    return `${bookName} ${firstVerse.chapter}:${firstVerse.number}–${lastVerse.number}`
  }

  return `${bookName} ${firstVerse.chapter}:${firstVerse.number}–${lastVerse.chapter}:${lastVerse.number}`
}

function splitBookReading(
  book: ScriptureBookData,
  bookEnglish: string,
  partIndex: number,
  partCount: number,
): ScriptureReading {
  const verses = flattenBook(book)
  const startIndex = Math.floor((verses.length * partIndex) / partCount)
  const endIndex = Math.floor((verses.length * (partIndex + 1)) / partCount)
  const selectedVerses = verses.slice(startIndex, endIndex)
  const firstVerse = selectedVerses[0]
  const lastVerse = selectedVerses[selectedVerses.length - 1]

  return {
    id: `progressive:${book.book.id}:${partIndex + 1}-of-${partCount}`,
    kind: 'scripture',
    sectionGreek: 'Πρόοδος',
    sectionEnglish: 'Progressive Reading',
    titleGreek: book.book.titleGreek,
    reference: formatReference(bookEnglish, firstVerse, lastVerse),
    verses: selectedVerses,
  }
}

function selectedPassage(
  book: ScriptureBookData,
  bookEnglish: string,
  range: PassageRange,
  index: number,
): ScriptureReading {
  const verses = flattenBook(book)
  const startId = `${book.book.id}.${range.startChapter}.${range.startVerse}`
  const endId = `${book.book.id}.${range.endChapter}.${range.endVerse}`
  const startIndex = verses.findIndex((verse) => verse.id === startId)
  const endIndex = verses.findIndex((verse) => verse.id === endId)

  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`Invalid configured passage: ${startId}–${endId}`)
  }

  const selectedVerses = verses.slice(startIndex, endIndex + 1)

  return {
    id: `challenge:${book.book.id}:${index + 1}`,
    kind: 'scripture',
    sectionGreek: 'Ἄσκησις',
    sectionEnglish: 'Challenge Reading',
    titleGreek: book.book.titleGreek,
    reference: formatReference(
      bookEnglish,
      selectedVerses[0],
      selectedVerses[selectedVerses.length - 1],
    ),
    verses: selectedVerses,
  }
}

export function resolveChallengeReading(
  assignmentIndex: number,
): ScriptureReading {
  const index =
    ((assignmentIndex % challengeRanges.length) + challengeRanges.length) %
    challengeRanges.length

  return selectedPassage(
    lukeData as ScriptureBookData,
    'Luke',
    challengeRanges[index],
    index,
  )
}

function progressiveReadingFor(dayNumber: number) {
  const cycleLength = progressiveBooks.reduce(
    (total, book) => total + book.days,
    0,
  )
  let cycleDay = dayNumber % cycleLength

  for (const book of progressiveBooks) {
    if (cycleDay < book.days) {
      return splitBookReading(
        book.data,
        book.english,
        cycleDay,
        book.days,
      )
    }

    cycleDay -= book.days
  }

  throw new Error('Unable to resolve the progressive reading.')
}

export function resolveDailyOffice(date = new Date()): DailyOffice {
  const dayNumber = dayNumberFor(date)

  return {
    dayNumber,
    psalmNumber: (dayNumber % PSALM_COUNT) + 1,
    openingPrayer: weeklyPrayerCycle[date.getDay()],
    progressiveReading: progressiveReadingFor(dayNumber),
    challengeReading: resolveChallengeReading(dayNumber),
    closingPrayer: {
      id: 'prayer:closing',
      kind: 'prayer',
      sectionGreek: 'Μετὰ τὴν ἀνάγνωσιν',
      sectionEnglish: 'Closing Prayer',
      titleGreek: 'Ἡ χάρις τοῦ κυρίου Ἰησοῦ Χριστοῦ',
      reference: '2 Corinthians 13:13',
      textGreek:
        'Ἡ χάρις τοῦ κυρίου Ἰησοῦ Χριστοῦ καὶ ἡ ἀγάπη τοῦ θεοῦ καὶ ἡ κοινωνία τοῦ ἁγίου πνεύματος μετὰ πάντων ὑμῶν. Ἀμήν.',
      textEnglish:
        'The grace of the Lord Jesus Christ, the love of God, and the fellowship of the Holy Spirit be with you all. Amen.',
    },
  }
}

export async function loadPsalm(psalmNumber: number): Promise<ScriptureReading> {
  const reading = await loadLxxChapter('psalms', psalmNumber)

  return {
    ...reading,
    id: `psalm:${psalmNumber}`,
    sectionGreek: 'Ψαλμός',
    sectionEnglish: 'Psalm',
    titleGreek: `Ψαλμὸς ${psalmNumber}`,
    reference: `Psalm ${psalmNumber}`,
  }
}
