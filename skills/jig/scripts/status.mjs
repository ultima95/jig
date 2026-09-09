import { isMain } from './lib/paths.mjs';
import { listTaskEntries } from './lib/tasks.mjs';
import { auditTasks, formatDoctor } from './doctor.mjs';

export function listTasks(projectRoot) {
  return listTaskEntries(projectRoot).map((e) => e.state);
}

export function openTasks(tasks) {
  return (tasks || []).filter((t) => t.phase !== 'done');
}

const MIN_TASK_COL = 40;

function hiddenNote(hidden) {
  return `${hidden} done task(s) hidden — run \`/jig status --all\` to include them.`;
}

export function formatStatus(tasks, { hidden = 0 } = {}) {
  if (!tasks.length) {
    return hidden
      ? `No open tasks — all ${hidden} done.`
      : 'No tasks yet. Start one with: /jig task "<request>"';
  }
  // Size the task column to the widest id so PHASE/GATES stay aligned; long
  // slugs used to overflow a hard-coded 40 and shear the columns apart.
  const width = Math.max(MIN_TASK_COL, ...tasks.map((t) => String(t.task).length));
  const header = 'TASK'.padEnd(width) + ' ' + 'PHASE'.padEnd(10) + ' GATES';
  const rows = tasks.map((t) => {
    const gates = Object.entries(t.gates || {}).map(([k, v]) => `${k}:${v}`).join(' ');
    return String(t.task).padEnd(width) + ' ' + String(t.phase).padEnd(10) + ' ' + gates;
  });
  const lines = [header, ...rows];
  const shipped = tasks.filter((t) => t.phase === 'shipped').length;
  if (shipped) {
    lines.push('', `${shipped} task(s) in 'shipped' — run /jig cleanup <taskId> to verify the merge and delete the branch.`);
  }
  if (hidden) lines.push('', hiddenNote(hidden));
  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  const all = listTasks(process.cwd());
  const showAll = process.argv.includes('--all');
  const shown = showAll ? all : openTasks(all);
  console.log(formatStatus(shown, { hidden: showAll ? 0 : all.length - shown.length }));

  // Surface state drift here so it cannot sit unnoticed: status is the command
  // every session runs, and drift means state.json was edited outside the scripts.
  const drift = auditTasks(process.cwd());
  if (drift.length) console.log('\n' + formatDoctor(drift));
}
