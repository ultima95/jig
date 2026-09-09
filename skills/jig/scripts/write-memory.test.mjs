import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mergeFindings, renderMemory, writeMemory, formatMemoryReport, isOverwritable } from './write-memory.mjs';
import { scaffoldJig } from './scaffold.mjs';

const tmps = [];
function mktmp() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jig-mem-')); tmps.push(d); return d; }
afterEach(() => { while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true }); });

test('mergeFindings unions arrays, dedupes by key, first non-empty scalar wins', () => {
  const merged = mergeFindings([
    { overview: '', stack: ['Node'], modules: [{ path: 'a', purpose: 'A' }], runbook: { build: '' } },
    { overview: 'The app', stack: ['Node', 'React'], modules: [{ path: 'a', purpose: 'dupe' }, { path: 'b', purpose: 'B' }], runbook: { build: 'npm run build' } },
  ]);
  assert.equal(merged.overview, 'The app');
  assert.deepEqual(merged.stack, ['Node', 'React']);
  assert.equal(merged.modules.length, 2);          // 'a' deduped by path
  assert.equal(merged.modules[0].purpose, 'A');    // first occurrence wins
  assert.equal(merged.runbook.build, 'npm run build');
});

test('mergeFindings tolerates empty input', () => {
  const merged = mergeFindings([]);
  assert.equal(merged.overview, '');
  assert.deepEqual(merged.stack, []);
  assert.deepEqual(merged.modules, []);
});

test('renderMemory produces all 7 files with content and index links', () => {
  const r = renderMemory({
    overview: 'A demo app',
    stack: ['Node'],
    architecture: { summary: 'layered', boundaries: ['api|core'], components: [{ name: 'api', role: 'http' }] },
    modules: [{ path: 'src/api', purpose: 'routes' }],
    conventions: ['ESM only'],
    glossary: [{ term: 'SDLC', definition: 'lifecycle' }],
    runbook: { build: 'npm run build', test: 'npm test', run: 'npm start', notes: ['needs node 18'] },
    risks: [{ area: 'auth', note: 'no tests' }],
  });
  assert.equal(Object.keys(r).length, 7);
  assert.match(r['architecture.md'], /layered/);
  assert.match(r['architecture.md'], /\*\*api\*\* — http/);
  assert.match(r['modules.md'], /`src\/api` — routes/);
  assert.match(r['runbook.md'], /\*\*Test:\*\* npm test/);
  assert.match(r['glossary.md'], /\*\*SDLC\*\* — lifecycle/);
  assert.match(r['index.md'], /\[Architecture\]\(architecture\.md\)/);
  assert.match(r['index.md'], /A demo app/);
});

test('renderMemory uses placeholders for empty sections (never blank)', () => {
  const r = renderMemory({});
  assert.equal(Object.keys(r).length, 7);
  assert.match(r['modules.md'], /Not determined during Phase 0/);
  assert.match(r['risks.md'], /Not determined during Phase 0/);
});

test('modules are grouped under a heading per top-level area', () => {
  const r = renderMemory({
    modules: [
      { path: 'apps/web', purpose: 'SPA' },
      { path: 'packages/shared', purpose: 'types' },
      { path: 'apps/api', purpose: 'HTTP API' },
    ],
  });
  const md = r['modules.md'];
  assert.match(md, /^## apps$/m);
  assert.match(md, /^## packages$/m);
  // grouped, and alphabetical within the group
  assert.ok(md.indexOf('apps/api') < md.indexOf('apps/web'));
  assert.ok(md.indexOf('## apps') < md.indexOf('## packages'));
});

test('a module with an explicit group overrides its path prefix', () => {
  const md = renderMemory({ modules: [{ path: 'src/x', purpose: 'p', group: 'Domain' }] })['modules.md'];
  assert.match(md, /^## Domain$/m);
});

test('a top-level module file still gets a heading rather than dangling', () => {
  const md = renderMemory({ modules: [{ path: 'server.js', purpose: 'entry point' }] })['modules.md'];
  assert.match(md, /^## \(root\)$/m);
  assert.match(md, /server\.js/);
});

test('risks sort highest severity first and show it inline', () => {
  const md = renderMemory({
    risks: [
      { area: 'reports', note: 'untested', severity: 'low' },
      { area: 'auth', note: 'no row lock', severity: 'high' },
      { area: 'db', note: 'slow' },
    ],
  })['risks.md'];
  assert.ok(md.indexOf('auth') < md.indexOf('reports'), 'high severity comes first');
  assert.match(md, /\*\*high · auth\*\* — no row lock/);
  assert.match(md, /\*\*db\*\* — slow/); // no severity given, no badge
});

test('conventions grouped by topic render a heading each', () => {
  const md = renderMemory({
    conventions: [
      { topic: 'Money', rules: ['integer minor units only', 'never a float'] },
      { topic: 'API', rules: ['validate with zod on both sides'] },
    ],
  })['conventions.md'];
  assert.match(md, /^## Money$/m);
  assert.match(md, /^- integer minor units only$/m);
  assert.match(md, /^## API$/m);
});

test('a flat list of convention strings still renders (older slices)', () => {
  const md = renderMemory({ conventions: ['ESM only', 'no default exports'] })['conventions.md'];
  assert.match(md, /^- ESM only$/m);
  assert.match(md, /^- no default exports$/m);
});

test('index links each file with a note on what it holds', () => {
  const md = renderMemory({ overview: 'A demo app' })['index.md'];
  assert.match(md, /\[Modules\]\(modules\.md\) — /);
  assert.match(md, /\[Risks\]\(risks\.md\) — /);
});

test('mergeFindings dedupes topic-grouped conventions by topic, unioning rules', () => {
  const merged = mergeFindings([
    { conventions: [{ topic: 'Money', rules: ['integer minor units'] }] },
    { conventions: [{ topic: 'Money', rules: ['integer minor units', 'never a float'] }, { topic: 'API', rules: ['zod'] }] },
  ]);
  assert.equal(merged.conventions.length, 2);
  assert.deepEqual(merged.conventions[0], { topic: 'Money', rules: ['integer minor units', 'never a float'] });
});

test('writeMemory writes all 7 files under .jig/memory', () => {
  const root = mktmp();
  const { written, deferred } = writeMemory(root, { overview: 'x' });
  assert.equal(written.length, 7);
  assert.deepEqual(deferred, []);
  const idx = path.join(root, '.jig', 'memory', 'index.md');
  assert.ok(fs.existsSync(idx));
  assert.match(fs.readFileSync(idx, 'utf8'), /x/);
});

test('writeMemory overwrites the untouched scaffold placeholder', () => {
  const root = mktmp();
  scaffoldJig(root);
  const { written, deferred } = writeMemory(root, { overview: 'x' });
  assert.equal(written.length, 7);
  assert.deepEqual(deferred, []);
});

test('writeMemory overwrites a file it generated itself', () => {
  const root = mktmp();
  writeMemory(root, { overview: 'first' });
  const { written, deferred } = writeMemory(root, { overview: 'second' });
  assert.equal(written.length, 7);
  assert.deepEqual(deferred, []);
  const idx = path.join(root, '.jig', 'memory', 'index.md');
  assert.match(fs.readFileSync(idx, 'utf8'), /second/);
});

test('writeMemory refuses to clobber hand-authored memory', () => {
  const root = mktmp();
  scaffoldJig(root);
  const modules = path.join(root, '.jig', 'memory', 'modules.md');
  fs.writeFileSync(modules, '# Modules\n\nHand-written knowledge worth keeping.\n');

  const { written, deferred } = writeMemory(root, { overview: 'x', modules: [{ path: 'src', purpose: 'p' }] });

  assert.match(fs.readFileSync(modules, 'utf8'), /Hand-written knowledge worth keeping/);
  assert.equal(deferred.length, 1);
  assert.match(deferred[0], /modules\.generated\.md$/);
  assert.match(fs.readFileSync(deferred[0], 'utf8'), /src/);
  assert.equal(written.length, 6); // the other six had nothing worth preserving
});

test('isOverwritable recognizes both the marker and the pre-0.8 placeholder prose', () => {
  assert.equal(isOverwritable('<!-- jig:memory-placeholder --> skeleton'), true);
  assert.equal(isOverwritable('_Populated by `/jig init` (Phase 0)._'), true);
  assert.equal(isOverwritable('# Modules\n\nreal curated content\n'), false);
});

test('a scaffolded skeleton filled in by hand is protected once its marker is gone', () => {
  const root = mktmp();
  scaffoldJig(root);
  const conventions = path.join(root, '.jig', 'memory', 'conventions.md');
  // Author writes into the skeleton and removes the placeholder line, as told to.
  const filled = fs.readFileSync(conventions, 'utf8')
    .split('\n').filter((l) => !l.includes('jig:memory-placeholder')).join('\n')
    + '\n## Money\n- integer minor units only\n';
  fs.writeFileSync(conventions, filled);

  const { deferred } = writeMemory(root, { conventions: ['regenerated'] });
  assert.match(fs.readFileSync(conventions, 'utf8'), /integer minor units only/);
  assert.ok(deferred.some((d) => d.endsWith('conventions.generated.md')));
});

test('formatMemoryReport names the files it would not overwrite', () => {
  const out = formatMemoryReport({ written: ['/m/index.md'], deferred: ['/m/modules.generated.md'] });
  assert.match(out, /modules\.generated\.md/);
  assert.match(out, /1 file\(s\) kept/);
});
