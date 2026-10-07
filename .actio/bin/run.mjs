#!/usr/bin/env node
/**
 * run.mjs: the orchestrator's bookkeeping, scripted, so its turns go on judgement.
 *
 *   open <slug> --lane <lane> [--no-ships]   create the run from .actio/TEMPLATE/lanes/<lane>.json
 *   next [<run>]                             sync gates, run the check, print gates, findings, due stages
 *   dispatch <run> <agent> [--stage N]       print a ready-to-send dispatch prompt
 *   ledger <run> <event> <agent> <detail...> append one ledger row stamped by the clock
 *   handoff <path>                           validate a handoff against the v2 schema
 *   snapshot <run>                           commit the working tree to refs/actio/snapshots/<run>/<n>
 *   close <run> [--confirm]                  can run-closure pass; --confirm clears .active
 *
 * Every command prints at most about 25 lines (dispatch about 40), because the orchestrator's
 * context is the scarcest resource in a run.
 *
 * Invariants this file upholds:
 *   - It never decides a gate. Results come from the owners' handoffs through sync-gates.mjs.
 *   - snapshot never touches the real index, the working tree or the stash. It builds the tree
 *     in a temporary GIT_INDEX_FILE and uses plumbing only: write-tree, commit-tree, update-ref.
 *     A snapshot whose tree equals the previous one is reused, so the same code has one sha.
 *   - dispatch never writes the ledger. The SubagentStart hook records the dispatch.
 *   - Timestamps come from the clock, never from a typed value.
 *
 * Environment: ACTIO_RUNS_DIR (default .actio/runs, relative to the repository root),
 * ACTIO_TEMPLATE_DIR (default .actio/TEMPLATE/lanes), ACTIO_REPO_ROOT (the git working tree,
 * default two folders above this file) and ACTIO_PREFLIGHT_MCP=skip (skip `claude mcp list`,
 * recorded as not checked). The last three exist so the tests can run against fixtures.
 *
 * The other scripts import the helpers exported here; the CLI runs only when this file is
 * the entry point.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs'
import { join, resolve, dirname, basename, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
/** Where .claude/ and .actio/TEMPLATE live: the code of the swarm. */
export const CODE_ROOT = resolve(HERE, '..', '..')
/** The git working tree that snapshots capture and runs live in. Equal to CODE_ROOT outside tests. */
export const REPO_ROOT = resolve(process.env.ACTIO_REPO_ROOT || CODE_ROOT)
export const RUNS_DIR = resolve(REPO_ROOT, process.env.ACTIO_RUNS_DIR || '.actio/runs')
const TEMPLATE_DIR = resolve(CODE_ROOT, process.env.ACTIO_TEMPLATE_DIR || '.actio/TEMPLATE/lanes')
const LANES = ['micro', 'standard-ui', 'standard-db', 'full']

/** Gates whose owner must record in `reviewed` the snapshot it judged (A2). */
export const JUDGED_GATES = ['design', 'review-1of3', 'review-2of3', 'review-3of3', 'security', 'regression-guard', 'engineering', 'quality']
const STATUSES = ['working', 'passed', 'blocked', 'rejected', 'escalated']
const RESULTS = ['pass', 'fail', 'n/a']
const SEVERITIES = ['blocker', 'major', 'minor', 'nit']
const KNOWN_KEYS = new Set(['run', 'agent', 'stage', 'status', 'started', 'finished', 'reviewed', 'consumed', 'produced', 'gates', 'plan', 'checks', 'findings', 'blockers', 'missing_inputs', 'machinery_findings', 'decisions_for_shehab', 'next'])
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const RISK = /^\s*Risk:/i

/* ------------------------------------------------------------------ shared helpers */

export const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const slash = (p) => String(p).replace(/\\/g, '/')
const arr = (x) => (Array.isArray(x) ? x : [])
const clip = (s, n = 60) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s))
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** A path for printing: repository-relative when inside the repository, else absolute. */
export function show(p) {
  const r = relative(REPO_ROOT, p)
  return slash(r && !r.startsWith('..') && !isAbsolute(r) ? r : p)
}

function fail(message, code = 2) {
  console.error(message)
  process.exit(code)
}

export function activeRun() {
  try {
    return readFileSync(join(RUNS_DIR, '.active'), 'utf8').trim() || null
  } catch {
    return null
  }
}

/** A run folder from a run id (under RUNS_DIR) or a path; null when neither has a run.json. */
export function resolveRunDir(arg) {
  const id = arg || activeRun()
  if (!id) return null
  for (const dir of [resolve(id), join(RUNS_DIR, id)]) if (existsSync(join(dir, 'run.json'))) return dir
  return null
}

function needRun(arg) {
  const dir = resolveRunDir(arg)
  if (!dir) fail(arg ? `no run.json for "${arg}" (looked in ${show(RUNS_DIR)})` : 'no run given and no active run in .actio/runs/.active')
  let run
  try {
    run = readJson(join(dir, 'run.json'))
  } catch (err) {
    fail(`run.json does not parse: ${err.message}`)
  }
  return { dir, run, id: run.run || basename(dir) }
}

/** The swarm roster is the set of agent files, so there is no second list to drift. */
export function agentNames() {
  try {
    return readdirSync(join(CODE_ROOT, '.claude', 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
  } catch {
    return []
  }
}

function frontmatter(agent) {
  try {
    const text = readFileSync(join(CODE_ROOT, '.claude', 'agents', `${agent}.md`), 'utf8')
    const fm = (text.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || ''
    const get = (key) => (fm.match(new RegExp(`^${key}:\\s*(\\S+)`, 'm')) || [])[1]
    return { model: get('model'), effort: get('effort') }
  } catch {
    return {}
  }
}

/** The recommended model for a plan entry: its `model` override, else the agent's frontmatter. */
export function modelFor(entry) {
  const fm = frontmatter(entry.agent)
  return `${entry.model || fm.model || 'inherit'}${fm.effort ? '/' + fm.effort : ''}`
}

/** Run artefacts are addressed run-relative; anything else is a repository path. */
function isRunPath(p) {
  const first = slash(p).replace(/^\.\//, '').split('/')[0]
  return ['run.json', 'ledger.md', 'report.md', 'evidence', 'orchestrator'].includes(first) || agentNames().includes(first)
}

function locate(p, runDir) {
  if (!p) return null
  for (const cand of [resolve(p), join(runDir, p), join(REPO_ROOT, p), join(CODE_ROOT, p)]) if (existsSync(cand)) return cand
  return null
}

function nonEmpty(abs) {
  try {
    const s = statSync(abs)
    return s.isDirectory() ? readdirSync(abs).length > 0 : s.size > 0
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ ledger */

const ledgerHead = (id) => `# Ledger · ${id}\n\n| Time (UTC) | Event | Agent | Detail |\n|---|---|---|---|\n`
const cell = (s) => String(s ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim()

/** Append one row to a run's ledger.md, creating the header if the file is missing. */
export function appendLedger(runDir, event, agent, detail) {
  const path = join(runDir, 'ledger.md')
  if (!existsSync(path)) writeFileSync(path, ledgerHead(basename(runDir)), 'utf8')
  const lead = readFileSync(path, 'utf8').endsWith('\n') ? '' : '\n'
  const row = `| ${now()} | ${cell(event)} | ${cell(agent)} | ${cell(detail)} |`
  appendFileSync(path, `${lead}${row}\n`, 'utf8')
  return row
}

/* ------------------------------------------------------------------ git and snapshots */

export function git(args, { env, allowFail = false } = {}) {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', env: env || process.env, maxBuffer: 512 * 1024 * 1024, windowsHide: true })
  if (r.error) {
    if (allowFail) return { status: -1, stdout: '', stderr: r.error.message }
    throw new Error(`git ${args[0]}: ${r.error.message}`)
  }
  if (allowFail) return r
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(r.stderr || '').trim().split('\n').pop()}`)
  return r.stdout.trim()
}

let gitChecked = null
export const inGitRepo = () => (gitChecked ??= git(['rev-parse', '--git-dir'], { allowFail: true }).status === 0)

/** The tree hash of any commit or tree, or null when the object is unknown. */
export function treeOf(rev) {
  if (!rev || !inGitRepo()) return null
  const r = git(['rev-parse', '--verify', '-q', `${rev}^{tree}`], { allowFail: true })
  return r.status === 0 ? r.stdout.trim() : null
}

export function listSnapshots(runId) {
  if (!inGitRepo()) return []
  const r = git(['for-each-ref', '--format=%(refname) %(objectname)', `refs/actio/snapshots/${runId}/`], { allowFail: true })
  if (r.status !== 0) return []
  return r.stdout.split('\n').filter(Boolean)
    .map((line) => { const [ref, sha] = line.split(' '); return { n: Number(ref.split('/').pop()), sha, ref } })
    .filter((s) => Number.isInteger(s.n))
    .sort((a, b) => a.n - b.n)
}

/**
 * Bookkeeping folders that are never code: run records and the verify cache. They are left out
 * of every snapshot even where .gitignore misses them, so writing evidence never changes the
 * key of the code it describes.
 */
function bookkeepingPaths() {
  const rel = slash(relative(REPO_ROOT, RUNS_DIR))
  const inside = rel && !rel.startsWith('..') && !isAbsolute(rel)
  return [...new Set(['.actio/runs', '.actio/verify', ...(inside ? [rel] : [])])]
}

/**
 * The tree of the whole working tree, tracked and untracked, ignored files and bookkeeping
 * excluded, built in a temporary index. The real index is copied, never written, so its stat
 * cache lets `git add -A` hash only what changed.
 */
export function workingTree() {
  const realIndex = resolve(REPO_ROOT, git(['rev-parse', '--git-path', 'index']))
  const tmp = join(tmpdir(), `actio-index-${process.pid}-${Date.now()}`)
  try {
    if (existsSync(realIndex)) copyFileSync(realIndex, tmp)
    const env = { ...process.env, GIT_INDEX_FILE: tmp }
    git(['add', '-A'], { env })
    git(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', ...bookkeepingPaths()], { env })
    return git(['write-tree'], { env })
  } finally {
    rmSync(tmp, { force: true })
    rmSync(`${tmp}.lock`, { force: true })
  }
}

function identityEnv() {
  if (git(['var', 'GIT_COMMITTER_IDENT'], { allowFail: true }).status === 0) return process.env
  const who = { NAME: 'Actio snapshot', EMAIL: 'snapshot@actio.invalid' }
  return { ...process.env, GIT_AUTHOR_NAME: who.NAME, GIT_AUTHOR_EMAIL: who.EMAIL, GIT_COMMITTER_NAME: who.NAME, GIT_COMMITTER_EMAIL: who.EMAIL }
}

/** Commit the working tree under refs/actio/snapshots/<run>/<n>, reusing the last one if unchanged. */
export function takeSnapshot(runId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) throw new Error(`run id "${runId}" cannot name a ref`)
  if (!inGitRepo()) throw new Error(`${show(REPO_ROOT)} is not a git working tree`)
  const tree = workingTree()
  const all = listSnapshots(runId)
  const last = all[all.length - 1] || null
  if (last && treeOf(last.sha) === tree) return { ...last, tree, reused: true, prev: all[all.length - 2] || null }
  const head = git(['rev-parse', '--verify', '-q', 'HEAD'], { allowFail: true })
  const parent = head.status === 0 ? ['-p', head.stdout.trim()] : []
  const n = (last ? last.n : 0) + 1
  const sha = git(['commit-tree', tree, ...parent, '-m', `actio snapshot ${runId} ${n}`], { env: identityEnv() })
  git(['update-ref', `refs/actio/snapshots/${runId}/${n}`, sha])
  return { n, sha, tree, reused: false, prev: last, head: head.status === 0 ? head.stdout.trim() : null }
}

/* ------------------------------------------------------------------ handoff v2 validation */

/**
 * Validate a handoff against the v2 schema in actio-agent-protocol. Returns errors and warnings,
 * one line each. A legacy v1 handoff in a v1 run passes with a warning.
 */
export function validateHandoff(path) {
  const errors = []
  const warnings = []
  const E = (m) => errors.push(m)
  const W = (m) => warnings.push(m)
  const abs = resolve(path)
  let text
  let h
  try {
    text = readFileSync(abs, 'utf8')
  } catch (err) {
    return { errors: [`cannot read ${path}: ${err.code || err.message}`], warnings, kind: null }
  }
  try {
    h = JSON.parse(text)
  } catch (err) {
    return { errors: [`JSON does not parse: ${err.message}`], warnings, kind: null }
  }
  if (!h || typeof h !== 'object' || Array.isArray(h)) return { errors: ['not a JSON object'], warnings, kind: null }

  const file = basename(abs)
  const runDir = dirname(dirname(abs))
  const folder = basename(dirname(abs))
  let run = null
  try {
    run = readJson(join(runDir, 'run.json'))
  } catch {
    W('no readable run.json two folders up: plan, gate and run checks skipped')
  }
  const v2 = (run && Number(run.version) >= 2) || 'plan' in h || 'checks' in h
  if (!v2) {
    if (!STATUSES.slice(1).includes(h.status)) E(`status "${h.status}" is not passed, blocked, rejected or escalated`)
    W('legacy v1 handoff (no plan or checks): accepted without the v2 checks')
    return { errors, warnings, kind: 'v1' }
  }

  const working = h.status === 'working'
  const agents = agentNames()
  const isAgent = (a) => (agents.length ? agents.includes(a) : /^[a-z][a-z-]+$/.test(a))

  const bytes = Buffer.byteLength(text)
  if (bytes > 12288) E(`${bytes} bytes, over the 12 KB hard cap: move long content to an evidence file`)
  else if (bytes > 4096) W(`${bytes} bytes, over the 4 KB soft cap`)
  for (const k of Object.keys(h)) if (!KNOWN_KEYS.has(k)) W(`unknown key "${k}" (not in the v2 schema)`)
  for (const k of ['run', 'agent', 'stage', 'status', 'started', 'consumed', 'produced']) if (!(k in h)) E(`missing "${k}"`)
  if (!working) for (const k of ['finished', 'plan', 'next']) if (!(k in h)) E(`missing "${k}" (required once status leaves working)`)
  for (const k of ['consumed', 'produced', 'gates', 'plan', 'checks', 'findings', 'blockers', 'missing_inputs', 'machinery_findings', 'decisions_for_shehab']) {
    if (k in h && !Array.isArray(h[k])) E(`${k} must be an array`)
  }
  if ('status' in h && !STATUSES.includes(h.status)) E(`status "${h.status}" is not one of ${STATUSES.join(', ')}`)
  if (run && h.run != null && h.run !== run.run) E(`run "${h.run}" does not match run.json "${run.run}"`)
  if (h.agent != null && h.agent !== folder) E(`agent "${h.agent}" does not match its folder "${folder}"`)

  // Stage: pairs the handoff with its plan entry, and the file name with the pass.
  const stage = Number(h.stage)
  if ('stage' in h && !Number.isInteger(stage)) E(`stage "${h.stage}" is not a whole number`)
  else if (run && 'stage' in h) {
    const mine = arr(run.plan).filter((e) => e.agent === h.agent).sort((a, b) => a.stage - b.stage)
    const named = file.match(/^handoff-stage(\d+)/)
    // The orchestrator runs every boundary and closes the run without a plan entry of its own.
    if (!mine.length) { if (h.agent !== 'orchestrator') E(`run.json has no plan entry for ${h.agent}`) }
    else if (!mine.some((e) => Number(e.stage) === stage)) E(`stage ${stage} matches no plan entry for ${h.agent} (planned: ${mine.map((e) => e.stage).join(', ')})`)
    else if (file === 'handoff.json' && stage !== Number(mine[0].stage)) E(`handoff.json is the first pass (stage ${mine[0].stage}); stage ${stage} writes handoff-stage${stage}.json`)
    else if (named && Number(named[1]) !== stage) E(`the file name says stage ${named[1]}, the handoff says stage ${stage}`)
    else if (file !== 'handoff.json' && !named) W(`${file} is neither handoff.json nor handoff-stage<N>.json`)
  }

  for (const k of ['started', 'finished']) {
    if (h[k] != null && !(typeof h[k] === 'string' && ISO.test(h[k]))) E(`${k} "${h[k]}" is not ISO 8601 UTC (date -u +%Y-%m-%dT%H:%M:%SZ)`)
    else if (h[k] && Date.parse(h[k]) > Date.now() + 10 * 60000) E(`${k} ${h[k]} is in the future: take it from the shell`)
  }
  if (working && h.finished != null) E('finished is set while status is working')
  if (ISO.test(h.started) && ISO.test(h.finished) && Date.parse(h.started) > Date.parse(h.finished)) E(`started ${h.started} is after finished ${h.finished}`)

  const judged = arr(h.gates).filter((g) => g && JUDGED_GATES.includes(g.name))
  if (h.reviewed != null) {
    if (typeof h.reviewed !== 'string' || !/^[0-9a-f]{7,40}$/.test(h.reviewed)) E(`reviewed "${h.reviewed}" is not a commit or tree hash`)
    else if (inGitRepo() && !treeOf(h.reviewed)) E(`reviewed ${h.reviewed} is not an object in this repository (take it with run.mjs snapshot)`)
  } else if (!working && judged.length) {
    E(`reviewed is required: ${judged.map((g) => g.name).join(', ')} must record the snapshot it judged (A2)`)
  }

  for (const k of ['consumed', 'produced']) {
    arr(h[k]).forEach((p, i) => {
      if (typeof p !== 'string' || !p.trim()) return E(`${k}[${i}] is not a path`)
      if (/\s/.test(p)) return E(`${k}[${i}] is not one plain path: "${clip(p)}"`)
      if (/[<>*]/.test(p)) return E(`${k}[${i}] is a placeholder; name the real path: ${p}`)
      const at = locate(p, runDir)
      // A working checkpoint names what it will write before writing it; only a hand-off must deliver.
      if (k === 'produced' && !(at && nonEmpty(at))) {
        if (working) W(`produced ${p} is not written yet (checkpoint)`)
        else E(`produced ${p} is missing or empty (PHANTOM_OUTPUT)`)
      }
      if (k === 'consumed' && !at) W(`consumed ${p} does not exist (FALSE_CONSUMPTION)`)
    })
  }

  const gateByName = new Map(arr(run?.gates).map((g) => [g.name, g]))
  arr(h.gates).forEach((g, i) => {
    if (!g || typeof g.name !== 'string') return E(`gates[${i}] has no name`)
    const def = gateByName.get(g.name)
    if (run && !def) E(`gate "${g.name}" is not in run.json gates (UNKNOWN_GATE)`)
    else if (def && def.owner !== h.agent) E(`gate "${g.name}" is owned by ${def.owner} (GATE_SELF_CERTIFIED)`)
    if (!RESULTS.includes(g.result)) E(`gate "${g.name}" result "${g.result}" is not pass, fail or n/a`)
    if (g.result === 'n/a' && !(typeof g.reason === 'string' && g.reason.trim())) E(`gate "${g.name}" is n/a without a reason`)
    if (g.result === 'pass' && !g.evidence) E(`gate "${g.name}" passes with no evidence path`)
    else if (g.result === 'pass' && !locate(g.evidence, runDir)) E(`gate "${g.name}" evidence ${g.evidence} does not exist (GATE_UNRESOLVED)`)
  })
  if (working && arr(h.gates).length) W('gates in a working checkpoint are ignored until hand-off')

  const plan = arr(h.plan)
  if (!working && plan.length === 0) E('plan is empty: 1 to 6 lines, at least one starting "Risk:"')
  if (plan.length > 6) E(`plan has ${plan.length} lines, the cap is 6`)
  if (plan.some((l) => typeof l !== 'string' || !l.trim())) E('plan lines must be non-empty strings')
  if (!working && plan.length && !plan.some((l) => typeof l === 'string' && RISK.test(l))) E('plan has no line starting "Risk:" (A1: the pre-mortem is verifiable)')

  const checks = arr(h.checks)
  if (h.status === 'passed' && checks.length === 0) E('checks is empty: a passed handoff records at least one criterion, result and evidence')
  checks.forEach((c, i) => {
    if (!c || typeof c.criterion !== 'string' || !c.criterion.trim()) E(`checks[${i}] has no criterion`)
    if (!RESULTS.includes(c?.result)) E(`checks[${i}] result "${c?.result}" is not pass, fail or n/a`)
    else if (c.result === 'fail' && h.status === 'passed') E(`checks[${i}] failed but status is passed: fix it or record a blocker`)
  })

  arr(h.findings).forEach((f, i) => {
    if (!f || typeof f !== 'object') return E(`findings[${i}] is not an object`)
    const id = f.id || `findings[${i}]`
    if (!f.id) E(`findings[${i}] has no id`)
    if (!SEVERITIES.includes(f.severity)) E(`${id} severity "${f.severity}" is not blocker, major, minor or nit`)
    if (!['open', 'fixed', 'accepted'].includes(f.status)) E(`${id} status "${f.status}" is not open, fixed or accepted`)
    if (typeof f.what !== 'string' || !f.what.trim()) E(`${id} has no what`)
    else if (f.what.length > 240) E(`${id} what is ${f.what.length} characters, the cap is 240`)
  })
  const serious = arr(h.findings).filter((f) => f && f.status === 'open' && ['blocker', 'major'].includes(f.severity))
  const passing = arr(h.gates).filter((g) => g && g.result === 'pass')
  if (serious.length && passing.length) E(`${passing.map((g) => g.name).join(', ')} passes with ${serious.map((f) => f.id).join(', ')} open (blocker or major)`)

  arr(h.blockers).forEach((b, i) => {
    for (const k of ['what', 'why', 'needs']) if (!b || typeof b[k] !== 'string' || !b[k].trim()) E(`blockers[${i}] has no ${k}`)
    if (b?.needs && b.needs !== 'shehab' && !isAgent(b.needs)) E(`blockers[${i}] needs "${b.needs}", which is neither an agent nor shehab`)
  })
  if (h.status === 'blocked' && !arr(h.blockers).length) E('status is blocked but blockers is empty')

  arr(h.decisions_for_shehab).forEach((d, i) => {
    if (!d || typeof d.question !== 'string' || !d.question.trim()) E(`decisions_for_shehab[${i}] has no question`)
    if (!Array.isArray(d?.options) || d.options.length < 2) E(`decisions_for_shehab[${i}] needs at least two options (never a bare question)`)
    if (!d || typeof d.recommendation !== 'string' || !d.recommendation.trim()) E(`decisions_for_shehab[${i}] has no recommendation`)
  })

  if ('next' in h && h.next !== null && h.next !== 'shehab' && !isAgent(h.next)) E(`next "${h.next}" is not an agent, shehab or null`)
  return { errors, warnings, kind: 'v2' }
}

/* ------------------------------------------------------------------ commands */

function cmdHandoff(path) {
  if (!path) fail('usage: run.mjs handoff <path-to-handoff>')
  const { errors, warnings, kind } = validateHandoff(path)
  const lines = [...errors.map((e) => `error: ${e}`), ...warnings.map((w) => `warning: ${w}`)]
  let status = ''
  try { status = JSON.parse(readFileSync(resolve(path), 'utf8')).status } catch { /* reported above */ }
  console.log(errors.length ? `invalid: ${slash(path)} (${errors.length} error${errors.length === 1 ? '' : 's'})` : `valid: ${slash(path)} (${kind}, status ${status})`)
  for (const l of lines.slice(0, 22)) console.log(l)
  if (lines.length > 22) console.log(`... ${lines.length - 22} more`)
  process.exit(errors.length ? 1 : 0)
}

function cmdLedger(runArg, event, agent, detail) {
  if (!runArg || !event || !agent) fail('usage: run.mjs ledger <run> <event> <agent> <detail...>')
  const { dir } = needRun(runArg)
  console.log(appendLedger(dir, event, agent, detail.join(' ')))
}

function cmdSnapshot(runArg) {
  const { id } = needRun(runArg)
  let s
  try {
    s = takeSnapshot(id)
  } catch (err) {
    fail(`snapshot failed: ${err.message}`, 1)
  }
  const short = (x) => (x ? x.slice(0, 12) : 'none')
  console.log(s.reused ? `snapshot ${s.n} of ${id} (unchanged since it was taken): ${s.sha}` : `snapshot ${s.n} of ${id}: ${s.sha}`)
  console.log(`  record it as "reviewed": "${s.sha}"`)
  console.log(`  tree ${short(s.tree)} · ref refs/actio/snapshots/${id}/${s.n}${s.head ? ` · parent HEAD ${short(s.head)}` : ''}`)
  if (s.prev) {
    const stat = git(['diff', '--shortstat', s.prev.sha, s.sha], { allowFail: true }).stdout?.trim() || 'no change'
    console.log(`  delta from snapshot ${s.prev.n}: git diff ${short(s.prev.sha)} ${short(s.sha)} (${stat})`)
  }
}

/** Sync gates, then run the check as JSON. Both are separate scripts so each stays usable alone. */
function runCheck(dir, extra = []) {
  const opts = { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 }
  const sync = spawnSync(process.execPath, [join(HERE, 'sync-gates.mjs'), dir, '--json'], opts)
  let synced = null
  try { synced = JSON.parse(sync.stdout) } catch { /* sync failure surfaces as stale gates in the check */ }
  const chk = spawnSync(process.execPath, [join(HERE, 'utilisation-check.mjs'), dir, '--json', ...extra], opts)
  let report = null
  try { report = JSON.parse(chk.stdout) } catch { /* handled below */ }
  if (!report) fail(`utilisation check failed: ${(chk.stderr || chk.stdout || '').trim().split('\n')[0]}`, 1)
  return { synced, report }
}

const findingLine = (f) => `  ${f.blocking ? 'BLOCKING' : 'advisory'} ${f.code}: ${f.subject}: ${clip(f.detail, 150)}`

function cmdNext(runArg) {
  const { dir, run, id } = needRun(runArg)
  const { synced, report } = runCheck(dir)
  const blocking = report.findings.filter((f) => f.blocking)
  const advisory = report.findings.filter((f) => !f.blocking)
  const out = [`run ${id} · lane ${run.lane || 'unset'} · ${now()}`]
  if (synced?.applied?.length) out.push(`gate sync applied: ${synced.applied.map((a) => a.split('  ')[0]).join('; ')}`)
  for (const g of report.gates) out.push(`  gate ${g.name.padEnd(17)} ${String(g.result).padEnd(8)} ${g.owner}`)
  out.push(`blocking ${blocking.length} · advisory ${advisory.length}`)
  for (const f of blocking.slice(0, 6)) out.push(findingLine(f))
  if (blocking.length > 6) out.push(`  ... ${blocking.length - 6} more blocking: node .actio/bin/utilisation-check.mjs ${id}`)
  for (const f of advisory.slice(0, 5)) out.push(findingLine(f))
  if (report.due.length) {
    out.push(blocking.length ? 'due once the blocking findings are resolved:' : 'due now (dispatch them in one message):')
    for (const d of report.due) {
      const entry = arr(run.plan).find((e) => e.agent === d.agent && Number(e.stage) === Number(d.stage)) || d
      out.push(`  stage ${d.stage} ${d.agent} · model ${modelFor(entry)} · run.mjs dispatch ${id} ${d.agent} --stage ${d.stage}`)
    }
  } else out.push('due now: none')
  for (const r of report.running) out.push(`  running: stage ${r.stage} ${r.agent} (working since ${r.started || '?'}; resume with SendMessage if it stopped)`)
  if (report.waiting.length) out.push(`waiting: ${report.waiting.length} (first: stage ${report.waiting[0].stage} ${report.waiting[0].agent}, on ${clip(report.waiting[0].on, 70)})`)
  console.log(out.join('\n'))
  appendLedger(dir, 'utilisation check', 'orchestrator', `blocking ${blocking.length} · advisory ${advisory.length} · due ${report.due.map((d) => d.agent).join(', ') || 'none'}`)
  process.exit(blocking.length ? 1 : 0)
}

function cmdClose(runArg, confirm) {
  const { dir, id } = needRun(runArg)
  const { report } = runCheck(dir, ['--closing'])
  const blocking = report.findings.filter((f) => f.blocking)
  const advisory = report.findings.filter((f) => !f.blocking)
  const unresolved = report.gates.filter((g) => g.name !== 'run-closure' && !['pass', 'n/a'].includes(g.result))
  const closure = report.gates.find((g) => g.name === 'run-closure')
  const can = blocking.length === 0 && unresolved.length === 0
  const out = [can ? `run-closure can pass for ${id}` : `run-closure cannot pass for ${id}: ${blocking.length + unresolved.length} open items`]
  for (const g of unresolved) out.push(`  gate ${g.name} reads ${g.result} (owner ${g.owner})`)
  for (const f of blocking.slice(0, 12)) out.push(findingLine(f))
  if (blocking.length > 12) out.push(`  ... ${blocking.length - 12} more: node .actio/bin/utilisation-check.mjs ${id} --closing`)
  out.push(`advisory ${advisory.length} (record them in report.md) · run-closure gate reads ${closure ? closure.result : 'absent'}`)
  if (confirm) {
    if (activeRun() === id) rmSync(join(RUNS_DIR, '.active'), { force: true })
    appendLedger(dir, 'run closed', 'orchestrator', `${can ? 'run-closure can pass' : `closed with ${blocking.length + unresolved.length} open items`} · run-closure gate ${closure ? closure.result : 'absent'} · .active cleared`)
    out.push('.active cleared · run closed row appended')
  } else {
    out.push(`then write report.md and orchestrator/handoff.json (gate run-closure) and run: node .actio/bin/run.mjs close ${id} --confirm`)
  }
  console.log(out.join('\n'))
  process.exit(can ? 0 : 1)
}

/** Which gates this plan entry certifies: its `gates` field, or the owner's pass before the first stage the gate blocks. */
function gatesFor(run, entry) {
  if (Array.isArray(entry.gates)) return entry.gates
  const mine = arr(run.plan).filter((e) => e.agent === entry.agent).sort((a, b) => a.stage - b.stage)
  return arr(run.gates).filter((g) => {
    if (g.owner !== entry.agent) return false
    if (mine.length === 1) return true
    const blocked = arr(run.plan).filter((e) => arr(e.blocked_by).includes(g.name)).map((e) => Number(e.stage))
    if (!blocked.length) return entry === mine[mine.length - 1]
    const before = mine.filter((e) => Number(e.stage) < Math.min(...blocked))
    return before[before.length - 1] === entry
  }).map((g) => g.name)
}

function readHandoff(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function cmdDispatch(runArg, agent, stageArg) {
  if (!runArg || !agent) fail('usage: run.mjs dispatch <run> <agent> [--stage N]')
  const { dir, run, id } = needRun(runArg)
  const mine = arr(run.plan).filter((e) => e.agent === agent).sort((a, b) => a.stage - b.stage)
  if (!mine.length) fail(`${agent} has no plan entry in ${id} (lane ${run.lane || 'unset'})`)
  const fileFor = (e) => (mine.indexOf(e) === 0 ? 'handoff.json' : `handoff-stage${e.stage}.json`)
  const done = (e) => { const h = readHandoff(join(dir, agent, fileFor(e))); return h && h.status !== 'working' }
  const entry = stageArg != null ? mine.find((e) => Number(e.stage) === Number(stageArg)) : mine.find((e) => !done(e)) || mine[mine.length - 1]
  if (!entry) fail(`${agent} has no stage ${stageArg} entry (planned: ${mine.map((e) => e.stage).join(', ')})`)

  const runRel = show(dir)
  const at = (p) => (isRunPath(p) ? `${runRel}/${slash(p)}` : slash(p))
  const handoffPath = `${runRel}/${agent}/${fileFor(entry)}`
  const gates = gatesFor(run, entry)
  const maker = arr(entry.produces).some((p) => !isRunPath(p))
  const out = [
    `Actio run ${id} · stage ${entry.stage} · ${agent} · pass ${mine.indexOf(entry) + 1} of ${mine.length} · lane ${run.lane || 'unset'}`,
    `Task: ${entry.task || '(no task text in run.json)'}`,
  ]
  const list = (title, items) => { if (items.length) { out.push(title); for (const p of items) out.push(`  - ${p}`) } }
  list('Read before you start:', arr(entry.read).map(at))
  list('Inputs:', arr(entry.consumes).map(at))
  list('Outputs:', arr(entry.produces).map(at))
  out.push(gates.length ? `Gate you certify: ${gates.join(', ')}${gates.some((g) => JUDGED_GATES.includes(g)) ? ' (record the snapshot you judged as "reviewed")' : ''}` : 'Gate you certify: none')
  if (arr(entry.blocked_by).length) out.push(`Blocked by: ${entry.blocked_by.map((g) => `${g}=${arr(run.gates).find((x) => x.name === g)?.result ?? '?'}`).join(', ')}`)
  out.push(arr(entry.brand).length ? `BRAND.md sections: ${entry.brand.join(', ')} (read a section before citing it)` : 'BRAND.md sections: none named for this stage')
  list('Acceptance criteria:', arr(entry.accept))

  const existing = readHandoff(join(dir, agent, fileFor(entry)))
  if (existing && existing.status !== 'working') out.push(`This pass already handed off (status ${existing.status}). For rework, resume the agent with SendMessage.`)
  else if (existing) out.push(`A working checkpoint exists (started ${existing.started || '?'}): continue from it.`)
  const snaps = listSnapshots(id)
  const latest = snaps[snaps.length - 1]
  if (existing?.reviewed && latest && treeOf(existing.reviewed) !== treeOf(latest.sha)) {
    out.push(`Delta: you judged ${existing.reviewed.slice(0, 12)}; read only git diff ${existing.reviewed.slice(0, 12)} ${latest.sha.slice(0, 12)} plus your open findings.`)
  }

  const tail = [
    `Handoff: ${handoffPath} (stage ${entry.stage})`,
    ...(maker || gates.some((g) => JUDGED_GATES.includes(g)) ? [`Snapshot: node .actio/bin/run.mjs snapshot ${id} (its sha is your "reviewed")`] : []),
    // engineering-lead builds the verify bundle once; the gates after it reuse it for the same tree.
    ...(agent === 'engineering-lead' ? [`Verify: node .actio/bin/verify.mjs --run ${id} (one call; later gates reuse its bundle)`]
      : ['qc-engineer', 'qc-lead', 'release-engineer'].includes(agent) ? [`Verify: reuse ${runRel}/evidence/verify/latest.json; node .actio/bin/verify.mjs --run ${id} is a cache hit when the code is unchanged`] : []),
    'Loop v2 (actio-agent-protocol):',
    '  1. Checkpoint first: write the handoff with status "working", started (date -u) and plan[] (at most 6 lines, one starting "Risk:").',
    `  2. Self-check into checks[]; then node .actio/bin/run.mjs handoff ${handoffPath} until it exits 0.`,
    '  3. Final message at most 8 lines: status, gate and result, next, blocker count, handoff path. Never paste artefacts.',
  ]
  const slice = join(dir, 'bug-historian', 'brief', `${agent}.md`)
  if (agent !== 'bug-historian' && existsSync(slice)) {
    const lines = readFileSync(slice, 'utf8').replace(/\s+$/, '').split(/\r?\n/)
    const room = Math.max(10, 40 - out.length - tail.length - 1)
    out.push(`Your brief slice (${runRel}/bug-historian/brief/${agent}.md; list it in consumed):`)
    for (const l of lines.slice(0, room)) out.push(`  | ${l}`)
    if (lines.length > room) out.push(`  | ... ${lines.length - room} more lines in the file`)
  } else if (agent !== 'bug-historian') {
    out.push(`Brief slice: ${runRel}/bug-historian/brief/${agent}.md is not on disk; read ${runRel}/bug-historian/brief.md if it exists.`)
  }
  console.log([...out, ...tail].join('\n'))
}

function readTemplate(lane) {
  const path = join(TEMPLATE_DIR, `${lane}.json`)
  if (!existsSync(path)) {
    let have = []
    try { have = readdirSync(TEMPLATE_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) } catch { /* none */ }
    fail(`lane template missing: ${show(path)} (available: ${have.join(', ') || 'none'})`)
  }
  let tpl
  try {
    tpl = readJson(path)
  } catch (err) {
    fail(`lane template ${show(path)} does not parse: ${err.message}`)
  }
  const bad = !Array.isArray(tpl.plan) || !tpl.plan.length ? 'no plan[]'
    : !Array.isArray(tpl.gates) ? 'no gates[]'
    : tpl.plan.some((e) => !e || !Number.isFinite(Number(e.stage)) || typeof e.agent !== 'string') ? 'a plan entry has no stage or agent' : ''
  if (bad) fail(`lane template ${show(path)} is not a run plan: ${bad}`)
  return tpl
}

/**
 * Build run.json from a lane template: expand `<agent>` in paths, drop release on --no-ships,
 * keep only the gates whose owner is in the plan, and record every drop in out_of_scope.
 */
function buildRun(tpl, { id, lane, ships, opened }) {
  const { $comment, _comment, description, ...rest } = tpl
  const plan = JSON.parse(JSON.stringify(tpl.plan))
  let gates = JSON.parse(JSON.stringify(tpl.gates))
  const outOfScope = [...arr(tpl.out_of_scope)]
  const dropped = []

  if (!ships) {
    for (const e of plan.filter((x) => x.agent === 'release-engineer')) {
      const ownGates = gates.filter((g) => g.owner === 'release-engineer').map((g) => g.name)
      for (const other of plan) {
        if (!arr(other.blocked_by).some((g) => ownGates.includes(g))) continue
        other.blocked_by = [...new Set(other.blocked_by.flatMap((g) => (ownGates.includes(g) ? arr(e.blocked_by) : [g])))]
      }
      plan.splice(plan.indexOf(e), 1)
    }
    for (const other of plan) other.consumes = arr(other.consumes).filter((p) => !slash(p).startsWith('release-engineer/'))
    outOfScope.push('release-engineer and the release gate: a non-shipping run (--no-ships)')
  }
  const inPlan = new Set(plan.map((e) => e.agent))
  gates = gates.filter((g) => {
    if (inPlan.has(g.owner) || g.owner === 'orchestrator') return true
    dropped.push(g.name)
    if (ships || g.owner !== 'release-engineer') outOfScope.push(`gate ${g.name}: its owner ${g.owner} is not in the ${lane} plan`)
    return false
  })
  for (const g of gates) { g.result = 'pending'; delete g.evidence; delete g.reason }
  for (const e of plan) {
    e.blocked_by = arr(e.blocked_by).filter((g) => !dropped.includes(g))
    for (const k of ['consumes', 'read']) if (Array.isArray(e[k])) e[k] = e[k].map((p) => p.replace(/<agent>/g, e.agent))
    if (Array.isArray(e.produces)) {
      e.produces = e.produces.flatMap((p) => (p.includes('<agent>')
        ? [...inPlan].filter((a) => a !== e.agent && a !== 'orchestrator').map((a) => p.replace(/<agent>/g, a))
        : [p]))
    }
  }
  return {
    ...rest,
    version: 2,
    run: id,
    lane,
    lane_reason: tpl.lane_reason || '<orchestrator: why this lane, from the files the change touches>',
    brief: tpl.brief || '<orchestrator: the brief, in the Product Lead\'s words>',
    opened,
    ships,
    done_means: arr(tpl.done_means),
    out_of_scope: outOfScope,
    plan,
    gates,
    amendments: arr(tpl.amendments),
    utilisation: [],
  }
}

function preflight(runDir, id) {
  const sh = (cmd, timeout) => spawnSync(cmd, { shell: true, encoding: 'utf8', cwd: CODE_ROOT, timeout, windowsHide: true })
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 24
  const npm = sh('npm --version', 60000)
  const npmV = npm.status === 0 ? npm.stdout.trim() : null
  let pw
  if (process.env.ACTIO_PREFLIGHT_MCP === 'skip') pw = { ok: false, line: 'not checked (ACTIO_PREFLIGHT_MCP=skip)' }
  else {
    const r = sh('claude mcp list', 120000)
    const line = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).find((l) => /^playwright: /.test(l))
    pw = line && /Connected\s*$/.test(line) ? { ok: true, line: line.trim() } : { ok: false, line: line ? line.trim() : `no playwright line (exit ${r.status ?? r.error?.code})` }
  }
  const stamp = now()
  const log = [
    `# Toolchain pre-flight · ${id} · ${stamp}`,
    `node: ${process.version} (${nodeOk ? 'answered, 24 or later' : 'below 24'})`,
    `npm: ${npmV || 'did not answer'}`,
    `playwright MCP: ${pw.line} (${pw.ok ? 'answered' : 'playwright MCP not answering'})`,
    'supabase MCP: orchestrator to run list_tables (an MCP call, not scriptable)',
    '',
  ].join('\n')
  writeFileSync(join(runDir, 'evidence', 'toolchain-preflight.log'), log, 'utf8')
  const summary = `node ${process.version}, npm ${npmV || 'missing'}, playwright ${pw.ok ? 'Connected' : 'not answering'}, supabase: orchestrator to run list_tables`
  appendLedger(runDir, 'toolchain pre-flight', 'orchestrator', `${summary} · evidence/toolchain-preflight.log`)
  return { ok: nodeOk && !!npmV, summary, playwright: pw.ok }
}

function cmdOpen(slug, lane, ships) {
  if (!slug || !lane) fail(`usage: run.mjs open <slug> --lane ${LANES.join('|')} [--no-ships]`)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail(`slug "${slug}" must be lower-case letters, digits and hyphens`)
  if (!/^[a-z0-9-]+$/.test(lane)) fail(`lane "${lane}" is not a lane name (${LANES.join(', ')})`)
  const tpl = readTemplate(lane)
  const opened = now()
  const id = `${opened.slice(0, 10)}-${slug}`
  const dir = join(RUNS_DIR, id)
  if (existsSync(dir)) fail(`run ${id} already exists at ${show(dir)}`)
  const run = buildRun(tpl, { id, lane, ships, opened })
  const previous = activeRun()

  mkdirSync(join(dir, 'evidence'), { recursive: true })
  writeFileSync(join(dir, 'run.json'), JSON.stringify(run, null, 2) + '\n', 'utf8')
  writeFileSync(join(dir, 'ledger.md'), ledgerHead(id), 'utf8')
  appendLedger(dir, 'run opened', 'orchestrator', `lane ${lane} · ships ${ships} · run.json from ${show(join(TEMPLATE_DIR, lane + '.json'))}`)
  writeFileSync(join(RUNS_DIR, '.active'), id + '\n', 'utf8')
  const pre = preflight(dir, id)

  const placeholder = (v) => (Array.isArray(v) ? v.length === 0 : !v || /<[^>]+>/.test(String(v)))
  const fill = ['brief', 'lane_reason', 'done_means'].filter((k) => placeholder(run[k]))
  const tasks = run.plan.filter((e) => placeholder(e.task)).map((e) => `${e.stage} ${e.agent}`)
  const patterns = [...new Set(run.plan.flatMap((e) => [...arr(e.consumes), ...arr(e.produces)]).filter((p) => /<[^>]+>|NNNN/.test(p)))]
  const out = [
    `opened ${id} · lane ${lane} · ships ${ships}${previous && previous !== id ? ` · .active was ${previous}` : ''}`,
    `  run ${show(dir)}/ · plan ${run.plan.length} entries · gates ${run.gates.map((g) => g.name).join(', ')}`,
    `  pre-flight: ${pre.summary} · evidence/toolchain-preflight.log`,
    'Fill in run.json before the first dispatch:',
    `  ${[...fill, 'out_of_scope (check the dropped stages and gates)'].join(', ')}`,
  ]
  if (tasks.length) out.push(`  task text for stage ${tasks.join(', ')}`)
  if (patterns.length) out.push(`  placeholders (fill once known; the check matches them as patterns): ${clip(patterns.join(', '), 160)}`)
  out.push('Supabase: call mcp__supabase__list_tables once, then record it:')
  out.push(`  node .actio/bin/run.mjs ledger ${id} "toolchain pre-flight" orchestrator "supabase list_tables answered"`)
  if (!pre.ok) out.push('STOP: node 24 or npm did not answer. No stage can run: escalate to Shehab.')
  else if (!pre.playwright) out.push('playwright MCP not answering: record it in blockers and escalate to Shehab; still dispatch every stage.')
  out.push(`Then: node .actio/bin/run.mjs next ${id}`)
  console.log(out.join('\n'))
  process.exit(pre.ok ? 0 : 1)
}

const USAGE = `Usage: node .actio/bin/run.mjs <command>
  open <slug> --lane ${LANES.join('|')} [--no-ships]
  next [<run>]
  dispatch <run> <agent> [--stage N]
  ledger <run> <event> <agent> <detail...>
  handoff <path>
  snapshot <run>
  close <run> [--confirm]
<run> is a run id under ACTIO_RUNS_DIR or a run folder; next defaults to the active run.`

function main(argv) {
  const [cmd, ...rest] = argv
  const flag = (name) => rest.includes(name)
  const value = (name) => { const i = rest.indexOf(name); return i === -1 ? null : rest[i + 1] }
  const positional = rest.filter((a, i) => !a.startsWith('--') && !['--lane', '--stage'].includes(rest[i - 1]))
  switch (cmd) {
    case 'open': return cmdOpen(positional[0], value('--lane'), !flag('--no-ships'))
    case 'next': return cmdNext(positional[0])
    case 'dispatch': return cmdDispatch(positional[0], positional[1], value('--stage'))
    case 'ledger': return cmdLedger(rest[0], rest[1], rest[2], rest.slice(3))
    case 'handoff': return cmdHandoff(positional[0])
    case 'snapshot': return cmdSnapshot(positional[0])
    case 'close': return cmdClose(positional[0], flag('--confirm'))
    default:
      console.log(USAGE)
      process.exit(cmd && !['-h', '--help', 'help'].includes(cmd) ? 2 : 0)
  }
}

const entry = process.argv[1] ? resolve(process.argv[1]) : ''
if (entry.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main(process.argv.slice(2))
