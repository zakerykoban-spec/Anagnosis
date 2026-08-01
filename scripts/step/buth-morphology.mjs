const PARTS_OF_SPEECH = {
  Adjective: 'τὸ ἐπίθετον',
  Adverb: 'τὸ ἐπίρρημα',
  'Adverb or adverb and particle combined': 'τὸ ἐπίρρημα',
  Article: 'τὸ ἄρθρον',
  Conditional: 'ὁ ὑποθετικὸς σύνδεσμος',
  Conjunction: 'ὁ σύνδεσμος',
  Correlative: 'ἡ ἀντωνυμία',
  'Correlative or Interrogative pronoun': 'ἡ ἀντωνυμία',
  'Correlative pronoun': 'ἡ ἀντωνυμία',
  'Definite article': 'τὸ ἄρθρον',
  'Demonstrative pronoun': 'ἡ ἀντωνυμία',
  'Demonstrative Pronoun': 'ἡ ἀντωνυμία',
  'DemonstrativePronoun': 'ἡ ἀντωνυμία',
  'Indefinite Pronoun': 'ἡ ἀντωνυμία',
  'Indefinite pronoun': 'ἡ ἀντωνυμία',
  Interjection: 'τὸ ἐπιφώνημα',
  'Interrogative Particle': 'τὸ μόριον',
  'Interrogative pronoun': 'ἡ ἀντωνυμία',
  'Interogative Pronoun': 'ἡ ἀντωνυμία',
  'Interrogative Pronoun': 'ἡ ἀντωνυμία',
  Noun: 'τὸ ὄνομα',
  'Negative Particle': 'τὸ μόριον',
  Particle: 'τὸ μόριον',
  'Particle or Disjunctive': 'τὸ μόριον',
  Preposition: 'ἡ πρόθεσις',
  'Personal Pronoun': 'ἡ ἀντωνυμία',
  'Personal pronoun': 'ἡ ἀντωνυμία',
  'Possessive Pronoun': 'ἡ ἀντωνυμία',
  'Possessive pronoun': 'ἡ ἀντωνυμία',
  Pronoun: 'ἡ ἀντωνυμία',
  'Reciprocal Pronoun': 'ἡ ἀντωνυμία',
  'Reciprocal pronoun': 'ἡ ἀντωνυμία',
  'Reflexive Pronoun': 'ἡ ἀντωνυμία',
  'Reflexive pronoun': 'ἡ ἀντωνυμία',
  'Relative Pronoun': 'ἡ ἀντωνυμία',
  'Relative pronoun': 'ἡ ἀντωνυμία',
  Verb: 'τὸ ῥῆμα',
}

const CASES = {
  Nominative: ['ορ', 'ὀρθὴ πτῶσις'],
  Genitive: ['γε', 'γενικὴ πτῶσις'],
  Dative: ['δο', 'δοτικὴ πτῶσις'],
  Accusative: ['αι', 'αἰτιατικὴ πτῶσις'],
  Vocative: ['κλ', 'κλητικὴ πτῶσις'],
}

const NUMBERS = {
  Singular: ['ε', 'ἑνικὸς ἀριθμός'],
  Plural: ['π', 'πληθυντικὸς ἀριθμός'],
}

const GENDERS = {
  Masculine: ['α', 'ἀρσενικὸν γένος'],
  Feminine: ['θ', 'θηλυκὸν γένος'],
  Neuter: ['ο', 'οὐδέτερον γένος'],
  Common: ['', 'κοινὸν γένος'],
}

const VOICES = {
  Active: ['ενερ', 'ἐνεργητικὴ διάθεσις'],
  Middle: ['μεση', 'μέση διάθεσις'],
  'Middle Deponent': ['μεση', 'μέση διάθεσις'],
  Passive: ['παθη', 'παθητικὴ διάθεσις'],
  'Passive Deponent': ['παθη', 'παθητικὴ διάθεσις'],
  'Middle or Passive': ['μεση/παθη', 'μέση ἢ παθητικὴ διάθεσις'],
  'Middle or Passive Deponent': ['μεση/παθη', 'μέση ἢ παθητικὴ διάθεσις'],
}

const MOODS = {
  Indicative: ['ορστ', 'ὀριστικὴ ἔγκλισις'],
  Subjunctive: ['υποτ', 'ὑποτακτικὴ ἔγκλισις'],
  Optative: ['ευκτ', 'εὐκτικὴ ἔγκλισις'],
  Imperative: ['πρστ', 'προστακτικὴ ἔγκλισις'],
}

const FORMS = {
  Infinitive: ['απρμ', 'ἀπαρέμφατος ἔγκλισις'],
  Participle: ['μετχ', 'μετοχὴ ἔγκλισις'],
}

const INDICATIVE_TENSES = {
  Present: ['ενστ', 'ἐνεστὼς χρόνος'],
  Future: ['μελλ', 'μέλλων χρόνος'],
  Imperfect: ['πρττ', 'παρατατικὸς χρόνος'],
  Aorist: ['αορσ', 'ἀόριστος χρόνος'],
  Perfect: ['πρκμ', 'παρακείμενος χρόνος'],
  Pluperfect: ['υπρσ', 'ὑπερσυντέλικος χρόνος'],
}

const ASPECTS = {
  Present: ['πρτ', 'παρατατικὴ ὄψις'],
  Imperfect: ['πρτ', 'παρατατικὴ ὄψις'],
  Aorist: ['αορ', 'ἀόριστος ὄψις'],
  Perfect: ['πρκ', 'παρακειμένη ὄψις'],
  Pluperfect: ['πρκ', 'παρακειμένη ὄψις'],
  Future: ['μελλ', 'μέλλουσα ὄψις'],
}

const DEGREE = {
  Comparative: ['συγκρ', 'συγκριτικὸς βαθμός'],
  Superlative: ['ὑπερθ', 'ὑπερθετικὸς βαθμός'],
}

function parseDescription(value) {
  return Object.fromEntries(value.split(';').map((part) => {
    const equals = part.indexOf('=')
    return equals < 0
      ? [part.trim(), '']
      : [part.slice(0, equals).trim(), part.slice(equals + 1).trim()]
  }).filter(([key]) => key))
}

export function parseTegmc(text) {
  const descriptions = new Map()
  for (const line of text.replace(/^\uFEFF/u, '').split(/\r?\n/u)) {
    const fields = line.split('\t')
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/u.test(fields[0] ?? '')) continue
    if (!(fields[1] ?? '').startsWith('Function=')) continue
    descriptions.set(fields[0], parseDescription(fields[1]))
  }
  return descriptions
}

function baseCode(component) {
  const equals = component.indexOf('=')
  return (equals < 0 ? component : component.slice(equals + 1)).trim()
}

function addPair(compact, expanded, pair) {
  if (!pair) return
  if (pair[0]) compact.push(pair[0])
  if (pair[1]) expanded.push(pair[1])
}

function renderComponent(code, description) {
  const partOfSpeech = PARTS_OF_SPEECH[description.Function]
  if (!partOfSpeech) {
    throw new Error(`${code}: unsupported STEP function ${description.Function}`)
  }

  const personCompact = []
  const personExpanded = []
  const verbalCompact = []
  const verbalExpanded = []
  const nominalCompact = []
  const nominalExpanded = []
  const degreeCompact = []
  const degreeExpanded = []
  const mood = description.Mood
  const form = description.Form

  if (description.Person) {
    const possessive = code.match(/^S-([123])([SP])/u)
    const person = possessive?.[1] ?? description.Person.match(/^[123]/u)?.[0]
    const personNumber = possessive?.[2] === 'P' ? 'Plural' : possessive ? 'Singular' : description.Number
    const number = NUMBERS[personNumber]?.[0]
    if (!person || !number) {
      throw new Error(`${code}: unsupported person/number`)
    }
    personCompact.push(`${person}${number}`)
    personExpanded.push(`${person} · ${NUMBERS[personNumber][1]}`)
  }

  if (description.Tense) {
    const tense = description.Tense.replace(/^2nd /u, '')
    const pair = mood === 'Indicative'
      ? INDICATIVE_TENSES[tense]
      : ASPECTS[tense]
    if (!pair) throw new Error(`${code}: unsupported STEP tense ${description.Tense}`)
    addPair(verbalCompact, verbalExpanded, pair)
  }

  if (description.Voice) {
    const pair = VOICES[description.Voice]
    if (!pair) throw new Error(`${code}: unsupported STEP voice ${description.Voice}`)
    addPair(verbalCompact, verbalExpanded, pair)
  }

  addPair(verbalCompact, verbalExpanded, MOODS[mood])
  addPair(verbalCompact, verbalExpanded, FORMS[form])
  addPair(nominalCompact, nominalExpanded, CASES[description.Case])
  addPair(nominalCompact, nominalExpanded, GENDERS[description.Gender])

  if (!description.Person || code.startsWith('S-')) {
    addPair(nominalCompact, nominalExpanded, NUMBERS[description.Number])
  }
  addPair(degreeCompact, degreeExpanded, DEGREE[description.Extra])

  const isParticiple = form === 'Participle'
  const compactGroups = isParticiple
    ? [nominalCompact, verbalCompact, degreeCompact]
    : [personCompact, verbalCompact, nominalCompact, degreeCompact]
  const expandedGroups = isParticiple
    ? [nominalExpanded, verbalExpanded, degreeExpanded]
    : [personExpanded, verbalExpanded, nominalExpanded, degreeExpanded]

  return {
    partOfSpeech,
    compact: compactGroups.filter((group) => group.length).map(
      (group) => group.join(' '),
    ).join(', '),
    expanded: expandedGroups.flat().join(' · '),
  }
}

export function renderButhMorphology(raw, descriptions) {
  const rendered = raw.split(/\s+\+\s+/u).map((component) => {
    const code = baseCode(component)
    const description = descriptions.get(code)
    if (!description) throw new Error(`${raw}: morphology code ${code} is absent from TEGMC`)
    return renderComponent(code, description)
  })

  return {
    partOfSpeech: [...new Set(rendered.map((item) => item.partOfSpeech))].join(' + '),
    compact: rendered.map((item) => item.compact).filter(Boolean).join(' + '),
    expanded: rendered.map((item) => item.expanded).filter(Boolean).join(' + '),
  }
}
