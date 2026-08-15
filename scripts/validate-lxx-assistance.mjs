import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const root=path.join(repo,'src/data/scripture/generated/lxx-assistance')
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
if(manifest.schemaVersion!==1||manifest.pilot!==true)throw new Error('Invalid LXX assistance manifest')
if(JSON.stringify(manifest.books.map((b)=>b.id))!==JSON.stringify(['genesis','psalms','isaiah']))throw new Error('Pilot scope changed')
for(const entry of manifest.books){for(const file of entry.files){const text=fs.readFileSync(path.join(root,file.filename),'utf8');const sum=crypto.createHash('sha256').update(text).digest('hex');if(sum!==file.sha256)throw new Error(`${entry.id}: checksum mismatch`);const book=JSON.parse(text);if(book.bookId!==entry.id||book.schemaVersion!==1)throw new Error(`${entry.id}: invalid header`);for(const tokens of Object.values(book.lexicalVerses)){const seen=new Set();for(const token of tokens){if(seen.has(token[0]))throw new Error(`${entry.id}: ambiguous lexical alignment`);seen.add(token[0]);if(!book.lemmaTable[token[1]]||!book.morphologyTable[token[2]])throw new Error(`${entry.id}: invalid lexical table reference`)}}for(const clauses of Object.values(book.syntaxVerses))for(const [,groups]of clauses)for(const [role,start,end]of groups)if(!manifest.roles[role]||start<0||end<start)throw new Error(`${entry.id}: invalid syntax group`)}}
process.stdout.write('Validated deterministic three-book LXX assistance pilot.\n')
