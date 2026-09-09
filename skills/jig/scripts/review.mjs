import fs from 'node:fs';
import path from 'node:path';
import { readState } from './lib/state.mjs';
import { isMain } from './lib/paths.mjs';

// Markers carried only by a scaffolded template — writeReview never emits either.
// The presence of one means the Review phase never wrote a report for this task.
// The first is a machine marker, so rewording the template's prose cannot quietly
// disable the gate check; the second is that prose, kept because repos scaffolded
// before the marker existed still have it and must stay protected.
const TEMPLATE_MARKERS = [
  '<!-- jig:review-template',
  '<!-- Findings from the Review phase.',
];

export function reviewReportWritten(taskDir) {
  const p = path.join(taskDir, 'review.md');
  if (!fs.existsSync(p)) return false;
  const md = fs.readFileSync(p, 'utf8');
  return !TEMPLATE_MARKERS.some((m) => md.includes(m));
}

function key(f) { return `${f.dimension}::${f.file}::${f.line}::${f.claim}`; }

export function dedupeFindings(arrays) {
  const seen = new Set();
  const out = [];
  for (const arr of arrays || []) {
    for (const f of arr || []) {
      if (!f) continue;
      const k = key(f);
      if (!seen.has(k)) { seen.add(k); out.push(f); }
    }
  }
  return out;
}

export function verdict(votes) {
  const v = (votes || []).filter(Boolean);
  if (!v.length) return 'real';
  const refuted = v.filter((x) => x.refuted).length;
  return refuted >= Math.ceil(v.length / 2) ? 'refuted' : 'real';
}

const COLUMNS = ['dimension', 'round', 'location', 'severity', 'claim', 'verdict', 'fix'];

// A pipe inside a claim would otherwise silently shear the row into extra cells.
function cell(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
}

// `med` and `medium` were both in use, so the same severity sorted as two values.
export function normalizeSeverity(severity) {
  const s = String(severity ?? '').trim().toLowerCase();
  if (s === 'med' || s === 'medium') return 'medium';
  return severity ? String(severity).trim() : '';
}

export function renderReview(findings) {
  const header = `| ${COLUMNS.join(' | ')} |\n|${COLUMNS.map(() => '---').join('|')}|`;
  const blank = `| _none_ |${COLUMNS.slice(1).map(() => '  ').join('|')}|`;
  if (!findings || !findings.length) return `${header}\n${blank}`;
  const rows = findings.map((f) => {
    const cells = [
      f.dimension, f.round, `${f.file}:${f.line}`,
      normalizeSeverity(f.severity), f.claim, f.verdict, f.fix,
    ];
    return `| ${cells.map(cell).join(' | ')} |`;
  });
  return [header, ...rows].join('\n');
}

// A hand-written `## Summary` (what the fan-out did, how many findings were
// refuted) is the reviewer's own prose — a second review pass rewrites the
// table beneath it, and must not take the summary down with it.
export function extractSummary(md) {
  const m = String(md).match(/^## Summary\n[\s\S]*?(?=\n\|)/m);
  return m ? m[0].trimEnd() : null;
}

export function writeReview(taskDir, findings) {
  const deduped = dedupeFindings([findings]);
  let id;
  try { id = readState(taskDir).task; } catch { id = path.basename(taskDir); }
  const dest = path.join(taskDir, 'review.md');
  const prior = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  const summary = extractSummary(prior);
  const parts = [`# Review — ${id}`, summary, renderReview(deduped)].filter(Boolean);
  fs.writeFileSync(dest, parts.join('\n\n') + '\n');
  return deduped.length;
}

if (isMain(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'write') {
    const [taskDir, findingsFile] = rest;
    if (!taskDir || !findingsFile) { console.error('usage: node review.mjs write <taskDir> <findings.json>'); process.exit(1); }
    const findings = JSON.parse(fs.readFileSync(findingsFile, 'utf8'));
    console.log(`wrote review.md with ${writeReview(taskDir, findings)} finding(s)`);
  } else if (cmd === 'verdict') {
    const [votesFile] = rest;
    if (!votesFile) { console.error('usage: node review.mjs verdict <votes.json>'); process.exit(1); }
    console.log(verdict(JSON.parse(fs.readFileSync(votesFile, 'utf8'))));
  } else {
    console.error('usage: node review.mjs <write <taskDir> <findings.json> | verdict <votes.json>>');
    process.exit(1);
  }
}
