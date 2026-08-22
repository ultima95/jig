import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findJigRoot, isMain, jigPaths, templatesDir } from './paths.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jig-paths-'));
}

test('jigPaths joins the standard layout under .jig by default', () => {
  const p = jigPaths('/proj');
  assert.equal(p.root, path.join('/proj', '.jig'));
  assert.equal(p.config, path.join('/proj', '.jig', 'config.yml'));
  assert.equal(p.backlog, path.join('/proj', '.jig', 'backlog.md'));
  assert.equal(p.memoryDir, path.join('/proj', '.jig', 'memory'));
  assert.equal(p.tasksDir, path.join('/proj', '.jig', 'tasks'));
});

test('jigPaths uses an existing legacy .sdlc dir', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, '.sdlc'));
  assert.equal(jigPaths(root).root, path.join(root, '.sdlc'));
});

test('jigPaths prefers .jig when both dirs exist', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, '.sdlc'));
  fs.mkdirSync(path.join(root, '.jig'));
  assert.equal(jigPaths(root).root, path.join(root, '.jig'));
});

test('findJigRoot finds the nearest ancestor containing .jig', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, '.jig'));
  const nested = path.join(root, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  assert.equal(findJigRoot(nested), root);
});

test('findJigRoot also finds a legacy .sdlc ancestor', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, '.sdlc'));
  const nested = path.join(root, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  assert.equal(findJigRoot(nested), root);
});

test('findJigRoot returns null when no state dir exists', () => {
  const root = tmp();
  assert.equal(findJigRoot(root), null);
});

test('templatesDir points at the skill templates directory', () => {
  assert.ok(fs.existsSync(path.join(templatesDir(), 'config.yml')));
});

test('isMain is true when argv[1] is the path of the module itself', () => {
  const saved = process.argv[1];
  try {
    process.argv[1] = fileURLToPath(import.meta.url);
    assert.equal(isMain(import.meta.url), true);
  } finally {
    process.argv[1] = saved;
  }
});

test('isMain is true when argv[1] is a symlink to the module', () => {
  const saved = process.argv[1];
  const link = path.join(tmp(), 'linked.test.mjs');
  try {
    fs.symlinkSync(fileURLToPath(import.meta.url), link);
    process.argv[1] = link;
    assert.equal(isMain(import.meta.url), true);
  } finally {
    process.argv[1] = saved;
  }
});

test('isMain is false for a module that is imported, not the entry point', () => {
  const saved = process.argv[1];
  try {
    process.argv[1] = fileURLToPath(import.meta.url);
    const here = path.dirname(fileURLToPath(import.meta.url));
    assert.equal(isMain(pathToFileURL(path.join(here, 'paths.mjs')).href), false);
  } finally {
    process.argv[1] = saved;
  }
});

test('isMain is false when argv[1] is missing or points at a nonexistent file', () => {
  const saved = process.argv[1];
  try {
    delete process.argv[1];
    assert.equal(isMain(import.meta.url), false);
    process.argv[1] = path.join(tmp(), 'nope.mjs');
    assert.equal(isMain(import.meta.url), false);
  } finally {
    process.argv[1] = saved;
  }
});
