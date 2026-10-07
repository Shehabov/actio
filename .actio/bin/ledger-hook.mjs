#!/usr/bin/env node
/**
 * ledger-hook.mjs: writes the dispatch and return rows of the active run's ledger, so the
 * orchestrator never spends a turn on them (R-15).
 *
 * Wired in .claude/settings.json as the SubagentStart (`start`) and SubagentStop (`stop`)
 * command hooks. Reads the hook payload from stdin and appends to the ledger of the run named
 * in .actio/runs/.active:
 *   start  | <ts> | dispatched | <agent> | auto · subagent started |
 *   stop   | <ts> | returned | <agent> | auto · handoff <latest handoff or none> · status <status or none> |
 *
 * Invariants this file upholds:
 *   - It never blocks or fails a session: everything is wrapped, it never writes to stdout or
 *     stderr, and it always exits 0.
 *   - It writes nothing when no run is active or the agent is not one of the swarm roles
 *     (the files in .claude/agents/), so other subagents leave no trace.
 *   - It reads the payload defensively, because the field naming the agent has differed
 *     between versions: agent_type, subagent_type, agent_name, tool_input.subagent_type.
 *   - It is standalone, importing nothing from the other scripts, so a defect elsewhere
 *     cannot break the hook.
 */

import { readFileSync, appendFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

function readStdin() {
  return new Promise((done) => {
    if (process.stdin.isTTY) return done('')
    let data = ''
    const finish = () => done(data)
    // A payload that never closes must not hold the session: give up after 1.5 s.
    const timer = setTimeout(finish, 1500)
    timer.unref?.()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => { clearTimeout(timer); finish() })
    process.stdin.on('error', () => { clearTimeout(timer); finish() })
  })
}

function agentOf(payload) {
  const raw = [payload?.agent_type, payload?.subagent_type, payload?.agent_name, payload?.tool_input?.subagent_type]
    .find((v) => typeof v === 'string' && v.trim())
  // A namespaced type such as "plugin:code-analyst" names the same role.
  return raw ? raw.trim().split(':').pop() : null
}

/** The newest handoff the agent has written in this run, and its status. */
function latestHandoff(runDir, agent) {
  const dir = join(runDir, agent)
  let best = null
  try {
    for (const file of readdirSync(dir)) {
      if (!/^handoff(-.+)?\.json$/.test(file)) continue
      const mtime = statSync(join(dir, file)).mtimeMs
      if (!best || mtime > best.mtime) best = { file, mtime }
    }
  } catch {
    return { path: 'none', status: 'none' }
  }
  if (!best) return { path: 'none', status: 'none' }
  let status = 'none'
  try { status = String(JSON.parse(readFileSync(join(dir, best.file), 'utf8')).status ?? 'none') } catch { status = 'unparseable' }
  return { path: `${agent}/${best.file}`, status }
}

async function main() {
  const mode = process.argv[2]
  if (mode !== 'start' && mode !== 'stop') return
  let payload = null
  try { payload = JSON.parse(await readStdin()) } catch { return }
  const agent = agentOf(payload)
  if (!agent) return

  const codeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const repoRoot = resolve(process.env.ACTIO_REPO_ROOT || process.env.CLAUDE_PROJECT_DIR || codeRoot)
  const roles = readdirSync(join(codeRoot, '.claude', 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
  if (!roles.includes(agent)) return

  const runsDir = resolve(repoRoot, process.env.ACTIO_RUNS_DIR || '.actio/runs')
  const id = readFileSync(join(runsDir, '.active'), 'utf8').trim()
  const runDir = join(runsDir, id)
  if (!id || !existsSync(join(runDir, 'run.json'))) return

  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  let row
  if (mode === 'start') row = `| ${ts} | dispatched | ${agent} | auto · subagent started |`
  else {
    const h = latestHandoff(runDir, agent)
    row = `| ${ts} | returned | ${agent} | auto · handoff ${h.path} · status ${h.status} |`
  }
  const ledger = join(runDir, 'ledger.md')
  if (!existsSync(ledger)) writeFileSync(ledger, `# Ledger · ${id}\n\n| Time (UTC) | Event | Agent | Detail |\n|---|---|---|---|\n`, 'utf8')
  // A hand-edited ledger may end without a newline; the row must still start its own line.
  const lead = readFileSync(ledger, 'utf8').endsWith('\n') ? '' : '\n'
  appendFileSync(ledger, lead + row + '\n', 'utf8')
}

main().catch(() => {}).finally(() => process.exit(0))
