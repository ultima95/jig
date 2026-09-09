import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setFrontMatterField, getFrontMatterField } from './frontmatter.mjs';

const md = `---
id: 20260706/x
status: intake          # intake | spec_plan | ...
gate_spec_plan: pending # pending | approved
---

# body stays
`;

test('replaces an existing field and drops its trailing comment', () => {
  const out = setFrontMatterField(md, 'status', 'implement');
  assert.match(out, /^status: implement$/m);
  assert.doesNotMatch(out, /status: intake/);
  assert.match(out, /# body stays/);
});

test('replaces only within the front-matter block', () => {
  const out = setFrontMatterField(md, 'gate_spec_plan', 'approved');
  assert.match(out, /^gate_spec_plan: approved$/m);
});

test('inserts a missing field into the front-matter', () => {
  const out = setFrontMatterField(md, 'track', 'fast');
  assert.match(out, /^track: fast$/m);
  assert.match(out, /^id: 20260706\/x$/m);
});

test('throws when there is no front-matter', () => {
  assert.throws(() => setFrontMatterField('no front-matter here', 'x', 'y'), /front-matter/);
});

test('setFrontMatterField inserts a value containing $ literally', () => {
  const out = setFrontMatterField(md, 'status', 'a$1b');
  assert.match(out, /^status: a\$1b$/m);
});

test('getFrontMatterField reads a value and strips its trailing comment', () => {
  assert.equal(getFrontMatterField(md, 'status'), 'intake');
  assert.equal(getFrontMatterField(md, 'gate_spec_plan'), 'pending');
});

test('getFrontMatterField returns undefined for a missing field or no front-matter', () => {
  assert.equal(getFrontMatterField(md, 'nope'), undefined);
  assert.equal(getFrontMatterField('no front-matter here', 'status'), undefined);
});

test('getFrontMatterField ignores a matching key in the body', () => {
  assert.equal(getFrontMatterField(`${md}\nstatus: decoy\n`, 'status'), 'intake');
});
