// Downloads every source in the manifest that has a url and a file, then checks its SHA-256.
// Usage: npm run fetch:sources            (download missing files, verify all)
//        npm run fetch:sources -- --check (verify only, download nothing)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parse } from 'yaml'

/** `regenerate` names the command that rebuilds a file which cannot be downloaded as is (the Rules Library snapshot). */
interface Source { id: string; url?: string; file?: string; sha256?: string; regenerate?: string }

const root = resolve(import.meta.dirname, '../..')
const manifest = parse(readFileSync(resolve(root, 'docs/00-governance/source-manifest.yaml'), 'utf8')) as { sources: Source[] }
const checkOnly = process.argv.includes('--check')
let failed = 0

for (const src of manifest.sources) {
  if (!src.file || !src.sha256) continue
  const path = resolve(root, src.file)
  if (!existsSync(path)) {
    if (checkOnly || !src.url || src.regenerate) {
      console.log(`MISSING  ${src.id} ${src.file}${src.regenerate ? ` (run ${src.regenerate})` : ''}`); failed++; continue
    }
    const res = await fetch(src.url)
    if (!res.ok) { console.log(`FAILED   ${src.id} HTTP ${res.status}`); failed++; continue }
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  const sum = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (sum === src.sha256) console.log(`OK       ${src.id} ${src.file}`)
  else { console.log(`MISMATCH ${src.id} got ${sum}; the publisher may have replaced the file, review before updating the manifest`); failed++ }
}
process.exit(failed ? 1 : 0)
