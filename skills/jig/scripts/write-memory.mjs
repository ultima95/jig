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

// Conventions arrive either as plain strings (older slices) or as
// `{topic, rules[]}` groups. Strings dedupe as-is; groups merge by topic so two
// explorers reporting the same topic union their rules instead of duplicating it.
export function mergeConventions(entries) {
  const strings = [];
  const byTopic = new Map();
  for (const e of entries || []) {
    if (e == null) continue;
    if (typeof e === 'object' && e.topic) {
      const prev = byTopic.get(e.topic) || [];
      byTopic.set(e.topic, uniqStrings([...prev, ...(e.rules || [])]));
    } else {
      strings.push(e);
    }
  }
  return [
    ...[...byTopic].map(([topic, rules]) => ({ topic, rules })),
    ...uniqStrings(strings),
  ];
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
    conventions: mergeConventions(s.flatMap((x) => x.conventions || [])),
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

// Renders `[[heading, items]]` as `## heading` + bullets, so a long file is
// scannable and a spec can cite a stable anchor (`modules.md#apps`) instead of
// pointing at a wall of undifferentiated lines.
function sections(groups, fmt) {
  if (!groups.length) return NONE;
  return groups
    .map(([heading, items]) => `## ${heading}\n${items.map(fmt).join('\n')}`)
    .join('\n\n');
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  return map;
}

// A module's area is its explicit `group`, else its top-level path segment —
// `apps/api/src` groups under `apps`. A bare filename has no prefix, so it lands
// under `(root)` rather than dangling above the first heading.
function moduleArea(m) {
  if (m.group) return m.group;
  const [head, ...rest] = String(m.path || '').split('/');
  return rest.length ? head : '(root)';
}

export function groupModules(modules) {
  const grouped = groupBy(modules || [], moduleArea);
  return [...grouped]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([area, items]) => [area, items.sort((x, y) => String(x.path).localeCompare(String(y.path)))]);
}

// Highest severity first: "what should I worry about" is the question this file
// exists to answer, so ordering carries it. Unrated risks sort last.
const SEVERITY_RANK = { high: 0, medium: 1, med: 1, low: 2 };

export function sortRisks(risks) {
  const rank = (r) => {
    const s = String(r.severity ?? '').toLowerCase();
    return s in SEVERITY_RANK ? SEVERITY_RANK[s] : 3;
  };
  return [...(risks || [])].sort((a, b) => rank(a) - rank(b));
}

function riskLabel(r) {
  const s = String(r.severity ?? '').toLowerCase();
  const sev = s === 'med' ? 'medium' : s;
  return sev ? `${sev} · ${r.area}` : `${r.area}`;
}

const INDEX_BLURBS = [
  ['Architecture', 'architecture.md', 'system shape, boundaries, and the components that make it up'],
  ['Modules', 'modules.md', 'where each part of the codebase lives, grouped by area'],
  ['Conventions', 'conventions.md', 'the style, patterns, and rules code here is expected to follow'],
  ['Glossary', 'glossary.md', 'domain terms, so a spec and the code mean the same thing'],
  ['Runbook', 'runbook.md', 'how to build, test, and run the project'],
  ['Risks', 'risks.md', 'fragile areas and gotchas, highest severity first'],
];

// Topic groups become headings; bare strings stay a flat list beneath them.
function renderConventions(conventions) {
  const list = conventions || [];
  if (!list.length) return NONE;
  const groups = list.filter((c) => c && typeof c === 'object' && c.topic);
  const loose = list.filter((c) => !(c && typeof c === 'object' && c.topic));
  const parts = [];
  if (groups.length) parts.push(sections(groups.map((g) => [g.topic, g.rules || []]), (r) => `- ${r}`));
  if (loose.length) parts.push(loose.map((c) => `- ${c}`).join('\n'));
  return parts.join('\n\n');
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

Where each part of the codebase lives, grouped by area.

${sections(groupModules(f.modules), (m) => `- \`${m.path}\` — ${m.purpose || ''}`.trimEnd())}
`,
    'conventions.md': `# Conventions

What code here is expected to look like. A violation is a review finding.

${renderConventions(f.conventions)}
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

Fragile areas and gotchas, highest severity first.

${bullets(sortRisks(f.risks), (r) => `- **${riskLabel(r)}** — ${r.note || ''}`.trimEnd())}
`,
    'index.md': `# Project Memory — Index

${f.overview || NONE}

## Tech stack
${bullets(f.stack, (s) => `- ${s}`)}

## Contents
${INDEX_BLURBS.map(([name, file, blurb]) => `- [${name}](${file}) — ${blurb}`).join('\n')}
`,
  };
}

// Stamped onto every file this script writes. Its absence in an existing memory
// file means a human wrote that file, so a refresh must not overwrite it — the
// curated memory of a mature repo is worth far more than a re-derived draft.
export const GENERATED_MARKER = '<!-- jig:generated';
const MARKER_LINE =
  `${GENERATED_MARKER} — rewritten by \`/jig memory-refresh\`. ` +
  'Delete this line to hand-author this file; a refresh will then leave it alone. -->';

// Scaffold placeholders are ours to replace: nobody has invested in them yet.
// The marker is machine-readable so rewording a template can't quietly turn a
// skeleton into "hand-authored"; the prose is the pre-0.8 form, still honoured so
// repos scaffolded before the marker keep behaving the same way.
const PLACEHOLDER_MARKERS = ['<!-- jig:memory-placeholder', 'Populated by '];

export function isOverwritable(existing) {
  if (existing == null) return true;
  return existing.includes(GENERATED_MARKER) || PLACEHOLDER_MARKERS.some((m) => existing.includes(m));
}

export function writeMemory(projectRoot, findings) {
  const { memoryDir } = jigPaths(projectRoot);
  fs.mkdirSync(memoryDir, { recursive: true });
  const rendered = renderMemory(findings);
  const written = [];
  const deferred = [];
  for (const [name, body] of Object.entries(rendered)) {
    const content = `${body.endsWith('\n') ? body : body + '\n'}\n${MARKER_LINE}\n`;
    const dest = path.join(memoryDir, name);
    const existing = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
    if (isOverwritable(existing)) {
      fs.writeFileSync(dest, content);
      written.push(dest);
    } else {
      // Hand-authored: leave it untouched and park the draft beside it so the
      // developer can diff and merge whatever is genuinely new.
      const beside = path.join(memoryDir, name.replace(/\.md$/, '.generated.md'));
      fs.writeFileSync(beside, content);
      deferred.push(beside);
    }
  }
  return { written, deferred };
}

export function formatMemoryReport({ written, deferred }) {
  const lines = [`Wrote ${written.length} memory file(s).`];
  for (const w of written) lines.push(`   ${w}`);
  if (deferred.length) {
    lines.push('', `${deferred.length} file(s) kept as-is because they are hand-authored; drafts written beside them:`);
    for (const d of deferred) lines.push(`   ${d}`);
    lines.push('', 'Diff each draft into its real file, then delete the draft.');
  }
  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  const [projectRoot, ...sliceFiles] = process.argv.slice(2);
  if (!projectRoot || !sliceFiles.length) {
    console.error('usage: node write-memory.mjs <projectRoot> <slice1.json> [slice2.json ...]');
    process.exit(1);
  }
  const slices = sliceFiles.map((fp) => JSON.parse(fs.readFileSync(fp, 'utf8')));
  const findings = mergeFindings(slices);
  console.log(formatMemoryReport(writeMemory(projectRoot, findings)));
}
