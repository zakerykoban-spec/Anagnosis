import type {
  ScriptureBookOption,
  ScriptureCorpusId,
} from './scriptureCatalog'

export type ScriptureBookGroup =
  | 'law'
  | 'history'
  | 'wisdom'
  | 'prophets'
  | 'gospels'
  | 'letters'
  | 'general'
  | 'apocalypse'

type ScriptureBookTile = {
  labelGreek: string
  group: ScriptureBookGroup
}

const SBLGNT_LABELS: Record<string, string> = {
  matthew: 'Ματθ',
  mark: 'Μάρκ',
  luke: 'Λουκ',
  john: 'Ἰω',
  acts: 'Πράξ',
  romans: 'Ῥωμ',
  '1-corinthians': 'Αʹ Κορ',
  '2-corinthians': 'Βʹ Κορ',
  galatians: 'Γαλ',
  ephesians: 'Ἐφ',
  philippians: 'Φιλπ',
  colossians: 'Κολ',
  '1-thessalonians': 'Αʹ Θεσ',
  '2-thessalonians': 'Βʹ Θεσ',
  '1-timothy': 'Αʹ Τιμ',
  '2-timothy': 'Βʹ Τιμ',
  titus: 'Τίτ',
  philemon: 'Φλήμ',
  hebrews: 'Ἑβρ',
  james: 'Ἰακ',
  '1-peter': 'Αʹ Πέτ',
  '2-peter': 'Βʹ Πέτ',
  '1-john': 'Αʹ Ἰω',
  '2-john': 'Βʹ Ἰω',
  '3-john': 'Γʹ Ἰω',
  jude: 'Ἰούδ',
  revelation: 'Ἀποκ',
}

const LXX_LABELS: Record<string, string> = {
  genesis: 'Γεν',
  exodus: 'Ἐξ',
  leviticus: 'Λευ',
  numbers: 'Ἀρ',
  deuteronomy: 'Δευτ',
  joshua: 'Ἰησ',
  judges: 'Κρ',
  ruth: 'Ῥούθ',
  '1-kingdoms': 'Αʹ Βασ',
  '2-kingdoms': 'Βʹ Βασ',
  '3-kingdoms': 'Γʹ Βασ',
  '4-kingdoms': 'Δʹ Βασ',
  '1-chronicles': 'Αʹ Παρ',
  '2-chronicles': 'Βʹ Παρ',
  '1-esdras': 'Αʹ Ἐσδ',
  '2-esdras': 'Βʹ Ἐσδ',
  esther: 'Ἐσθ',
  judith: 'Ἰουδ',
  tobit: 'Τωβ',
  '1-maccabees': 'Αʹ Μακ',
  '2-maccabees': 'Βʹ Μακ',
  '3-maccabees': 'Γʹ Μακ',
  '4-maccabees': 'Δʹ Μακ',
  psalms: 'Ψαλ',
  odes: 'Ὠδ',
  proverbs: 'Παροι',
  'song-of-songs': 'Ἄσμ',
  job: 'Ἰώβ',
  wisdom: 'Σοφ',
  sirach: 'Σειρ',
  'psalms-of-solomon': 'Ψαλ Σολ',
  hosea: 'Ὡσ',
  amos: 'Ἀμ',
  micah: 'Μιχ',
  joel: 'Ἰωήλ',
  obadiah: 'Ὀβδ',
  jonah: 'Ἰων',
  nahum: 'Να',
  habakkuk: 'Ἀμβ',
  zephaniah: 'Σοφον',
  haggai: 'Ἀγγ',
  zechariah: 'Ζαχ',
  malachi: 'Μαλ',
  isaiah: 'Ἠσ',
  jeremiah: 'Ἱερ',
  baruch: 'Βαρ',
  lamentations: 'Θρ',
  'letter-of-jeremiah': 'Ἐπ Ἱερ',
  ezekiel: 'Ἰεζ',
  'susanna-old-greek': 'Σουσ Οʹ',
  'susanna-theodotion': 'Σουσ Θʹ',
  'daniel-old-greek': 'Δαν Οʹ',
  'daniel-theodotion': 'Δαν Θʹ',
  'bel-and-the-dragon-old-greek': 'Βὴλ Οʹ',
  'bel-and-the-dragon-theodotion': 'Βὴλ Θʹ',
}

function sblgntGroup(bookId: string): ScriptureBookGroup {
  if (['matthew', 'mark', 'luke', 'john'].includes(bookId)) return 'gospels'
  if (bookId === 'acts') return 'history'
  if (bookId === 'revelation') return 'apocalypse'
  if (['hebrews', 'james', '1-peter', '2-peter', '1-john', '2-john', '3-john', 'jude'].includes(bookId)) return 'general'
  return 'letters'
}

function lxxGroup(bookId: string): ScriptureBookGroup {
  const labels = Object.keys(LXX_LABELS)
  const index = labels.indexOf(bookId)
  if (index <= 4) return 'law'
  if (index <= 22) return 'history'
  if (index <= 30) return 'wisdom'
  return 'prophets'
}

export function scriptureBookTile(
  corpus: ScriptureCorpusId,
  book: ScriptureBookOption,
): ScriptureBookTile {
  const labelGreek = corpus === 'sblgnt'
    ? SBLGNT_LABELS[book.id]
    : LXX_LABELS[book.id]

  return {
    labelGreek: labelGreek ?? book.code,
    group: corpus === 'sblgnt' ? sblgntGroup(book.id) : lxxGroup(book.id),
  }
}

export function scriptureBookAriaLabel(book: ScriptureBookOption) {
  const english = book.titleEnglish ? `, ${book.titleEnglish}` : ''
  const chapterLabel = book.chapterNumbers.length === 1 ? 'chapter' : 'chapters'
  return `${book.titleGreek}${english}, ${book.chapterNumbers.length} ${chapterLabel}`
}
