import fs from 'node:fs';
import path from 'node:path';
import { readState, writeState } from './lib/state.mjs';
import { nextPhase } from './lib/transition.mjs';
import { setFrontMatterField } from './lib/frontmatter.mjs';
import { isMain } from './lib/paths.mjs';

const GATES = ['spec_plan', 'review'];
const GATE_VALUES = ['pending', 'approved'];
const FIELDS = ['branch', 'base', 'pr'];

function updateSpecField(taskDir, key, value) {
  const p = path.join(taskDir, 'spec.md');
  if (fs.existsSync(p)) {
    fs.writeFileSync(p, setFrontMatterField(fs.readFileSync(p, 'utf8'), key, value));
  }
}

export function setPhase(taskDir, phase) {
  const s = readState(taskDir);
  s.phase = phase;
  writeState(taskDir, s);
  updateSpecField(taskDir, 'status', phase);
  return phase;
}

export function advance(taskDir) {
  const s = readState(taskDir);
  return setPhase(taskDir, nextPhase(s.phase));
}

export function setGate(taskDir, gate, value) {
  if (!GATES.includes(gate)) throw new Error(`invalid gate: ${gate} (expected ${GATES.join('|')})`);
  if (!GATE_VALUES.includes(value)) throw new Error(`invalid gate value: ${value} (expected ${GATE_VALUES.join('|')})`);
  const s = readState(taskDir);
  s.gates = { ...s.gates, [gate]: value };
  writeState(taskDir, s);
  updateSpecField(taskDir, `gate_${gate}`, value);
  return s.gates;
}

export function setField(taskDir, key, value) {
  if (!FIELDS.includes(key)) throw new Error(`invalid field: ${key} (expected ${FIELDS.join('|')})`);
  const s = readState(taskDir);
  s[key] = value;
  writeState(taskDir, s);
  return s[key];
}

if (isMain(import.meta.url)) {
  const [taskDir, cmd, a, b] = process.argv.slice(2);
  if (!taskDir || !cmd) {
    console.error('usage: node set-state.mjs <taskDir> <phase <name> | advance | gate <gate> <value> | field <key> <value>>');
    process.exit(1);
  }
  if (cmd === 'phase') setPhase(taskDir, a);
  else if (cmd === 'advance') advance(taskDir);
  else if (cmd === 'gate') setGate(taskDir, a, b);
  else if (cmd === 'field') setField(taskDir, a, b);
  else { console.error(`unknown command: ${cmd}`); process.exit(1); }
  console.log(JSON.stringify(readState(taskDir)));
}
