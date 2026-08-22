import fs from 'node:fs';
import path from 'node:path';
import { isMain } from './lib/paths.mjs';

export function appendProgress(taskDir, phase, note) {
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
