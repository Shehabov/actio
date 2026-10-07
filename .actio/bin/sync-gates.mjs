#!/usr/bin/env node
/**
 * Sync gate results from agent handoffs into run.json.
 *
 * A gate's result lives in `run.json`. Its owner records the result in its own handoff.
 * Nothing copied one into the other until the orchestrator closed the run, so mid-run every
 * gate read `pending` and the rule that a stage waits for its gates could not be enforced by
 * reading the file the rule points at. Recorded as BUG-0027. `run.mjs next` runs this first.
 *
 * Invariants this file upholds:
 *   - It only ever copies a result an owner recorded. It never decides a gate.
 *   - It refuses a result from an agent the plan does not name as that gate's owner
 *     (GATE_SELF_CERTIFIED), a gate the run does not have (UNKNOWN_GATE), a result other than
 *     pass, fail or n/a, and an n/a without a reason (R-18).
 *   - A `working` handoff is a checkpoint, not a verdict, so its gates are never copied.
 *   - When an owner records the same gate more than once (a fail, a fix, then a re-review
 *     that passes), the latest record wins, judged by the handoff's `finished` time and then
 *     by pass (stage * 1000 + round). Re-running is safe: the same handoffs give the same answer.
 *   - It rewrites only `gates[].result`, `gates[].evidence` and, for n/a, `gates[].reason`.
 *
 * Usage:  node .actio/bin/sync-gates.mjs <run-dir | run-id> [--dry-run] [--json]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRunDir } from './run.mjs'

const RESULTS = new Set(['pass', 'fail', 'n/a'])
const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node .actio/bin/sync-gates.mjs <run-dir | run-id> [--dry-run] [--json]')
  process.exit(0)
}
const dryRun = args.includes('--dry-run')
const asJson = args.includes('--json')
const runDir = resolveRunDir(positional[0]) || (positional[0] ? null : resolveRunDir('.'))
if (!runDir) {
  console.error(`No run.json for ${positional[0] || 'the active run or the current folder'}.`)
  process.exit(2)
}
const runJsonPath = join(runDir, 'run.json')
let run
try {
  run = JSON.parse(readFileSync(runJsonPath, 'utf8'))
} catch (err) {
  console.error(`run.json does not parse: ${err.message}`)
  process.exit(2)
}
const gates = Array.isArray(run.gates) ? run.gates : []
const gateByName = new Map(gates.map((g) => [g.name, g]))

/** The pass a handoff file records: 0 for handoff.json, else stage * 1000 + round. */
const passOf = (file) => {
  if (file === 'handoff.json') return 0
  const stage = Number((file.match(/stage(\d+)/) || file.match(/(\d+)/) || [0, 1])[1])
  const round = Number((file.match(/round(\d+)/) || [0, 0])[1])
  return stage * 1000 + round
}

/** Collect every gate result any agent recorded on hand-off, with the agent that recorded it. */
const claims = []
for (const entry of readdirSync(runDir)) {
  const dir = join(runDir, entry)
  if (entry === 'evidence' || !statSync(dir).isDirectory()) continue
  for (const file of readdirSync(dir)) {
    if (!/^handoff(-.+)?\.json$/.test(file)) continue
    let h
    try {
      h = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch {
      continue
    }
    if (!h || h.status === 'working') continue
    const at = Date.parse(h.finished || '') || 0
    for (const g of Array.isArray(h.gates) ? h.gates : []) if (g && g.name) claims.push({ agent: entry, file, pass: passOf(file), at, ...g })
  }
}

const applied = []
const refused = []

// Oldest first, so the owner's latest record is the one left standing.
claims.sort((a, b) => a.at - b.at || a.pass - b.pass)
const latest = new Map()

for (const c of claims) {
  const gate = gateByName.get(c.name)
  const where = `${c.agent}/${c.file}`
  if (!gate) refused.push(`${where} certified "${c.name}", which is not a gate in this run (UNKNOWN_GATE)`)
  else if (gate.owner !== c.agent) refused.push(`${where} certified "${c.name}", owned by ${gate.owner} (GATE_SELF_CERTIFIED)`)
  else if (!RESULTS.has(c.result)) refused.push(`${where} recorded "${c.name}" as "${c.result}", which is not pass, fail or n/a`)
  else if (c.result === 'n/a' && !(typeof c.reason === 'string' && c.reason.trim())) refused.push(`${where} recorded "${c.name}" as n/a without a reason (R-18)`)
  else latest.set(c.name, c)
}

for (const [name, c] of latest) {
  const gate = gateByName.get(name)
  const reason = c.result === 'n/a' ? c.reason : undefined
  if (gate.result === c.result && (!c.evidence || gate.evidence === c.evidence) && gate.reason === reason) continue
  const was = gate.result
  gate.result = c.result
  if (c.evidence) gate.evidence = c.evidence
  if (reason) gate.reason = reason
  else delete gate.reason
  applied.push(`${name}: ${was} -> ${c.result}  (${c.agent}, ${c.file})`)
}

if (applied.length && !dryRun) writeFileSync(runJsonPath, JSON.stringify(run, null, 2) + '\n', 'utf8')

if (asJson) {
  console.log(JSON.stringify({ run: run.run, applied, refused, dryRun, gates: gates.map((g) => ({ name: g.name, result: g.result })) }, null, 2))
} else {
  console.log(`Gate sync: ${run.run}`)
  console.log(applied.length ? (dryRun ? '\n  would apply:' : '\n  applied:') : '\n  nothing to apply')
  for (const a of applied) console.log(`    ${a}`)
  if (refused.length) console.log('\n  refused:')
  for (const r of refused) console.log(`    ${r}`)
  console.log(`\n  now: ${gates.map((g) => `${g.name}=${g.result}`).join('  ')}`)
}

process.exit(refused.length ? 1 : 0)
