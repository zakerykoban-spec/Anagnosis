import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { LXX_ASSISTANCE_BOOKS } from './scripture/lxx-assistance-books.mjs'

const OGA_RECORD = '14206061'
const OGA_VERSION = '0.2.0'
const OGA_ARCHIVE_MD5 = 'd4117ae52f1cc6319c6ba20af0c1cf3b'
const STEP_COMMIT = 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39'
const SCHEMA = 1
const ALIGNMENT = 1
const ROLE_CODES = ['s', 'v', 'o', 'o2', 'io', 'p', 'adv', 'vc', 'aux', 'oc']
const ROLE_MAP = new Map([['SBJ','s'],['OBJ','o'],['PNOM','p'],['ADV','adv'],['OCOMP','oc']])
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ogaDir = process.argv[2] ? path.resolve(process.argv[2]) : null
if (!ogaDir) throw new Error('Usage: node scripts/import-lxx-assistance.mjs <OGA conllu directory>')
const output = path.join(repo, 'src/data/scripture/generated/lxx-assistance')
const scripture = path.join(repo, 'src/data/scripture/generated/lxx')
const glossaryFile = path.join(repo, 'scripts/data/lxx-step-glossary.json')

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function verified(filename, expected) { const actual=sha256(fs.readFileSync(filename)); if(actual!==expected)throw new Error(`${filename}: expected ${expected}, received ${actual}`); return filename }
function normalize(value) {
  return value.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase('el')
    .replace(/ς/gu, 'σ').replace(/[ʼ’‘'᾽᾿]/gu, '').replace(/[^\p{L}]+/gu, '')
}
function mixedScript(value) { return /[A-Za-z]/u.test(value) && /\p{Script=Greek}/u.test(value) }
function conflictingMorphology(token) {
  return /^[navdplrcm]$/u.test(token.pos) && token.raw !== '_' && token.raw[0] !== token.pos
}
const REVIEWED_REJECTIONS = new Set([
  'isaiah|isaiah.1.2|υψωσα',
  '1-chronicles|1-chronicles.12.33|εκπορευομενοι',
  '1-esdras|1-esdras.5.55|εθεμελιωσαν',
  'amos|amos.5.15|ηγαπηκαμεν',
  'malachi|malachi.2.14|διεμαρτυρατο',
  'letter-of-jeremiah|letter-of-jeremiah.1.37|χηραν',
  'daniel-old-greek|daniel-old-greek.5.4|ηυλογουν',
])
function reviewedRejection(bookId, match, token) {
  return REVIEWED_REJECTIONS.has(`${bookId}|${match.verseId}|${normalize(token.surface)}`)
}
function readVerses(bookId) {
  const book = JSON.parse(fs.readFileSync(path.join(scripture, `${bookId}.json`), 'utf8'))
  return book.chapters.flatMap((chapter) => chapter.verses)
}
function canonicalTokens(verses) {
  return verses.flatMap((verse) => verse.displayText.split(/\s+/u).filter(Boolean).map((surface, index) => ({
    verseId: verse.id, index, surface, normalized: normalize(surface),
  })))
}
function parseConllu(filename) {
  const sentences = []
  for (const block of fs.readFileSync(filename, 'utf8').split(/\r?\n\s*\r?\n/u)) {
    const tokens = block.split(/\r?\n/u).filter((line) => /^\d+\t/u.test(line)).map((line) => {
      const f = line.split('\t')
      return { id:Number(f[0]), surface:f[1], lemma:f[2], pos:f[3], raw:f[4], features:f[5], head:Number(f[6]), relation:f[7] }
    }).filter((token) => token.surface !== '[0]' && normalize(token.surface))
    if (tokens.length) sentences.push(tokens)
  }
  return sentences
}
function align(canonical, sentences) {
  const source = sentences.flat()
  const pairs = new Map()
  let ci = 0
  for (let si = 0; si < source.length && ci < canonical.length; si += 1) {
    const target = normalize(source[si].surface)
    if (!target || mixedScript(source[si].surface)) continue
    if (target === canonical[ci].normalized) { pairs.set(source[si], canonical[ci]); ci += 1; continue }
    if (ci + 1 < canonical.length && target === canonical[ci].normalized + canonical[ci + 1].normalized) {
      // A source token spanning two display words is unsuitable for a word popup.
      ci += 2; continue
    }
    let found = -1
    for (let look = ci + 1; look < Math.min(canonical.length, ci + 9); look += 1) {
      if (canonical[look].normalized === target) { found = look; break }
    }
    if (found >= 0) { ci = found; pairs.set(source[si], canonical[ci]); ci += 1 }
  }
  return pairs
}
function glosses() {
  const glossary = JSON.parse(fs.readFileSync(glossaryFile, 'utf8'))
  if (glossary.schemaVersion !== 1 || glossary.source?.stepCommit !== STEP_COMMIT) {
    throw new Error('The compact STEP glossary is not pinned to the reviewed commit.')
  }
  return new Map(Object.entries(glossary.entries))
}
const POS = { n:'ὄνομα', v:'ῥῆμα', a:'ἐπίθετον', d:'ἐπίρρημα', p:'ἀντωνυμία', l:'ἄρθρον', r:'πρόθεσις', c:'σύνδεσμος', u:'σημεῖον', m:'ἀριθμός' }
const FEATURE = { Case:{n:'ὀνομαστική',g:'γενική',d:'δοτική',a:'αἰτιατική',v:'κλητική'}, Number:{s:'ἑνικός',p:'πληθυντικός',d:'δυϊκός'}, Gender:{m:'ἀρσενικόν',f:'θηλυκόν',n:'οὐδέτερον'}, Mood:{i:'ὁριστική',s:'ὑποτακτική',o:'εὐκτική',m:'προστακτική',n:'ἀπαρέμφατον',p:'μετοχή'}, Tense:{p:'ἐνεστώς',i:'παρατατικός',f:'μέλλων',a:'ἀόριστος',r:'παρακείμενος',l:'ὑπερσυντέλικος'}, Voice:{a:'ἐνεργητική',m:'μέση',p:'παθητική',e:'μέση/παθητική'}, Person:{1:'πρῶτον πρόσωπον',2:'δεύτερον πρόσωπον',3:'τρίτον πρόσωπον'} }
function morphology(token) {
  const values = token.features === '_' ? [] : token.features.split('|').flatMap((item) => {
    const [key,value] = item.split('='); return FEATURE[key]?.[value] ? [FEATURE[key][value]] : []
  })
  return [token.raw, POS[token.pos] ?? 'ἄγνωστον', values.slice(0,3).join(' · '), values.join(', ')]
}
function syntaxFor(sentences, pairs) {
  const verses = {}
  let omitted = 0
  for (const sentence of sentences) {
    const byId = new Map(sentence.map((token) => [token.id, token]))
    const children = new Map()
    for (const token of sentence) { const list=children.get(token.head)??[]; list.push(token); children.set(token.head,list) }
    const groupsByVerse = new Map()
    for (const token of sentence) {
      let role = ROLE_MAP.get(token.relation)
      if (token.relation === 'PRED') role = token.pos === 'v' ? 'v' : 'p'
      if (!role || !pairs.has(token)) continue
      const collected = []
      const visit = (node) => { const match=pairs.get(node); if(match) collected.push(match); for(const child of children.get(node.id)??[]) if(!ROLE_MAP.has(child.relation)&&child.relation!=='PRED') visit(child) }
      visit(token)
      const verseIds = new Set(collected.map((item) => item.verseId))
      const indexes = collected.map((item) => item.index).sort((a,b)=>a-b)
      const contiguous = indexes.every((value,index)=>index===0||value===indexes[index-1]+1)
      if (verseIds.size !== 1 || !contiguous) { omitted += 1; continue }
      const verseId = collected[0].verseId
      const list = groupsByVerse.get(verseId) ?? []
      list.push([ROLE_CODES.indexOf(role), indexes[0], indexes.at(-1)])
      groupsByVerse.set(verseId, list)
    }
    for (const [verseId, groups] of groupsByVerse) {
      if (groups.length < 2) continue
      const clauses = verses[verseId] ?? []
      clauses.push([0, groups.sort((a,b)=>a[1]-b[1])])
      verses[verseId] = clauses
    }
  }
  return { verses, omitted }
}

fs.mkdirSync(output, { recursive:true })
for (const filename of fs.readdirSync(output)) fs.unlinkSync(path.join(output, filename))
const dictionary = glosses()
const manifestBooks = []
for (const [bookId, approvedSource] of Object.entries(LXX_ASSISTANCE_BOOKS)) {
  const { filename: basename, sha256: sourceSha256, tier } = approvedSource
  const sourceFile = verified(path.join(ogaDir, basename), sourceSha256)
  const verses = readVerses(bookId)
  const canonical = canonicalTokens(verses)
  const sentences = parseConllu(sourceFile)
  const pairs = align(canonical, sentences)
  const lemmaTable=[]; const lemmaIndex=new Map(); const morphologyTable=[]; const morphologyIndex=new Map(); const lexicalVerses={}
  let glossed=0
  for (const sentence of sentences) for (const token of sentence) {
    const match=pairs.get(token); if(!match || mixedScript(token.lemma) || token.pos==='u' || conflictingMorphology(token) || reviewedRejection(bookId,match,token)) continue
    const lemma=token.lemma.normalize('NFC'); const gloss=dictionary.get(normalize(lemma))??''; if(gloss) glossed += 1
    const lk=`${lemma}\0${gloss}`; if(!lemmaIndex.has(lk)){lemmaIndex.set(lk,lemmaTable.length);lemmaTable.push([lemma,gloss,0])}
    const morph=morphology(token); const mk=morph.join('\0'); if(!morphologyIndex.has(mk)){morphologyIndex.set(mk,morphologyTable.length);morphologyTable.push(morph)}
    const list=lexicalVerses[match.verseId]??[]; list.push([match.index,lemmaIndex.get(lk),morphologyIndex.get(mk),token.id,0]); lexicalVerses[match.verseId]=list
  }
  const syntax=syntaxFor(sentences,pairs)
  const source={ogaVersion:OGA_VERSION,ogaRecord:OGA_RECORD,ogaArchiveMd5:OGA_ARCHIVE_MD5,ogaFile:basename,ogaFileSha256:sourceSha256,ogaLicense:'CC BY-SA 4.0',stepCommit:STEP_COMMIT,stepLicense:'CC BY 4.0',stepGlossary:'reviewed-committed-derivative',alignmentStrategyVersion:ALIGNMENT,approvalTier:tier}
  const counts={displayTokens:canonical.length,alignedTokens:pairs.size,lexicalTokens:Object.values(lexicalVerses).reduce((n,x)=>n+x.length,0),glossedTokens:glossed,versesWithSyntax:Object.keys(syntax.verses).length,discardedSyntaxGroups:syntax.omitted}
  const verseIds=Object.keys(lexicalVerses); const split=Math.ceil(verseIds.length/2); const files=[]
  for (const [part, ids] of [verseIds.slice(0,split),verseIds.slice(split)].entries()) {
    const lexicalPart=Object.fromEntries(ids.map((id)=>[id,lexicalVerses[id]])); const syntaxPart=Object.fromEntries(ids.flatMap((id)=>syntax.verses[id] ? [[id,syntax.verses[id]]] : []))
    const data={schemaVersion:SCHEMA,bookId,part:part+1,source,counts,lemmaTable,morphologyTable,lexicalVerses:lexicalPart,syntaxVerses:syntaxPart}
    const text=JSON.stringify(data); const filename=`${bookId}-${part+1}.json`; fs.writeFileSync(path.join(output,filename),text+'\n'); files.push({filename,sha256:sha256(text+'\n')})
  }
  manifestBooks.push({id:bookId,approvalTier:tier,ogaFile:basename,ogaFileSha256:sourceSha256,files,counts})
}
const manifest={schemaVersion:SCHEMA,pilot:false,scope:'reviewed-expansion',minimumExactWitnessAlignmentPercent:99,books:manifestBooks,roles:ROLE_CODES,source:{ogaVersion:OGA_VERSION,ogaRecord:OGA_RECORD,ogaArchiveMd5:OGA_ARCHIVE_MD5,ogaLicense:'CC BY-SA 4.0',stepCommit:STEP_COMMIT,stepLicense:'CC BY 4.0',stepGlossary:'reviewed-committed-derivative',alignmentStrategyVersion:ALIGNMENT}}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
process.stdout.write(`Generated reviewed LXX assistance expansion: ${JSON.stringify(manifestBooks.map((b)=>({id:b.id,...b.counts})))}\n`)
