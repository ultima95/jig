import fs from 'node:fs';
import path from 'node:path';
import { readState, writeState } from './lib/state.mjs';
import { nextPhase } from './lib/transition.mjs';
import { setFrontMatterField } from './lib/frontmatter.mjs';
import { reviewReportWritten } from './review.mjs';
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

// Phases a task can fall back FROM into `implement`, and the loop counter each
// such fix-loop spends. Keyed by the phase being left.
const LOOP_ON_REGRESS = { test: 'test', review: 'review' };

export function setPhase(taskDir, phase) {
  const s = readState(taskDir);
  const from = s.phase;
  s.phase = phase;
  // A backward move into Implement IS the fix loop, so the counter is a property
  // of the transition rather than of an agent remembering to run loop.mjs. That
  // is what keeps `loops.max_test` / `loops.max_review` actually enforceable.
  const loopKey = phase === 'implement' ? LOOP_ON_REGRESS[from] : undefined;
  if (loopKey) s.loops = { ...s.loops, [loopKey]: (s.loops?.[loopKey] || 0) + 1 };
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
  // The review gate cannot be approved on an unwritten report: a clean pass still
  // owes a `| _none_ |` table (review.mjs write), so a pristine template means the
  // Review phase never ran and there is nothing to approve.
  if (gate === 'review' && value === 'approved' && !reviewReportWritten(taskDir)) {
    throw new Error(
      'cannot approve the review gate: review.md is still the scaffolded template — ' +
      'run `review.mjs write <taskDir> <findings.json>` first (an empty findings array is fine for a clean pass)',
    );
  }
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
