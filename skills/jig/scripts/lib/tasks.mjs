import fs from 'node:fs';
import path from 'node:path';
import { jigPaths } from './paths.mjs';

// Walks `.jig/tasks/<YYYYMMDD>/<slug>/` and yields each task's directory next to
// its parsed state. Shared by status and doctor so neither has to import the
// other — they used to, and the cycle deadlocked status.mjs's top-level await.
export function listTaskEntries(projectRoot) {
  const { tasksDir } = jigPaths(projectRoot);
  if (!fs.existsSync(tasksDir)) return [];
  const entries = [];
  for (const day of fs.readdirSync(tasksDir)) {
    const dayPath = path.join(tasksDir, day);
    if (!fs.statSync(dayPath).isDirectory()) continue;
    for (const slug of fs.readdirSync(dayPath)) {
      const taskDir = path.join(dayPath, slug);
      const statePath = path.join(taskDir, 'state.json');
      if (!fs.existsSync(statePath)) continue;
      try {
        entries.push({ taskDir, state: JSON.parse(fs.readFileSync(statePath, 'utf8')) });
      } catch { /* skip malformed state.json */ }
    }
  }
  return entries.sort((a, b) => (a.state.task < b.state.task ? 1 : a.state.task > b.state.task ? -1 : 0));
}
