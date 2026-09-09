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

// Once a task has shipped, these phases must each have left an entry behind.
// A gate can be approved and a task closed while the work it attests to was never
// recorded — the audit that prompted this found tasks reaching `done` with no test
// or review entry at all. Only checked from `ship` onward, so a task still moving
// through the lifecycle is never nagged about phases it has not reached.
const SHIPPED_PHASES = ['ship', 'shipped', 'done'];
const REQUIRED_ENTRIES = ['implement', 'test', 'review'];

// Splits the required phases three ways, because "never happened" and "happened
// but the heading predates the phase vocabulary" need different fixes and should
// not be reported with the same words.
function auditProgressEntries(taskDir) {
  const p = path.join(taskDir, 'progress.md');
  if (!fs.existsSync(p)) return { missing: REQUIRED_ENTRIES, malformed: [] };
  const md = fs.readFileSync(p, 'utf8');
  const missing = [];
  const malformed = [];
  for (const phase of REQUIRED_ENTRIES) {
    if (new RegExp(`^## \\S+ — ${phase}$`, 'm').test(md)) continue;
    // Same phase named loosely: wrong case, or a qualifier appended to the heading.
    if (new RegExp(`^## \\S+ — .*\\b${phase}\\b`, 'im').test(md)) malformed.push(phase);
    else missing.push(phase);
  }
  return { missing, malformed };
}

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

  if (SHIPPED_PHASES.includes(state.phase)) {
    const { missing, malformed } = auditProgressEntries(taskDir);
    if (missing.length) {
      issues.push(`task is "${state.phase}" but progress.md has no ${missing.join(' or ')} entry`);
    }
    if (malformed.length) {
      issues.push(
        `progress.md records ${malformed.join(', ')} under a heading that is not ` +
        '`## <date> — <phase>`, so the trail is there but not greppable',
      );
    }
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
