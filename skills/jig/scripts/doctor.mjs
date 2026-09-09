import fs from 'node:fs';
import path from 'node:path';
import { getFrontMatterField } from './lib/frontmatter.mjs';
import { reviewReportWritten } from './review.mjs';
import { isMain } from './lib/paths.mjs';
import { listTaskEntries } from './lib/tasks.mjs';

// `state.json` is the source of truth; `spec.md`'s front-matter is its mirror.
// They only diverge when something wrote state.json directly instead of going
// through set-state.mjs — which is exactly the drift this catches.
const MIRRORED = [
  { field: 'status', of: (s) => s.phase, label: 'phase' },
  { field: 'gate_spec_plan', of: (s) => s.gates?.spec_plan, label: 'gates.spec_plan' },
  { field: 'gate_review', of: (s) => s.gates?.review, label: 'gates.review' },
];

export function auditTask(taskDir, state) {
  const issues = [];
  const specPath = path.join(taskDir, 'spec.md');
  const spec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : null;

  if (spec === null) {
    issues.push('spec.md is missing');
  } else {
    for (const { field, of, label } of MIRRORED) {
      const expected = of(state);
      const actual = getFrontMatterField(spec, field);
      if (expected !== undefined && actual !== expected) {
        issues.push(`${label} is "${expected}" in state.json but spec.md says ${field}: "${actual ?? '(absent)'}"`);
      }
    }
  }

  if (state.gates?.review === 'approved' && !reviewReportWritten(taskDir)) {
    issues.push('review gate is approved but review.md was never written');
  }

  return issues;
}

export function auditTasks(projectRoot) {
  const out = [];
  for (const { taskDir, state } of listTaskEntries(projectRoot)) {
    const issues = auditTask(taskDir, state);
    if (issues.length) out.push({ task: state.task, issues });
  }
  return out;
}

export function formatDoctor(results) {
  if (!results.length) return 'OK — task state is consistent (state.json ↔ spec.md).';
  const lines = [`${results.length} task(s) with state drift:`, ''];
  for (const { task, issues } of results) {
    lines.push(`  ${task}`);
    for (const i of issues) lines.push(`    - ${i}`);
  }
  lines.push('', 'Repair with set-state.mjs (phase/gate/field) rather than editing state.json by hand.');
  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  const results = auditTasks(process.cwd());
  console.log(formatDoctor(results));
  if (results.length) process.exit(1);
}
