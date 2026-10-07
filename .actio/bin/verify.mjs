#!/usr/bin/env node
/**
 * verify.mjs: lint, typecheck, test and build once per tree, so every gate after engineering
 * reuses one bundle instead of rebuilding.
 *
 *   node .actio/bin/verify.mjs [--run <id>] [--force] [--only web,extension,db] [--e2e]
 *
 * Key. The tree hash of the working tree (tracked and untracked, ignored files and bookkeeping
 * excluded), cut to 12 characters: the same code gives the same key whatever HEAD is. With
 * --run the tree is also committed as the run's snapshot (run.mjs snapshot), so the key and the
 * `reviewed` value a gate owner records name the same code.
 *
 * Steps. web/ and extension/ each run whichever of lint, typecheck, test and build their
 * package.json defines (e2e too with --e2e); db runs `npm run db:test` when supabase/ exists.
 * Workspaces run in parallel, the steps of one workspace in order, and every step runs even
 * when an earlier one failed, so one pass reports everything.
 *
 * Output. <base>/<key>/<workspace>-<step>.log, <base>/<key>/summary.json (step, exit code,
 * duration, log path) and <base>/latest.json pointing at that summary. <base> is the run's
 * evidence/verify/ with --run, else .actio/verify/.
 *
 * Invariants this file upholds:
 *   - A step already recorded for this key is never run again without --force: summary.json
 *     is printed instead. A step that could not start (no node_modules) is not a result and is
 *     retried on the next call.
 *   - It never installs anything. A workspace with dependencies and no node_modules is
 *     reported blocked with the command that fixes it.
 *   - Exit 0 only when at least one step ran or was reused and every one passed; 1 when a step
 *     failed, could not start, or nothing was verified; 2 on a usage error.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, openSync, closeSync } from 'node:fs'
import { join, basename } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { REPO_ROOT, resolveRunDir, takeSnapshot, workingTree, inGitRepo, git, show, now } from './run.mjs'

const WORKSPACES = ['web', 'extension', 'db']
const STEPS = ['lint', 'typecheck', 'test', 'build']
const STEP_TIMEOUT_MS = Number(process.env.ACTIO_VERIFY_TIMEOUT_MS) || 20 * 60 * 1000

const USAGE = 'Usage: node .actio/bin/verify.mjs [--run <id>] [--force] [--only web,extension,db] [--e2e]'

function fail(message, code = 2) {
  console.error(message)
  process.exit(code)
}

function parseArgs(argv) {
  const opts = { run: null, force: false, only: WORKSPACES, e2e: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--run') opts.run = argv[++i]
    else if (a === '--force') opts.force = true
    else if (a === '--e2e') opts.e2e = true
    else if (a === '--only') opts.only = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0) }
    else fail(`unknown argument "${a}"\n${USAGE}`)
  }
  if (opts.run === undefined || opts.run === '') fail(`--run needs a run id\n${USAGE}`)
  const bad = opts.only.filter((w) => !WORKSPACES.includes(w))
  if (!opts.only.length || bad.length) fail(`--only takes ${WORKSPACES.join(', ')} (got "${bad.join(',') || 'nothing'}")`)
  return opts
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

/** What one workspace would run, or why it is skipped. */
function planFor(ws, e2e) {
  if (ws === 'db') {
    if (!existsSync(join(REPO_ROOT, 'supabase'))) return { ws, skipped: 'no supabase/ folder' }
    const pkg = readJson(join(REPO_ROOT, 'package.json'))
    if (!pkg?.scripts?.['db:test']) return { ws, skipped: 'no db:test script in the root package.json' }
    return { ws, cwd: REPO_ROOT, pkg, steps: ['db:test'] }
  }
  const cwd = join(REPO_ROOT, ws)
  const pkg = readJson(join(cwd, 'package.json'))
  if (!pkg) return { ws, skipped: `no ${ws}/package.json` }
  const steps = [...STEPS, ...(e2e ? ['e2e'] : [])].filter((s) => pkg.scripts?.[s])
  if (!steps.length) return { ws, skipped: `${ws}/package.json defines none of ${STEPS.join(', ')}` }
  return { ws, cwd, pkg, steps }
}

/** npm workspaces hoist to the root, so either folder satisfies an install. */
function missingInstall(p) {
  const deps = Object.keys({ ...p.pkg.dependencies, ...p.pkg.devDependencies })
  if (!deps.length) return null
  if (existsSync(join(p.cwd, 'node_modules')) || existsSync(join(REPO_ROOT, 'node_modules'))) return null
  return `node_modules missing: run npm install at the repository root, then verify again`
}

function stopTree(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
  else child.kill('SIGKILL')
}

/** Run one npm script with its output going straight to the log file. */
function runStep(cwd, step, logPath) {
  return new Promise((done) => {
    const fd = openSync(logPath, 'w')
    const t0 = Date.now()
    let timedOut = false
    let settled = false
    const finish = (exit, note) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { closeSync(fd) } catch { /* already closed */ }
      done({ exit, duration_ms: Date.now() - t0, ...(note ? { note } : {}) })
    }
    const child = spawn(`npm run ${step}`, { cwd, shell: true, stdio: ['ignore', fd, fd], windowsHide: true })
    const timer = setTimeout(() => { timedOut = true; stopTree(child) }, STEP_TIMEOUT_MS)
    child.on('error', (err) => finish(null, `could not start: ${err.message}`))
    child.on('close', (code) => finish(timedOut ? null : code, timedOut ? `timed out after ${STEP_TIMEOUT_MS / 1000}s` : null))
  })
}

const secs = (ms) => `${(ms / 1000).toFixed(1)}s`

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!inGitRepo()) fail(`${REPO_ROOT} is not a git working tree: verify keys its bundle by the tree`, 1)

  let runDir = null
  let runId = null
  if (opts.run) {
    runDir = resolveRunDir(opts.run)
    if (!runDir) fail(`no run.json for "${opts.run}"`)
    runId = readJson(join(runDir, 'run.json'))?.run || basename(runDir)
  }

  // The key is taken before anything runs: the bundle describes the code as it was judged.
  let tree
  let snapshot = null
  try {
    if (runId) {
      const s = takeSnapshot(runId)
      tree = s.tree
      snapshot = s.sha
    } else tree = workingTree()
  } catch (err) {
    fail(`cannot key the tree: ${err.message}`, 1)
  }
  const key = tree.slice(0, 12)
  const base = runDir ? join(runDir, 'evidence', 'verify') : join(REPO_ROOT, '.actio', 'verify')
  const keyDir = join(base, key)
  const summaryPath = join(keyDir, 'summary.json')
  mkdirSync(keyDir, { recursive: true })

  const prior = readJson(summaryPath)
  const known = new Map((prior?.tree === tree ? prior.steps || [] : [])
    .filter((s) => s.result !== 'blocked')
    .map((s) => [`${s.workspace}:${s.step}`, s]))

  const plans = opts.only.map((ws) => planFor(ws, opts.e2e))
  const steps = []
  const skipped = plans.filter((p) => p.skipped).map((p) => ({ workspace: p.ws, reason: p.skipped }))
  let ran = 0
  let reused = 0

  await Promise.all(plans.filter((p) => !p.skipped).map(async (p) => {
    const install = missingInstall(p)
    for (const step of p.steps) {
      const id = `${p.ws}:${step}`
      const logName = `${p.ws}-${step.replace(/[^a-z0-9-]/gi, '-')}.log`
      const cached = known.get(id)
      if (cached && !opts.force) {
        steps.push({ ...cached, cached: true })
        reused++
        continue
      }
      if (install) {
        steps.push({ workspace: p.ws, step, exit: null, result: 'blocked', duration_ms: 0, log: null, note: install })
        continue
      }
      const logPath = join(keyDir, logName)
      const r = await runStep(p.cwd, step, logPath)
      ran++
      steps.push({ workspace: p.ws, step, exit: r.exit, result: r.exit === 0 ? 'pass' : 'fail', duration_ms: r.duration_ms, log: show(logPath), finished: now(), ...(r.note ? { note: r.note } : {}) })
    }
  }))

  // Steps are reported in a stable order whatever finished first.
  const order = (s) => WORKSPACES.indexOf(s.workspace) * 10 + [...STEPS, 'e2e', 'db:test'].indexOf(s.step)
  steps.sort((a, b) => order(a) - order(b))

  // A step that rewrites tracked files would leave a bundle that describes code nobody has.
  const after = ran ? workingTree() : tree
  const failed = steps.filter((s) => s.result === 'fail')
  const blocked = steps.filter((s) => s.result === 'blocked')
  const result = !steps.length ? 'empty' : failed.length ? 'fail' : blocked.length ? 'blocked' : 'pass'
  const head = git(['rev-parse', '--verify', '-q', 'HEAD'], { allowFail: true })

  const summary = {
    key,
    tree,
    snapshot,
    run: runId,
    head: head.status === 0 ? head.stdout.trim() : null,
    updated: now(),
    result,
    ...(after !== tree ? { tree_changed_to: after } : {}),
    steps: steps.map(({ cached, ...s }) => s),
    skipped,
  }
  if (ran || !prior || prior.tree !== tree || JSON.stringify(prior.skipped) !== JSON.stringify(skipped) || blocked.length) {
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8')
  }
  const latestPath = join(base, 'latest.json')
  writeFileSync(latestPath, JSON.stringify({
    key, tree, snapshot, run: runId, result, summary: show(summaryPath), updated: summary.updated,
    counts: { pass: steps.filter((s) => s.result === 'pass').length, fail: failed.length, blocked: blocked.length, skipped: skipped.length },
  }, null, 2) + '\n', 'utf8')

  const out = [`verify key ${key} · tree ${tree.slice(0, 12)} · snapshot ${snapshot ? snapshot.slice(0, 12) : 'none'}${runId ? ` · run ${runId}` : ''}`]
  const hit = ran === 0 && !blocked.length && prior?.tree === tree
  out.push(hit ? `  cache hit: ${show(summaryPath)} already holds this key; ${reused} step${reused === 1 ? '' : 's'} reused, nothing run (--force re-runs)`
    : `  ran ${ran} step${ran === 1 ? '' : 's'}, reused ${reused}`)
  for (const s of steps) {
    out.push(`  ${`${s.workspace} ${s.step}`.padEnd(20)} ${s.result.padEnd(7)} exit ${String(s.exit).padEnd(4)} ${secs(s.duration_ms).padStart(7)}${s.cached ? ' cached' : ''}  ${s.log || s.note || ''}`)
  }
  for (const s of skipped) out.push(`  ${s.workspace.padEnd(20)} skipped: ${s.reason}`)
  if (blocked.length) out.push(`  blocked: ${blocked[0].note}`)
  if (after !== tree) out.push(`  warning: the tree changed while verifying (${tree.slice(0, 12)} -> ${after.slice(0, 12)}); the bundle is keyed to the tree as it started`)
  out.push(`result ${result}${result === 'empty' ? ' (nothing was verified)' : ''} · summary ${show(summaryPath)} · latest ${show(latestPath)}`)
  console.log(out.join('\n'))
  process.exit(result === 'pass' ? 0 : 1)
}

main().catch((err) => fail(`verify failed: ${err.stack || err.message}`, 1))
