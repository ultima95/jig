import fs from 'node:fs';
import path from 'node:path';
import { readState } from './lib/state.mjs';
import { isMain } from './lib/paths.mjs';

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

export function renderReview(findings) {
  const header = '| dimension | location | severity | claim | verdict | fix |\n|---|---|---|---|---|---|';
  if (!findings || !findings.length) return `${header}\n| _none_ |  |  |  |  |  |`;
  const rows = findings.map(
    (f) => `| ${f.dimension} | ${f.file}:${f.line} | ${f.severity || ''} | ${f.claim} | ${f.verdict || ''} |  |`,
  );
  return [header, ...rows].join('\n');
}

export function writeReview(taskDir, findings) {
  const deduped = dedupeFindings([findings]);
  let id;
  try { id = readState(taskDir).task; } catch { id = path.basename(taskDir); }
  const content = `# Review — ${id}\n\n${renderReview(deduped)}\n`;
  fs.writeFileSync(path.join(taskDir, 'review.md'), content);
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
