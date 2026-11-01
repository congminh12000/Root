// Makes sure work that touches the rules is checked against the current Leder Rules Library (decisions/0005).
// When the change touches rules paths (or with --force), it refreshes the local p16 snapshot at most every 12 hours
// (always with --refresh) and fails if the snapshot is missing or differs from the sha256 in source-manifest.yaml,
// which means Leder changed the rules. The old snapshot is kept beside it as *.prev.json for diffing.
// Runs from scripts/ship.sh and the pre-commit hook (.githooks). Offline, a snapshot matching the manifest passes
// with a warning.
// Usage: npm run rules:guard [-- --force] [-- --refresh]
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Paths whose changes are rules work: engine and data code, rule and data specs, coverage and rulings. */
const RULES_PATHS = [
  'packages/game-engine/src/', 'packages/game-data/src/', 'docs/02-rules-spec/', 'docs/03-data-spec/',
  'docs/06-qa/rule-coverage.yaml', 'docs/00-governance/decisions/', 'docs/00-governance/rule-precedence.md',
]
const MAX_AGE_MS = 12 * 3600 * 1000

const root = resolve(import.meta.dirname, '../..')
const snapshot = resolve(root, 'docs/01-official-sources/base/rules-library-root-p16.json')
const stamp = resolve(root, 'docs/01-official-sources/base/rules-library-root-p16.checked.json') // gitignored
const args = process.argv.slice(2)

const git = (...a: string[]) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
const changed = [...new Set([...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')])]
const touched = changed.filter(f => RULES_PATHS.some(p => f.startsWith(p)))

if (!touched.length && !args.includes('--force') && !args.includes('--refresh')) {
  console.log('rules:guard: no rules files changed')
  process.exit(0)
}

const manifest = readFileSync(resolve(root, 'docs/00-governance/source-manifest.yaml'), 'utf8')
const entry = manifest.slice(manifest.indexOf('file: docs/01-official-sources/base/rules-library-root-p16.json'))
const expected = /sha256: (\w+)/.exec(entry)?.[1]
if (!expected) throw new Error('rules:guard: no sha256 for the p16 snapshot in source-manifest.yaml')
const sha = () => createHash('sha256').update(readFileSync(snapshot)).digest('hex')
const fail = (msg: string) => { console.error(`rules:guard: ${msg}`); process.exit(1) }

if (touched.length) console.log(`rules:guard: rules files changed (${touched.slice(0, 5).join(', ')}${touched.length > 5 ? ', …' : ''})`)
const lastChecked = existsSync(stamp) ? statSync(stamp).mtimeMs : 0
if (args.includes('--refresh') || !existsSync(snapshot) || Date.now() - lastChecked > MAX_AGE_MS) {
  if (existsSync(snapshot)) copyFileSync(snapshot, snapshot.replace(/\.json$/, '.prev.json'))
  try {
    execFileSync(process.execPath, [resolve(root, 'scripts/snapshot-rules/index.ts')], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] })
    writeFileSync(stamp, JSON.stringify({ checked: new Date().toISOString() }))
    console.log('rules:guard: refreshed the Rules Library p16 snapshot')
  } catch (e) {
    // The snapshot script's own error (offline, or dependencies not installed) says why.
    const why = String((e as { stderr?: Buffer }).stderr ?? e).trim().split('\n').find(l => /Error/.test(l)) ?? String(e).split('\n')[0]
    if (!existsSync(snapshot)) fail(`no Rules Library snapshot and it could not be fetched (${why}); run \`npm install\` and \`npm run snapshot:rules\` online`)
    console.warn(`rules:guard: could not refresh the snapshot (${why}); checking the local copy`)
  }
}

if (sha() !== expected) {
  fail(`the Rules Library p16 snapshot (sha256 ${sha()}) differs from source-manifest.yaml (${expected}).
  Leder changed the rules. Diff it against rules-library-root-p16.prev.json, update the rule specs, engine, tests
  and rule-coverage.yaml, then the manifest sha256 and retrieved date. Ask the project manager before changing rulings.`)
}
console.log('rules:guard: snapshot matches the manifest; read the clauses you change in docs/01-official-sources/base/rules-library-root-p16.json')
