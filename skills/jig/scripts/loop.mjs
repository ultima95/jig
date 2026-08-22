import { readState, writeState } from './lib/state.mjs';
import { isMain } from './lib/paths.mjs';

const LOOP_KEYS = ['test', 'review'];

function assertKey(key) {
  if (!LOOP_KEYS.includes(key)) throw new Error(`invalid loop: ${key} (expected ${LOOP_KEYS.join('|')})`);
}

export function bumpLoop(taskDir, key) {
  assertKey(key);
  const s = readState(taskDir);
  const next = (s.loops?.[key] || 0) + 1;
  s.loops = { ...s.loops, [key]: next };
  writeState(taskDir, s);
  return next;
}

export function resetLoop(taskDir, key) {
  assertKey(key);
  const s = readState(taskDir);
  s.loops = { ...s.loops, [key]: 0 };
  writeState(taskDir, s);
  return 0;
}

if (isMain(import.meta.url)) {
  const [taskDir, cmd, key] = process.argv.slice(2);
  if (!taskDir || !cmd || !key) {
    console.error('usage: node loop.mjs <taskDir> <bump|reset> <test|review>');
    process.exit(1);
  }
  let n;
  if (cmd === 'bump') n = bumpLoop(taskDir, key);
  else if (cmd === 'reset') n = resetLoop(taskDir, key);
  else { console.error(`unknown command: ${cmd}`); process.exit(1); }
  console.log(`${key} loop = ${n}`);
}
