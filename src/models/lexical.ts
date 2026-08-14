export type LexicalLemma = [
  lemma: string,
  gloss: string,
  ntFrequency: number,
]

export type LexicalMorphology = [
  rawCode: string,
  partOfSpeechGreek: string,
  compactGreek: string,
  expandedGreek: string,
]

export type LexicalToken = [
  displayTokenIndex: number,
  lemmaIndex: number,
  morphologyIndex: number,
  tagntPosition: number,
  flags: number,
]

export interface NtLexicalBook {
  schemaVersion: 1
  bookId: string
  source: {
    stepCommit: string
    license: 'CC BY 4.0'
    matchingStrategyVersion: number
    rareLemmaThreshold: number
  }
  counts: {
    displayTokens: number
    alignedTokens: number
    rareTokens: number
    unresolvedTokens: number
  }
  lemmaTable: LexicalLemma[]
  morphologyTable: LexicalMorphology[]
  verses: Record<string, LexicalToken[]>
}

export interface LxxAssistanceBook {
  schemaVersion: 1
  bookId: string
  source: {
    ogaVersion: string
    ogaLicense: 'CC BY-SA 4.0'
    stepCommit: string
    stepLicense: 'CC BY 4.0'
  }
  lemmaTable: LexicalLemma[]
  morphologyTable: LexicalMorphology[]
  lexicalVerses: Record<string, LexicalToken[]>
  syntaxVerses: Record<string, import('./syntax').CompactSyntaxClause[]>
}

export interface LexicalWordInfo {
  key: string
  surface: string
  lemma: string
  gloss: string
  ntFrequency: number
  rawMorphology: string
  partOfSpeechGreek: string
  compactGreek: string
  expandedGreek: string
  proper: boolean
  uncommon: boolean
  sourceLabel?: string
}

export function lexicalAssistanceApplies(
  corpus: 'sblgnt' | 'lxx',
  context: 'progressive' | 'challenge' | 'free-reading' | 'psalm' | 'prayer' | null,
  bookId?: string | null,
) {
  if (corpus === 'lxx') return ['genesis', 'psalms', 'isaiah'].includes(bookId ?? '')
    && (context === 'free-reading' || context === 'psalm')
  return (
      context === 'progressive'
      || context === 'challenge'
      || context === 'free-reading'
    )
}

export function lexicalWordsForVerse(
  book: NtLexicalBook | LxxAssistanceBook | null,
  verseId: string,
  surfaces: string[],
) {
  const words = new Map<number, LexicalWordInfo>()
  if (!book) return words

  const verses = 'lexicalVerses' in book ? book.lexicalVerses : book.verses
  for (const token of verses[verseId] ?? []) {
    const [displayIndex, lemmaIndex, morphologyIndex, tagntPosition, flags] = token
    const lemma = book.lemmaTable[lemmaIndex]
    const morphology = book.morphologyTable[morphologyIndex]
    const surface = surfaces[displayIndex]
    if (!lemma || !morphology || surface === undefined) continue

    const proper = (flags & 1) === 1
    words.set(displayIndex, {
      key: `${verseId}:${displayIndex}:${tagntPosition}`,
      surface,
      lemma: lemma[0],
      gloss: lemma[1],
      ntFrequency: lemma[2],
      rawMorphology: morphology[0],
      partOfSpeechGreek: morphology[1],
      compactGreek: morphology[2],
      expandedGreek: morphology[3],
      proper,
      uncommon: 'rareLemmaThreshold' in book.source
        ? !proper && lemma[2] <= book.source.rareLemmaThreshold
        : false,
      sourceLabel: 'ogaVersion' in book.source ? 'STEP Bible · OGA' : 'STEP Bible',
    })
  }
  return words
}
