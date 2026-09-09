import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scaffoldJig } from './scaffold.mjs';
import { createTask } from './new-task.mjs';
import { setPhase, setGate } from './set-state.mjs';
import { writeReview } from './review.mjs';
import { appendProgress } from './progress.mjs';
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
  assert.ok(drift.issues.some((i) => /phase.*done.*intake/.test(i)));
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

test('auditTasks flags a shipped task whose progress never recorded test or review', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  appendProgress(taskDir, 'implement', 'wrote it');
  writeReview(taskDir, []);
  handEditState(taskDir, { phase: 'done', gates: { spec_plan: 'approved', review: 'approved' } });
  setPhase(taskDir, 'done'); // resync the mirrored fields so only the gap remains
  setGate(taskDir, 'spec_plan', 'approved');
  setGate(taskDir, 'review', 'approved');

  const [drift] = auditTasks(root);
  assert.equal(drift.issues.length, 1);
  assert.match(drift.issues[0], /progress\.md/);
  assert.match(drift.issues[0], /test.*review|review.*test/);
});

test('a phase recorded under a non-conforming heading is reported as such, not as missing', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  // Headings written by hand before progress.mjs enforced the phase vocabulary.
  fs.appendFileSync(path.join(taskDir, 'progress.md'), [
    '', '## 2026-07-06 — Implement', '- built it',
    '', '## 2026-07-06 — Implement (review fix loop) + Test', '- fixed it',
    '', '## 2026-07-06 — review', '- clean', '',
  ].join('\n'));
  writeReview(taskDir, []);
  setGate(taskDir, 'review', 'approved');
  setPhase(taskDir, 'done');

  const [drift] = auditTasks(root);
  const issue = drift.issues.join(' ');
  assert.match(issue, /implement, test/);      // present, but the heading does not conform
  assert.doesNotMatch(issue, /no implement/);  // not reported as absent
  assert.doesNotMatch(issue, /review/);        // a conforming entry is not mentioned at all
});

test('auditTasks does not ask for test or review before a task reaches ship', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  setPhase(taskDir, 'implement');
  assert.deepEqual(auditTasks(root), []);
});

test('auditTasks accepts a shipped task with a full phase trail', () => {
  const root = newRepo();
  const taskDir = addTask(root);
  for (const p of ['implement', 'test', 'review']) appendProgress(taskDir, p, 'done');
  writeReview(taskDir, []);
  setGate(taskDir, 'spec_plan', 'approved');
  setGate(taskDir, 'review', 'approved');
  setPhase(taskDir, 'done');
  assert.deepEqual(auditTasks(root), []);
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
