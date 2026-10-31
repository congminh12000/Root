// Checks docs/06-qa/rule-coverage.yaml and prints coverage by status.
// Usage: npm run audit:rules              (structure checks + summary)
//        npm run audit:rules -- --release (also fail unless every in-scope, non-group rule is verified)
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

const STATUSES = ['needs_source_verification', 'source_located', 'specified', 'implemented', 'verified', 'out_of_scope'] as const
const LIFECYCLE = STATUSES.slice(0, 5)
type Status = (typeof STATUSES)[number]
interface Rule {
  rule_id: string; title: string; section: string; page: number; group?: boolean; status: Status
  spec?: string; implementation: string[]; tests: string[]
  review: { rules_verified: boolean; implementation_verified: boolean }
}

const root = resolve(import.meta.dirname, '../..')
const matrix = parse(readFileSync(resolve(root, 'docs/06-qa/rule-coverage.yaml'), 'utf8')) as { rules: Rule[] }
const errors: string[] = []
const seen = new Set<string>()
const atLeast = (s: Status, min: Status) => s === 'out_of_scope' ? min === 'specified' : LIFECYCLE.indexOf(s) >= LIFECYCLE.indexOf(min)

for (const r of matrix.rules) {
  const at = `${r.rule_id}:`
  if (seen.has(r.rule_id)) errors.push(`${at} duplicate rule_id`)
  seen.add(r.rule_id)
  if (r.rule_id !== `ROOT-${r.section}`) errors.push(`${at} rule_id must be ROOT-<section>`)
  if (!STATUSES.includes(r.status)) { errors.push(`${at} unknown status ${r.status}`); continue }
  if (atLeast(r.status, 'specified') && !r.spec) errors.push(`${at} ${r.status} needs a spec link`)
  if (atLeast(r.status, 'implemented') && !r.group && (!r.implementation.length || !r.tests.length))
    errors.push(`${at} implemented needs implementation and tests`)
  if (r.status === 'verified' && !(r.review.rules_verified && r.review.implementation_verified))
    errors.push(`${at} verified needs both review flags`)
  for (const f of [...r.implementation, ...r.tests, ...(r.spec ? [r.spec.split('#')[0]!] : [])])
    if (!existsSync(resolve(root, f))) errors.push(`${at} missing file ${f}`)
  if (r.spec && existsSync(resolve(root, r.spec)) && !readFileSync(resolve(root, r.spec), 'utf8').includes(`${r.rule_id} `))
    errors.push(`${at} spec ${r.spec} does not mention ${r.rule_id}`)
}

const leaves = matrix.rules.filter(r => !r.group)
for (const s of STATUSES) console.log(`${s.padEnd(26)} ${leaves.filter(r => r.status === s).length}`)
console.log(`${'total rules'.padEnd(26)} ${leaves.length} (+${matrix.rules.length - leaves.length} groups)`)

if (process.argv.includes('--release')) {
  const open = leaves.filter(r => r.status !== 'verified' && r.status !== 'out_of_scope')
  if (open.length) errors.push(`release blocked: ${open.length} rules not verified (first: ${open[0]!.rule_id})`)
}
for (const e of errors) console.error(e)
process.exit(errors.length ? 1 : 0)
