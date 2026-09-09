import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scaffoldJig } from './scaffold.mjs';
import { createTask } from './new-task.mjs';
import { dedupeFindings, verdict, renderReview, writeReview, reviewReportWritten } from './review.mjs';

const tmps = [];
function newTask() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-rev-'));
  tmps.push(root);
  scaffoldJig(root);
  return createTask(root, { title: 'Fix login', type: 'bug', date: new Date(2026, 6, 6) }).taskDir;
}
afterEach(() => { while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true }); });

const F = (o) => ({ dimension: 'correctness', file: 'a.js', line: 1, severity: 'high', claim: 'x', ...o });

test('dedupeFindings merges arrays and dedupes by dimension+file+line+claim', () => {
  const out = dedupeFindings([[F({}), F({})], [F({ line: 2 }), F({ claim: 'y' })]]);
  assert.equal(out.length, 3); // the exact duplicate is removed
});

test('verdict applies the adversarial majority rule', () => {
  assert.equal(verdict([{ refuted: true }, { refuted: true }, { refuted: false }]), 'refuted');
  assert.equal(verdict([{ refuted: true }, { refuted: false }, { refuted: false }]), 'real');
  assert.equal(verdict([{ refuted: true }]), 'refuted');
  assert.equal(verdict([{ refuted: false }]), 'real');
  assert.equal(verdict([]), 'real'); // no verifiers -> keep the finding
});

test('renderReview renders a table, or a none-row when empty', () => {
  assert.match(renderReview([]), /_none_/);
  const t = renderReview([F({ verdict: 'real' })]);
  assert.match(t, /\| dimension \| round \| location \|/);
  assert.match(t, /a\.js:1/);
  assert.match(t, /correctness/);
});

test('writeReview writes review.md under the task with the task id header', () => {
  const taskDir = newTask();
  const n = writeReview(taskDir, [F({ verdict: 'real' }), F({ verdict: 'real' })]);
  assert.equal(n, 1); // deduped to one
  const md = fs.readFileSync(path.join(taskDir, 'review.md'), 'utf8');
  assert.match(md, /# Review — 20260706\/fix-login/);
  assert.match(md, /a\.js:1/);
});

test('reviewReportWritten is false for the current scaffolded template', () => {
  assert.equal(reviewReportWritten(newTask()), false);
});

test('reviewReportWritten is false for a review.md left by the pre-0.8 template', () => {
  const taskDir = newTask();
  // Repos scaffolded before the machine marker existed carry only this prose.
  fs.writeFileSync(path.join(taskDir, 'review.md'), [
    '# Review — 20260706/fix-login',
    '',
    '<!-- Findings from the Review phase. `verdict` is real|refuted after adversarial',
    '     verification; only `real` findings loop back to Implement. -->',
    '',
    '| dimension | location | severity | claim | verdict | fix |',
    '|-----------|----------|----------|-------|---------|-----|',
    '|           |          |          |       |         |            |',
  ].join('\n'));
  assert.equal(reviewReportWritten(taskDir), false);
});

test('reviewReportWritten is true once a real report is written', () => {
  const taskDir = newTask();
  writeReview(taskDir, []);
  assert.equal(reviewReportWritten(taskDir), true);
});

test('renderReview emits the fix a finding carries', () => {
  const t = renderReview([F({ verdict: 'real', fix: 'fixed in ea74416: parse through healthSchema' })]);
  assert.match(t, /fixed in ea74416: parse through healthSchema/);
});

test('renderReview gives each finding its own round column', () => {
  const t = renderReview([F({ verdict: 'real', round: 2 })]);
  assert.match(t, /\| dimension \| round \| location \|/);
  const row = t.split('\n').at(-1);
  assert.match(row, /\| correctness \| 2 \|/);
});

test('renderReview normalizes med and medium to one severity spelling', () => {
  const t = renderReview([F({ severity: 'med' }), F({ severity: 'medium', line: 2 })]);
  assert.equal(t.match(/medium/g).length, 2);
  assert.doesNotMatch(t, /\| med \|/);
});

test('renderReview passes an unrecognized severity through untouched', () => {
  assert.match(renderReview([F({ severity: 'blocker' })]), /blocker/);
});

test('renderReview escapes a pipe in a claim so it cannot break the table', () => {
  const row = renderReview([F({ claim: 'a || b breaks the row' })]).split('\n').at(-1);
  assert.match(row, /a \\\|\\\| b breaks the row/);
  // 7 columns => 8 cell delimiters; the claim's own pipes are escaped and don't count
  assert.equal(row.split(/(?<!\\)\|/).length - 1, 8);
});

test('writeReview preserves a hand-written Summary section across a rewrite', () => {
  const taskDir = newTask();
  writeReview(taskDir, [F({ verdict: 'real' })]);
  const p = path.join(taskDir, 'review.md');
  const withSummary = fs.readFileSync(p, 'utf8').replace(
    /\n\| dimension/,
    '\n## Summary\n\n4 reviewers fanned out; 8 findings, 3 refuted.\n\n| dimension',
  );
  fs.writeFileSync(p, withSummary);

  writeReview(taskDir, [F({ verdict: 'real', line: 9 })]); // second pass rewrites the table
  const md = fs.readFileSync(p, 'utf8');
  assert.match(md, /4 reviewers fanned out; 8 findings, 3 refuted\./);
  assert.match(md, /a\.js:9/);
  assert.doesNotMatch(md, /a\.js:1\b/); // the stale table is gone
});
