# Phase 4 — Test

Goal: prove the change with tests. Run the project's test command; on failure loop
back to Implement, bounded by `loops.max_test`. `<SKILL_DIR>` is this skill's base
directory; `<taskDir>` is the task folder.

Memory (index-first, lazy): load `runbook.md` for how to run tests if the command
isn't already clear from `.jig/config.yml`.

## Steps
1. Confirm phase is `test`. Satisfy the plan's Test plan — author any missing tests
   (each acceptance criterion → a test). For `hotfix`, ensure a regression test that
   reproduces the bug exists and now passes.
2. Run the test command from `.jig/config.yml` `project.test`.
3. If tests PASS: append a dated entry to `progress.md`, commit any new/updated tests —
   staging the `.jig/` changes in the same commit when `git.track_state` (see SKILL.md
   § Committing `.jig/` state) — optionally reset the counter
   (`node "<SKILL_DIR>/scripts/loop.mjs" "<taskDir>" reset test`), then advance to
   Review: `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" advance`
   (phase `test` → `review`). Follow the Review phase (`<SKILL_DIR>/phases/review.md`).
4. If tests FAIL:
   - Compare `loops.test` in `state.json` (fix loops already spent) to `loops.max_test`
     in `.jig/config.yml` (default 3):
     - Under the limit: return to Implement — move the phase back with
       `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" phase implement`, feed the
       failures to the implementer to fix, then come back to Test.
     - At or over the limit: STOP. Append the failing output to `progress.md`, leave
       the task at phase `test`, and escalate to the developer.

## Notes
- Never advance to Review with failing tests.
- **The counter bumps itself.** Moving the phase back from `test` to `implement` is the
  fix loop, so `set-state.mjs` bumps `loops.test` as part of that transition and prints the
  new state. There is no manual bump; `loop.mjs bump` is refused rather than double-counting.
- The counter persists in `state.json` `loops.test`, so the bound holds across resumes.
