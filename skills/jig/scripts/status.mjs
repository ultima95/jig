import fs from 'node:fs';
import path from 'node:path';
import { isMain, jigPaths } from './lib/paths.mjs';

export function listTasks(projectRoot) {
  const { tasksDir } = jigPaths(projectRoot);
  if (!fs.existsSync(tasksDir)) return [];
  const tasks = [];
  for (const day of fs.readdirSync(tasksDir)) {
    const dayPath = path.join(tasksDir, day);
    if (!fs.statSync(dayPath).isDirectory()) continue;
    for (const slug of fs.readdirSync(dayPath)) {
      const statePath = path.join(dayPath, slug, 'state.json');
      if (!fs.existsSync(statePath)) continue;
      try {
        tasks.push(JSON.parse(fs.readFileSync(statePath, 'utf8')));
      } catch { /* skip malformed state.json */ }
    }
  }
  return tasks.sort((a, b) => (a.task < b.task ? 1 : a.task > b.task ? -1 : 0));
}

export function formatStatus(tasks) {
  if (!tasks.length) return 'No tasks yet. Start one with: /jig task "<request>"';
  const header = 'TASK'.padEnd(40) + ' ' + 'PHASE'.padEnd(10) + ' GATES';
  const rows = tasks.map((t) => {
    const gates = Object.entries(t.gates || {}).map(([k, v]) => `${k}:${v}`).join(' ');
    return String(t.task).padEnd(40) + ' ' + String(t.phase).padEnd(10) + ' ' + gates;
  });
  const lines = [header, ...rows];
  const shipped = tasks.filter((t) => t.phase === 'shipped').length;
  if (shipped) {
    lines.push('', `${shipped} task(s) in 'shipped' — run /jig cleanup <taskId> to verify the merge and delete the branch.`);
  }
  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  console.log(formatStatus(listTasks(process.cwd())));
}
