import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scaffoldJig } from './scaffold.mjs';
import { createTask } from './new-task.mjs';
import { listTasks, formatStatus, openTasks } from './status.mjs';

const tmps = [];
function mktmp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-status-'));
  tmps.push(d);
  scaffoldJig(d);
  return d;
}
afterEach(() => { while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true }); });

test('listTasks returns [] for a fresh repo', () => {
  const root = mktmp();
  assert.deepEqual(listTasks(root), []);
});

test('listTasks returns created tasks with their phase', () => {
  const root = mktmp();
  createTask(root, { title: 'Fix login', type: 'bug', date: new Date(2026, 6, 6) });
  createTask(root, { title: 'Add export', type: 'feature', date: new Date(2026, 6, 5) });
  const tasks = listTasks(root);
  assert.equal(tasks.length, 2);
  assert.ok(tasks.every((t) => t.phase === 'intake'));
  // newest date first
  assert.ok(tasks[0].task.startsWith('20260706/'));
});

test('formatStatus renders a header and a friendly empty message', () => {
  assert.match(formatStatus([]), /No tasks yet/);
  const out = formatStatus([{ task: '20260706/x', phase: 'intake', gates: { spec_plan: 'pending' } }]);
  assert.match(out, /20260706\/x/);
  assert.match(out, /intake/);
});

test('formatStatus hints cleanup when a task is shipped', () => {
  const out = formatStatus([{ task: '20260707/x', phase: 'shipped', gates: {} }]);
  assert.match(out, /shipped/);
  assert.match(out, /\/jig cleanup/);
});

test('formatStatus omits the cleanup hint when nothing is shipped', () => {
  const out = formatStatus([{ task: '20260707/x', phase: 'intake', gates: { spec_plan: 'pending' } }]);
  assert.doesNotMatch(out, /\/jig cleanup/);
});

test('formatStatus widens the task column to fit long ids instead of overflowing', () => {
  const long = '20260909/remove-linttest-from-ci-to-reduce-github-actions';
  const out = formatStatus([{ task: long, phase: 'done', gates: { review: 'approved' } }]);
  const [header, row] = out.split('\n');
  assert.ok(row.includes(long));
  // PHASE starts at the same column in the header and the row
  assert.equal(header.indexOf('PHASE'), row.indexOf('done'));
});

test('formatStatus keeps a stable minimum width for short ids', () => {
  const out = formatStatus([{ task: '20260706/x', phase: 'intake', gates: {} }]);
  const [header, row] = out.split('\n');
  assert.equal(header.indexOf('PHASE'), row.indexOf('intake'));
});

test('openTasks drops done tasks and keeps everything in flight', () => {
  const tasks = [
    { task: 'a', phase: 'done', gates: {} },
    { task: 'b', phase: 'shipped', gates: {} },
    { task: 'c', phase: 'implement', gates: {} },
  ];
  assert.deepEqual(openTasks(tasks).map((t) => t.task), ['b', 'c']);
});

test('formatStatus notes how many done tasks it hid when filtering to open', () => {
  const tasks = [{ task: 'a', phase: 'done', gates: {} }, { task: 'b', phase: 'implement', gates: {} }];
  const out = formatStatus(openTasks(tasks), { hidden: tasks.length - openTasks(tasks).length });
  assert.match(out, /1 done/);
});

test('formatStatus says so when every task is done and none are open', () => {
  assert.match(formatStatus([], { hidden: 3 }), /3 done/);
});
