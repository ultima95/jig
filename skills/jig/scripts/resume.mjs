import path from 'node:path';
import { readState } from './lib/state.mjs';
import { isMain, jigPaths } from './lib/paths.mjs';
import { listTasks } from './status.mjs';

export function resumableTasks(projectRoot) {
  return listTasks(projectRoot).filter((t) => t.phase !== 'done');
}

if (isMain(import.meta.url)) {
  const [projectRoot = process.cwd(), taskId] = process.argv.slice(2);
  if (taskId) {
    const { tasksDir } = jigPaths(projectRoot);
    console.log(JSON.stringify(readState(path.join(tasksDir, taskId))));
  } else {
    const tasks = resumableTasks(projectRoot);
    if (!tasks.length) {
      console.log('No resumable tasks (all done, or none started).');
    } else {
      for (const t of tasks) console.log(`${t.task}  phase=${t.phase}`);
    }
  }
}
