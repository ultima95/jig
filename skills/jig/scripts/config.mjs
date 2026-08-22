import fs from 'node:fs';
import { isMain, jigPaths } from './lib/paths.mjs';
import { parseConfig, validate, getValue, applySet, SCHEMA } from './lib/config.mjs';

export function renderShow(text) {
  const { leaves } = parseConfig(text);
  const out = [];
  let lastTop = null;
  for (const key of Object.keys(SCHEMA)) {
    const top = key.split('.')[0];
    if (lastTop !== null && top !== lastTop) out.push('');
    lastTop = top;
    const value = leaves.has(key) ? display(leaves.get(key).value) : '(unset)';
    const spec = SCHEMA[key];
    const allowed = spec.type === 'enum' ? `   [${spec.allowed.join(' | ')}]`
      : spec.type === 'bool' ? '   [true | false]'
      : '';
    out.push(`  ${key.padEnd(34)} ${value}${allowed}`);
  }
  out.push('', 'Run `/jig config check` to validate.');
  return out.join('\n');
}

export function renderCheck(text) {
  const results = validate(parseConfig(text));
  const lines = [];
  let ok = 0, warn = 0, err = 0;
  for (const res of results) {
    if (res.level === 'ok') ok++; else if (res.level === 'warn') warn++; else err++;
    const tag = res.level.toUpperCase().padEnd(4);
    const val = res.value === undefined ? '' : ` = ${display(res.value)}`;
    const note = res.note ? `   (${res.note})` : '';
    lines.push(`${tag} ${res.key}${val}${note}`);
  }
  lines.push('', `${ok} ok, ${warn} warning(s), ${err} error(s)`);
  return { report: lines.join('\n'), errors: err };
}

function display(v) {
  return Array.isArray(v) ? `[${v.join(', ')}]` : String(v);
}

if (isMain(import.meta.url)) {
  const [verb = 'show', a, b] = process.argv.slice(2);
  const { config } = jigPaths(process.cwd());
  if (!fs.existsSync(config)) {
    console.error('No .jig/config.yml found — run `/jig init` first.');
    process.exit(1);
  }
  const text = fs.readFileSync(config, 'utf8');

  if (verb === 'show') {
    console.log(renderShow(text));
  } else if (verb === 'get') {
    if (!a) { console.error('usage: config get <key>'); process.exit(1); }
    const value = getValue(parseConfig(text), a);
    if (value === undefined) { console.error(`unknown or unset key: ${a}`); process.exit(1); }
    console.log(display(value));
  } else if (verb === 'set') {
    if (!a || b === undefined) { console.error('usage: config set <key> <value>'); process.exit(1); }
    let next;
    try { next = applySet(text, a, b); }
    catch (e) { console.error(e.message); process.exit(1); }
    fs.writeFileSync(config, next);
    console.log(`set ${a} = ${display(getValue(parseConfig(next), a))}`);
  } else if (verb === 'check') {
    const { report, errors } = renderCheck(text);
    console.log(report);
    if (errors > 0) process.exit(1);
  } else {
    console.error(`unknown verb: ${verb} (expected show | get | set | check)`);
    process.exit(1);
  }
}
