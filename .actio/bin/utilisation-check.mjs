#!/usr/bin/env node
/**
 * The Actio utilisation check, v2.
 *
 * The orchestrator's reason for existing: did every agent that should have run actually
 * run, and was every agent that ran actually used?
 *
 * This file is the executable form of the utilisation-check algorithm in
 * `.claude/skills/actio-orchestration/SKILL.md`. That skill originally published the check
 * as `jq` one-liners that could not run here (BUG-0021); the skill is the specification and
 * this file the implementation, one source and one reference (R-03).
 *
 * Invariants this file upholds:
 *   - It never writes. A checker that repairs what it checks cannot be trusted.
 *   - It never reads the ledger. The ledger is narrative; handoffs are the record.
 *   - A stage that is not yet due is PENDING, not NEVER_RAN, so the check is meaningful
 *     mid-run and not only at closure (BUG-0022). A `working` handoff is a checkpoint, not a
 *     hand-off: its stage is running.
 *   - Every finding is blocking or advisory. Exit code is 1 only when a blocking finding is
 *     raised, so run-closure can depend on it while advisory findings go to the report.
 *   - It must return no finding on every healthy state of a v2 run and must not crash on a
 *     legacy run (R-13).
 *
 * Usage:  node .actio/bin/utilisation-check.mjs [<run-dir> | <run-id>] [--json] [--compact] [--closing]
 *         --closing judges the run as if run-closure were being recorded (used by run.mjs close).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { REPO_ROOT, CODE_ROOT, resolveRunDir, treeOf, listSnapshots } from './run.mjs'

const VALID_STATUS = new Set(['passed', 'blocked', 'rejected', 'escalated'])
const WORKING = 'working'
const RESOLVED = new Set(['pass', 'n/a'])
const RISK = /^\s*Risk:/i

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
  // A gate passed on a snapshot older than the latest maker snapshot (A2).
  GATE_STALE: 'GATE_STALE',
  // The two checks that used to live only in orchestrator.md's parallel taxonomy (BUG-0025).
  LOOP_SKIPPED: 'LOOP_SKIPPED',
  NO_TIMING: 'NO_TIMING',
}
/** Blocking findings stop the run. Advisory ones are reported and never on their own justify a dispatch. */
const BLOCKING = new Set([F.NEVER_RAN, F.MALFORMED_HANDOFF, F.PHANTOM_OUTPUT, F.GATE_UNRESOLVED, F.GATE_SELF_CERTIFIED, F.GATE_SKIPPED, F.UNKNOWN_GATE, F.GATE_STALE])

/** Gates that judge the code in the working tree, so they are bound to a snapshot (A2). */
const CODE_GATES = ['review-1of3', 'review-2of3', 'review-3of3', 'security', 'regression-guard', 'engineering', 'quality']
/** The stages that must not start on a stale gate (A2). */
const STALE_GUARDED = new Set(['engineering-lead', 'qc-lead', 'release-engineer'])

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node .actio/bin/utilisation-check.mjs [<run-dir> | <run-id>] [--json] [--compact] [--closing]\nRun node .actio/bin/sync-gates.mjs <run> first (run.mjs next does both), so run.json carries the owners\' gate results.')
  process.exit(0)
}
const asJson = args.includes('--json')
const compact = args.includes('--compact')
const forceClosing = args.includes('--closing')
const runDir = resolveRunDir(positional[0]) || (positional[0] ? null : resolveRunDir('.'))
const findings = []
const pending = []
const raise = (code, subject, detail) => findings.push({ code, subject, detail, blocking: BLOCKING.has(code) })
const pend = (subject, detail) => pending.push({ code: 'PENDING', subject, detail })
const arr = (x) => (Array.isArray(x) ? x : [])

/* ------------------------------------------------------------------ inputs */

if (!runDir) {
  console.error(`No run.json for ${positional[0] || 'the active run or the current folder'}. Nothing to check.`)
  process.exit(2)
}
let run
try {
  run = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'))
} catch (err) {
  console.error(`run.json does not parse: ${err.message}`)
  process.exit(2)
}

const isV2 = Number(run.version) >= 2
const plan = arr(run.plan)
const gates = arr(run.gates)
const gateByName = new Map(gates.map((g) => [g.name, g]))
const planAgents = new Set(plan.map((e) => e.agent))

/**
 * Handoffs, keyed by agent. A pass after the first writes `handoff-stage<N>.json`, because two
 * passes writing one file destroyed the first record (BUG-0016). This reader accepts both.
 */
function loadHandoffs() {
  const out = []
  for (const entry of readdirSync(runDir)) {
    const dir = join(runDir, entry)
    if (entry === 'evidence' || !statSync(dir).isDirectory()) continue
    for (const file of readdirSync(dir)) {
      if (!/^handoff(-.+)?\.json$/.test(file)) continue
      const path = join(dir, file)
      let parsed = null
      let error = null
      try {
        parsed = JSON.parse(readFileSync(path, 'utf8'))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not a JSON object')
      } catch (err) {
        parsed = null
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
const isWorking = (rec) => rec.handoff?.status === WORKING

/* ------------------------------------------------------------------ paths */

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
const isWholePlaceholder = (p) => String(p).startsWith('<')
/** Plan paths may carry placeholders the template cannot know: `adr-NNNN-<slug>.md`. */
const isPattern = (p) => /<[^>]*>|NNNN/.test(p)
const patternBody = (p) => norm(p).split(/(<[^>]*>|NNNN)/)
  .map((part) => (part === 'NNNN' ? '\\d+' : /^<[^>]*>$/.test(part) ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  .join('')
const sameArtefact = (a, b) => {
  const x = norm(a)
  const y = norm(b)
  if (x === y || x.endsWith('/' + y) || y.endsWith('/' + x)) return true
  const fits = (pat, s) => isPattern(pat) && new RegExp(`(^|/)${patternBody(pat)}$`).test(s)
  return fits(x, y) || fits(y, x)
}

/** A path in a handoff may be run-relative, repo-relative or absolute. Try each root. */
const roots = [...new Set([resolve(runDir, '..', '..', '..'), REPO_ROOT, CODE_ROOT])]
function walk(dir, segs, i) {
  if (i === segs.length) return dir
  if (!isPattern(segs[i])) {
    const next = join(dir, segs[i])
    return existsSync(next) ? walk(next, segs, i + 1) : null
  }
  let names
  try { names = readdirSync(dir) } catch { return null }
  const rx = new RegExp(`^${patternBody(segs[i])}$`)
  for (const name of names) {
    const hit = rx.test(name) && walk(join(dir, name), segs, i + 1)
    if (hit) return hit
  }
  return null
}
/** `pattern` is for plan paths only: a handoff must name real paths, so its placeholders never match. */
function locate(p, { pattern = false } = {}) {
  if (!p) return null
  if (pattern && isPattern(p)) {
    for (const base of [runDir, ...roots]) { const hit = walk(base, norm(p).split('/'), 0); if (hit) return hit }
    return null
  }
  if (isPattern(p)) return null
  for (const cand of [resolve(p), join(runDir, p), ...roots.map((r) => join(r, p))]) if (existsSync(cand)) return cand
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
/** Run artefacts are the deliverables a successor consumes. Repository files are judged through the snapshot (A2). */
const insideRun = (p) => {
  const n = norm(p)
  if (n.includes('.actio/runs/')) return true
  const first = n.split('/')[0]
  return ['run.json', 'ledger.md', 'report.md', 'evidence'].includes(first) || planAgents.has(first) || handoffsByAgent.has(first)
}

/**
 * The agent's own loop artefacts and its handoff are records of its work, not deliverables
 * a successor consumes. Evidence is consumed by qc-lead and by Shehab, per the skill. The
 * leading slash makes a run-relative `evidence/...` path match as well as a repo-relative one.
 */
const isInternalArtefact = (p) => {
  const n = '/' + norm(p)
  return n.includes('/evidence/') || /\/handoff(-.+)?\.json$/.test(n) || /\/plan\.md$/.test(n) || /\/review\.md$/.test(n)
}

/* -------------------------------------------------- is a stage due to have run yet? */

const gateResolved = (name) => RESOLVED.has(gateByName.get(name)?.result)

/**
 * An agent is due when its gates pass (or are n/a with a reason) AND every input it is planned
 * to consume is on disk. A consumed handoff counts only when it parses and its status is
 * `passed`: a maker's `working` checkpoint is not reviewable yet, and blocked, rejected or
 * escalated work is not something a reviewer or a successor should be dispatched onto.
 */
function presentForDue(p) {
  if (isWholePlaceholder(p)) return true
  const at = locate(p, { pattern: true })
  if (!at) return false
  if (!/handoff(-[^\\/]+)?\.json$/.test(at)) return true
  try { return JSON.parse(readFileSync(at, 'utf8')).status === 'passed' } catch { return false }
}
/**
 * A maker writes its deliverables as it goes, so a file on disk is not yet an input: it is
 * ready once every other plan entry planned to produce it has handed off.
 */
const producersOf = (entry, p) => plan.filter((e) => e !== entry && arr(e.produces).some((q) => !isWholePlaceholder(q) && sameArtefact(q, p)))
const inputReady = (entry, p) => presentForDue(p) && producersOf(entry, p).every((e) => handedOff.has(e))
const isDue = (entry) => arr(entry.blocked_by).every(gateResolved) && arr(entry.consumes).every((p) => inputReady(entry, p))
const waitingOn = (entry) => [
  ...arr(entry.blocked_by).filter((g) => !gateResolved(g)),
  ...arr(entry.consumes).filter((p) => !inputReady(entry, p)),
]

/**
 * An agent may appear in the plan more than once. Pair each handoff file with the plan entry
 * it belongs to by the `stage` the handoff declares, falling back to the number in its file
 * name and then to plan order, so a stage-1 brief is never judged against a later entry.
 */
function pairWithPlan(agent, entries, records) {
  if (entries.length === 1) return records.map((r) => ({ rec: r, entry: entries[0] }))
  const byStage = new Map(entries.map((e) => [String(e.stage), e]))
  const unmatched = [...entries].sort((a, b) => a.stage - b.stage)
  // handoff.json is always the first pass; a plain sort would put handoff-stage7.json first.
  const order = (f) => (f === 'handoff.json' ? -1 : Number((f.match(/\d+/) || [Infinity])[0]))
  const declaredStage = (r) => {
    if (r.handoff && r.handoff.stage != null) return String(r.handoff.stage)
    const m = r.file !== 'handoff.json' && r.file.match(/stage(\d+)/)
    return m ? m[1] : null
  }
  return records
    .slice()
    .sort((a, b) => order(a.file) - order(b.file))
    .map((r) => {
      const entry = byStage.get(declaredStage(r)) || unmatched[0] || entries[entries.length - 1]
      const i = unmatched.indexOf(entry)
      if (i !== -1) unmatched.splice(i, 1)
      return { rec: r, entry }
    })
}

/* ------------------------------------------------------------------ the steps */

const allConsumed = new Set()
for (const { handoff } of handoffs) for (const c of arr(handoff?.consumed)) allConsumed.add(norm(c))

const planByAgent = new Map()
for (const entry of plan) {
  if (!planByAgent.has(entry.agent)) planByAgent.set(entry.agent, [])
  planByAgent.get(entry.agent).push(entry)
}

/**
 * Which plan entries have handed off, by the same stage pairing the checks use. A `working`
 * checkpoint marks its entry as running, not handed off.
 */
const handedOff = new Set()
const runningRec = new Map()
for (const [agent, entries] of planByAgent) {
  for (const { rec, entry } of pairWithPlan(agent, entries, handoffsByAgent.get(agent) || [])) {
    if (isWorking(rec)) runningRec.set(entry, rec)
    else handedOff.add(entry)
  }
}
for (const e of handedOff) runningRec.delete(e)

/**
 * An entry never ran once the run has moved past it: a later plan entry planned to consume what
 * it produces has handed off, or the run is closing. The test reads the plan's declared
 * consumes, never a handoff's ad hoc citations.
 */
const closing = forceClosing || (handoffsByAgent.get('orchestrator') || []).some((h) =>
  !isWorking(h) && arr(h.handoff?.gates).some((g) => g && g.name === 'run-closure'))
const plannedConsumers = (entry, p) => plan.filter((e) => e !== entry && arr(e.consumes).some((c) => !isWholePlaceholder(c) && sameArtefact(c, p)))
const readersOf = (entry) => [...new Set(arr(entry.produces)
  .filter((p) => !isWholePlaceholder(p))
  .flatMap((p) => plannedConsumers(entry, p))
  .filter((e) => handedOff.has(e))
  .map((e) => e.agent))]

const due = []
const running = []
const waiting = []

for (const [agent, entries] of planByAgent) {
  const records = handoffsByAgent.get(agent) || []

  // 1. HANDOFF EXISTS, once per planned pass, by the stage pairing, never a count of files (BUG-0030).
  for (const entry of entries.filter((e) => !handedOff.has(e))) {
    const readers = readersOf(entry)
    const ckpt = runningRec.get(entry)
    const what = ckpt ? 'has only a working checkpoint' : 'has no handoff'
    if (closing) raise(F.NEVER_RAN, agent, `stage ${entry.stage} ${what}, and the run is closing: ${entry.task || ''}`)
    else if (readers.length) raise(F.NEVER_RAN, agent, `stage ${entry.stage} ${what}, and ${readers.join(', ')} already handed off on its output: ${entry.task || ''}`)
    else if (ckpt) {
      running.push({ stage: entry.stage, agent, started: ckpt.handoff.started || null })
      pend(agent, `stage ${entry.stage} is running (working since ${ckpt.handoff.started || '?'})`)
    } else if (isDue(entry)) {
      due.push({ stage: entry.stage, agent, task: entry.task || '' })
      pend(agent, `stage ${entry.stage} is due now (its gates pass and its inputs are on disk): dispatch it`)
    } else {
      const on = waitingOn(entry).join(', ') || 'nothing'
      waiting.push({ stage: entry.stage, agent, on })
      pend(agent, `stage ${entry.stage}, waiting on ${on}`)
    }
  }

  for (const { rec, entry } of pairWithPlan(agent, entries, records)) {
    if (isWorking(rec)) continue
    const label = records.length > 1 ? `${agent} (${rec.file})` : agent

    // 2. HANDOFF PARSES
    if (rec.error) {
      raise(F.MALFORMED_HANDOFF, label, rec.error)
      continue
    }
    const h = rec.handoff
    if (!VALID_STATUS.has(h.status)) raise(F.MALFORMED_HANDOFF, label, `status "${h.status}" is not one of ${[WORKING, ...VALID_STATUS].join(', ')}`)

    // 3. OUTPUT EXISTS. A handoff names real paths, so a placeholder here is phantom too.
    for (const p of arr(h.produced)) {
      const abs = locate(p)
      if (!abs || !nonEmpty(abs)) raise(F.PHANTOM_OUTPUT, label, `produced ${p}, which is missing or empty`)
    }

    // 4. OUTPUT WAS CONSUMED. Exempt by entry, never by agent name: an entry is exempt only when
    //    nothing in the plan is planned to consume what it produces. The old test exempted every
    //    output of the last plan agent by name, so bug-historian's brief could never be flagged.
    const hasConsumer = arr(entry.produces).some((p) => !isWholePlaceholder(p) && plannedConsumers(entry, p).length)
    for (const p of hasConsumer ? arr(h.produced) : []) {
      if (isInternalArtefact(p) || (isV2 && !insideRun(p))) continue
      if ([...allConsumed].some((c) => sameArtefact(c, p))) continue
      // Nobody has consumed it. That is only a defect once its planned consumer has handed off.
      const consumers = plannedConsumers(entry, p)
      const waitingFor = consumers.filter((e) => !handedOff.has(e)).map((e) => e.agent)
      // An output no plan entry names (a brief slice for an agent whose entry omits it) can still
      // be cited by whoever the dispatch hands it to, so it is only unused once the run closes.
      if (waitingFor.length) pend(label, `produced ${p}, awaiting ${[...new Set(waitingFor)].join(', ')}`)
      else if (consumers.length) raise(F.UNUSED_OUTPUT, label, `produced ${p}, planned for ${[...new Set(consumers.map((e) => e.agent))].join(', ')}, who handed off without citing it`)
      else if (closing || !isV2) raise(F.UNUSED_OUTPUT, label, `produced ${p}, which no later agent consumed`)
      else pend(label, `produced ${p}, which no plan entry consumes yet`)
    }

    // 5. INPUTS WERE REAL
    for (const p of arr(h.consumed)) if (!locate(p)) raise(F.FALSE_CONSUMPTION, label, `consumed ${p}, which does not exist`)

    // 6 & 7. GATES RESOLVED, AND OWNED BY THE AGENT THAT CERTIFIED THEM
    for (const g of arr(h.gates)) {
      if (!g || !gateByName.has(g.name)) {
        raise(F.UNKNOWN_GATE, label, `certified "${g?.name}", which is not in run.json gates[]`)
        continue
      }
      if (gateByName.get(g.name).owner !== agent) raise(F.GATE_SELF_CERTIFIED, label, `certified "${g.name}", owned by ${gateByName.get(g.name).owner}`)
      if (g.result === 'pass' && g.evidence && !locate(g.evidence)) raise(F.GATE_UNRESOLVED, label, `gate "${g.name}" passed on evidence ${g.evidence}, which does not exist`)
      if (g.result === 'n/a' && !(typeof g.reason === 'string' && g.reason.trim())) raise(F.MALFORMED_HANDOFF, label, `gate "${g.name}" is n/a without a reason (R-18)`)
      else if (isV2 && !['pass', 'fail', 'n/a'].includes(g.result)) raise(F.MALFORMED_HANDOFF, label, `gate "${g.name}" result "${g.result}" is not pass, fail or n/a`)
    }

    // 9. THE LOOP WAS ACTUALLY WORKED. v2: plan[] with a Risk: line (A1), and checks[] when
    //    passed; the same rule run.mjs handoff applies. A v1 run may satisfy it instead with
    //    plan.md carrying an Audit heading plus review.md, so legacy runs keep checking clean.
    //    In a v2 run plan.md is optional and never stands in for plan[].
    const v2Shape = Array.isArray(h.plan) || Array.isArray(h.checks)
    const v2Gap = !arr(h.plan).length ? 'plan[] is empty: steps 1 and 2 of the loop left no trace'
      : !arr(h.plan).some((l) => typeof l === 'string' && RISK.test(l)) ? 'plan[] has no line starting "Risk:", so the pre-mortem was skipped (A1)'
      : h.status === 'passed' && !arr(h.checks).length ? 'a passed handoff with no checks[]: step 4 left no trace' : null
    if (v2Gap && isV2) raise(F.LOOP_SKIPPED, label, v2Gap)
    else if (v2Gap) {
      const legacyGaps = legacyLoopGaps(join(runDir, agent))
      if (legacyGaps.length) for (const m of v2Shape ? [v2Gap] : legacyGaps) raise(F.LOOP_SKIPPED, label, m)
    }

    // 10. TIMING IS COHERENT, and in a v2 run present.
    if (h.started && h.finished && new Date(h.started) > new Date(h.finished)) raise(F.NO_TIMING, label, `started ${h.started} is after finished ${h.finished}`)
    else if (isV2 && (!h.started || !h.finished)) raise(F.NO_TIMING, label, `${!h.started ? 'started' : 'finished'} is missing`)

    // 8. NO SKIPPED DEPENDENCY. It judges the gate as it reads now: v2 reworks rewrite a handoff
    //    in place, so the history a time-based test would need is not on disk.
    for (const gname of arr(entry.blocked_by)) {
      const g = gateByName.get(gname)
      if (!g) raise(F.UNKNOWN_GATE, label, `blocked_by "${gname}", which is not in run.json gates[]`)
      else if (!RESOLVED.has(g.result)) raise(F.GATE_SKIPPED, label, `ran while gate "${gname}" reads "${g.result}"`)
    }
  }
}

/** The v1 loop record: plan.md with an Audit heading (every heading form in use, T-16) and review.md. */
function legacyLoopGaps(agentDir) {
  const gaps = []
  const planMd = join(agentDir, 'plan.md')
  const reviewMd = join(agentDir, 'review.md')
  if (!existsSync(planMd) || !nonEmpty(planMd)) gaps.push('no plan.md: steps 1 and 2 of the loop left no trace')
  else if (!/^#{2,}\s*(\d+\.?\s*)?audit\b/im.test(readFileSync(planMd, 'utf8'))) gaps.push('plan.md has no Audit section, so step 2 was skipped')
  if (!existsSync(reviewMd) || !nonEmpty(reviewMd)) gaps.push('no review.md: step 4 left no trace')
  return gaps
}

// Gates nobody resolved. An owner that runs more than once sets its gate on a later pass, so a
// pending gate is only unresolved once the owner has handed off every pass it has in the plan,
// or has named the gate in a handoff.
for (const g of gates) {
  const owned = (handoffsByAgent.get(g.owner) || []).filter((r) => !isWorking(r))
  const passes = plan.filter((e) => e.agent === g.owner)
  const named = owned.some((r) => arr(r.handoff?.gates).some((x) => x && x.name === g.name))
  const allPassesRan = passes.length > 0 && passes.every((e) => handedOff.has(e))
  if (g.result === 'pending' && (named || allPassesRan)) {
    raise(F.GATE_UNRESOLVED, g.owner, `gate "${g.name}" still reads pending although its owner has handed off (run sync-gates.mjs first if the owner recorded a result)`)
  }
}

/**
 * GATE_STALE (A2). When engineering-lead, qc-lead or release-engineer is due, every code gate
 * that reads pass must have judged the same tree as the latest maker snapshot. A maker is a
 * plan agent that judges nothing: the snapshot it records in `reviewed` is the code as it left
 * it. Trees are compared, not commit shas, so a re-taken snapshot of the same code still matches.
 */
if (isV2) {
  const judges = new Set(['orchestrator', 'qc-engineer', 'release-engineer', 'ux-auditor', ...gates.filter((g) => CODE_GATES.includes(g.name)).map((g) => g.owner)])
  const when = (r) => Date.parse(r.handoff.finished || r.handoff.started || '') || 0
  const makerRecs = handoffs
    .filter((r) => planAgents.has(r.agent) && !judges.has(r.agent) && r.handoff && !isWorking(r) && typeof r.handoff.reviewed === 'string')
    .sort((a, b) => when(a) - when(b))
  let latest = makerRecs.length ? { sha: makerRecs[makerRecs.length - 1].handoff.reviewed, by: makerRecs[makerRecs.length - 1].agent } : null
  if (!latest) {
    const snaps = listSnapshots(run.run || basename(runDir))
    if (snaps.length) latest = { sha: snaps[snaps.length - 1].sha, by: `snapshot ${snaps[snaps.length - 1].n}` }
  }
  const guarded = due.filter((d) => STALE_GUARDED.has(d.agent))
  if (latest && guarded.length) {
    const latestTree = treeOf(latest.sha)
    const sameCode = (sha) => {
      const t = treeOf(sha)
      return t && latestTree ? t === latestTree : sha.startsWith(latest.sha) || latest.sha.startsWith(sha)
    }
    for (const g of gates) {
      const waitingStages = guarded.filter((d) => d.agent !== g.owner).map((d) => d.agent)
      if (!CODE_GATES.includes(g.name) || g.result !== 'pass' || !waitingStages.length) continue
      const rec = (handoffsByAgent.get(g.owner) || [])
        .filter((r) => r.handoff && !isWorking(r) && arr(r.handoff.gates).some((x) => x && x.name === g.name))
        .sort((a, b) => when(a) - when(b)).pop()
      if (!rec) continue
      const judged = rec.handoff.reviewed
      if (typeof judged !== 'string' || !judged) raise(F.GATE_STALE, g.owner, `${g.name} passed without recording the snapshot it judged (reviewed); ${waitingStages.join(', ')} is due`)
      else if (!sameCode(judged)) raise(F.GATE_STALE, g.owner, `${g.name} judged ${judged.slice(0, 12)}, the latest maker snapshot is ${latest.sha.slice(0, 12)} (${latest.by}): delta re-review git diff ${judged.slice(0, 12)} ${latest.sha.slice(0, 12)} before ${waitingStages.join(', ')}`)
    }
  }
}

/* ------------------------------------------------------------------ report */

for (const list of [due, running, waiting]) list.sort((a, b) => Number(a.stage) - Number(b.stage))
const blocking = findings.filter((f) => f.blocking)
const advisory = findings.filter((f) => !f.blocking)
const gateRows = gates.map((g) => ({ name: g.name, owner: g.owner, result: g.result }))

if (asJson) {
  console.log(JSON.stringify({
    run: run.run, version: isV2 ? 2 : 1, lane: run.lane || null, findings, pending, due, running, waiting,
    gates: gateRows, blocking: blocking.length, advisory: advisory.length, clean: blocking.length === 0,
  }, null, 2))
} else if (compact) {
  const resolvedCount = gates.filter((g) => RESOLVED.has(g.result)).length
  const out = [
    `Utilisation check: ${run.run} · ${plan.length} plan entries · ${handoffs.length} handoffs · gates ${resolvedCount}/${gates.length} resolved`,
    `blocking ${blocking.length} · advisory ${advisory.length} · due ${due.length} · running ${running.length} · waiting ${waiting.length}`,
  ]
  for (const f of blocking.slice(0, 8)) out.push(`  BLOCKING ${f.code}: ${f.subject}: ${f.detail}`)
  if (blocking.length > 8) out.push(`  ... ${blocking.length - 8} more blocking (run without --compact)`)
  for (const f of advisory.slice(0, 5)) out.push(`  advisory ${f.code}: ${f.subject}: ${f.detail}`)
  if (advisory.length > 5) out.push(`  ... ${advisory.length - 5} more advisory`)
  if (due.length) out.push(`  due: ${due.map((d) => `stage ${d.stage} ${d.agent}`).join(', ')}`)
  if (running.length) out.push(`  running: ${running.map((d) => `stage ${d.stage} ${d.agent}`).join(', ')}`)
  console.log(out.join('\n'))
} else {
  console.log(`Utilisation check: ${run.run}`)
  console.log(`  plan ${plan.length} entries, ${handoffs.length} handoffs on disk, ${gates.length} gates\n`)
  if (findings.length === 0) console.log('  No findings.')
  if (blocking.length) console.log(`  Blocking (${blocking.length}):`)
  for (const f of blocking) console.log(`  ${f.code}: ${f.subject}: ${f.detail}`)
  if (advisory.length) console.log(`${blocking.length ? '\n' : ''}  Advisory (${advisory.length}), for the run report:`)
  for (const f of advisory) console.log(`  ${f.code}: ${f.subject}: ${f.detail}`)
  if (pending.length) {
    console.log(`\n  Pending, not findings (${pending.length}):`)
    for (const f of pending) console.log(`    ${f.subject}: ${f.detail}`)
  }
}

process.exit(blocking.length === 0 ? 0 : 1)
