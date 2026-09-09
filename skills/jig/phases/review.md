# Phase 5 — Review

Goal: find real defects in the change, adversarially verify them, and gate shipping.
`<SKILL_DIR>` is this skill's base directory; `<taskDir>` is the task folder. Scaled by `track`.

Memory (index-first, lazy): load `conventions.md` (for the conventions dimension) and
`risks.md` (for correctness/security) as needed. Load only what you need.

## Steps
1. Confirm phase is `review`. Identify the change under review (the task's commits/diff
   since it started) and the acceptance criteria from `spec.md`.
2. **Fan out reviewers.** For each dimension in `.jig/config.yml` `review.dimensions`
   (default: correctness, security, tests, conventions), dispatch a `reviewer` subagent
   (role: `<SKILL_DIR>/agents/reviewer.md`) IN PARALLEL, one per dimension. Collect each
   one's JSON findings array. For `fast`/`hotfix` tracks, a single-pass reviewer is fine.
3. **Dedupe.** Merge all reviewer arrays and dedupe by dimension+file+line+claim (this is
   what `review.mjs` does when it writes the report).
4. **Adversarially verify.** If `review.verify` is `adversarial` (default), for each
   finding dispatch a `verifier` subagent (role: `<SKILL_DIR>/agents/verifier.md`). Decide
   each finding's `verdict` with the majority-refute rule — write the verifier votes to a
   JSON file and run `node "<SKILL_DIR>/scripts/review.mjs" verdict <votes.json>` (prints
   `real` or `refuted`). Keep the `verdict` on each finding.
5. **Write the report.** Put the final findings in a JSON file and run
   `node "<SKILL_DIR>/scripts/review.mjs" write "<taskDir>" <findings.json>` to write
   `review.md`. Each finding is `{dimension, round, file, line, severity, claim, verdict, fix}`
   — `severity` is `low|medium|high`, `round` is which review pass raised it, and `fix` is what
   resolved it (all of these are columns; don't cram them into `claim`). **A clean pass writes
   the report too** — pass `[]` and the table renders a `_none_` row. This is not optional
   bookkeeping: `set-state.mjs` refuses to approve the review gate while `review.md` is still
   the untouched template. Any prose belongs under a `## Summary` heading above the table,
   which survives later rewrites; anything else you add by hand does not.
   When `git.track_state`, commit `review.md` with the `.jig/` state (see SKILL.md
   § Committing `.jig/` state) — a standalone `.jig/` commit on a clean pass; when looping
   back to Implement, the fix commits there carry it.
6. **Decide:**
   - **Confirmed `real` findings exist:** compare `loops.review` in `state.json` (fix
     loops already spent) to `loops.max_review` (default 2). Under the limit → go back to
     Implement (`node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" phase implement`) to
     fix them, then re-run Test and Review; that transition bumps `loops.review` itself, so
     do **not** also run `loop.mjs bump review`. At/over the limit → STOP and escalate to
     the developer.
   - **Clean (no `real` findings):** this is the **review gate**. Per `.jig/config.yml`
     `gates.review`: `hard` (default) and track not `hotfix` → present the change summary
     and ask the developer to APPROVE to ship. `soft`/`off` or `hotfix` → proceed.
     On approval:
     `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" gate review approved` then
     `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" advance` (phase `review` → `ship`).
7. Report the outcome (looped back to Implement, or gate approved → phase `ship`).
   Continue with the Ship phase (`<SKILL_DIR>/phases/ship.md`).

## Notes
- Only verified `real` findings loop back — refuted findings are dropped so plausible-but-wrong
  ones don't churn the loop.
- Never approve the review gate with unfixed `real` findings.
