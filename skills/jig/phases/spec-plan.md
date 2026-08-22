# Phase 2 — Spec & Plan

Goal: produce the execution plan and pass the spec gate. Builds on the agreed
understanding from Intake. Scaled by `track`. `<SKILL_DIR>` is this skill's base
directory; `<taskDir>` is the task folder.

Memory (index-first, lazy): read `.jig/memory/index.md`, then load `modules.md`
and `risks.md` for the affected areas to ground the plan; load `conventions.md` if
it informs the approach. Load only what you need.

## Steps
1. Confirm `spec.md` Part 1 (Spec) is filled from Intake and phase is `spec_plan`.
2. Fill `spec.md` **Part 2 — Plan**: Approach (+ why), Affected files & modules
   (from `modules.md` / `risks.md`), ordered Steps mapped to files, Test plan
   (each acceptance criterion → a test), Risks & rollback. Scale detail by `track`:
   - `hotfix`: a one-line approach + the regression test that proves the fix.
   - `fast`: summary approach + steps + test plan.
   - `full`: the complete plan.
   **Scope discipline (YAGNI):** plan only what the acceptance criteria require now.
   Prefer the simplest approach that meets them; don't add speculative features,
   config knobs, or abstraction layers for needs that aren't in the spec. Append any
   "might-need-later" idea to `.jig/backlog.md` (durable, dated, tagged with this task)
   rather than building it — that is where deferred work is tracked so it isn't forgotten.
3. Append a dated entry to `progress.md`.
4. **Spec gate** — read `gates.spec_plan` from `.jig/config.yml`:
   - `hard` (default) AND track is not `hotfix`: present a concise summary to the
     developer — Problem/Goal, Acceptance criteria, and the Plan steps — and ask
     them to APPROVE or request changes. Summarize in the same plain language Intake
     used (`phases/intake.md` § Asking questions) — `spec.md` itself stays precise.
     Wait for explicit approval; revise and re-present if changes are requested.
   - `hotfix` track, or `soft`/`off` config: do not stop; record the plan and proceed.
5. On approval (or when the gate is skipped), record it and advance:
   `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" gate spec_plan approved`
   then `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" advance`
   (phase `spec_plan` → `implement`).
6. Report that the plan is approved and the task is at phase `implement`. Continue with
   the Implement phase (`<SKILL_DIR>/phases/implement.md`).

## Notes
- The gate reviews the whole `spec.md` (Spec + Plan) at once.
- Never advance past a `hard` spec gate without explicit approval (unless track is `hotfix`).
- Do **not** commit `.jig/` here — like Intake, this runs on the base before the feature
  branch exists; the spec + plan ride onto the branch at Implement and fold into the first
  commit (see SKILL.md § Committing `.jig/` state).
