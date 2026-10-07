// Checks and ships the Actio string catalogue (schema: actio-bilingual-copy SKILL.md, "The string catalogue").
// Usage, from the repository root:
//   node .claude/skills/actio-bilingual-copy/scripts/catalogue.mjs check <run-dir> [--slots <path>]
//   node .claude/skills/actio-bilingual-copy/scripts/catalogue.mjs ship  <run-dir> [--slots <path>]
// check: one line per finding, then a summary. Exit 0 clean, 1 findings, 2 unreadable input.
// ship: runs check, refuses on any finding, then overlays the run's strings onto
// content/strings/{en,ar}.json (text only, keys sorted). It never deletes a key.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BANNED = ['empower', 'seamless', 'unlock', 'leverage', 'journey', 'supercharge', 'delight',
  'effortless', 'revolutionise', 'game-changing', 'moments that matter', 'listening strategy',
  'people leader', 'oops', 'sorry', 'unfortunately', 'something went wrong',
  'please try again later', 'an unexpected error occurred'];
const READERS = ['employee', 'lead', 'operations', 'executive'];
const AR_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const KEY = /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+$/;
const NUMERIC_DATE = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{1,2}-\d{1,2}-\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/;
const ARABIC = /[؀-ۿ]/;
const LATIN_OR_DIGIT = /[A-Za-z0-9{]/;
const EMOJI = /\p{Extended_Pictographic}/u;

const [cmd, runDir, ...rest] = process.argv.slice(2);
if (!['check', 'ship'].includes(cmd) || !runDir) {
  console.log('usage: catalogue.mjs check|ship <run-dir> [--slots <path>]');
  process.exit(2);
}
const slotsArg = rest.indexOf('--slots');
const slotsPath = slotsArg >= 0 ? rest[slotsArg + 1] : path.join(runDir, 'ux-designer', 'string-slots.json');

function readJson(p, required) {
  if (!fs.existsSync(p)) {
    if (!required) return null;
    console.log(`UNREADABLE ${p} missing`);
    process.exit(2);
  }
  try { return { raw: fs.readFileSync(p), json: JSON.parse(fs.readFileSync(p, 'utf8')) }; }
  catch (e) { console.log(`UNREADABLE ${p} ${e.message}`); process.exit(2); }
}

const en = readJson(path.join(runDir, 'ux-writer', 'strings-en.json'), true).json.strings || {};
const ar = readJson(path.join(runDir, 'ux-writer', 'strings-ar.json'), true).json.strings || {};
const slotsFile = readJson(slotsPath, false);
const slotList = slotsFile ? (Array.isArray(slotsFile.json) ? slotsFile.json : slotsFile.json.slots || []) : [];
const slots = Object.fromEntries(slotList.map((s) => [`${s.surface}.${s.slot}`, s]));
const slotsSha = slotsFile ? crypto.createHash('sha256').update(slotsFile.raw).digest('hex').slice(0, 12) : 'none';

const findings = [];
const fail = (key, code, detail) => findings.push(`FAIL ${key} ${code} ${detail}`);
const variants = (text) => (text && typeof text === 'object' ? Object.values(text) : [text]);
const len = (s) => [...String(s ?? '')].length;
const longest = (text) => Math.max(0, ...variants(text).map(len));

for (const key of Object.keys(slots)) if (!en[key]) fail(key, 'SLOT_UNWRITTEN', 'slot in string-slots.json has no catalogue row');
for (const key of Object.keys(ar)) if (!en[key]) fail(key, 'MISSING_EN', 'key has Arabic but no English');

for (const [key, row] of Object.entries(en)) {
  const a = ar[key];
  if (!KEY.test(key)) fail(key, 'KEY_FORMAT', 'key is not <surface>.<slot>');
  if (!a) { fail(key, 'MISSING_AR', 'key has English but no Arabic'); continue; }
  for (const [loc, r] of [['en', row], ['ar', a]]) {
    const vs = variants(r.text);
    if (vs.length === 0 || vs.some((v) => typeof v !== 'string' || !v.trim())) fail(key, 'EMPTY_TEXT', `${loc} text missing or empty`);
    if (r.competitor !== 'pass') fail(key, 'COMPETITOR', `${loc} row not marked competitor: pass`);
    for (const v of vs.filter((x) => typeof x === 'string')) {
      if (v.includes('{count}') && typeof r.text !== 'object') fail(key, 'PLURAL', `${loc} carries {count} without plural variants`);
      if (v.includes('%') && !/n\s*=/.test(v)) fail(key, 'SAMPLE_SIZE', `${loc} percentage without (n=...)`);
      if (v.includes('!')) fail(key, 'EXCLAMATION', `${loc} exclamation mark`);
      if (EMOJI.test(v)) fail(key, 'EMOJI', `${loc} emoji`);
      if (NUMERIC_DATE.test(v)) fail(key, 'NUMERIC_DATE', `${loc} numeric-only date`);
      if (loc === 'en') for (const w of BANNED) if (new RegExp(`\\b${w}\\b`, 'i').test(v)) fail(key, 'BANNED_WORD', `en "${w}"`);
      if (loc === 'ar' && !ARABIC.test(v)) fail(key, 'AR_SCRIPT', 'ar variant has no Arabic letters');
    }
  }
  if (typeof row.text === 'object' && !(row.text.one && row.text.other)) fail(key, 'PLURAL_EN_FORMS', 'en plural needs one and other');
  if (typeof a.text === 'object' && AR_FORMS.some((f) => !a.text[f])) fail(key, 'PLURAL_AR_FORMS', `ar plural needs ${AR_FORMS.join(', ')}`);
  if ((typeof row.text === 'object') !== (typeof a.text === 'object')) fail(key, 'PLURAL_MISMATCH', 'one locale is plural and the other is not');
  if (!READERS.includes(row.reader)) fail(key, 'READER', `reader must be one of ${READERS.join('|')}`);
  if (!row.context || !String(row.context).trim()) fail(key, 'CONTEXT', 'context missing');
  if (!row.drafts || !row.drafts.id || !row.drafts.tl) fail(key, 'DRAFTS', 'drafts.id and drafts.tl are needed to measure length');
  const ltrNeeded = variants(a.text).some((v) => LATIN_OR_DIGIT.test(String(v)));
  if (ltrNeeded && !Array.isArray(a.ltr_runs)) fail(key, 'LTR_RUNS', 'ar carries Latin, digits or placeholders but ltr_runs is not a list');
  if (Array.isArray(a.ltr_runs)) for (const run of a.ltr_runs) if (!variants(a.text).some((v) => String(v).includes(run))) fail(key, 'LTR_RUNS', `listed run "${run}" not in the ar text`);
  const review = a.ar_review;
  const named = review && typeof review === 'object' && review.reviewer && review.device && review.date;
  if (review !== 'needs native review' && !named) fail(key, 'AR_REVIEW', 'ar_review must be "needs native review" or {reviewer, device, date}');
  const slot = slots[key];
  const budget = slot ? slot.max_chars : row.max_chars;
  if (slot && row.max_chars !== undefined && row.max_chars !== slot.max_chars) fail(key, 'BUDGET_DRIFT', `row max_chars ${row.max_chars} differs from slot ${slot.max_chars}; the slot is the source`);
  if (!budget) { fail(key, 'NO_BUDGET', 'no slot budget and no row max_chars'); continue; }
  const lengths = { en: longest(row.text), ar: longest(a.text), id: len(row.drafts?.id), tl: len(row.drafts?.tl) };
  const [loc, chars] = Object.entries(lengths).sort((x, y) => y[1] - x[1])[0];
  if (chars > budget) fail(key, 'OVER_BUDGET', `${loc} ${chars} chars > ${budget}`);
}

for (const f of findings) console.log(f);
console.log(`keys ${Object.keys(en).length} · slots ${Object.keys(slots).length} (sha256 ${slotsSha}) · findings ${findings.length}`);
if (findings.length) process.exit(1);

if (cmd === 'ship') {
  const dir = path.join('content', 'strings');
  fs.mkdirSync(dir, { recursive: true });
  for (const [loc, rows] of [['en', en], ['ar', ar]]) {
    const out = path.join(dir, `${loc}.json`);
    const cur = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
    for (const [k, r] of Object.entries(rows)) cur[k] = r.text;
    const sorted = Object.fromEntries(Object.keys(cur).sort().map((k) => [k, cur[k]]));
    fs.writeFileSync(out, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`shipped ${Object.keys(rows).length} keys to ${out.split(path.sep).join('/')} (${Object.keys(sorted).length} total)`);
  }
}
