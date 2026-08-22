import fs from 'node:fs';
import path from 'node:path';
import { isMain, jigPaths } from './lib/paths.mjs';

function uniqStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr || []) {
    if (s == null) continue;
    const k = String(s);
    if (!seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out;
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const o of arr || []) {
    if (!o) continue;
    const k = keyFn(o);
    if (!seen.has(k)) { seen.add(k); out.push(o); }
  }
  return out;
}

function firstNonEmpty(vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return v;
  }
  return '';
}

export function mergeFindings(slices) {
  const s = (Array.isArray(slices) ? slices : []).filter(Boolean);
  return {
    overview: firstNonEmpty(s.map((x) => x.overview)),
    stack: uniqStrings(s.flatMap((x) => x.stack || [])),
    architecture: {
      summary: firstNonEmpty(s.map((x) => x.architecture?.summary)),
      boundaries: uniqStrings(s.flatMap((x) => x.architecture?.boundaries || [])),
      components: uniqBy(s.flatMap((x) => x.architecture?.components || []), (c) => c.name),
    },
    modules: uniqBy(s.flatMap((x) => x.modules || []), (m) => m.path),
    conventions: uniqStrings(s.flatMap((x) => x.conventions || [])),
    glossary: uniqBy(s.flatMap((x) => x.glossary || []), (g) => g.term),
    runbook: {
      build: firstNonEmpty(s.map((x) => x.runbook?.build)),
      test: firstNonEmpty(s.map((x) => x.runbook?.test)),
      run: firstNonEmpty(s.map((x) => x.runbook?.run)),
      notes: uniqStrings(s.flatMap((x) => x.runbook?.notes || [])),
    },
    risks: uniqBy(s.flatMap((x) => x.risks || []), (r) => `${r.area}::${r.note}`),
  };
}

const NONE = '_Not determined during Phase 0._';

function bullets(items, fmt) {
  if (!items || !items.length) return NONE;
  return items.map(fmt).join('\n');
}

export function renderMemory(findings) {
  const f = findings || {};
  const arch = f.architecture || {};
  const run = f.runbook || {};

  return {
    'architecture.md': `# Architecture

${f.overview || NONE}

## System summary
${arch.summary || NONE}

## Boundaries
${bullets(arch.boundaries, (b) => `- ${b}`)}

## Components
${bullets(arch.components, (c) => `- **${c.name}** — ${c.role || ''}`.trimEnd())}
`,
    'modules.md': `# Modules

${bullets(f.modules, (m) => `- \`${m.path}\` — ${m.purpose || ''}`.trimEnd())}
`,
    'conventions.md': `# Conventions

${bullets(f.conventions, (c) => `- ${c}`)}
`,
    'glossary.md': `# Glossary

${bullets(f.glossary, (g) => `- **${g.term}** — ${g.definition || ''}`.trimEnd())}
`,
    'runbook.md': `# Runbook

- **Build:** ${run.build || NONE}
- **Test:** ${run.test || NONE}
- **Run:** ${run.run || NONE}

## Notes
${bullets(run.notes, (n) => `- ${n}`)}
`,
    'risks.md': `# Risks

${bullets(f.risks, (r) => `- **${r.area}** — ${r.note || ''}`.trimEnd())}
`,
    'index.md': `# Project Memory — Index

${f.overview || NONE}

## Tech stack
${bullets(f.stack, (s) => `- ${s}`)}

## Contents
- [Architecture](architecture.md)
- [Modules](modules.md)
- [Conventions](conventions.md)
- [Glossary](glossary.md)
- [Runbook](runbook.md)
- [Risks](risks.md)
`,
  };
}

export function writeMemory(projectRoot, findings) {
  const { memoryDir } = jigPaths(projectRoot);
  fs.mkdirSync(memoryDir, { recursive: true });
  const rendered = renderMemory(findings);
  const written = [];
  for (const [name, content] of Object.entries(rendered)) {
    const dest = path.join(memoryDir, name);
    fs.writeFileSync(dest, content.endsWith('\n') ? content : content + '\n');
    written.push(dest);
  }
  return written;
}

if (isMain(import.meta.url)) {
  const [projectRoot, ...sliceFiles] = process.argv.slice(2);
  if (!projectRoot || !sliceFiles.length) {
    console.error('usage: node write-memory.mjs <projectRoot> <slice1.json> [slice2.json ...]');
    process.exit(1);
  }
  const slices = sliceFiles.map((fp) => JSON.parse(fs.readFileSync(fp, 'utf8')));
  const findings = mergeFindings(slices);
  const written = writeMemory(projectRoot, findings);
  console.log(`Wrote ${written.length} memory files to ${jigPaths(projectRoot).memoryDir}`);
  for (const w of written) console.log('  ', w);
}
