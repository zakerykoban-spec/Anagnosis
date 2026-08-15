import { lxxAssistanceApplies } from '../lxxAssistanceCatalog.ts'

export type SyntaxRoleCode =
  | 's'
  | 'v'
  | 'o'
  | 'o2'
  | 'io'
  | 'p'
  | 'adv'
  | 'vc'
  | 'aux'
  | 'oc'

export type CompactSyntaxGroup = [
  roleIndex: number,
  startTokenIndex: number,
  endTokenIndex: number,
]

export type CompactSyntaxClause = [
  flags: number,
  groups: CompactSyntaxGroup[],
]

export interface NtSyntaxBook {
  schemaVersion: 1
  bookId: string
  source: {
    maculaCommit: string
    license: 'CC BY 4.0'
    alignmentStrategyVersion: number
  }
  counts: {
    displayTokens: number
    alignedTokens: number
    reviewedSurfaceExceptions: number
    versesWithSyntax: number
    clauses: number
    groups: number
    discardedUnsupportedRoles: number
  }
  verses: Record<string, CompactSyntaxClause[]>
}

export interface LxxSyntaxBook {
  schemaVersion: 1
  bookId: string
  syntaxVerses: Record<string, CompactSyntaxClause[]>
}

export interface SyntaxRoleLabel {
  greek: string
  english: string
}

export interface SyntaxGroupInsight extends SyntaxRoleLabel {
  role: SyntaxRoleCode
  startTokenIndex: number
  endTokenIndex: number
  text: string
}

export interface SyntaxClauseInsight {
  flags: number
  groups: SyntaxGroupInsight[]
  observations: Array<{ greek: string; english: string }>
}

export const SYNTAX_ROLES: readonly SyntaxRoleCode[] = [
  's',
  'v',
  'o',
  'o2',
  'io',
  'p',
  'adv',
  'vc',
  'aux',
  'oc',
]

const ROLE_LABELS: Record<SyntaxRoleCode, SyntaxRoleLabel> = {
  s: { greek: 'Ὑποκείμενον', english: 'Subject' },
  v: { greek: 'Ῥῆμα', english: 'Verb' },
  o: { greek: 'Ἀντικείμενον', english: 'Object' },
  o2: { greek: 'Δεύτερον ἀντικείμενον', english: 'Second object' },
  io: { greek: 'Ἔμμεσον ἀντικείμενον', english: 'Indirect object' },
  p: { greek: 'Κατηγορούμενον', english: 'Predicate' },
  adv: { greek: 'Ἐπιρρηματικὸς ὅρος', english: 'Adverbial' },
  vc: { greek: 'Συμπλήρωμα ῥήματος', english: 'Verbal complement' },
  aux: { greek: 'Βοηθητικὸν ῥῆμα', english: 'Auxiliary' },
  oc: { greek: 'Κατηγορούμενον ἀντικειμένου', english: 'Object complement' },
}

export function syntaxAssistanceApplies(
  corpus: 'sblgnt' | 'lxx',
  context: 'progressive' | 'challenge' | 'free-reading' | 'psalm' | 'prayer' | null,
  bookId?: string | null,
) {
  if (corpus === 'lxx') return lxxAssistanceApplies(context, bookId)
  return (
      context === 'progressive'
      || context === 'challenge'
      || context === 'free-reading'
    )
}

export function syntaxRoleLabel(role: SyntaxRoleCode) {
  return ROLE_LABELS[role]
}

export function syntaxInsightForVerse(
  book: NtSyntaxBook | LxxSyntaxBook | null,
  verseId: string,
  surfaces: string[],
): SyntaxClauseInsight[] {
  if (!book) return []

  const verses = 'syntaxVerses' in book ? book.syntaxVerses : book.verses
  return (verses[verseId] ?? []).map(([flags, compactGroups]) => {
    const groups = compactGroups.flatMap(([roleIndex, startTokenIndex, endTokenIndex]) => {
      const role = SYNTAX_ROLES[roleIndex]
      const label = role ? ROLE_LABELS[role] : null
      const text = surfaces.slice(startTokenIndex, endTokenIndex + 1).join(' ')
      return role && label && text
        ? [{
            role,
            ...label,
            startTokenIndex,
            endTokenIndex,
            text,
          }]
        : []
    })
    const observations = []
    if ((flags & 1) === 1) {
      observations.push({ greek: 'Ἄνευ ῥήματος', english: 'Verbless predication' })
    }
    if ((flags & 2) === 2) {
      observations.push({ greek: 'Ἐλλειπτικὴ κατηγόρησις', english: 'Elided predication' })
    }
    if ((flags & 4) === 4) {
      observations.push({ greek: 'Σύνταξις περιόδου', english: 'Sentence-level grouping' })
    }
    return { flags, groups, observations }
  }).filter((clause) => clause.groups.length > 0)
}
