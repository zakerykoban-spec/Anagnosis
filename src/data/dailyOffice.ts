import actsData from './scripture/generated/sblgnt/acts.json'
import johnData from './scripture/generated/sblgnt/john.json'
import lukeData from './scripture/generated/sblgnt/luke.json'
import markData from './scripture/generated/sblgnt/mark.json'

export type ScriptureVerse = {
  id: string
  chapter: number
  number: number
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
const TEI_NAMESPACE = 'http://www.tei-c.org/ns/1.0'

const PSALMS_SOURCE_URL =
  'https://cdn.jsdelivr.net/gh/OpenGreekAndLatin/First1KGreek@4c9c843d80ee94b4371f52add5f7d68bbfe7ba4c/data/tlg0527/tlg027/tlg0527.tlg027.1st1K-grc1.xml'

let psalmsDocumentPromise: Promise<Document> | null = null

const progressiveBooks = [
  { data: markData as ScriptureBookData, english: 'Mark', days: 3 },
  { data: johnData as ScriptureBookData, english: 'John', days: 4 },
  { data: actsData as ScriptureBookData, english: 'Acts', days: 7 },
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
  const challengeIndex = dayNumber % challengeRanges.length

  return {
    dayNumber,
    psalmNumber: (dayNumber % PSALM_COUNT) + 1,
    openingPrayer: {
      id: 'prayer:opening',
      kind: 'prayer',
      sectionGreek: 'Πρὸ τῆς ἀναγνώσεως',
      sectionEnglish: 'Opening Prayer',
      titleGreek: 'Ἀποκάλυψον τοὺς ὀφθαλμούς μου',
      reference: 'Psalm 118:18',
      textGreek:
        'ἀποκάλυψον τοὺς ὀφθαλμούς μου, καὶ κατανοήσω τὰ θαυμάσια ἐκ τοῦ νόμου σου. Ἀμήν.',
      textEnglish:
        'Open my eyes, and I shall understand the wondrous things of your law. Amen.',
    },
    progressiveReading: progressiveReadingFor(dayNumber),
    challengeReading: selectedPassage(
      lukeData as ScriptureBookData,
      'Luke',
      challengeRanges[challengeIndex],
      challengeIndex,
    ),
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

function textFromVerseElement(verseElement: Element) {
  const cleanElement = verseElement.cloneNode(true) as Element

  for (const note of Array.from(
    cleanElement.getElementsByTagNameNS(TEI_NAMESPACE, 'note'),
  )) {
    note.remove()
  }

  for (const pageBreak of Array.from(
    cleanElement.getElementsByTagNameNS(TEI_NAMESPACE, 'pb'),
  )) {
    pageBreak.remove()
  }

  return (cleanElement.textContent ?? '')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/gu, '')
    .replace(/\s+/gu, ' ')
    .replace(/\s+([,.;··!?])/gu, '$1')
    .trim()
}

async function loadPsalmsDocument() {
  if (!psalmsDocumentPromise) {
    psalmsDocumentPromise = fetch(PSALMS_SOURCE_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load Psalms (${response.status}).`)
        }

        const source = await response.text()
        const document = new DOMParser().parseFromString(
          source,
          'application/xml',
        )

        if (document.getElementsByTagName('parsererror').length > 0) {
          throw new Error('Unable to parse the Psalms source.')
        }

        return document
      })
      .catch((error: unknown) => {
        psalmsDocumentPromise = null
        throw error
      })
  }

  return psalmsDocumentPromise
}

export async function loadPsalm(psalmNumber: number): Promise<ScriptureReading> {
  const document = await loadPsalmsDocument()

  const chapter = Array.from(
    document.getElementsByTagNameNS(TEI_NAMESPACE, 'div'),
  ).find(
    (element) =>
      element.getAttribute('subtype') === 'chapter' &&
      element.getAttribute('n') === String(psalmNumber),
  )

  if (!chapter) {
    throw new Error(`Psalm ${psalmNumber} is missing from the source.`)
  }

  const verseElements = Array.from(chapter.children).filter(
    (element) =>
      element.localName === 'div' &&
      element.getAttribute('subtype') === 'verse',
  )

  const verses = verseElements.map((element, index) => {
    const verseNumber = Number.parseInt(
      element.getAttribute('n') ?? String(index + 1),
      10,
    )
    const text = textFromVerseElement(element)

    return {
      id: `psalms.${psalmNumber}.${verseNumber}`,
      chapter: psalmNumber,
      number: verseNumber,
      sourceText: text,
      displayText: text,
    }
  })

  if (verses.length === 0) {
    throw new Error(`Psalm ${psalmNumber} contains no verses.`)
  }

  return {
    id: `psalm:${psalmNumber}`,
    kind: 'scripture',
    sectionGreek: 'Ψαλμός',
    sectionEnglish: 'Psalm',
    titleGreek: `Ψαλμὸς ${psalmNumber}`,
    reference: `Psalm ${psalmNumber}`,
    verses,
  }
}
