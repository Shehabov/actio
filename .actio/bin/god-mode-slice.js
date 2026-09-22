export const meta = {
  name: 'actio-god-mode-slice',
  description: 'Run one slice of the Actio end-to-end test, so a spend limit costs one stage instead of the whole run',
  phases: [{ title: 'Slice' }],
}

const REPO = 'C:/Users/Sheha/Desktop/Actio'
const RUN = '2026-09-22-site-insights'
const DIR = `${REPO}/.actio/runs/${RUN}`

const BRIEF = `
THE BRIEF, from Shehab Beram, Product Lead.

Gulf Facilities Group runs the March 2026 engagement cycle across three sites: Tower A,
Warehouse B and Depot C. Build the **site insights screen**: the screen a site lead opens to
see how their own site is doing. It shows how many people responded, how long issues are
taking to close, and what people actually said. Nothing else.

The hard part is Depot C. It has four respondents. It must not report at all, and the screen
must not leak that the number is four. The site lead must understand why they are seeing
nothing, without learning anything about who answered.

done_means:
- Renders at 360px and above, English and Arabic, both themes
- Every figure computed for the reader, never illustrative, every percentage carries n=
- A cohort below the reporting threshold degrades without leaking its size
- The threshold is enforced in the database, not the client, and pgTAP proves it
- The anti-generic checklist in actio-design-system passes
- qc-lead issues a go

out_of_scope: the admin view across all three sites; changing the threshold value; WhatsApp or SMS delivery.
`

const CTX = `
You are an Actio agent working in ${REPO}. Today is 2026-09-22.

RUN ID: ${RUN}
RUN DIRECTORY: ${DIR}

This is a real run, resumed. Earlier stages are already on disk: read them before you plan.
Follow your own agent definition in .claude/agents/ and the house skills in .claude/skills/
exactly as written: the five-step loop (plan, audit the plan, execute, review, hand off), the
gates you own and no others, and the handoff schema in actio-agent-protocol.

Write your handoff to ${DIR}/<your-agent-name>/handoff.json, with a "stage" key, and
consumed[] and produced[] listing REAL paths that exist on disk. An agent that runs more than
once writes handoff-stage<N>.json on later passes. The utilisation check at
.actio/bin/utilisation-check.mjs verifies every path, so a phantom path is a finding
against you. Your plan.md must contain an "## Audit" section, or the check raises LOOP_SKIPPED.

TOOLING ON THIS MACHINE: node, perl, git, grep, sed, awk. **jq is NOT installed.**
**Do not write files with a Bash heredoc, it hangs and you will lose your turn.** Use the
file-writing tool or write a script file and run it. Bash calls here are slow; prefer the
dedicated read and search tools.

This run is also a test of the machinery. If a skill or agent definition is ambiguous,
contradictory, or missing something you needed, record it in "machinery_findings" with the
file named. That is as valuable as the feature work.

${BRIEF}
`

const HANDOFF = {
  type: 'object',
  properties: {
    agent: { type: 'string' },
    stage: { type: 'integer' },
    status: { type: 'string', enum: ['passed', 'blocked', 'rejected', 'escalated'] },
    summary: { type: 'string' },
    consumed: { type: 'array', items: { type: 'string' } },
    produced: { type: 'array', items: { type: 'string' } },
    gates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          result: { type: 'string', enum: ['pass', 'fail', 'blocked'] },
          evidence: { type: 'string' },
        },
        required: ['name', 'result'],
      },
    },
    blockers: { type: 'array', items: { type: 'string' } },
    missing_inputs: { type: 'array', items: { type: 'string' } },
    machinery_findings: { type: 'array', items: { type: 'string' } },
    next: { type: 'string' },
  },
  required: ['agent', 'stage', 'status', 'summary', 'consumed', 'produced', 'machinery_findings'],
}

const go = (name, task) =>
  agent(`${CTX}\n\nYOUR TASK THIS RUN:\n${task}`, {
    label: name,
    phase: 'Slice',
    agentType: name,
    schema: HANDOFF,
  })

const SLICES = {
  // Stage 2 back end. ux-designer already completed; its spec is on disk.
  backend: () => [
    go('backend-engineer', `Stage 2, resuming: your plan.md and files.md are already on disk, the SQL is not.
       Read ${DIR}/tech-architect/brief-backend.md, ${DIR}/bug-historian/brief.md and your own
       ${DIR}/backend-engineer/plan.md and files.md. Now write the real artefacts under ${DIR}/backend/:
       declarative schema, RLS policies and grants, the security-definer function that applies the
       reporting floor, and the pgTAP suite that proves a cohort of four does not report and does not
       leak its size. Real SQL that would run. The reviewers read it line by line.`),
  ],
  audit: () => [
    go('ux-auditor', `Stage 3. Independently audit ${DIR}/ux-designer/spec.md against BRAND.md,
       actio-design-system including its anti-generic checklist and five signatures, WCAG 2.2 AA and the
       interaction heuristics. Write ${DIR}/ux-auditor/findings.md. You own the design gate. Be
       adversarial: if the spec would produce a generic dashboard, fail it and say exactly where.`),
  ],
  copy: () => [
    go('ux-writer', `Stage 4. Read ${DIR}/ux-designer/spec.md, ${DIR}/ux-designer/string-slots.json and
       ${DIR}/ux-auditor/findings.md. Write every user-visible string in English and Arabic to
       ${DIR}/ux-writer/strings-en.json and ${DIR}/ux-writer/strings-ar.json. English first, then Arabic.
       Include the below-threshold message, which must explain without leaking the group size. No string
       concatenates a count. You own the copy gate.`),
  ],
  build: () => [
    go('frontend-engineer', `Stage 5. Read ${DIR}/tech-architect/brief-frontend.md, ${DIR}/ux-designer/spec.md,
       ${DIR}/ux-auditor/findings.md and both string files. Write the real React component and its tests
       under ${DIR}/frontend/. Implement the approved spec: two metric tiles (never a six-tile row), the
       unfilled sidebar with the icon after the label, quote-led rows, the below-threshold state and the
       empty state. Responsive from 360px, RTL, both themes.`),
  ],
  review: () => [
    go('peer-reviewer', `Stage 6. Review everything under ${DIR}/backend/ and ${DIR}/frontend/ as a senior
       engineer: problem fit, design, layer boundaries, failure modes, test quality, rollout safety. Write
       ${DIR}/peer-reviewer/review.md. You own review-1of3.`),
    go('code-analyst', `Stage 6. Read every line under ${DIR}/backend/ and ${DIR}/frontend/ for defects,
       security holes, data-layer problems and structural rot. Pay particular attention to the threshold
       path and anything that could leak a group size. Write ${DIR}/code-analyst/findings.md with file,
       line, severity and a concrete fix. You own review-2of3.`),
    go('code-steward', `Stage 6. Enforce clean code and commenting on ${DIR}/backend/ and ${DIR}/frontend/:
       naming in the domain's language, function and file size, guard clauses, module headers stating the
       invariants each file upholds, docstrings, comments that say why. Write ${DIR}/code-steward/findings.md.
       You own review-3of3.`),
    go('security-analyst', `Stage 6. Full security pass over ${DIR}/backend/ and ${DIR}/frontend/ using
       actio-security: secrets in tree, RLS coverage and grants on every client-reachable table,
       service_role usage, IDOR and broken access control, injection, client-side auth, data in URLs and
       logs, error handling. Check specifically whether the below-threshold response, or any error, header,
       timing or log line, discloses the cohort size. Write ${DIR}/security-analyst/findings.md and evidence
       under ${DIR}/evidence/security/. You own the security gate and block on your own authority.`),
  ],
  guard: () => [
    go('bug-historian', `Stage 7, your second pass. Write handoff-stage7.json, NOT handoff.json: your stage 1
       record is already at handoff.json and overwriting it is BUG-0016. Run the regression guard: check
       ${DIR}/backend/, ${DIR}/frontend/ and ${DIR}/ux-designer/ against your own brief at
       ${DIR}/bug-historian/brief.md. Has any known defect been repeated, and has every binding standing rule
       R-01 to R-11 been checked? Run each detection command and record its result. Write
       ${DIR}/bug-historian/guard.md and evidence under ${DIR}/evidence/regression/. You own regression-guard.`),
  ],
  integrate: () => [
    go('engineering-lead', `Stage 8. All three reviews, security and the regression guard have run. Read
       ${DIR}/peer-reviewer/review.md, ${DIR}/code-analyst/findings.md, ${DIR}/code-steward/findings.md,
       ${DIR}/security-analyst/findings.md and ${DIR}/bug-historian/guard.md. Decide the integration gate:
       does the seam between front end and back end hold, does the architecture conform to the ADR, what did
       this touch that nobody tested. Write ${DIR}/engineering-lead/verdict.md. You own the engineering gate
       and may reject back to any engineering role.`),
  ],
  test: () => [
    go('qc-engineer', `Stage 9. Test against the architect's contract, the privacy invariants, the state
       machine and the real flows, across locales and both themes, at 360px. The privacy invariants are the
       product's core claim, so test them hardest: prove a cohort of four does not report and does not leak
       its size. Write ${DIR}/qc-engineer/test-log.md and save real evidence under ${DIR}/evidence/.`),
  ],
  quality: () => [
    go('qc-lead', `Stage 10. Audit ${DIR}/qc-engineer/test-log.md and the evidence under ${DIR}/evidence/
       rather than trusting the log. Name the untested locale, state and device. Re-verify that Actio's own
       product claims still hold. Write ${DIR}/qc-lead/verdict.md with a go or no-go. You own the quality gate.`),
  ],
  ship: () => [
    go('release-engineer', `Stage 11. Run the release pre-flight ONLY. This run produced artefacts under
       ${DIR}, not a deployable application: no Supabase project is linked and there is no Vercel target.
       Decide honestly whether this is releasable and REFUSE if it is not. A pre-flight refusal is the
       correct outcome here and is what is being tested. Write ${DIR}/release-engineer/preflight.md.
       Do NOT push, deploy, tag or commit anything. You own the release gate.`),
  ],
  close: () => [
    go('orchestrator', `Stage 12. Close the run. Run the utilisation check:
       \`node .actio/bin/utilisation-check.mjs .actio/runs/${RUN}\` from ${REPO}. It is the implementation of
       the eight-step algorithm in actio-orchestration; do not re-derive it by hand and do not use jq, which
       is not installed. Report every finding by its code. Then run
       \`node .actio/bin/sync-gates.mjs .actio/runs/${RUN}\` so run.json reflects what the owners recorded.
       Write the run report at ${DIR}/report.md: what shipped, what each gate decided, every blocker, and a
       consolidated list of every machinery_finding every agent raised across all twelve stages. You own
       run-closure. Do not paper over a finding: a clean report that is not true is the worst outcome here.`),
  ],
}

const name = (typeof args === 'string' ? args : args && args.slice) || 'backend'
const build = SLICES[name]
if (!build) throw new Error(`Unknown slice "${name}". One of: ${Object.keys(SLICES).join(', ')}`)

phase('Slice')
log(`Slice: ${name}`)

const results = (await parallel(build().map((p) => () => p))).filter(Boolean)

return {
  slice: name,
  agents: results.length,
  statuses: results.map((h) => ({ agent: h.agent, stage: h.stage, status: h.status, gates: h.gates || [] })),
  blockers: results.flatMap((h) => (h.blockers || []).map((b) => `${h.agent}: ${b}`)),
  missing_inputs: results.flatMap((h) => (h.missing_inputs || []).map((m) => `${h.agent}: ${m}`)),
  machinery_findings: results.flatMap((h) => (h.machinery_findings || []).map((m) => `${h.agent}: ${m}`)),
}
