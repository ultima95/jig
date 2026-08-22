import fs from 'node:fs';
import path from 'node:path';
import { isMain, jigPaths, templatesDir } from './lib/paths.mjs';

const MEMORY_FILES = [
  'architecture.md', 'modules.md', 'conventions.md',
  'glossary.md', 'runbook.md', 'risks.md', 'index.md',
];

export function scaffoldJig(targetRoot, { force = false } = {}) {
  const p = jigPaths(targetRoot);
  const tpl = templatesDir();
  const created = [];
  const skipped = [];

  fs.mkdirSync(p.memoryDir, { recursive: true });
  fs.mkdirSync(p.tasksDir, { recursive: true });

  const copy = (src, dest) => {
    if (fs.existsSync(dest) && !force) { skipped.push(dest); return; }
    fs.copyFileSync(src, dest);
    created.push(dest);
  };

  copy(path.join(tpl, 'config.yml'), p.config);
  copy(path.join(tpl, 'backlog.md'), p.backlog);
  for (const f of MEMORY_FILES) copy(path.join(tpl, 'memory', f), path.join(p.memoryDir, f));

  const gitkeep = path.join(p.tasksDir, '.gitkeep');
  if (!fs.existsSync(gitkeep)) { fs.writeFileSync(gitkeep, ''); created.push(gitkeep); }

  return { created, skipped };
}

if (isMain(import.meta.url)) {
  const target = process.argv[2] || process.cwd();
  const res = scaffoldJig(target, { force: process.argv.includes('--force') });
  console.log(`Scaffolded .jig in ${target}`);
  for (const f of res.created) console.log('  created', f);
  for (const f of res.skipped) console.log('  skipped (exists)', f);
}
