# Phase 7 — Cleanup (post-ship)

Goal: after a human has merged the PR out-of-band, verify the merge, return to the base branch,
delete the feature branch, and close the task. `<SKILL_DIR>` is this skill's base directory;
`<taskDir>` is the task folder. Runs for a task in phase `shipped` (via `/jig cleanup`).

Only runs when `.jig/config.yml` `git.cleanup: on_merge`. Merge is asynchronous and human — this
phase is expected to run in a LATER session than Ship.

## Steps
1. Read `state.json` for `branch`, `base`, and `pr`; read `ship.mode` + `git.*` from
   `.jig/config.yml`. If there is no `branch`, there is nothing to clean — set phase `done`
   (`node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" advance`) and report.
2. **Verify the branch was actually merged** — never delete otherwise:
   - `ship.mode: pr` (a `pr` is recorded): `gh pr view <pr> --json state,mergedAt`.
     - `MERGED` → proceed.
     - `OPEN` → not merged yet; report and STOP (leave the task in `shipped`).
     - `CLOSED` without a merge → warn; ask the developer keep-the-branch vs. force-delete.
   - `ship.mode: commit` (no PR): `git merge-base --is-ancestor <branch> <base>` (exit 0 = merged).
     - Not merged → report and STOP (task stays `shipped`).
3. **Confirm** the cleanup plan with the developer once: which branch is deleted, the base to
   return to, and whether the remote branch is deleted (`git.delete_remote`).
4. **Return to base:** `git checkout <base>` then `git pull --ff-only` (pull in the merged commits).
5. **Delete the local branch:** `git branch -d <branch>` (safe delete). If it refuses with
   "not fully merged" **but step 2 confirmed the PR is `MERGED`**, the merge was a squash or
   rebase — the branch's commits aren't ancestors of `<base>`, yet the change is genuinely
   merged. The PR verdict is authoritative, so delete with `git branch -D <branch>`. Only use
   `-D` on a truly *unmerged* branch when the developer explicitly forces it after a
   CLOSED-not-merged warning (step 2).
6. **Delete the remote branch** if `git.delete_remote` (default `true`) and it still exists:
   `git push origin --delete <branch>` (confirm per `trust_level`: `strict` confirms; others auto).
7. Record: `node "<SKILL_DIR>/scripts/progress.mjs" "<taskDir>" cleanup "cleaned up: deleted <branch>, on <base>"`.
8. Close the task: `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" advance`
   (phase `shipped` → `done`).
9. **Commit the final `.jig/` state on the base** when `git.track_state` (see SKILL.md
   § Committing `.jig/` state): `git add .jig && git commit -m "chore(jig): close <taskId>"`,
   then push it if `git.push` (default `true`): `git push`. If the base is protected and rejects
   the commit/push, report it and leave the change for the developer.
10. Report: the branch deleted (local/remote), the base now checked out, and that the task is `done`.

## Notes
- Never delete a genuinely unmerged branch. Step 2's PR verdict is authoritative — a
  `git branch -d` refusal when the PR is `MERGED` just means a squash/rebase merge (use `-D`),
  not that the work is unmerged.
- Non-git repo, no remote, or `git.cleanup: off` → this phase is not used; Ship already moved the
  task to `done`.
