import { readState, writeState } from './lib/state.mjs';
import { isMain } from './lib/paths.mjs';

const LOOP_KEYS = ['test', 'review'];

function assertKey(key) {
  if (!LOOP_KEYS.includes(key)) throw new Error(`invalid loop: ${key} (expected ${LOOP_KEYS.join('|')})`);
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
    console.error('usage: node loop.mjs <taskDir> reset <test|review>');
    process.exit(1);
  }
  if (cmd === 'bump') {
    // Refuse rather than silently double-count: moving the phase back into
    // `implement` is the fix loop and bumps the counter itself, so a manual bump
    // on top of it inflates the count and trips `loops.max_*` a round early.
    console.error(
      'bump was removed: incrementing is automatic. Moving the phase back with ' +
      '`set-state.mjs <taskDir> phase implement` is the fix loop and bumps the counter, ' +
      'so bumping here as well would double-count.',
    );
    process.exit(1);
  }
  if (cmd !== 'reset') { console.error(`unknown command: ${cmd}`); process.exit(1); }
  console.log(`${key} loop = ${resetLoop(taskDir, key)}`);
}
