import {
  SYNTAX_CLAUSE_LABEL,
  SYNTAX_OBSERVATION_LABELS,
  SYNTAX_ROLES,
  syntaxRoleLabel,
} from './models/syntax.ts'

export const INSIGHT_HELP_TERMS = [
  SYNTAX_CLAUSE_LABEL,
  ...SYNTAX_ROLES.map(syntaxRoleLabel),
]

export const INSIGHT_HELP_OBSERVATIONS = SYNTAX_OBSERVATION_LABELS.map(
  ({ greek, english }) => ({ greek, english }),
)

export const UNSUPPORTED_LXX_HELP_GROUPS = [
  {
    ids: ['exodus', 'leviticus', 'numbers', 'deuteronomy'],
    label: 'Exodus, Leviticus, Numbers, and Deuteronomy',
  },
  {
    ids: [
      'joshua',
      'judges',
      'ruth',
      '1-kingdoms',
      '2-kingdoms',
      '3-kingdoms',
      '4-kingdoms',
    ],
    label: 'Joshua, Judges, Ruth, and 1–4 Kingdoms',
  },
  { ids: ['judith'], label: 'Judith' },
  {
    ids: ['odes', 'job', 'wisdom', 'sirach'],
    label: 'Odes, Job, Wisdom, and Sirach',
  },
  { ids: ['hosea', 'lamentations'], label: 'Hosea and Lamentations' },
  {
    ids: ['susanna-old-greek', 'susanna-theodotion'],
    label: 'Susanna Old Greek and Susanna Theodotion',
  },
  {
    ids: ['bel-and-the-dragon-theodotion'],
    label: 'Bel and the Dragon Theodotion',
  },
] as const
