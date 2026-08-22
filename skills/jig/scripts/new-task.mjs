import fs from 'node:fs';
import path from 'node:path';
import { isMain, jigPaths, templatesDir } from './lib/paths.mjs';
import { slugify, uniqueSlug, dateStamp } from './lib/slug.mjs';
import { newTaskState, writeState } from './lib/state.mjs';

const TYPES = ['feature', 'bug', 'chore', 'refactor'];
const TRACKS = ['full', 'fast', 'hotfix'];
const DEFAULT_TRACK_BY_TYPE = { feature: 'full', refactor: 'full', bug: 'fast', chore: 'fast' };

function fill(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}

export function defaultTrack(type) {
  return DEFAULT_TRACK_BY_TYPE[type] || 'full';
}

export function createTask(projectRoot, { title, type = 'feature', track, date = new Date() }) {
  if (!TYPES.includes(type)) throw new Error(`invalid type: ${type} (expected ${TYPES.join('|')})`);
  const resolvedTrack = track ?? defaultTrack(type);
  if (!TRACKS.includes(resolvedTrack)) throw new Error(`invalid track: ${resolvedTrack} (expected ${TRACKS.join('|')})`);

  const p = jigPaths(projectRoot);
  const stamp = dateStamp(date);
  const dayDir = path.join(p.tasksDir, stamp);
  fs.mkdirSync(dayDir, { recursive: true });

  const existing = fs.readdirSync(dayDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const slug = uniqueSlug(slugify(title), existing);
  const taskDir = path.join(dayDir, slug);
  fs.mkdirSync(taskDir, { recursive: true });

  const taskId = `${stamp}/${slug}`;
  const created = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
  const vars = { ID: taskId, TYPE: type, TRACK: resolvedTrack, CREATED: created };
  const tpl = templatesDir();
  const render = (name) => fill(fs.readFileSync(path.join(tpl, name), 'utf8'), vars);

  fs.writeFileSync(path.join(taskDir, 'spec.md'), render('spec.md'));
  fs.writeFileSync(path.join(taskDir, 'progress.md'), render('progress.md'));
  fs.writeFileSync(path.join(taskDir, 'review.md'), render('review.md'));
  writeState(taskDir, newTaskState({ taskId, type, track: resolvedTrack, created }));

  return { taskId, taskDir, slug, track: resolvedTrack };
}

if (isMain(import.meta.url)) {
  const title = process.argv[2];
  const type = process.argv[3] || 'feature';
  const track = process.argv[4]; // optional; defaults by type
  if (!title) {
    console.error('usage: node new-task.mjs "<title>" [feature|bug|chore|refactor] [full|fast|hotfix]');
    process.exit(1);
  }
  const { taskId, taskDir, track: t } = createTask(process.cwd(), { title, type, track });
  console.log('created task', taskId, `(track: ${t})`, 'at', taskDir);
}
