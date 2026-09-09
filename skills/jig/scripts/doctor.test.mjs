import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scaffoldJig } from './scaffold.mjs';
import { createTask } from './new-task.mjs';
import { setPhase, setGate } from './set-state.mjs';
import { writeReview } from './review.mjs';
import { auditTasks, formatDoctor } from './doctor.mjs';

const tmps = [];
function newRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-doctor-'));
  tmps.push(root);
  scaffoldJig(root);
  return root;
}
afterEach(() => { while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true }); });

function addTask(root, title = 'Fix login') {
  return createTask(root, { title, type: 'bug', date: new Date(2026, 6, 6) }).taskDir;
}

// Simulates the real-world failure: state.json edited directly, bypassing set-state.mjs,
// so spec.md's front-matter is never synced.
function handEditState(taskDir, patch) {
  const p = path.join(taskDir, 'state.json');
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  fs.writeFileSync(p, JSON.stringify({ ...s, ...patch }, null, 2) + '\n');
}

test('auditTasks reports nothing for a task driven through the scripts', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  setPhase(taskDir, 'implement');
  setGate(taskDir, 'spec_plan', 'approved');
  writeReview(taskDir, []);
  setGate(taskDir, 'review', 'approved');
  assert.deepEqual(auditTasks(root), []);
});

test('auditTasks flags a phase that drifted from spec.md status', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  handEditState(taskDir, { phase: 'done' });
  const [drift] = auditTasks(root);
  assert.equal(drift.task, '20260706/fix-login');
  assert.equal(drift.issues.length, 1);
  assert.match(drift.issues[0], /phase.*done.*intake/);
});

test('auditTasks flags a gate that drifted from spec.md front-matter', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  writeReview(taskDir, []);
  handEditState(taskDir, { gates: { spec_plan: 'approved', review: 'approved' } });
  const [drift] = auditTasks(root);
  assert.equal(drift.issues.length, 2);
  assert.ok(drift.issues.some((i) => /gate_spec_plan/.test(i)));
  assert.ok(drift.issues.some((i) => /gate_review/.test(i)));
});

test('auditTasks flags a review gate approved with no review report written', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  handEditState(taskDir, { gates: { spec_plan: 'pending', review: 'approved' } });
  const [drift] = auditTasks(root);
  assert.ok(drift.issues.some((i) => /review\.md/.test(i)));
});

test('auditTasks covers every task, not just the first', () => {
  const root = newRepo();
  handEditState(addTask(root, 'Fix login'), { phase: 'done' });
  handEditState(addTask(root, 'Add export'), { phase: 'ship' });
  assert.equal(auditTasks(root).length, 2);
});

test('formatDoctor reports OK when there is no drift', () => {
  assert.match(formatDoctor([]), /^OK/);
});

test('formatDoctor lists each task and its issues', () => {
  const out = formatDoctor([{ task: '20260706/fix-login', issues: ['phase drift', 'gate drift'] }]);
  assert.match(out, /20260706\/fix-login/);
  assert.match(out, /phase drift/);
  assert.match(out, /gate drift/);
});
