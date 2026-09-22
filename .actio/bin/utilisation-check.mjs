#!/usr/bin/env node
/**
 * The Actio utilisation check.
 *
 * The orchestrator's reason for existing: did every agent that should have run actually
 * run, and was every agent that ran actually used?
 *
 * This file is the executable form of the eight-step algorithm in
 * `.claude/skills/actio-orchestration/SKILL.md`. That skill originally published the check
 * as twelve `jq` one-liners; `jq` is not installed on the Product Lead's machine, so the
 * single most important routine in the swarm could not be run as documented. Recorded as
 * BUG-0021. The skill is now the specification and this file is the implementation, which
 * is the R-03 shape: one source, one reference, never two copies.
 *
 * Invariants this file upholds:
 *   - It never writes. A checker that repairs what it checks cannot be trusted.
 *   - It never reads the ledger. The ledger is narrative; handoffs are the record.
 *   - A stage that is not yet due is reported as PENDING, not NEVER_RAN, so the check is
 *     meaningful mid-run and not only at closure (BUG-0022).
 *   - Exit code is 1 when any finding is raised, so a gate can depend on it.
 *
 * Usage:  node .actio/bin/utilisation-check.mjs <run-dir> [--json]
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const VALID_STATUS = new Set(['passed', 'blocked', 'rejected', 'escalated'])

/** Findings, in the vocabulary the skill defines. One name per condition, no synonyms. */
const F = {
  NEVER_RAN: 'NEVER_RAN',
  MALFORMED_HANDOFF: 'MALFORMED_HANDOFF',
  PHANTOM_OUTPUT: 'PHANTOM_OUTPUT',
  UNUSED_OUTPUT: 'UNUSED_OUTPUT',
  FALSE_CONSUMPTION: 'FALSE_CONSUMPTION',
  GATE_UNRESOLVED: 'GATE_UNRESOLVED',
  GATE_SELF_CERTIFIED: 'GATE_SELF_CERTIFIED',
  GATE_SKIPPED: 'GATE_SKIPPED',
  UNKNOWN_GATE: 'UNKNOWN_GATE',
}

const runDir = resolve(process.argv[2] || '.')
const asJson = process.argv.includes('--json')
const findings = []
const raise = (code, subject, detail) => findings.push({ code, subject, detail })

/* ------------------------------------------------------------------ inputs */

const runJsonPath = join(runDir, 'run.json')
if (!existsSync(runJsonPath)) {
  console.error(`No run.json at ${runJsonPath}. Nothing to check.`)
  process.exit(2)
}

let run
try {
  run = JSON.parse(readFileSync(runJsonPath, 'utf8'))
} catch (err) {
  console.error(`run.json does not parse: ${err.message}`)
  process.exit(2)
}

const plan = Array.isArray(run.plan) ? run.plan : []
const gates = Array.isArray(run.gates) ? run.gates : []
const gateByName = new Map(gates.map((g) => [g.name, g]))

/**
 * Handoffs, keyed by agent.
 *
 * An agent may run more than once in a plan: `bug-historian` publishes the brief at stage 1
 * and runs the regression guard at stage 7. Both passes used to write the same
 * `handoff.json`, so the second destroyed the first and every downstream `consumed[]`
 * pointing at the brief read as FALSE_CONSUMPTION at closure. Recorded as BUG-0016. A pass
 * after the first writes `handoff-<stage>.json`, and this reader accepts both forms.
 */
function loadHandoffs() {
  const out = []
  if (!existsSync(runDir)) return out
  for (const entry of readdirSync(runDir)) {
    const dir = join(runDir, entry)
    if (!statSync(dir).isDirectory() || entry === 'evidence') continue
    for (const file of readdirSync(dir)) {
      if (!/^handoff(-.+)?\.json$/.test(file)) continue
      const path = join(dir, file)
      let parsed = null
      let error = null
      try {
        parsed = JSON.parse(readFileSync(path, 'utf8'))
      } catch (err) {
        error = err.message
      }
      out.push({ agent: entry, file, path, handoff: parsed, error })
    }
  }
  return out
}

const handoffs = loadHandoffs()
const handoffsByAgent = new Map()
for (const h of handoffs) {
  if (!handoffsByAgent.has(h.agent)) handoffsByAgent.set(h.agent, [])
  handoffsByAgent.get(h.agent).push(h)
}

/** A path in a handoff may be run-relative, repo-relative or absolute. Try each. */
const repoRoot = resolve(runDir, '..', '..', '..')
function locate(p) {
  if (!p) return null
  for (const cand of [p, join(runDir, p), join(repoRoot, p)]) {
    if (existsSync(cand)) return cand
  }
  return null
}
const nonEmpty = (abs) => {
  try {
    const s = statSync(abs)
    return s.isDirectory() ? readdirSync(abs).length > 0 : s.size > 0
  } catch {
    return false
  }
}

/* -------------------------------------------------- is a stage due to have run yet? */

/**
 * A plan entry is due once every gate in its `blocked_by` reads `pass`. Run at run-open,
 * the original check raised NEVER_RAN against all fifteen planned agents, which made it
 * useless anywhere but closure. PENDING separates "has not run yet and should not have"
 * from "should have run and did not".
 */
const gatePassed = (name) => gateByName.get(name)?.result === 'pass'

/**
 * `blocked_by` names gates only, never agents, so it cannot express "wait for the spec".
 * `ux-auditor` has no blocking gate but cannot audit a spec that does not exist yet. An
 * agent is due when its gates pass AND every input it is planned to consume is on disk.
 */
const isDue = (entry) =>
  (entry.blocked_by || []).every(gatePassed) &&
  (entry.consumes || []).every((p) => p.startsWith('<') || locate(p))

/**
 * An agent may appear in the plan more than once. Pair each handoff file with the plan
 * entry it belongs to by the `stage` the handoff declares, falling back to plan order, so
 * a stage-1 brief is never judged against a stage-7 entry's blocked_by. Without this the
 * check cross-products the two and invents GATE_SKIPPED findings against a pass that ran
 * long before those gates existed.
 */
function pairWithPlan(agent, entries, records) {
  if (entries.length === 1) return records.map((r) => ({ rec: r, entry: entries[0] }))
  const byStage = new Map(entries.map((e) => [String(e.stage), e]))
  const unmatched = [...entries].sort((a, b) => a.stage - b.stage)
  return records
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((r) => {
      const declared = r.handoff && r.handoff.stage != null ? byStage.get(String(r.handoff.stage)) : null
      const entry = declared || unmatched.shift() || entries[entries.length - 1]
      return { rec: r, entry }
    })
}

/**
 * The agent's own loop artefacts and its handoff are records of its work, not deliverables
 * a successor consumes. Expecting them to be consumed produces noise that buries the real
 * UNUSED_OUTPUT findings. Evidence is consumed by qc-lead and by Shehab, per the skill.
 */
const isInternalArtefact = (p) => {
  const n = p.replace(/\\/g, '/')
  return (
    n.includes('/evidence/') ||
    /\/handoff(-.+)?\.json$/.test(n) ||
    /\/plan\.md$/.test(n) ||
    /\/review\.md$/.test(n)
  )
}

/* ------------------------------------------------------------------ the eight steps */

const allConsumed = new Set()
for (const { handoff } of handoffs) {
  for (const c of handoff?.consumed || []) allConsumed.add(c.replace(/\\/g, '/'))
}

const planByAgent = new Map()
for (const entry of plan) {
  if (!planByAgent.has(entry.agent)) planByAgent.set(entry.agent, [])
  planByAgent.get(entry.agent).push(entry)
}

for (const [agent, entries] of planByAgent) {
  const records = handoffsByAgent.get(agent) || []

  // 1. HANDOFF EXISTS, once per planned pass
  if (records.length < entries.length) {
    const missing = entries.slice(records.length)
    for (const entry of missing) {
      const waiting = [
        ...(entry.blocked_by || []).filter((g) => !gatePassed(g)),
        ...(entry.consumes || []).filter((p) => !p.startsWith('<') && !locate(p)),
      ]
      if (isDue(entry)) raise(F.NEVER_RAN, agent, `stage ${entry.stage}: ${entry.task || ''}`)
      else findings.push({ code: 'PENDING', subject: agent, detail: `stage ${entry.stage}, waiting on ${waiting.join(', ') || 'nothing'}` })
    }
    if (records.length === 0) continue
  }

  for (const { rec, entry } of pairWithPlan(agent, entries, records)) {
    const label = records.length > 1 ? `${agent} (${rec.file})` : agent

    // 2. HANDOFF PARSES
    if (rec.error) {
      raise(F.MALFORMED_HANDOFF, label, rec.error)
      continue
    }
    const h = rec.handoff
    if (!VALID_STATUS.has(h.status)) {
      raise(F.MALFORMED_HANDOFF, label, `status "${h.status}" is not one of ${[...VALID_STATUS].join(', ')}`)
    }

    // 3. OUTPUT EXISTS
    for (const p of h.produced || []) {
      const abs = locate(p)
      if (!abs || !nonEmpty(abs)) raise(F.PHANTOM_OUTPUT, label, `produced ${p}, which is missing or empty`)
    }

    // 4. OUTPUT WAS CONSUMED
    //    Evidence is consumed by qc-lead and by Shehab rather than by a successor, and the
    //    last agent in the run has no successor. Both are stated exceptions in the skill.
    const isLast = plan[plan.length - 1]?.agent === agent
    for (const p of h.produced || []) {
      const norm = p.replace(/\\/g, '/')
      if (isInternalArtefact(norm) || isLast) continue
      const seen = [...allConsumed].some((c) => c === norm || c.endsWith(norm) || norm.endsWith(c))
      if (seen) continue
      // Nobody has consumed it. That is only a defect once its planned consumer has run:
      // mid-run, an artefact waiting for an agent that has not been dispatched is correct.
      const waitingOn = plan
        .filter((e) => (e.consumes || []).some((c) => { const cn = c.replace(/\\/g, '/'); return cn === norm || cn.endsWith(norm) || norm.endsWith(cn) }))
        .filter((e) => (handoffsByAgent.get(e.agent) || []).length === 0)
        .map((e) => e.agent)
      if (waitingOn.length) findings.push({ code: 'PENDING', subject: label, detail: `produced ${p}, awaiting ${[...new Set(waitingOn)].join(', ')}` })
      else raise(F.UNUSED_OUTPUT, label, `produced ${p}, which no later agent consumed`)
    }

    // 5. INPUTS WERE REAL
    for (const p of h.consumed || []) {
      if (!locate(p)) raise(F.FALSE_CONSUMPTION, label, `consumed ${p}, which does not exist`)
    }

    // 6 & 7. GATES RESOLVED, AND OWNED BY THE AGENT THAT CERTIFIED THEM
    for (const g of h.gates || []) {
      if (!gateByName.has(g.name)) {
        raise(F.UNKNOWN_GATE, label, `certified "${g.name}", which is not in run.json gates[]`)
        continue
      }
      if (gateByName.get(g.name).owner !== agent) {
        raise(F.GATE_SELF_CERTIFIED, label, `certified "${g.name}", owned by ${gateByName.get(g.name).owner}`)
      }
      if (g.result === 'pass' && g.evidence && !locate(g.evidence)) {
        raise(F.GATE_UNRESOLVED, label, `gate "${g.name}" passed on evidence ${g.evidence}, which does not exist`)
      }
    }

    // 8. NO SKIPPED DEPENDENCY
    for (const gname of entry.blocked_by || []) {
      const g = gateByName.get(gname)
      if (!g) raise(F.UNKNOWN_GATE, label, `blocked_by "${gname}", which is not in run.json gates[]`)
      else if (g.result !== 'pass') raise(F.GATE_SKIPPED, label, `ran while gate "${gname}" reads "${g.result}"`)
    }
  }
}

// Gates nobody resolved. Only counted once every agent that could resolve one has run.
for (const g of gates) {
  if (g.result === 'pending' && (handoffsByAgent.get(g.owner) || []).length > 0) {
    raise(F.GATE_UNRESOLVED, g.owner, `gate "${g.name}" still reads pending although its owner has handed off`)
  }
}

/* ------------------------------------------------------------------ report */

const real = findings.filter((f) => f.code !== 'PENDING')
const pending = findings.filter((f) => f.code === 'PENDING')

if (asJson) {
  console.log(JSON.stringify({ run: run.run, findings: real, pending, clean: real.length === 0 }, null, 2))
} else {
  console.log(`Utilisation check: ${run.run}`)
  console.log(`  plan ${plan.length} agents, ${handoffs.length} handoffs on disk, ${gates.length} gates\n`)
  if (real.length === 0) console.log('  No findings.')
  for (const f of real) console.log(`  ${f.code}: ${f.subject} — ${f.detail}`)
  if (pending.length) {
    console.log(`\n  Not yet due (${pending.length}):`)
    for (const f of pending) console.log(`    ${f.subject} — ${f.detail}`)
  }
}

process.exit(real.length === 0 ? 0 : 1)
