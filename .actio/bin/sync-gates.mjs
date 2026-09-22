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
 *   - It never downgrades a result that is already recorded, so re-running is safe.
 *   - It rewrites only `gates[].result` and `gates[].evidence`. Nothing else in run.json.
 *
 * Usage:  node .actio/bin/sync-gates.mjs <run-dir> [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const runDir = resolve(process.argv[2] || '.')
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
    for (const g of h.gates || []) claims.push({ agent: entry, file, ...g })
  }
}

const applied = []
const refused = []

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
  if (gate.result === c.result) continue
  if (gate.result !== 'pending' && gate.result !== undefined) {
    refused.push(`"${c.name}" already reads "${gate.result}"; ${c.agent} now claims "${c.result}". Not overwritten.`)
    continue
  }
  gate.result = c.result
  if (c.evidence) gate.evidence = c.evidence
  applied.push(`${c.name} -> ${c.result}  (${c.agent})`)
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
