#!/usr/bin/env node
/**
 * The Actio utilisation check.
 *
 * The orchestrator's reason for existing: did every agent that should have run actually
 * run, and was every agent that ran actually used?
 *
 * This file is the executable form of the utilisation-check algorithm in
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
  // The two checks that used to live only in orchestrator.md's parallel taxonomy (BUG-0025).
  // They are real and are kept; they just live here now with everything else.
  LOOP_SKIPPED: 'LOOP_SKIPPED',
  NO_TIMING: 'NO_TIMING',
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node .actio/bin/utilisation-check.mjs <run-dir> [--json]\nRun node .actio/bin/sync-gates.mjs <run-dir> first, so run.json carries the owners\' gate results.')
  process.exit(0)
}
const runDir = resolve(positional[0] || '.')
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
  // handoff.json is always the first pass. A plain localeCompare sorts `handoff-stage7.json`
  // ahead of it, which paired the stage-7 guard with the stage-1 entry when no stage was declared.
  const order = (f) => (f === 'handoff.json' ? -1 : Number((f.match(/\d+/) || [Infinity])[0]))
  // A stage is declared by the handoff's `stage` field, or else by the number in its file
  // name, so `handoff-stage1-brief.json` pairs with stage 1 and never with the stage-7 guard.
  const declaredStage = (r) => {
    if (r.handoff && r.handoff.stage != null) return String(r.handoff.stage)
    const m = r.file !== 'handoff.json' && r.file.match(/stage(\d+)/)
    return m ? m[1] : null
  }
  return records
    .slice()
    .sort((a, b) => order(a.file) - order(b.file))
    .map((r) => {
      const declared = byStage.get(declaredStage(r)) || null
      const entry = declared || unmatched[0] || entries[entries.length - 1]
      const i = unmatched.indexOf(entry)
      if (i !== -1) unmatched.splice(i, 1)
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

/**
 * The script never reads the ledger, so it cannot see a dispatch. A due entry with no handoff
 * is therefore waiting for its dispatch or still running: finishing stage N always makes stage
 * N+1 due, so raising NEVER_RAN at once left every stage boundary of a healthy run unclean.
 * An entry never ran once the run has moved past it: a later plan entry that is planned to
 * consume what it produces has handed off, or the orchestrator has recorded run-closure. The
 * test reads the plan's declared consumes, never a handoff's ad hoc citations, so an evidence
 * file another role happened to write early cannot mark a stage as skipped.
 */
const closing = (handoffsByAgent.get('orchestrator') || []).some((h) =>
  (h.handoff?.gates || []).some((g) => g && g.name === 'run-closure'))
const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
const sameArtefact = (a, b) => {
  const x = norm(a)
  const y = norm(b)
  return x === y || x.endsWith('/' + y) || y.endsWith('/' + x)
}
// Which plan entries have a handoff, by the same stage pairing the checks below use. Counting
// files would be wrong: bug-historian can write two files for its stage-1 brief, and a count
// would then mark its stage-7 guard as handed off too.
const handedOff = new Set()
for (const [agent, entries] of planByAgent) {
  for (const { entry } of pairWithPlan(agent, entries, handoffsByAgent.get(agent) || [])) handedOff.add(entry)
}
const readersOf = (entry) => [...new Set(plan
  .filter((e) => e !== entry && handedOff.has(e) && (e.consumes || []).some((c) =>
    (entry.produces || []).some((p) => !p.startsWith('<') && sameArtefact(c, p))))
  .map((e) => e.agent))]

for (const [agent, entries] of planByAgent) {
  const records = handoffsByAgent.get(agent) || []

  // 1. HANDOFF EXISTS, once per planned pass. The missing passes are the entries the stage
  //    pairing left without a handoff, never a count of files: bug-historian can write two
  //    files for its stage-1 brief, and a count then hides its stage-7 guard (BUG-0030).
  const missing = entries.filter((e) => !handedOff.has(e))
  if (missing.length) {
    for (const entry of missing) {
      const waiting = [
        ...(entry.blocked_by || []).filter((g) => !gatePassed(g)),
        ...(entry.consumes || []).filter((p) => !p.startsWith('<') && !locate(p)),
      ]
      const readers = readersOf(entry)
      if (closing) raise(F.NEVER_RAN, agent, `stage ${entry.stage} has no handoff, and the run is closing: ${entry.task || ''}`)
      else if (readers.length) raise(F.NEVER_RAN, agent, `stage ${entry.stage} has no handoff, and ${readers.join(', ')} already handed off on its output: ${entry.task || ''}`)
      else if (isDue(entry)) findings.push({ code: 'PENDING', subject: agent, detail: `stage ${entry.stage} is due now (its gates pass and its inputs are on disk): dispatch it` })
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

    // 9. THE FIVE-STEP LOOP WAS ACTUALLY WORKED
    //    plan.md carries the step-1 plan and its audit; review.md carries the step-4 review.
    //    An agent that produced its deliverable without either skipped the loop.
    const agentDir = join(runDir, agent)
    const planMd = join(agentDir, 'plan.md')
    const reviewMd = join(agentDir, 'review.md')
    if (!existsSync(planMd) || !nonEmpty(planMd)) raise(F.LOOP_SKIPPED, label, 'no plan.md: steps 1 and 2 of the loop left no trace')
    // Accepts every heading form in use: "## Audit", "## 2. Audit" and the template's own
    // "## 2. Audit of the plan", which the earlier pattern could not match (T-16).
    else if (!/^#{2,}\s*(\d+\.?\s*)?audit\b/im.test(readFileSync(planMd, 'utf8'))) raise(F.LOOP_SKIPPED, label, 'plan.md has no Audit section, so step 2 was skipped')
    if (!existsSync(reviewMd) || !nonEmpty(reviewMd)) raise(F.LOOP_SKIPPED, label, 'no review.md: step 4 left no trace')

    // 10. TIMING IS COHERENT
    if (h.started && h.finished && new Date(h.started) > new Date(h.finished)) {
      raise(F.NO_TIMING, label, `started ${h.started} is after finished ${h.finished}`)
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
// An owner that runs more than once (bug-historian's brief, then its guard) sets its gate on
// a later pass, so a pending gate is only unresolved once the owner has handed off for every
// pass it has in the plan, or has named the gate in a handoff.
for (const g of gates) {
  const owned = handoffsByAgent.get(g.owner) || []
  const passes = plan.filter((e) => e.agent === g.owner)
  const named = owned.some((r) => ((r.handoff && r.handoff.gates) || []).some((x) => x.name === g.name))
  const covered = new Set(pairWithPlan(g.owner, passes, owned).map((p) => p.entry))
  const allPassesRan = passes.length > 0 && passes.every((e) => covered.has(e))
  if (g.result === 'pending' && (named || allPassesRan)) {
    raise(F.GATE_UNRESOLVED, g.owner, `gate "${g.name}" still reads pending although its owner has handed off (run sync-gates.mjs first if the owner recorded a result)`)
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
  for (const f of real) console.log(`  ${f.code}: ${f.subject}: ${f.detail}`)
  if (pending.length) {
    console.log(`\n  Pending, not findings (${pending.length}):`)
    for (const f of pending) console.log(`    ${f.subject}: ${f.detail}`)
  }
}

process.exit(real.length === 0 ? 0 : 1)
