import fs from 'node:fs';
import path from 'node:path';
import { PHASES } from './lib/transition.mjs';
import { isMain } from './lib/paths.mjs';

// The lifecycle phases, plus `cleanup` — a phase guide (Phase 7) that has no
// state of its own but still earns its own entry. Restricting headings to this
// set is what keeps progress.md greppable: no `Spec & Plan` vs `spec_plan`, and
// no qualifiers such as `implement (fix pass)` smuggled into the heading.
export const PROGRESS_PHASES = [...PHASES, 'cleanup'];

export function appendProgress(taskDir, phase, note) {
  if (!PROGRESS_PHASES.includes(phase)) {
    throw new Error(
      `unknown phase: ${phase} (expected ${PROGRESS_PHASES.join('|')}) — ` +
      'put qualifiers like "fix pass" in the note, not the heading',
    );
  }
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const entry = `\n## ${date} — ${phase}\n- ${note}\n`;
  fs.appendFileSync(path.join(taskDir, 'progress.md'), entry);
  return entry;
}

if (isMain(import.meta.url)) {
  const [taskDir, phase, ...noteParts] = process.argv.slice(2);
  const note = noteParts.join(' ');
  if (!taskDir || !phase || !note) {
    console.error('usage: node progress.mjs <taskDir> <phase> <note...>');
    process.exit(1);
  }
  appendProgress(taskDir, phase, note);
  console.log('appended progress entry');
}
