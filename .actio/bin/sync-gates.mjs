#!/usr/bin/env node
/**
 * Sync gate results from agent handoffs into run.json.
 *
 * A gate's result lives in `run.json`. Its owner records the result in its own
 * `handoff.json`. Nothing copied one into the other until the orchestrator closed the run,
 * so mid-run every gate read `pending`, every dispatched agent looked like it had started
 * before its blocking gate passed, and the rule that a stage waits for its gates could not
 * be enforced by reading the file the rule points at. Recorded as BUG-0027.
 *
 * This is that copy, made explicit and runnable. The orchestrator runs it after reading each
 * handoff, before dispatching the next stage.
 *
 * Invariants this file upholds:
 *   - It only ever copies a result an owner recorded. It never decides a gate.
 *   - It refuses a result from an agent the plan does not name as that gate's owner, which
 *     is GATE_SELF_CERTIFIED and belongs to the checker, not to a sync step.
 *   - When an owner records the same gate more than once (a fail, a fix, then a re-review
 *     that passes), the owner's latest record wins, judged by the handoff's `finished` time
 *     and then by pass number. Refusing every change after the first result used to pin a
 *     gate at `fail` for good, so the stage it blocked could never become due and the run
 *     stalled. Re-running is still safe: the same handoffs always give the same answer.
 *   - It rewrites only `gates[].result` and `gates[].evidence`. Nothing else in run.json.
 *
 * Usage:  node .actio/bin/sync-gates.mjs <run-dir> [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node .actio/bin/sync-gates.mjs <run-dir> [--dry-run]')
  process.exit(0)
}
const runDir = resolve(positional[0] || '.')
const dryRun = process.argv.includes('--dry-run')
const runJsonPath = join(runDir, 'run.json')

if (!existsSync(runJsonPath)) {
  console.error(`No run.json at ${runJsonPath}.`)
  process.exit(2)
}

const run = JSON.parse(readFileSync(runJsonPath, 'utf8'))
const gates = Array.isArray(run.gates) ? run.gates : []
const gateByName = new Map(gates.map((g) => [g.name, g]))

/** Collect every gate result any agent recorded, with the agent that recorded it. */
const claims = []
for (const entry of readdirSync(runDir)) {
  const dir = join(runDir, entry)
  if (!statSync(dir).isDirectory() || entry === 'evidence') continue
  for (const file of readdirSync(dir)) {
    if (!/^handoff(-.+)?\.json$/.test(file)) continue
    let h
    try {
      h = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch {
      continue
    }
    const pass = file === 'handoff.json' ? 0 : Number((file.match(/\d+/) || [1])[0])
    const at = Date.parse(h.finished || '') || 0
    for (const g of h.gates || []) claims.push({ agent: entry, file, pass, at, ...g })
  }
}

const applied = []
const refused = []

// Oldest first, so the owner's latest record is the one left standing.
claims.sort((a, b) => a.at - b.at || a.pass - b.pass)
const latest = new Map()

for (const c of claims) {
  const gate = gateByName.get(c.name)
  if (!gate) {
    refused.push(`${c.agent} certified "${c.name}", which is not a gate in this run (UNKNOWN_GATE)`)
    continue
  }
  if (gate.owner !== c.agent) {
    refused.push(`${c.agent} certified "${c.name}", owned by ${gate.owner} (GATE_SELF_CERTIFIED)`)
    continue
  }
  latest.set(c.name, c)
}

for (const [name, c] of latest) {
  const gate = gateByName.get(name)
  if (gate.result === c.result && (!c.evidence || gate.evidence === c.evidence)) continue
  const was = gate.result
  gate.result = c.result
  if (c.evidence) gate.evidence = c.evidence
  applied.push(`${name}: ${was} -> ${c.result}  (${c.agent}, ${c.file})`)
}

if (applied.length && !dryRun) {
  writeFileSync(runJsonPath, JSON.stringify(run, null, 2) + '\n', 'utf8')
}

console.log(`Gate sync: ${run.run}`)
if (applied.length) {
  console.log(dryRun ? '\n  would apply:' : '\n  applied:')
  for (const a of applied) console.log(`    ${a}`)
} else {
  console.log('\n  nothing to apply')
}
if (refused.length) {
  console.log('\n  refused:')
  for (const r of refused) console.log(`    ${r}`)
}
console.log(`\n  now: ${gates.map((g) => `${g.name}=${g.result}`).join('  ')}`)

process.exit(refused.length ? 1 : 0)
