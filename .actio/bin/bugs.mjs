#!/usr/bin/env node
// bugs.mjs: the machinery of the defect register. It reads BUGS.md, maps changed paths to
// surface tags, writes the regression brief and its per-agent slices, runs the regression
// guard, and derives the ids and tables that must never be typed by hand.
//
//   node .actio/bin/bugs.mjs index [--json]
//   node .actio/bin/bugs.mjs surfaces (--base <ref> [--head <ref>] | --paths <p...> | --paths -)
//   node .actio/bin/bugs.mjs brief --run <id> (--base <ref> | --surfaces a,b | --paths <p...> | --paths -)
//   node .actio/bin/bugs.mjs guard --run <id> --base <ref> [--head <ref>] [--only BUG-x,BUG-y]
//                                  [--dry] [--timeout <seconds>] [--full-base] [--jobs <n>]
//   node .actio/bin/bugs.mjs proof <BUG-NNNN...> [--bad <ref> --good <ref>]
//   node .actio/bin/bugs.mjs next-id | open-index | lint [--strict]
//
//   --root <repo>       the tree to read and judge (default: the repository holding this script)
//   --register <path>   the register (default: <root>/BUGS.md)
//   ACTIO_RUNS_DIR      overrides <root>/.actio/runs as the run directory root (relative to <root>)
//
// Invariants this file upholds:
//   1. It never writes BUGS.md. It writes only inside a run directory: bug-historian/brief.md,
//      bug-historian/brief/<agent>.md, bug-historian/guard.md, evidence/regression/guard.json.
//   2. A detection runs exactly as read from the register. The command string is handed to
//      `bash -c` untouched, never retyped or re-quoted (BUG-0047: a `\|` retyped inside a JS
//      string literal became "match anything").
//   3. A detection that cannot run (placeholder, missing path, refused as unsafe, error,
//      timeout) is never a pass. It is listed for judgement.
//   4. A hit at head that is absent at base is a repeat. A hit present at both is listed for
//      judgement on a closed entry, never passed in silence.
//   5. Detections are read-only. A command that would write files, fetch or change git state is
//      refused before it runs.
//   6. The base tree, and a --head ref, is a temporary `git worktree` under the OS temp folder,
//      removed afterwards. With no --head the detections run in the working tree under a
//      temporary GIT_INDEX_FILE holding HEAD plus every change, untracked files included, so
//      `git grep` sees what is not yet committed (BUG-0019). The real working tree, index,
//      stash and branches are never touched (R-19).
//   7. Detections run in parallel (--jobs, default the core count up to 8); each is bounded by
//      the timeout and never reads stdin.
//
// Node 24, built-ins only. Runs from Git Bash and from cmd. Splits on /\r?\n/ (CRLF checkouts).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ENTRY_MAX_LINES = 40
const ENTRY_MAX_BYTES = 2560
const BRIEF_MAX_LINES = 60
const BRIEF_JUDGEMENT_LINES = 10 // reserved for bug-historian's own lines
const SLICE_MAX_LINES = 20
const GUARD_MAX_LINES = 40
const TAIL_LINES = 20
const DEFAULT_TIMEOUT_S = 60
const AGENTS = ['orchestrator', 'tech-architect', 'engineering-lead', 'qc-lead', 'ux-designer', 'ux-auditor', 'ux-writer', 'frontend-engineer', 'backend-engineer', 'peer-reviewer', 'code-analyst', 'code-steward', 'security-analyst', 'qc-engineer', 'release-engineer', 'bug-historian']
const REVIEWERS = ['peer-reviewer', 'code-analyst', 'code-steward', 'security-analyst']
const SEVERITY_RANK = { blocker: 0, major: 1, minor: 2, nit: 3 }

class UsageError extends Error {}

const bytesOf = (s) => Buffer.byteLength(s, 'utf8')
const posix = (p) => p.replace(/\\/g, '/')
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const uniq = (xs) => [...new Set(xs)]
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')
const idNum = (id) => Number(id.slice(4))
const fmtId = (n) => `BUG-${String(n).padStart(4, '0')}`

// ------------------------------------------------------------------------------------------
// Options
// ------------------------------------------------------------------------------------------
const BOOL_FLAGS = new Set(['json', 'dry', 'full-base', 'strict'])
const MULTI_FLAGS = new Set(['paths'])

/** Splits argv into the command, positional arguments and --flags. */
function parseArgs(argv) {
  const opts = { cmd: argv[0] && !argv[0].startsWith('--') ? argv[0] : null, _: [] }
  for (let i = opts.cmd ? 1 : 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { opts._.push(a); continue }
    const k = a.slice(2)
    if (MULTI_FLAGS.has(k)) {
      opts[k] = opts[k] || []
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) opts[k].push(argv[++i])
    } else if (!BOOL_FLAGS.has(k) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) opts[k] = argv[++i]
    else opts[k] = true
  }
  return opts
}

// ------------------------------------------------------------------------------------------
// Git and shell
// ------------------------------------------------------------------------------------------
const CHILD_ENV = { ...process.env, MSYS_NO_PATHCONV: '1', MSYS2_ARG_CONV_EXCL: '*', GIT_PAGER: 'cat', PAGER: 'cat' }

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: CHILD_ENV, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
}

/** Resolves a ref to a full commit sha, or throws a usage error naming the ref. */
function revParse(root, ref) {
  try { return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], root).trim() } catch { throw new UsageError(`not a commit in ${root}: ${ref}`) }
}

/**
 * Git Bash, never WSL's bash.exe, which cmd can find first on PATH. Git's own bin/bash.exe
 * sets up the MSYS PATH, so grep, sed and the rest resolve when the parent shell is cmd.
 */
function findBash() {
  if (process.env.ACTIO_BASH && fs.existsSync(process.env.ACTIO_BASH)) return process.env.ACTIO_BASH
  if (process.platform !== 'win32') return 'bash'
  try {
    const exec = git(['--exec-path'], process.cwd()).trim() // <git>/mingw64/libexec/git-core
    const gitRoot = path.resolve(exec, '..', '..', '..')
    for (const rel of ['bin/bash.exe', 'usr/bin/bash.exe']) { const p = path.join(gitRoot, rel); if (fs.existsSync(p)) return p }
  } catch { /* fall through */ }
  for (const p of ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe']) if (fs.existsSync(p)) return p
  return 'bash'
}

const MAX_OUT = 8 * 1024 * 1024
const DEFAULT_JOBS = Math.max(2, Math.min(8, (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 4))

/** Spawns a child with no stdin, bounded by the timeout. Resolves with the result, never rejects. */
function spawnAsync(file, args, opts, timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    let stdout = '', stderr = '', timedOut = false, done = false
    const finish = (r) => { if (!done) { done = true; clearTimeout(timer); resolve({ stdout, stderr, timedOut, ms: Date.now() - t0, ...r }) } }
    let child
    try { child = spawn(file, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }) } catch (e) { return resolve({ exit: null, signal: null, timedOut: false, spawnError: e.message, stdout: '', stderr: '', ms: 0 }) }
    const timer = setTimeout(() => { timedOut = true; child.kill() }, timeoutMs)
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => { if (stdout.length < MAX_OUT) stdout += d })
    child.stderr.on('data', (d) => { if (stderr.length < MAX_OUT) stderr += d })
    child.on('error', (e) => finish({ exit: null, signal: null, spawnError: e.message }))
    child.on('close', (code, signal) => finish({ exit: timedOut ? null : code, signal: signal || null, spawnError: null }))
  })
}

/** Runs one command string through `bash -c`, as read from the register. */
function runShell(bash, cmd, cwd, timeoutMs, env = CHILD_ENV) {
  return spawnAsync(bash, ['-c', cmd], { cwd, env }, timeoutMs)
}

/** Runs fn over items with at most limit in flight. */
async function pool(items, limit, fn) {
  let next = 0
  const worker = async () => { while (next < items.length) { const k = next++; await fn(items[k], k) } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

const MODULE_RUNNER = [
  "import { pathToFileURL } from 'node:url'",
  'const [mod, root, ref] = process.argv.slice(1)',
  'const m = await import(pathToFileURL(mod).href)',
  "if (typeof m.detect !== 'function') throw new Error('module exports no detect()')",
  'const r = await m.detect({ root, ref })',
  'process.stdout.write(JSON.stringify({ hits: (r && Array.isArray(r.hits)) ? r.hits.map(String) : null }))',
].join('\n')

/** Runs a committed detection module in a child node, so a hang is bounded by the timeout. */
async function runModule(modPath, root, ref, timeoutMs, env = process.env) {
  const r = await spawnAsync(process.execPath, ['--input-type=module', '-e', MODULE_RUNNER, modPath, root, ref], { env }, timeoutMs)
  const res = { ...r, stdout: '' }
  try {
    const parsed = JSON.parse(r.stdout || 'null')
    if (!parsed || !Array.isArray(parsed.hits)) throw new Error('detect() returned no hits array')
    res.stdout = parsed.hits.join('\n')
  } catch (e) { if (!res.timedOut && !res.spawnError) { res.exit = res.exit || 2; res.stderr = (res.stderr + '\n' + e.message).trim() } }
  return res
}

/** Creates a detached worktree of ref under the OS temp folder, runs fn in it, removes it. */
async function withWorktree(root, ref, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugs-guard-'))
  const tree = path.join(dir, 'tree')
  git(['worktree', 'add', '--detach', tree, ref], root)
  try { return await fn(tree) } finally {
    try { git(['worktree', 'remove', '--force', tree], root) } catch { fs.rmSync(tree, { recursive: true, force: true }); try { git(['worktree', 'prune'], root) } catch { /* nothing left to prune */ } }
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Runs fn(env) with GIT_INDEX_FILE pointing at a throwaway index that holds HEAD plus every
 * working-tree change, untracked files included and ignored files excluded. Detections that
 * use `git grep` or `git ls-files` then see uncommitted work (BUG-0019). The real index is
 * never read for writing or written.
 */
async function withSnapshotIndex(root, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugs-index-'))
  const env = { ...CHILD_ENV, GIT_INDEX_FILE: path.join(dir, 'index') }
  try {
    for (const args of [['read-tree', 'HEAD'], ['add', '-A']]) execFileSync('git', args, { cwd: root, env, stdio: 'ignore', maxBuffer: 64 * 1024 * 1024 })
    return await fn(env)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

/** Every path changed against base, untracked files included (BUG-0019), deletions included. */
function changedPaths(root, base, head) {
  const split = (s) => s.split('\0').filter(Boolean).map(posix)
  if (head) return split(git(['diff', '--name-only', '--no-renames', '-z', base, head], root))
  return uniq([...split(git(['diff', '--name-only', '--no-renames', '-z', base], root)), ...split(git(['ls-files', '--others', '--exclude-standard', '-z'], root))])
}

// ------------------------------------------------------------------------------------------
// Surface vocabulary (.actio/bugs/surfaces.json)
// ------------------------------------------------------------------------------------------
function globToRe(g) {
  let re = ''
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*' && g[i + 1] === '*') { re += '(?:.*/)?'; i++; if (g[i + 1] === '/') i++; else re += '.*' }
    else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp('^' + re + '$', 'i')
}

/** Loads and validates surfaces.json: tags, globs, aliases, class_tags, entry_tags. */
function loadConfig(root) {
  const file = [path.join(root, '.actio/bugs/surfaces.json'), path.join(HERE, '../bugs/surfaces.json')].find((f) => fs.existsSync(f))
  if (!file) throw new UsageError('no .actio/bugs/surfaces.json in the root or beside this script')
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  const strip = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => k !== 'about'))
  const tags = raw.tags
  const cfg = { file, tags, aliases: strip(raw.aliases), classTags: strip(raw.class_tags), entryTags: strip(raw.entry_tags), uiTags: raw.ui_tags || [] }
  const unknown = [...Object.values(cfg.aliases), ...Object.values(cfg.classTags), ...Object.values(cfg.entryTags), cfg.uiTags].flat().filter((t) => !tags[t])
  if (unknown.length) throw new UsageError(`surfaces.json names tags not in its own list: ${uniq(unknown).join(', ')}`)
  const res = Object.fromEntries(Object.entries(tags).map(([t, v]) => [t, v.globs.map(globToRe)]))
  cfg.tagsForPath = (p, derivedOnly = false) => {
    const n = posix(p).replace(/^\.\//, '').trim()
    return Object.keys(tags).filter((t) => (!derivedOnly || tags[t].derive !== false) && res[t].some((re) => re.test(n)))
  }
  // null means no alias matched; [] means an alias that deliberately maps to nothing
  cfg.aliasTags = (part) => {
    const k = part.replace(/`/g, '').trim().toLowerCase()
    if (!k) return []
    if (tags[k]) return [k]
    if (Object.prototype.hasOwnProperty.call(cfg.aliases, k)) return cfg.aliases[k]
    const pre = Object.keys(cfg.aliases).find((a) => a.endsWith('*') && k.startsWith(a.slice(0, -1)))
    return pre ? cfg.aliases[pre] : null
  }
  cfg.agentTags = (agent) => cfg.tagsForPath(`.claude/agents/${agent}.md`, true)
  cfg.tagOwners = (tag) => AGENTS.filter((a) => cfg.agentTags(a).includes(tag))
  cfg.isMachinery = (t) => tags[t] && tags[t].kind === 'machinery'
  return cfg
}

// ------------------------------------------------------------------------------------------
// Register parsing
// ------------------------------------------------------------------------------------------
/** A markdown table row into cells. A pipe inside backticks or escaped as \| is content. */
function splitRow(line) {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells = []
  let cur = '', tick = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\\' && s[i + 1] === '|') { cur += '\\|'; i++; continue }
    if (c === '`') tick = !tick
    if (c === '|' && !tick) { cells.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  cells.push(cur.trim())
  return cells
}
const isRow = (l) => /^\s*\|/.test(l) && !/^\s*\|\s*:?-{2,}/.test(l)

/** Splits on a separator outside parentheses, so "a, b (c, d)" is two parts. */
function splitTop(s, sep = ',') {
  const out = []
  let depth = 0, cur = ''
  for (const c of s || '') {
    if (c === '(') depth++
    if (c === ')') depth = Math.max(0, depth - 1)
    if (c === sep && !depth) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function splitAgents(s) {
  if (!s) return []
  const out = AGENTS.filter((a) => new RegExp(`(^|[^a-z-])${a}([^a-z-]|$)`, 'i').test(s))
  if (/\bthe four reviewers\b/i.test(s)) out.push(...REVIEWERS)
  if (/\b(every|any|all) (agents?|authors?|gate owners?|roles?)\b/i.test(s)) out.push('*')
  return uniq(out)
}

const backticked = (s) => ((s || '').match(/`[^`]+`/g) || []).map((t) => t.slice(1, -1).trim())

/** A bare skill or agent name in a Component cell resolves to its path. */
function resolveToken(tok) {
  const t = tok.trim()
  if (/^actio-[a-z-]+$/.test(t)) return `.claude/skills/${t}/SKILL.md`
  if (/^[a-z-]+\.md$/.test(t) && !/^(bugs|brand|claude|readme)\.md$/i.test(t)) return `.claude/agents/${t}`
  if (AGENTS.includes(t)) return `.claude/agents/${t}.md`
  const p = t.replace(/\s.*$/, '')
  return p.endsWith('/') ? p + 'x' : p
}

// Detection command recognition, for legacy entries whose command sits in prose.
const CMD_RE = /^(MSYS_NO_PATHCONV=1\s+)?(git\s+(grep|show|log|diff|ls-files|status|rev-parse|cat-file)\b|grep\b(?!:)|rg\b|node\b|npm\s+run\b|npx\b|find\b|ls\b|test\s|diff\b|wc\b|awk\b|sed\b|cat\b|for\s+\w+\s+in\b|if\s)/
const PLACEHOLDER_RE = /(^|[\s'"(=])\.\.\.(?=[\s;'"|)]|$)|…|<(files?|paths?|run-id|run|id|ref|base|sha|slug|agent|surface|dir|name|n+|NNNN|yyyy[^>]*)>|<[a-z]+-[a-z-]+>/i
const UNSAFE_RE = /(^|[;&|(]\s*|\s)(rm|rmdir|mv|cp|chmod|chown|mkdir|touch|tee|curl|wget|dd|truncate)\s|\bsed\s+(-[a-zA-Z]*i\b|--in-place)|\bgit\s+(checkout|reset|stash|commit|push|pull|fetch|clean|add|rm|mv|worktree|restore|switch|rebase|merge|tag|branch|apply|am|cherry-pick|revert|gc|prune|config|init|clone|update-ref|update-index)\b|\bnpm\s+(i|install|ci|uninstall|update|publish|link|exec|x)\b|\bnpx\b|(^|\s)[12]?>{1,2}(?!\s*(\/dev\/null|&))/
const unquote = (c) => c.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''")

/** Classifies one command: its kind, and every reason it cannot run as a detection here. */
function classifyCommand(cmd, root) {
  const c = cmd.trim()
  const head = c.replace(/^MSYS_NO_PATHCONV=1\s+/, '')
  const kind = /^node\b/.test(head) ? 'node' : /^(npm\s+run|npx)\b/.test(head) ? 'npm' : /^git\b/.test(head) ? 'git' : 'shell'
  const issues = []
  const bare = unquote(c)
  if (PLACEHOLDER_RE.test(c)) issues.push('placeholder')
  if (UNSAFE_RE.test(bare)) issues.push('refused-unsafe')
  if (/raise BelowThreshold|\.py\b/.test(c)) issues.push('wrong-stack')
  const words = bare.split(/\s+/).filter(Boolean)
  if (words.length < (/^(git|npm)$/.test(words[0]) ? 3 : 2)) issues.push('fragment')
  if (root) {
    for (const m of c.matchAll(/(\.actio\/runs\/[A-Za-z0-9._-]+)/g)) if (!fs.existsSync(path.join(root, m[1]))) issues.push(`missing-path:${m[1]}`)
    const script = head.match(/^node\s+(?!-)(\S+\.m?js)\b/)
    if (script && !fs.existsSync(path.join(root, script[1]))) issues.push(`missing-path:${script[1]}`)
  }
  const blocking = issues.filter((i) => /^(placeholder|refused-unsafe|wrong-stack|fragment|missing-path)/.test(i))
  return { cmd: c, kind, runnable: blocking.length === 0, issues: uniq(issues) }
}

function commandsIn(text, root, standaloneOnly = false) {
  const out = []
  let rest = text
  for (const m of text.matchAll(/```([a-z]*)\r?\n([\s\S]*?)```/g)) {
    for (const line of m[2].split(/\r?\n/)) { const l = line.trim(); if (l && CMD_RE.test(l)) out.push({ ...classifyCommand(l, root), from: 'fence' }) }
    rest = rest.replace(m[0], ' ')
  }
  for (const line of rest.split(/\r?\n/)) {
    const sm = line.trim().match(/^`([^`]+)`[.,;]?$/)
    if (sm && CMD_RE.test(sm[1].trim())) out.push({ ...classifyCommand(sm[1], root), from: 'standalone' })
  }
  if (standaloneOnly) return out
  for (const m of rest.matchAll(/``\s?([^`]+?)\s?``|`([^`]+)`/g)) {
    const s = (m[1] || m[2]).replace(/\s*\r?\n\s*/g, ' ').trim()
    if (CMD_RE.test(s) && !out.some((o) => o.cmd === s)) out.push({ ...classifyCommand(s, root), from: 'inline' })
  }
  return out
}

const BOLD_LEAD_RE = /^\*\*([^*]+?)\*\*/
const REQUIRED_ROWS = ['Status', 'Raised on', 'Run', 'Component', 'Agent at fault', 'Class', 'Severity', 'Evidence']

/** One `### BUG-NNNN · title` block into an entry record. */
function parseEntry(block, exampleBlock, root) {
  const head = block[0].match(/^### (BUG-\d{4})\s*(?:[·:–-]\s*)?(.*)$/)
  const e = { id: head[1], title: head[2].trim(), meta: {}, sections: [], problems: [], mode: 'legacy', detect: [], secondary: [], judgement: [] }
  let body = block.slice(1)
  const raw = block.join('\n')
  if (/Full entry in the format example/i.test(raw) && exampleBlock) { body = exampleBlock.split('\n').slice(1); e.problems.push('body lives in the Entry format example') }
  const firstPara = body.findIndex((l) => BOLD_LEAD_RE.test(l))
  for (const l of firstPara < 0 ? body : body.slice(0, firstPara)) {
    if (!isRow(l)) continue
    const cells = splitRow(l)
    if (cells.length >= 2 && /^[A-Z][A-Za-z ]+$/.test(cells[0])) e.meta[cells[0]] = cells.slice(1).join(' | ')
  }
  const g = (k) => (e.meta[k] == null ? null : e.meta[k])
  Object.assign(e, {
    status: g('Status'), raisedBy: g('Raised by'), surfaceRaw: g('Surface'), componentRaw: g('Component'),
    agentAtFault: g('Agent at fault'), class: (g('Class') || '').replace(/`/g, '').trim() || null,
    severity: (g('Severity') || '').replace(/`/g, '').trim().toLowerCase() || null, repeatOf: g('Repeat of'),
    surfacesRow: g('Surfaces'), bindsRow: g('Binds'), ruleRow: g('Rule'), historyRow: g('History'), needs: g('Needs'),
  })
  e.statusKey = /^\**open\b/i.test(e.status || '') ? 'open' : /^\**closed\b/i.test(e.status || '') ? 'closed' : (e.status || 'none').toLowerCase()
  for (const req of REQUIRED_ROWS) if (g(req) == null) e.problems.push(`no ${req} row`)
  if (g('Surface') == null && g('Surfaces') == null) e.problems.push('no Surface or Surfaces row')

  let cur = null
  for (const l of firstPara < 0 ? [] : body.slice(firstPara)) {
    const m = l.match(BOLD_LEAD_RE)
    if (m) { cur = { label: m[1].trim().replace(/[.:]$/, ''), text: l }; e.sections.push(cur) } else if (cur) cur.text += '\n' + l
  }
  const sec = (re) => e.sections.filter((s) => re.test(s.label.toLowerCase()))
  const ruleSec = sec(/^the rule this produces/)[0]
  const flat = (s) => s.text.replace(BOLD_LEAD_RE, '').replace(/\s+/g, ' ').trim()
  e.rule = ruleSec ? flat(ruleSec) : e.ruleRow
  e.ruleIds = uniq([...(e.ruleRow || '').match(/S?R-\d{2}/g) || [], ...(ruleSec ? ruleSec.text.match(/S?R-\d{2}/g) || [] : [])])
  const br = sec(/^who must be briefed/)[0]
  e.briefedRaw = e.bindsRow || (br ? flat(br) : null)
  if (!ruleSec && !e.ruleRow) e.problems.push('no rule paragraph or Rule row')
  if (!br && !e.bindsRow) e.problems.push('no Binds row or "Who must be briefed" paragraph')

  const fenced = [...raw.matchAll(/```detect[^\n]*\r?\n([\s\S]*?)```/g)]
  const howTo = sec(/^how to detect it next time/)
  const later = sec(/^(detection corrected|reopened|recurred|closed|items? .* fixed|register correction)/)
  e.detectProse = howTo.length ? howTo.map(flat).join(' ') : null
  if (fenced.length) {
    // Grammar, one item per line: a command (run by bash -c from the repo root);
    // `expect: empty | <text>` for the command above it (default empty);
    // `judgement: <question>` where no command can decide; `stack: sql | ts | md | any`;
    // `module: .actio/bugs/detect/BUG-NNNN.mjs` (documentation; the file's presence decides).
    e.mode = 'fenced'
    if (fenced.length > 1) e.problems.push('more than one detect block')
    for (const line of fenced[0][1].split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))) {
      const kv = line.match(/^(expect|judgement|stack|module|block):\s*(.*)$/)
      if (!kv) { e.detect.push({ ...classifyCommand(line, root), from: 'detect-block', expect: 'empty' }); continue }
      const [, k, v] = kv
      if (k === 'expect' && e.detect.length) e.detect[e.detect.length - 1].expect = v.trim()
      else if (k === 'judgement') e.judgement.push(v.trim())
      else if (k === 'stack') e.stack = v.trim()
      else if (k === 'module') e.moduleNote = v.trim()
      else if (k === 'block') e.problems.push('block: lines are retired; commit .actio/bugs/detect/' + e.id + '.mjs instead')
      else e.problems.push(`detect block: "${k}:" with no command before it`)
    }
    if (!e.detect.length && !e.judgement.length) e.problems.push('empty detect block')
  } else {
    // Legacy: the latest standalone or fenced command in a later paragraph is current; else
    // every command in "How to detect". The other candidates run as secondary checks.
    const laterCmds = later.flatMap((s) => commandsIn(s.text, root, true))
    const howToCmds = howTo.flatMap((s) => commandsIn(s.text, root))
    e.detect = laterCmds.length ? laterCmds : howToCmds
    e.secondary = laterCmds.length ? howToCmds.filter((c) => !laterCmds.some((l) => l.cmd === c.cmd)) : []
    if (laterCmds.length && howToCmds.length) e.problems.push('two candidate current detections (How to detect and a later paragraph)')
    if (!howTo.length && !e.detect.length) e.problems.push('no detection')
    else if (!e.detect.length) e.problems.push('detection is prose only')
  }
  if (e.detect.length && !e.detect.some((c) => c.runnable)) e.problems.push('no runnable detection (' + uniq(e.detect.flatMap((c) => c.issues.map((i) => i.split(':')[0]))).join(', ') + ')')
  return e
}

/** Parses BUGS.md into entries, rules, the Open index, T-rows and repeat patterns. Never writes. */
function parseRegister(src, { root, cfg }) {
  const lines = src.split(/\r?\n/)
  const inFence = []
  let f = false
  lines.forEach((l, i) => { if (/^\s*```/.test(l)) { inFence[i] = true; f = !f } else inFence[i] = f })
  const heads = lines.map((l, i) => (!inFence[i] && /^#{2,3} /.test(l) ? i : -1)).filter((i) => i >= 0)
  const h2 = heads.filter((i) => /^## /.test(lines[i])).map((i, k, a) => ({ title: lines[i].slice(3).trim(), start: i, end: k + 1 < a.length ? a[k + 1] : lines.length }))
  const section = (prefix) => { const h = h2.find((x) => x.title.toLowerCase().startsWith(prefix.toLowerCase())); return h ? { ...h, lines: lines.slice(h.start, h.end) } : null }
  const rows = (sec) => (sec ? sec.lines.filter(isRow).map(splitRow) : [])
  const problems = []

  const fmt = section('Entry format')
  let exampleBlock = null
  if (fmt) { const s = fmt.lines.findIndex((l) => /^```markdown/.test(l)); const e = fmt.lines.findIndex((l, i) => i > s && /^```\s*$/.test(l)); if (s >= 0 && e > s) exampleBlock = fmt.lines.slice(s + 1, e).join('\n') }

  const rules = rows(section('Standing rules')).filter((r) => /^S?R-\d+$/.test(r[0])).map((r) => {
    const bindsRaw = r[3] || ''
    const edits = (bindsRaw.match(/pass that (?:edits|writes) (.*)$/) || [])[1] || ''
    const triggers = uniq(backticked(edits).flatMap((t) => cfg.aliasTags(t) ?? cfg.tagsForPath(resolveToken(t), true)))
    const binds = splitAgents(bindsRaw)
    return { id: r[0], rule: r[1] || '', from: (r[2] || '').match(/BUG-\d{4}/g) || [], bindsRaw, binds, universal: binds.includes('*'), triggers }
  })

  const openSec = section('Open')
  const openRows = rows(openSec)
  const openHeader = openRows.find((r) => /^id$/i.test(r[0])) || []
  const openIndex = openRows.filter((r) => /^BUG-\d{4}$/.test(r[0])).map((r) => ({ id: r[0], cells: r, needs: r[openHeader.findIndex((h) => /^needs$/i.test(h))] || null }))
  const tRows = rows(section('Raised and not yet registered')).filter((r) => /^T-\d+$/.test(r[0])).map((r) => ({ id: r[0], promoted: ((r[1] || '').match(/Promoted to (BUG-\d{4})/) || [])[1] || null }))
  const repeats = rows(section('Repeat offenders')).filter((r) => r.length >= 3 && /BUG-\d{4}/.test(r[1] || '')).map((r) => ({ pattern: r[0], ids: uniq(r[1].match(/BUG-\d{4}/g)), occurrences: (r[1].match(/BUG-\d{4}/g) || []).length, rules: r[2].match(/S?R-\d+/g) || [], state: r[3] || '' }))

  const fmtRange = fmt ? [fmt.start, fmt.end] : [-1, -1]
  const entries = []
  for (const i of heads) {
    if (!/^### BUG-\d{4}\b/.test(lines[i]) || (i >= fmtRange[0] && i < fmtRange[1])) continue
    const next = heads.find((j) => j > i) ?? lines.length
    const block = lines.slice(i, next)
    while (block.length > 1 && /^(---|\s*)$/.test(block[block.length - 1])) block.pop()
    const e = parseEntry(block, exampleBlock, root)
    Object.assign(e, { line: i + 1, lines: block.length, bytes: bytesOf(block.join('\n')) })
    entries.push(e)
  }

  const byId = new Map(entries.map((e) => [e.id, e]))
  const ruleById = new Map(rules.map((r) => [r.id, r]))
  for (const d of uniq(entries.map((e) => e.id).filter((x, i, a) => a.indexOf(x) !== i))) problems.push({ where: d, problem: 'id used by two headings' })
  for (const e of entries) {
    e.ruleIds = uniq([...e.ruleIds, ...rules.filter((r) => r.from.includes(e.id)).map((r) => r.id)]).sort()
    for (const rid of e.ruleIds) if (!ruleById.has(rid)) e.problems.push(`cites ${rid}, not in the standing rules`)
    e.surfaces = entrySurfaces(e, cfg)
    e.kind = e.surfaces.some((t) => !cfg.isMachinery(t)) ? 'product' : e.surfaces.length ? 'machinery' : 'unscoped'
    if (!e.surfaces.length) e.problems.push('no surface tag derivable')
    e.componentPaths = backticked(e.componentRaw).map(resolveToken)
    const binds = new Set([...splitAgents(e.briefedRaw), ...splitAgents(e.agentAtFault)])
    for (const rid of e.ruleIds) { const r = ruleById.get(rid); if (r && !r.universal) r.binds.forEach((a) => binds.add(a)) }
    e.bindsDerived = binds.size === 0
    if (e.bindsDerived) e.surfaces.flatMap(cfg.tagOwners).forEach((a) => binds.add(a))
    e.binds = [...binds]
  }
  for (const r of rules) {
    const fromTags = r.from.flatMap((id) => (byId.get(id) || { surfaces: [] }).surfaces)
    r.tags = uniq([...fromTags, ...r.triggers])
    if (!r.tags.length) r.tags = uniq(r.binds.filter((a) => a !== '*').flatMap(cfg.agentTags))
    r.missingFrom = r.from.filter((id) => !byId.has(id))
  }
  return { entries, byId, rules, ruleById, openIndex, tRows, repeats, problems, bytes: bytesOf(src), lineCount: lines.length }
}

function entrySurfaces(e, cfg) {
  if (e.surfacesRow) {
    const parts = e.surfacesRow.split(/[,\s]+/).map((t) => t.replace(/`/g, '').trim()).filter(Boolean)
    for (const p of parts.filter((t) => !cfg.tags[t])) e.problems.push(`Surfaces row names "${p}", not in surfaces.json`)
    return uniq(parts.filter((t) => cfg.tags[t]))
  }
  const tags = new Set()
  for (const part of splitTop(e.surfaceRaw)) {
    const a = cfg.aliasTags(part)
    if (a === null) e.problems.push(`Surface "${clip(part, 40)}" maps to no tag (add an alias)`)
    else a.forEach((t) => tags.add(t))
  }
  for (const tok of backticked(e.componentRaw)) {
    const a = cfg.aliasTags(tok)
    ;(a ?? cfg.tagsForPath(resolveToken(tok), true)).forEach((t) => tags.add(t))
  }
  for (const t of cfg.entryTags[e.id] || []) tags.add(t)
  return [...tags]
}

/** Every BUG id referenced in the register, the run folders' bug-historian files and .actio/bugs. */
function referencedIds(ctx) {
  const refs = new Map()
  const note = (text, where) => { for (const id of text.match(/BUG-\d{4}/g) || []) if (!refs.has(id)) refs.set(id, where) }
  note(ctx.src, posix(path.relative(ctx.root, ctx.register)) || 'BUGS.md')
  const walk = (dir, depth = 0) => {
    if (!fs.existsSync(dir) || depth > 4) return
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name)
      if (d.isDirectory()) walk(p, depth + 1)
      else if (/\.(md|json|mjs|js|txt)$/.test(d.name) && fs.statSync(p).size < 4 * 1024 * 1024) note(fs.readFileSync(p, 'utf8'), posix(path.relative(ctx.root, p)))
    }
  }
  walk(path.join(ctx.root, '.actio/bugs'))
  if (fs.existsSync(ctx.runsDir)) for (const r of fs.readdirSync(ctx.runsDir).sort()) walk(path.join(ctx.runsDir, r, 'bug-historian'))
  return refs
}

// ------------------------------------------------------------------------------------------
// Selection
// ------------------------------------------------------------------------------------------
function rankPicked(a, b) {
  const o = (p) => (p.e.statusKey === 'open' ? 0 : 1)
  const v = (p) => (p.via === 'class' ? 1 : 0)
  const s = (p) => SEVERITY_RANK[p.e.severity] ?? 4
  return o(a) - o(b) || v(a) - v(b) || s(a) - s(b) || idNum(b.e.id) - idNum(a.e.id)
}

/**
 * The entries and rules that bind a run with these tags (A3): an entry is picked when its
 * surface tags or its class tags intersect the run's, or a changed path is named in its
 * Component cell. A machinery entry never binds a run that carries no machinery tag, and an
 * agent-behaviour entry is never a row, because the universal rules carry it.
 */
function selectFor(reg, cfg, tagList, changed = []) {
  const tags = new Set(tagList)
  const machineryRun = tagList.some(cfg.isMachinery)
  const picked = []
  for (const e of reg.entries) {
    if (e.class === 'agent-behaviour') continue
    const surface = e.surfaces.filter((t) => tags.has(t))
    const cls = (cfg.classTags[e.class] || []).filter((t) => tags.has(t))
    const comp = e.componentPaths.filter((p) => changed.includes(p))
    if (!surface.length && !cls.length && !comp.length) continue
    if (e.kind === 'machinery' && !machineryRun) continue
    picked.push({ e, via: surface.length ? 'surface' : comp.length ? 'component' : 'class', on: uniq([...surface, ...cls]) })
  }
  picked.sort(rankPicked)
  const ids = new Set(picked.map((p) => p.e.id))
  const universal = reg.rules.filter((r) => r.universal)
  const scoped = reg.rules.filter((r) => !r.universal && (r.tags.some((t) => tags.has(t)) || r.from.some((id) => ids.has(id)) || picked.some((p) => p.e.ruleIds.includes(r.id))))
  return { tags: tagList, machineryRun, picked, universal, scoped }
}

/** The first sentence of a rule; a very short one carries its second sentence too. */
function oneLine(rule) {
  const flat = rule.replace(/\s+/g, ' ').trim()
  const parts = flat.split(/(?<=[.!?])\s+(?=[A-Z`"])/)
  let s = parts[0]
  if (s.length < 60 && parts[1]) s += ' ' + parts[1]
  return clip(s, 260)
}

function detectSummary(e, modules) {
  if (modules.has(e.id)) return 'module'
  const n = e.detect.filter((d) => d.runnable).length
  const parts = []
  if (n) parts.push(n > 1 ? `cmd x${n}` : 'cmd')
  if (e.judgement.length) parts.push('judgement')
  if (!parts.length) parts.push(e.detect.length ? 'dead' : e.detectProse ? 'prose' : 'none')
  return parts.join(' + ')
}

function bindsCell(binds, n = 3) {
  if (binds.includes('*')) return 'every agent'
  if (!binds.length) return '-'
  return binds.length <= n ? binds.join(', ') : `${binds.slice(0, n).join(', ')} +${binds.length - n}`
}

const listModules = (root) => {
  const dir = path.join(root, '.actio/bugs/detect')
  return new Set(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => (f.match(/^(BUG-\d{4})\.mjs$/) || [])[1]).filter(Boolean) : [])
}

// ------------------------------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------------------------------
function readPathsOpt(opts) {
  if (!opts.paths) return null
  const ps = opts.paths.length === 1 && opts.paths[0] === '-' ? fs.readFileSync(0, 'utf8').split(/\r?\n/) : opts.paths
  return ps.map((p) => posix(p.trim()).replace(/^\.\//, '')).filter(Boolean)
}

/** Resolves the run's tags from --surfaces, --paths and --base (any combination, unioned). */
function runTags(ctx, opts) {
  const fromPaths = readPathsOpt(opts) || []
  const fromBase = opts.base ? changedPaths(ctx.root, opts.base, opts.head && opts.head !== true ? opts.head : null) : []
  const paths = uniq([...fromPaths, ...fromBase])
  const given = typeof opts.surfaces === 'string' ? opts.surfaces.split(/[,\s]+/).filter(Boolean) : []
  const bad = given.filter((t) => !ctx.cfg.tags[t])
  if (bad.length) throw new UsageError(`unknown surface tag(s): ${bad.join(', ')}. Closed list: ${Object.keys(ctx.cfg.tags).join(', ')}`)
  if (!paths.length && !given.length && !opts.base) throw new UsageError('give --base <ref>, --surfaces a,b or --paths <p...>')
  const byPath = paths.map((p) => ({ p, tags: ctx.cfg.tagsForPath(p) }))
  return { paths, byPath, tags: uniq([...given, ...byPath.flatMap((x) => x.tags)]), source: [opts.base && `diff ${opts.base}`, fromPaths.length && `${fromPaths.length} paths`, given.length && 'given'].filter(Boolean).join(' + ') }
}

function cmdSurfaces(ctx, opts) {
  const t = runTags(ctx, opts)
  if (opts.json) return console.log(JSON.stringify(t, null, 2))
  const kinds = uniq(t.tags.map((x) => ctx.cfg.tags[x].kind)).join('+') || 'none'
  console.log(`${t.paths.length} paths, ${t.tags.length} tags (${kinds}): ${t.tags.join(', ') || 'none'}`)
  for (const tag of t.tags) {
    const ps = t.byPath.filter((x) => x.tags.includes(tag)).map((x) => x.p)
    console.log(`  ${tag.padEnd(14)} ${String(ps.length).padStart(3)}  ${ps.slice(0, 3).join(', ')}${ps.length > 3 ? ', …' : ''}`)
  }
  const none = t.byPath.filter((x) => !x.tags.length).map((x) => x.p)
  if (none.length) console.log(`  (untagged)     ${String(none.length).padStart(3)}  ${none.slice(0, 4).join(', ')}${none.length > 4 ? ', …' : ''}`)
}

function cmdIndex(ctx, opts) {
  const { reg } = ctx
  const modules = listModules(ctx.root)
  if (opts.json) {
    const out = {
      register: posix(path.relative(ctx.root, ctx.register)), bytes: reg.bytes, lines: reg.lineCount, surfaces: posix(path.relative(ctx.root, ctx.cfg.file)),
      entries: reg.entries.map((e) => ({ id: e.id, title: e.title, status: e.statusKey, statusRaw: e.status, severity: e.severity, class: e.class, kind: e.kind, surfaces: e.surfaces, agentAtFault: e.agentAtFault, binds: e.binds, bindsDerived: e.bindsDerived, ruleIds: e.ruleIds, rule: e.rule, mode: e.mode, module: modules.has(e.id), detect: e.detect.map(({ cmd, kind, runnable, issues, expect, from }) => ({ cmd, kind, runnable, issues, expect, from })), secondary: e.secondary.map(({ cmd, runnable, issues }) => ({ cmd, runnable, issues })), judgement: e.judgement, detectProse: e.detect.length ? null : e.detectProse, anchor: `BUGS.md#L${e.line}`, lines: e.lines, bytes: e.bytes, problems: e.problems })),
      rules: reg.rules.map(({ id, rule, from, binds, universal, triggers, tags, missingFrom }) => ({ id, rule, from, binds, universal, triggers, tags, missingFrom })),
      openIndex: reg.openIndex.map((o) => o.id), tRows: reg.tRows, repeats: reg.repeats, problems: reg.problems,
    }
    return console.log(JSON.stringify(out, null, 2))
  }
  const clean = reg.entries.filter((e) => !e.problems.length)
  const open = reg.entries.filter((e) => e.statusKey === 'open')
  console.log(`${posix(path.relative(ctx.root, ctx.register)) || 'BUGS.md'}: ${reg.bytes} bytes, ${reg.entries.length} entries (${open.length} open), ${clean.length} parse clean, ${reg.rules.length} rules (${reg.rules.filter((r) => r.universal).length} universal), ${reg.tRows.length} T-rows, ${reg.repeats.length} repeat patterns`)
  for (const e of reg.entries) console.log(`${e.id} ${e.statusKey.padEnd(6)} ${(e.class || '-').padEnd(17)} ${e.kind.padEnd(9)} ${(e.surfaces.join(',') || '-').padEnd(28)} detect:${detectSummary(e, modules).padEnd(9)} ${e.lines}L/${e.bytes}B${e.problems.length ? '  ! ' + e.problems.join('; ') : ''}`)
  for (const p of reg.problems) console.log(`[register] ${p.where}: ${p.problem}`)
}

function writeFile(p, text) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text) }

function runDirOf(ctx, run) {
  if (!run || run === true) throw new UsageError('give --run <id>')
  return path.join(ctx.runsDir, run)
}

function planAgents(runDir) {
  const f = path.join(runDir, 'run.json')
  if (!fs.existsSync(f)) throw new UsageError(`no run.json at ${posix(f)}`)
  const plan = JSON.parse(fs.readFileSync(f, 'utf8')).plan || []
  return uniq(plan.map((p) => p.agent).filter((a) => a && a !== 'bug-historian'))
}

function cmdBrief(ctx, opts) {
  const runDir = runDirOf(ctx, opts.run)
  const agents = planAgents(runDir)
  const t = runTags(ctx, opts)
  const sel = selectFor(ctx.reg, ctx.cfg, t.tags, t.paths)
  const modules = listModules(ctx.root)
  const baseRef = opts.base && opts.base !== true ? opts.base : 'HEAD'
  const baseSha = revParse(ctx.root, baseRef).slice(0, 12)
  const run = opts.run
  const nOpen = sel.picked.filter((p) => p.e.statusKey === 'open').length
  const kinds = uniq(t.tags.map((x) => ctx.cfg.tags[x].kind)).join(' + ') || 'none'

  // brief.md: header, universal rules, scoped rules, entries, then room for 10 judgement lines.
  const head = [
    `# Regression brief · ${run}`, '',
    `Surfaces: ${t.tags.map((x) => '`' + x + '`').join(', ') || '(none derived)'}. Kind: ${kinds}. Source: ${t.source || 'given'}. Base \`${baseSha}\` (${baseRef}).`,
    `${sel.picked.length} of ${ctx.reg.entries.length} entries bind this run (${nOpen} open), ${sel.scoped.length} scoped rules. Generated by \`node .actio/bin/bugs.mjs brief\`; slices in \`bug-historian/brief/<agent>.md\`.`,
    '', '## Universal rules (every agent, every run)',
    ...sel.universal.map((r) => `- ${r.id}: ${oneLine(r.rule)}`),
  ]
  const tail = ['', '## Judgement (bug-historian, at most 10 lines)', '- none yet']
  const ruleRows = sel.scoped.map((r) => `| ${r.id} | ${bindsCell(r.binds)} | ${oneLine(r.rule).replace(/\|/g, '\\|')} |`)
  const entryRow = (p) => `| ${p.e.id} | ${p.e.statusKey} | ${clip(p.e.title, 90).replace(/\|/g, '\\|')} | ${bindsCell(p.e.binds)} | ${detectSummary(p.e, modules)} |`
  const budget = BRIEF_MAX_LINES - BRIEF_JUDGEMENT_LINES + 1 // the "none yet" line is replaced, not added to
  const fixed = head.length + tail.length + 2 + (ruleRows.length ? 3 : 1) + 3 // headings, table heads, blanks
  let room = budget - fixed - ruleRows.length
  const shown = sel.picked.length > room ? sel.picked.slice(0, Math.max(0, room - 1)) : sel.picked
  const over = sel.picked.slice(shown.length)
  const lines = [...head, '', '## Scoped rules']
  if (ruleRows.length) lines.push('| Rule | Binds | Rule, one line |', '|---|---|---|', ...ruleRows)
  else lines.push('None: no scoped rule binds these surfaces.')
  lines.push('', '## Entries on these surfaces')
  if (sel.picked.length) lines.push('| Id | Status | What | Binds | Detect |', '|---|---|---|---|---|', ...shown.map(entryRow))
  else lines.push('Nothing in the register binds these surfaces beyond the universal rules.')
  if (over.length) lines.push(`Also binding (ids only, the guard runs them all): ${over.map((p) => p.e.id).join(', ')}.`)
  lines.push(...tail)
  const briefMd = lines.join('\n') + '\n'

  // brief/<agent>.md: the universal rules, then only what binds that agent.
  const slices = {}
  for (const agent of agents) {
    const rulesFor = sel.scoped.filter((r) => r.binds.includes(agent))
    const named = sel.picked.filter((p) => p.e.binds.includes(agent))
    const starred = sel.picked.filter((p) => !p.e.binds.includes(agent) && p.e.binds.includes('*'))
    const items = [
      ...rulesFor.map((r) => ({ id: r.id, text: `- ${r.id}: ${oneLine(r.rule)}` })),
      ...[...named, ...starred].map((p) => ({ id: p.e.id, runnable: modules.has(p.e.id) || p.e.detect.some((d) => d.runnable), text: `- ${p.e.id} (${p.e.statusKey}, ${p.e.severity || '-'}): ${clip(p.e.title, 110)}. Detect: ${detectSummary(p.e, modules)}.` })),
    ]
    const headS = [`# Brief slice · ${agent} · ${run}`, 'Universal rules (every agent):', ...sel.universal.map((r) => `- ${r.id}: ${oneLine(r.rule)}`)]
    const self = items.filter((i) => i.runnable).map((i) => i.id)
    const footer = self.length ? [`Self-check before hand-off: \`node .actio/bin/bugs.mjs guard --run ${run} --base ${baseSha} --only ${self.join(',')} --dry\``] : []
    const roomS = SLICE_MAX_LINES - headS.length - 1 - footer.length
    const fits = items.length <= roomS ? items : items.slice(0, Math.max(0, roomS - 1))
    const rest = items.slice(fits.length)
    const body = items.length ? [`Binds you on ${t.tags.join(', ') || 'these surfaces'}:`, ...fits.map((i) => i.text)] : [`Nothing else in the register binds you on ${t.tags.join(', ') || 'these surfaces'}.`]
    if (rest.length) body.push(`Also binds you: ${rest.map((i) => i.id).join(', ')} (rows in bug-historian/brief.md).`)
    slices[agent] = [...headS, ...body, ...footer].join('\n') + '\n'
  }

  const bhDir = path.join(runDir, 'bug-historian')
  const sliceDir = path.join(bhDir, 'brief')
  if (fs.existsSync(sliceDir)) for (const f of fs.readdirSync(sliceDir)) { const p = path.join(sliceDir, f); if (/\.md$/.test(f) && /^# Brief slice · /.test(fs.readFileSync(p, 'utf8'))) fs.rmSync(p) }
  writeFile(path.join(bhDir, 'brief.md'), briefMd)
  for (const [a, text] of Object.entries(slices)) writeFile(path.join(sliceDir, `${a}.md`), text)

  const n = (s) => s.split('\n').length - 1
  console.log(`brief.md: ${n(briefMd)} lines, ${bytesOf(briefMd)} B (cap ${BRIEF_MAX_LINES} lines incl. ${BRIEF_JUDGEMENT_LINES} judgement). ${sel.picked.length} entries (${shown.length} rows, ${over.length} ids only), ${sel.scoped.length} scoped + ${sel.universal.length} universal rules.`)
  console.log(`tags: ${t.tags.join(', ') || 'none'} (${kinds}) from ${t.source || 'given'}; base ${baseSha}`)
  console.log(`slices (${agents.length}): ${agents.map((a) => `${a} ${n(slices[a])}L/${bytesOf(slices[a])}B`).join(', ')}`)
  const live = ctx.reg.repeats.filter((r) => r.ids.some((id) => sel.picked.some((p) => p.e.id === id)))
  if (live.length) console.log(`live repeat patterns (judge whether this run can extend one): ${live.map((r) => `${r.rules.join('/') || '-'} x${r.occurrences} "${clip(r.pattern, 60)}"`).join('; ')}`)
  const noRun = sel.picked.filter((p) => !modules.has(p.e.id) && !p.e.detect.some((d) => d.runnable))
  if (noRun.length) console.log(`no runnable detection (guard lists them for judgement): ${noRun.map((p) => p.e.id).join(', ')}`)
  const missing = sel.scoped.concat(sel.universal).filter((r) => r.missingFrom.length)
  if (missing.length) console.log(`rules citing ids with no entry: ${missing.map((r) => `${r.id} (${r.missingFrom.join(', ')})`).join('; ')}`)
  console.log(`wrote ${posix(path.relative(ctx.root, bhDir)) || posix(bhDir)}/brief.md and brief/*.md`)
}

/** Text normalised for a head-against-base comparison: no CR, no tree paths, no line numbers. */
function normaliseLines(out, roots) {
  let s = out.replace(/\r/g, '')
  for (const r of roots) for (const v of uniq([r, posix(r), posix(r).replace(/^([A-Za-z]):/, (m, d) => '/' + d.toLowerCase())])) s = s.split(v).join('<root>')
  return s.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()).map((l) => l.replace(/^([^\s:]+):(\d+):/, '$1::'))
}

/** Hit, silent or error, for one run of one detection. */
function evaluate(det, res, roots) {
  if (res.timedOut) return { state: 'error', why: 'timed out' }
  if (res.spawnError) return { state: 'error', why: res.spawnError }
  const grepLike = !/\|/.test(unquote(det.cmd)) && /^(MSYS_NO_PATHCONV=1\s+)?(git\s+grep|grep|rg)\b/.test(det.cmd)
  const lines = normaliseLines(res.stdout, roots)
  if (res.exit === 127) return { state: 'error', why: 'command not found', lines }
  if (res.exit == null || res.exit > 1 || (res.exit === 1 && !grepLike && !lines.length && res.stderr.trim())) return { state: 'error', why: `exit ${res.exit}${res.signal ? ' ' + res.signal : ''}: ${clip(res.stderr.trim().split('\n').pop() || '', 120)}`, lines }
  const expect = det.expect && det.expect !== 'empty' ? det.expect : null
  const hit = expect ? res.stdout.replace(/\r/g, '').trim() !== expect.trim() : lines.length > 0
  return { state: hit ? 'hit' : 'silent', lines }
}

const tail = (s) => s.replace(/\r/g, '').split('\n').slice(-TAIL_LINES).join('\n').slice(-4000)

async function cmdGuard(ctx, opts) {
  const t0 = Date.now()
  if (!opts.base || opts.base === true) throw new UsageError('give --base <ref>')
  const runDir = runDirOf(ctx, opts.run)
  const dry = !!opts.dry
  if (!dry && !fs.existsSync(runDir)) throw new UsageError(`no run directory ${posix(runDir)}`)
  const timeoutMs = (Number(opts.timeout) || DEFAULT_TIMEOUT_S) * 1000
  const headRef = opts.head && opts.head !== true ? opts.head : null
  const baseSha = revParse(ctx.root, opts.base)
  const headSha = revParse(ctx.root, headRef || 'HEAD')
  const changed = changedPaths(ctx.root, opts.base, headRef)
  const diffTags = uniq(changed.flatMap((p) => ctx.cfg.tagsForPath(p)))
  const briefPath = path.join(runDir, 'bug-historian/brief.md')
  const briefText = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf8') : ''
  const briefTags = backticked((briefText.match(/^Surfaces: (.*)$/m) || [])[1] || '').filter((x) => ctx.cfg.tags[x])
  const briefIds = uniq(briefText.match(/BUG-\d{4}/g) || []).filter((id) => ctx.reg.byId.has(id))
  const tags = uniq([...briefTags, ...diffTags])
  const sel = selectFor(ctx.reg, ctx.cfg, tags, changed)
  const diffIds = sel.picked.map((p) => p.e.id)
  const only = typeof opts.only === 'string' ? opts.only.split(/[,\s]+/).filter(Boolean) : null
  if (only) { const bad = only.filter((id) => !ctx.reg.byId.has(id)); if (bad.length) throw new UsageError(`no such entry: ${bad.join(', ')}`) }
  const ids = only || uniq([...briefIds, ...diffIds]).sort()
  const modules = listModules(ctx.root)
  const bash = findBash()

  // One task per detection. Legacy secondary candidates run too, but only as judgement input.
  const tasks = []
  const judgement = []
  for (const id of ids) {
    const e = ctx.reg.byId.get(id)
    const from = [briefIds.includes(id) && 'brief', diffIds.includes(id) && 'diff', only && 'only'].filter(Boolean)
    if (modules.has(id)) { tasks.push({ id, e, from, role: 'current', det: { cmd: `module .actio/bugs/detect/${id}.mjs`, kind: 'module', runnable: true, issues: [], expect: 'empty' } }); continue }
    for (const det of e.detect) tasks.push({ id, e, from, role: 'current', det })
    for (const det of e.secondary) tasks.push({ id, e, from, role: 'secondary', det })
    for (const q of e.judgement) judgement.push({ id, kind: 'judgement', text: q })
    if (!e.detect.length && !e.judgement.length) judgement.push({ id, kind: e.detectProse ? 'prose-only' : 'no-detection', text: e.detectProse ? clip(e.detectProse, 160) : 'the entry carries no detection' })
  }

  const jobs = Math.max(1, Number(opts.jobs) || DEFAULT_JOBS)
  const runOne = (task, dir, refLabel, env) => (task.det.kind === 'module' ? runModule(path.join(ctx.root, '.actio/bugs/detect', `${task.id}.mjs`), dir, refLabel, timeoutMs, env) : runShell(bash, task.det.cmd, dir, timeoutMs, env))
  const withHead = (fn) => (headRef ? withWorktree(ctx.root, headRef, (dir) => fn(dir, CHILD_ENV)) : withSnapshotIndex(ctx.root, (env) => fn(ctx.root, env)))
  for (const task of tasks) if (!task.det.runnable) task.state = 'not-runnable'
  await withHead(async (headDir, headEnv) => {
    await pool(tasks.filter((x) => x.det.runnable), jobs, async (task) => {
      task.head = await runOne(task, headDir, headRef || 'working-tree', headEnv)
      task.headEval = evaluate(task.det, task.head, [headDir])
    })
    const needBase = tasks.filter((x) => x.head && (opts['full-base'] || x.headEval.state !== 'silent'))
    if (needBase.length) await withWorktree(ctx.root, baseSha, (baseDir) => pool(needBase, jobs, async (task) => {
      task.base = await runOne(task, baseDir, baseSha, CHILD_ENV)
      task.baseEval = evaluate(task.det, task.base, [baseDir])
    }))
  })

  // Verdict per detection (invariant 4).
  for (const task of tasks) {
    if (task.state === 'not-runnable') continue
    const h = task.headEval, b = task.baseEval
    const open = task.e.statusKey === 'open'
    if (h.state === 'silent') task.state = b && b.state === 'hit' ? 'fixed' : 'silent'
    else if (h.state === 'error') task.state = 'error'
    else if (!b || b.state === 'error') task.state = 'hit-base-unknown'
    else {
      const baseSet = new Set(b.state === 'hit' ? b.lines : [])
      task.newLines = h.lines.filter((l) => !baseSet.has(l))
      const fresh = b.state === 'silent' || task.newLines.length > 0
      task.state = open ? (fresh ? 'open-spread' : 'open-present') : fresh ? 'repeat' : 'pre-existing'
    }
    if (task.role === 'secondary' && task.state === 'repeat') task.state = 'secondary-fires'
  }
  const say = { 'not-runnable': (x) => `cannot run (${x.det.issues.join(', ')}): ${clip(x.det.cmd, 100)}`, error: (x) => `detection errored (${x.headEval.why}): ${clip(x.det.cmd, 90)}`, 'hit-base-unknown': (x) => `fires at head; base could not run (${x.baseEval ? x.baseEval.why : 'not run'}), so repeat against pre-existing is undecided`, 'pre-existing': (x) => `closed entry fires at base too (${x.headEval.lines.length} lines): a recurrence older than this change, or a detection not silent on healthy state (R-13)`, 'open-spread': (x) => `open entry gains ${x.newLines.length} new line(s) at head: this change spreads it`, 'secondary-fires': (x) => `a non-current candidate detection fires new at head: decide which detection is current` }
  for (const task of tasks) if (say[task.state] && !(task.role === 'secondary' && task.state !== 'secondary-fires')) judgement.push({ id: task.id, kind: task.state, text: say[task.state](task) })

  // Rules: each binding rule is checked by its entries' detections, or it is a judgement item.
  const ruleChecks = []
  if (!only) for (const r of [...sel.universal, ...sel.scoped]) {
    const src = tasks.filter((x) => x.role === 'current' && (r.from.includes(x.id) || x.e.ruleIds.includes(r.id)) && x.state && x.state !== 'not-runnable')
    const fail = src.filter((x) => x.state === 'repeat')
    const ok = src.filter((x) => ['silent', 'fixed', 'open-present'].includes(x.state))
    const method = src.length ? `detections of ${uniq(src.map((x) => x.id)).join(', ')}` : 'none runnable'
    const result = fail.length ? `fail: ${uniq(fail.map((x) => x.id)).join(', ')} repeated` : ok.length && ok.length === src.length ? 'pass' : 'judgement'
    ruleChecks.push({ id: r.id, universal: r.universal, method, result })
  }
  const ruleJudgement = ruleChecks.filter((r) => r.result === 'judgement')

  const repeats = tasks.filter((x) => x.state === 'repeat')
  const needsJudgement = judgement.length > 0 || ruleJudgement.length > 0
  const exit = repeats.length ? 1 : needsJudgement ? 2 : 0
  const verdict = ['CLEAN', 'REPEAT', 'JUDGEMENT NEEDED'][exit]
  const ms = Date.now() - t0
  const rel = (p) => posix(path.relative(ctx.root, p))

  const record = {
    run: opts.run, generated: nowIso(), verdict: verdict.toLowerCase(), exit, partial: !!only, ms, bash, timeout_s: timeoutMs / 1000,
    base: { ref: opts.base, sha: baseSha }, head: { ref: headRef || 'working tree', sha: headSha, untracked_included: !headRef },
    changed: { count: changed.length, tags: diffTags, paths: changed.slice(0, 500) }, brief: { path: fs.existsSync(briefPath) ? 'bug-historian/brief.md' : null, tags: briefTags, ids: briefIds },
    selected: ids.map((id) => ({ id, from: [briefIds.includes(id) && 'brief', diffIds.includes(id) && 'diff', only && 'only'].filter(Boolean) })),
    detections: tasks.map((x) => ({ id: x.id, role: x.role, source: x.det.from || x.det.kind, cmd: x.det.cmd, expect: x.det.expect || 'empty', issues: x.det.issues, state: x.state, new_lines: x.newLines ? x.newLines.slice(0, TAIL_LINES) : undefined, head: x.head && { exit: x.head.exit, ms: x.head.ms, timed_out: x.head.timedOut, lines: x.headEval.lines.length, stdout_tail: tail(x.head.stdout), stderr_tail: tail(x.head.stderr) }, base: x.base && { exit: x.base.exit, ms: x.base.ms, timed_out: x.base.timedOut, lines: (x.baseEval.lines || []).length, stdout_tail: tail(x.base.stdout), stderr_tail: tail(x.base.stderr) } })),
    judgement, rules: ruleChecks,
  }

  // guard.md, at most 40 lines.
  const g = [`# Regression guard · ${opts.run}`, '',
    `Verdict: **${verdict}** (exit ${exit})${only ? ', partial run (--only): not a gate result' : ''}. Base \`${baseSha.slice(0, 12)}\` (${opts.base}); head ${headRef ? '`' + headSha.slice(0, 12) + '`' : 'working tree at `' + headSha.slice(0, 12) + '`, untracked included'}.`,
    `${changed.length} paths changed; tags ${tags.join(', ') || 'none'}. ${tasks.filter((x) => x.head).length} detections ran for ${ids.length} entries (brief ${briefIds.length}, diff ${diffIds.length}) in ${(ms / 1000).toFixed(1)} s. Evidence: \`evidence/regression/guard.json\`.`]
  if (repeats.length) {
    g.push('', '## Repeats: route each to its agent at fault with the entry attached', '| Id | Agent at fault | New at head (first) | Command |', '|---|---|---|---|')
    for (const x of repeats.slice(0, 8)) g.push(`| ${x.id} | ${clip(x.e.agentAtFault || bindsCell(x.e.binds), 40)} | \`${clip((x.newLines[0] || '').replace(/`/g, "'"), 70)}\` (${x.newLines.length}) | \`${clip(x.det.cmd.replace(/`/g, "'"), 60)}\` |`)
    if (repeats.length > 8) g.push(`And ${repeats.length - 8} more in guard.json.`)
  }
  const judgeLines = []
  const proseIds = judgement.filter((j) => j.kind === 'prose-only' || j.kind === 'no-detection').map((j) => j.id)
  if (proseIds.length) judgeLines.push(`- Prose-only or no detection, check by reading and state how: ${uniq(proseIds).join(', ')}`)
  for (const j of judgement.filter((x) => x.kind !== 'prose-only' && x.kind !== 'no-detection')) judgeLines.push(`- ${j.id} ${j.kind}: ${j.text}`)
  const uj = ruleJudgement.filter((r) => r.universal).map((r) => r.id)
  const sj = ruleJudgement.filter((r) => !r.universal).map((r) => r.id)
  if (uj.length) judgeLines.push(`- Universal rules with no runnable detection: ${uj.join(', ')}. State per rule the check made, or cite the gate evidence that covered it`)
  if (sj.length) judgeLines.push(`- Scoped rules with no runnable detection: ${sj.join(', ')}. State the check and its result`)
  if (judgeLines.length) {
    g.push('', '## Judgement: decide each and record it in your handoff checks[]')
    const room = 12
    g.push(...judgeLines.slice(0, room))
    if (judgeLines.length > room) g.push(`- And ${judgeLines.length - room} more in guard.json \`judgement\`.`)
  }
  const silent = uniq(tasks.filter((x) => x.role === 'current' && ['silent', 'fixed', 'open-present'].includes(x.state)).map((x) => `${x.id}${x.state === 'silent' ? '' : ' (' + x.state + ')'}`))
  if (silent.length) g.push('', `Silent or unchanged: ${silent.join(', ')}.`)
  if (ruleChecks.length) {
    g.push('', '## Rules', '| Rule | Method | Result |', '|---|---|---|')
    const shownRules = ruleChecks.filter((r) => r.result !== 'judgement')
    for (const r of shownRules.slice(0, 8)) g.push(`| ${r.id} | ${clip(r.method, 60)} | ${r.result} |`)
    if (ruleJudgement.length) g.push(`| ${ruleJudgement.map((r) => r.id).join(', ')} | none runnable | judgement |`)
  }
  const guardMd = g.slice(0, GUARD_MAX_LINES).join('\n') + '\n'

  if (!dry) {
    writeFile(path.join(runDir, 'evidence/regression/guard.json'), JSON.stringify(record, null, 2) + '\n')
    writeFile(path.join(runDir, 'bug-historian/guard.md'), guardMd)
  }
  console.log(`${verdict} (exit ${exit}) in ${(ms / 1000).toFixed(1)} s: ${tasks.filter((x) => x.head).length} detections for ${ids.length} entries; ${repeats.length} repeat, ${judgement.length + ruleJudgement.length} judgement, ${silent.length} silent.${dry ? ' Dry run: nothing written.' : ''}`)
  for (const x of repeats.slice(0, 8)) console.log(`  REPEAT ${x.id}: ${x.newLines.length} new line(s), first: ${clip(x.newLines[0] || '', 100)}`)
  for (const l of judgeLines.slice(0, 10)) console.log(`  ${l.slice(2)}`)
  if (!dry) console.log(`wrote ${rel(path.join(runDir, 'bug-historian/guard.md'))} (${guardMd.split('\n').length - 1} lines) and ${rel(path.join(runDir, 'evidence/regression/guard.json'))}`)
  return exit
}

async function cmdProof(ctx, opts) {
  const ids = opts._.filter((a) => /^BUG-\d{4}$/.test(a))
  if (!ids.length) throw new UsageError('give one or more BUG-NNNN ids')
  const bash = findBash()
  const timeoutMs = (Number(opts.timeout) || DEFAULT_TIMEOUT_S) * 1000
  let failed = 0
  for (const id of ids) {
    const e = ctx.reg.byId.get(id)
    if (!e) throw new UsageError(`no such entry: ${id}`)
    const mod = path.join(ctx.root, '.actio/bugs/detect', `${id}.mjs`)
    const side = async (dir, ref) => {
      if (fs.existsSync(mod)) { const r = await runModule(mod, dir, ref, timeoutMs); return evaluate({ cmd: 'module', expect: 'empty' }, r, [dir]).state }
      const dets = e.detect.filter((d) => d.runnable)
      if (!dets.length) return 'none'
      const states = await Promise.all(dets.map(async (d) => evaluate(d, await runShell(bash, d.cmd, dir, timeoutMs), [dir]).state))
      return states.includes('error') ? 'error' : states.includes('hit') ? 'hit' : 'silent'
    }
    let bad, good
    if (opts.bad && opts.good) {
      bad = await withWorktree(ctx.root, revParse(ctx.root, opts.bad), (d) => side(d, opts.bad))
      good = await withWorktree(ctx.root, revParse(ctx.root, opts.good), (d) => side(d, opts.good))
    } else if (fs.existsSync(mod)) {
      const m = JSON.parse(spawnSync(process.execPath, ['--input-type=module', '-e', `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL(process.argv[1]).href); process.stdout.write(JSON.stringify(m.proof || null))`, mod], { encoding: 'utf8' }).stdout || 'null')
      if (!m || !m.bad || !m.good) { console.log(`${id}  no proof: the module exports no proof {bad, good} fixtures; give --bad <ref> --good <ref>`); failed++; continue }
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bugs-proof-'))
      try {
        const fixture = (name, files) => { const d = path.join(tmp, name); for (const [rel, body] of Object.entries(files)) writeFile(path.join(d, rel), body); fs.mkdirSync(d, { recursive: true }); return d }
        bad = await side(fixture('bad', m.bad), 'fixture-bad'); good = await side(fixture('good', m.good), 'fixture-good')
      } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
    } else { console.log(`${id}  no proof: give --bad <defective ref> --good <healthy ref>, or commit a module with proof fixtures`); failed++; continue }
    const ok = bad === 'hit' && good === 'silent'
    if (!ok) failed++
    console.log(`${id}  defective: ${bad}  healthy: ${good}  ${ok ? 'two-sided' : 'NOT TWO-SIDED'}`)
  }
  return failed ? 1 : 0
}

function cmdNextId(ctx, opts) {
  const refs = referencedIds(ctx)
  const entryMax = Math.max(0, ...ctx.reg.entries.map((e) => idNum(e.id)))
  const top = [...refs.keys()].sort((a, b) => idNum(b) - idNum(a))[0]
  const next = fmtId(Math.max(entryMax, top ? idNum(top) : 0) + 1)
  const gap = [...refs.keys()].filter((id) => !ctx.reg.byId.has(id)).sort()
  const nextR = `R-${String(Math.max(0, ...ctx.reg.rules.map((r) => Number(r.id.replace(/\D/g, '')))) + 1).padStart(2, '0')}`
  const nextT = `T-${String(Math.max(0, ...ctx.reg.tRows.map((r) => Number(r.id.slice(2)))) + 1).padStart(2, '0')}`
  if (opts.json) return console.log(JSON.stringify({ next, nextRule: nextR, nextT, highestReferenced: top || null, where: top ? refs.get(top) : null, highestEntry: entryMax ? fmtId(entryMax) : null, referencedWithoutEntry: gap }, null, 2))
  console.log(next)
  console.error(`highest referenced ${top || 'none'} (${top ? refs.get(top) : '-'}); highest entry ${entryMax ? fmtId(entryMax) : 'none'}; ${gap.length} referenced id(s) with no entry${gap.length ? ': ' + compressIds(gap) : ''}. Next rule ${nextR}, next T-row ${nextT}.`)
}

function compressIds(ids) {
  const ns = uniq(ids.map(idNum)).sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < ns.length; i++) { let j = i; while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++; out.push(j - i >= 2 ? `${fmtId(ns[i])}..${fmtId(ns[j])}` : ns.slice(i, j + 1).map(fmtId).join(', ')); i = j }
  return out.join(', ')
}

function openIndexRows(reg) {
  const carried = new Map(reg.openIndex.map((o) => [o.id, o.needs]))
  return reg.entries.filter((e) => e.statusKey === 'open').map((e) => ({ id: e.id, row: `| ${e.id} | ${e.title.replace(/\|/g, '\\|')} | ${e.surfacesRow || e.surfaceRaw || e.surfaces.join(', ') || '-'} | ${e.agentAtFault || bindsCell(e.binds)} | ${e.needs || carried.get(e.id) || '-'} |` }))
}

function openMismatch(reg) {
  const byStatus = reg.entries.filter((e) => e.statusKey === 'open').map((e) => e.id)
  const listed = reg.openIndex.map((o) => o.id)
  return { byStatus, listed, missing: byStatus.filter((x) => !listed.includes(x)), stale: listed.filter((x) => !byStatus.includes(x)) }
}

function cmdOpenIndex(ctx) {
  const rows = openIndexRows(ctx.reg)
  console.log('| Id | What | Surface | Agent at fault | Needs |')
  console.log('|---|---|---|---|---|')
  for (const r of rows) console.log(r.row)
  const m = openMismatch(ctx.reg)
  console.error(`${m.byStatus.length} open by Status rows; the current Open table lists ${m.listed.length}. Not listed: ${m.missing.join(', ') || 'none'}. Listed but not open: ${m.stale.join(', ') || 'none'}. Needs is carried from the current table where the id is already there.`)
}

function cmdLint(ctx, opts) {
  const { reg } = ctx
  const modules = listModules(ctx.root)
  const findings = []
  const add = (code, text) => findings.push({ code, text })
  const big = reg.entries.filter((e) => e.lines > ENTRY_MAX_LINES || e.bytes > ENTRY_MAX_BYTES)
  if (big.length) add('oversized', `${big.length} entries over ${ENTRY_MAX_LINES} lines or ${ENTRY_MAX_BYTES} B (move dated history to .actio/bugs/history/): ${big.map((e) => `${e.id} ${e.lines}L/${e.bytes}B`).join(', ')}`)
  const noDetect = reg.entries.filter((e) => !modules.has(e.id) && !e.detect.some((d) => d.runnable) && !e.judgement.length)
  if (noDetect.length) add('no-runnable-detect', `${noDetect.length} entries with no runnable detection: ${noDetect.map((e) => `${e.id} (${e.detect.length ? 'dead' : e.detectProse ? 'prose' : 'none'})`).join(', ')}`)
  for (const r of reg.rules.filter((x) => x.missingFrom.length)) add('rule-cites-missing', `${r.id} cites ${r.missingFrom.join(', ')}, which has no entry`)
  const refs = referencedIds(ctx)
  const gap = [...refs.keys()].filter((id) => !reg.byId.has(id))
  if (gap.length) add('id-without-entry', `${gap.length} ids referenced with no entry (taken by next-id): ${compressIds(gap)}; first seen in ${uniq(gap.map((id) => refs.get(id))).slice(0, 3).join(', ')}`)
  const m = openMismatch(reg)
  if (m.missing.length || m.stale.length) add('open-index', `Open table lists ${m.listed.length}, Status rows say ${m.byStatus.length} open. Not listed: ${m.missing.join(', ') || 'none'}. Listed but not open: ${m.stale.join(', ') || 'none'}. Paste \`bugs.mjs open-index\``)
  for (const t of reg.tRows.filter((x) => x.promoted && !reg.byId.has(x.promoted))) add('t-row', `${t.id} promoted to ${t.promoted}, which has no entry`)
  for (const p of reg.problems) add('register', `${p.where}: ${p.problem}`)
  const unrouted = reg.entries.filter((e) => e.bindsDerived)
  if (unrouted.length) add('no-binds', `${unrouted.length} entries name no agent (binds derived from surfaces): ${unrouted.map((e) => e.id).join(', ')}`)
  const tagProblems = reg.entries.filter((e) => e.problems.some((p) => /maps to no tag|not in surfaces\.json|no surface tag/.test(p)))
  if (tagProblems.length) add('surface', `${tagProblems.length} entries with an unmapped surface: ${tagProblems.map((e) => `${e.id} (${e.problems.find((p) => /tag|surfaces/.test(p))})`).join('; ')}`)
  for (const e of reg.entries.filter((x) => x.historyRow)) { const h = backticked(e.historyRow)[0]; if (h && !fs.existsSync(path.join(ctx.root, h))) add('history', `${e.id} History row names ${h}, which does not exist`) }
  const legacy = reg.entries.filter((e) => !e.surfacesRow || !e.bindsRow || e.mode !== 'fenced')
  if (legacy.length) add('legacy-format', `${legacy.length} of ${reg.entries.length} entries predate the Surfaces/Binds/detect-block convention (advisory; convert when next touched)`)
  console.log(`lint: ${findings.length} finding(s) on ${posix(path.relative(ctx.root, ctx.register)) || 'BUGS.md'} (${reg.entries.length} entries, ${reg.rules.length} rules). Advisory${opts.strict ? ', --strict' : ''}.`)
  for (const f of findings) console.log(`- [${f.code}] ${f.text}`)
  return opts.strict && findings.length ? 1 : 0
}

// ------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------
const USAGE = 'usage: node .actio/bin/bugs.mjs <index|surfaces|brief|guard|proof|next-id|open-index|lint> [--root <repo>] [--register <path>] (see the header of this file)'

async function main(argv) {
  const opts = parseArgs(argv)
  if (!opts.cmd || opts.cmd === 'help' || opts.help) { console.log(USAGE); return opts.cmd ? 0 : 2 }
  const root = path.resolve(opts.root && opts.root !== true ? opts.root : path.join(HERE, '..', '..'))
  const register = path.resolve(opts.register && opts.register !== true ? opts.register : path.join(root, 'BUGS.md'))
  if (!fs.existsSync(register)) throw new UsageError(`no register at ${posix(register)}`)
  // A relative ACTIO_RUNS_DIR is relative to the root being judged, never to the shell's cwd.
  const runsDir = path.resolve(root, process.env.ACTIO_RUNS_DIR || '.actio/runs')
  const cfg = loadConfig(root)
  const src = fs.readFileSync(register, 'utf8')
  const ctx = { root, register, runsDir, cfg, src, reg: parseRegister(src, { root, cfg }) }
  const commands = { index: cmdIndex, surfaces: cmdSurfaces, brief: cmdBrief, guard: cmdGuard, proof: cmdProof, 'next-id': cmdNextId, 'open-index': cmdOpenIndex, lint: cmdLint }
  const fn = commands[opts.cmd]
  if (!fn) throw new UsageError(`unknown command "${opts.cmd}". ${USAGE}`)
  return (await fn(ctx, opts)) || 0
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (err) {
  console.error(err instanceof UsageError ? `bugs.mjs: ${err.message}` : `bugs.mjs: ${err.stack || err}`)
  process.exitCode = err instanceof UsageError ? 64 : 70
}
