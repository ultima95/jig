import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scaffoldJig } from './scaffold.mjs';
import { createTask } from './new-task.mjs';
import * as loop from './loop.mjs';
import { resetLoop } from './loop.mjs';
import { setPhase } from './set-state.mjs';

const tmps = [];
function newTask() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-loop-'));
  tmps.push(root);
  scaffoldJig(root);
  return createTask(root, { title: 'Fix login', type: 'bug', date: new Date(2026, 6, 6) }).taskDir;
}
afterEach(() => { while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true }); });
function loops(taskDir) { return JSON.parse(fs.readFileSync(path.join(taskDir, 'state.json'), 'utf8')).loops; }

const CLI = fileURLToPath(new URL('./loop.mjs', import.meta.url));

test('resetLoop sets the counter back to 0', () => {
  const t = newTask();
  setPhase(t, 'review');
  setPhase(t, 'implement'); // the fix loop bumps review to 1
  assert.equal(loops(t).review, 1);
  assert.equal(resetLoop(t, 'review'), 0);
  assert.equal(loops(t).review, 0);
});

test('resetLoop rejects an invalid loop key', () => {
  const t = newTask();
  assert.throws(() => resetLoop(t, 'nope'), /invalid loop/);
});

test('there is no manual bump, because bumping is the phase transition', () => {
  assert.equal(loop.bumpLoop, undefined);
});

test('the CLI refuses bump and names the mechanism that replaced it', () => {
  const t = newTask();
  let err;
  try {
    execFileSync(process.execPath, [CLI, t, 'bump', 'review'], { stdio: 'pipe' });
  } catch (e) { err = e; }
  assert.ok(err, 'bump should exit non-zero');
  const msg = String(err.stderr);
  assert.match(msg, /set-state\.mjs/);
  assert.match(msg, /double-count|automatic/i);
  assert.equal(loops(t).review, 0, 'a refused bump must not change state');
});
