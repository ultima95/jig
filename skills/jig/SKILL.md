---
name: jig
description: Run a gated software development lifecycle for a repo. Use for `/jig init` (understand the codebase and scaffold project memory), `/jig task "<request>"` (start an issue/bug/feature through spec→implement→test→review→ship), `/jig status`, `/jig config` (view/set/validate settings), `/jig memory-refresh`, and `/jig resume`. Triggers on "jig", "run the lifecycle", "start a task", "sdlc", "sdlc init/status".
---

# Jig

A jig holds the work and guides the tool so every cut comes out true. This skill
holds a task and guides the agent through a repeatable, gated software development
lifecycle for the current repository, so every task runs the same accurate path.
Deterministic mechanics are Node scripts bundled in this skill under `scripts/`;
you run them and interpret the output. `<SKILL_DIR>` below is this skill's base
directory — use its absolute path when running commands. Node.js ≥ 18 is required.

## Dispatch

Parse the sub-command from the user's invocation (the word after `/jig`, or infer
from the request) and follow the matching section. If none matches, run **status**
and show the available sub-commands.

### init
Scaffold `.jig/`, then run Phase 0 to build Project Memory.

1. Run: `node "<SKILL_DIR>/scripts/scaffold.mjs" "$(pwd)"` (add `--force` only if the
   developer explicitly asked to re-scaffold) and report created vs. skipped. Note whether
   `.jig/config.yml` itself is in the **created** list (fresh) or **skipped** (already
   existed) — that decides whether step 3 runs.
2. Run **Phase 0 — understand the codebase**: follow `<SKILL_DIR>/phases/understand.md`
   to fan out explorer subagents, merge their findings, and populate `.jig/memory/`. Its
   `runbook` slice (`.jig/memory/runbook.md`) feeds the config wizard's project-commands
   question in step 3.
3. **Configure `.jig/config.yml`** — only if step 1 listed it under **created**. If it was
   **skipped** (existing config, no `--force`), skip straight to step 4; an existing config
   is never walked through implicitly.
   1. Ask the developer: walk through settings now, or accept the scaffold defaults and
      tune later with `/jig config`? On "defaults", skip ahead to step 3.3 — every key
      stays as scaffolded.
   2. On "walk through", ask each group below as its own message, in plain language: describe
      the situation, offer lettered options, name a recommendation, and give an escape hatch
      ("keep default" / "not sure"). After each answer, apply it right away —
      `node "<SKILL_DIR>/scripts/config.mjs" set <key> <value>` — so a rejected value only
      re-asks that one group; earlier groups are already applied and untouched.
      - **Project commands** (`project.build`, `project.test`, `project.lint`) — if
        `.jig/memory/runbook.md` names a build/test command, offer it as the suggested
        default for `build`/`test`; free text either way. `lint` has no auto-detection —
        ask plainly; default keeps the scaffold placeholder.
      - **Gates** (`gates.spec_plan`, `gates.review`) — per checkpoint: stop and wait for
        approval (`hard`), note and continue (`soft`), or skip it (`off`). Default both `hard`.
      - **Trust level** (`trust_level`) — how much Jig asks vs. decides-and-discloses on its
        own: `strict | normal | trusted`. Default `normal`.
      - **Track defaults** (`tracks.default_by_type.{feature,refactor,bug,chore}`) — confirm
        or customize the per-type default (`full | fast | hotfix`). Default: feature/refactor
        → `full`, bug/chore → `fast`.
      - **Loops** (`loops.max_test`, `loops.max_review`) — fix-and-retry attempts before a
        phase escalates to the developer. Default `3` and `2`.
      - **Memory** (`memory.graph`, `memory.refresh`) — use a code-graph MCP when present
        (`auto | on | off`), and when Project Memory refreshes (`on_ship | manual`). Defaults
        `auto`, `on_ship`.
      - **Review** (`review.dimensions`, `review.verify`) — which dimensions to check (comma
        list) and whether findings get adversarially re-verified before reporting
        (`adversarial | off`). Defaults `correctness, security, tests, conventions`,
        `adversarial`.
      - **Ship mode** (`ship.mode`) — open a PR (`pr`) or leave commits for the developer to
        push/PR themselves (`commit`). Default `commit`.
      - **Git workflow** (`git.track_state`, `git.branch`, `git.base`, `git.branch_from`,
        `git.push`) — commit `.jig/` state alongside code, or gitignore it (this is the old
        standalone question, now part of the group); create a feature branch at Implement;
        base branch (`auto`-detect, or an explicit name for a stable default); branch off
        `remote` (fetch fresh `origin/<base>`) or `local`; push the branch at Ship. Defaults
        `true`, `true`, `auto`, `remote`, `true`.
      - **Git cleanup** (`git.cleanup`, `git.delete_remote`) — after a shipped branch merges,
        delete it automatically (`on_merge`) or never (`off`), and whether to also delete the
        remote branch. Defaults `on_merge`, `true`.
   3. Read the resulting `git.track_state` — `node "<SKILL_DIR>/scripts/config.mjs" get
      git.track_state` — and act on it regardless of whether the developer walked through
      settings or took the defaults:
      - `true` → commit the scaffold: `git add .jig && git commit -m "chore: initialize
        jig"`. If the base is protected and rejects a direct commit, tell the developer to
        commit `.jig/` themselves (or open a PR).
      - `false` → add `.jig/` to `.gitignore` and commit that: `git add .gitignore &&
        git commit -m "chore: ignore .jig state"`.
   4. Run `node "<SKILL_DIR>/scripts/config.mjs" check` and report the result to the
      developer (a `WARN`, e.g. an unfilled `project.lint` placeholder, is informational,
      not a failure).
4. Report which memory files were populated and suggest the user skim
   `.jig/memory/index.md`.
5. Do **not** overwrite an existing config unless the user explicitly asks (`--force`) —
   this is also what gates step 3 (a fresh scaffold walks through config; an existing one
   does not).

### task
Create a new task folder for an issue/bug/feature.

1. Determine a short `title` from the user's request and a `type`
   (`feature` | `bug` | `chore` | `refactor`; default `feature`).
2. Propose a `track` (process weight): defaults by type are
   feature/refactor → `full`, bug/chore → `fast`; suggest `hotfix` when the
   user signals urgency. Confirm title, type, and track in one line before
   creating, and let the user override the track.
3. Run: `node "<SKILL_DIR>/scripts/new-task.mjs" "<title>" <type> <track>`
   (omit `<track>` to accept the type default).
4. Report the created `taskId`, its `track`, and path
   (`.jig/tasks/<YYYYMMDD>/<slug>/`).
5. The created task folder is `<taskDir>` (`.jig/tasks/<YYYYMMDD>/<slug>/`), at phase `intake`.
6. Run **Phase 1 — Intake & Clarify**: follow `<SKILL_DIR>/phases/intake.md` (pass
   `<taskDir>`). This is an interactive dialogue with the developer.
7. Run **Phase 2 — Spec & Plan**: follow `<SKILL_DIR>/phases/spec-plan.md` (pass
   `<taskDir>`), ending at the spec gate.
8. After the gate is approved (phase `implement`), run **Phase 3 — Implement**
   (`<SKILL_DIR>/phases/implement.md`; creates a `<type>/<slug>` feature branch per
   `git.branch`), **Phase 4 — Test** (`<SKILL_DIR>/phases/test.md`),
   **Phase 5 — Review** (`<SKILL_DIR>/phases/review.md`, review gate), then
   **Phase 6 — Ship** (`<SKILL_DIR>/phases/ship.md`). Ship pushes the branch and opens a PR or
   leaves commits (`ship.mode`), refreshes Project Memory, and moves the task to `shipped` (a
   branch awaiting merge) or `done`. When a `shipped` task's PR is merged, run **`/jig cleanup`**
   to verify the merge, delete the branch, return to base, and close the task.

### status
Show the open tasks and their current phase/gate state.

1. Run: `node "<SKILL_DIR>/scripts/status.mjs"` from the repo root (`$(pwd)`). Add `--all`
   to include `done` tasks (they are hidden by default, with a count).
2. Print the output verbatim. Status also runs the **doctor** check and appends any state
   drift it finds — relay that too, and offer to repair it (see `### doctor`).

### doctor
Check every task for: `state.json` disagreeing with its `spec.md` front-matter; a review
gate approved without a written `review.md`; and a shipped task whose `progress.md` never
recorded an `implement` / `test` / `review` entry — a gate can be approved and a task
closed while the work it attests to was never written down.

1. Run: `node "<SKILL_DIR>/scripts/doctor.mjs"` from the repo root (`$(pwd)`). Exits
   non-zero when there is drift.
2. Print the output verbatim. Repair drift by re-issuing the real transition through
   `set-state.mjs` (`phase` / `gate` / `field`) so both files are written together —
   never by hand-editing `state.json` or `spec.md` to match.

### config
View, edit, and validate `.jig/config.yml`. Backed by `scripts/config.mjs`; run it from the
repo root (`$(pwd)`) and relay the output. Keys are dotted paths (e.g. `gates.review`).

1. **show** (default): `node "<SKILL_DIR>/scripts/config.mjs" show` — print settings grouped
   by section with allowed values.
2. **get**: `node "<SKILL_DIR>/scripts/config.mjs" get <key>` — print one value.
3. **set**: `node "<SKILL_DIR>/scripts/config.mjs" set <key> <value>` — validate and write one
   key, preserving comments. On an invalid value it exits non-zero and prints the allowed set;
   relay that and do not retry blindly.
4. **check**: `node "<SKILL_DIR>/scripts/config.mjs" check` — static validation
   (`OK`/`WARN`/`ERR` + summary); exits non-zero if any `ERR`.

When `git.track_state: true`, commit the changed `.jig/config.yml` after a `set`.

### memory-refresh
Re-run Phase 0 to refresh Project Memory (e.g., after significant changes).
Follow `<SKILL_DIR>/phases/understand.md`; it overwrites the memory files.

### cleanup
Finish a `shipped` task after its PR was merged out-of-band.

1. Determine the task: if the user gave `<YYYYMMDD>/<slug>`, use it; else run
   `node "<SKILL_DIR>/scripts/resume.mjs" "$(pwd)"` and pick a task whose phase is `shipped`
   (ask the user if there are several).
2. Read its state: `node "<SKILL_DIR>/scripts/resume.mjs" "$(pwd)" "<taskId>"`; confirm the phase
   is `shipped`. If it is already `done`, tell the user the task is already cleaned up.
3. Follow **Phase 7 — Cleanup** (`<SKILL_DIR>/phases/cleanup.md`), passing the task folder.

### resume
Resume a paused task from its saved state.

1. Determine the task: if the user gave `<YYYYMMDD>/<slug>`, use it; otherwise run
   `node "<SKILL_DIR>/scripts/resume.mjs" "$(pwd)"` to list resumable tasks (phase ≠ done)
   and pick one (ask the user if there are several).
2. Read its state: `node "<SKILL_DIR>/scripts/resume.mjs" "$(pwd)" "<taskId>"` (prints
   `state.json`); note the current `phase`.
3. Recover context: read the task's `progress.md` (and `spec.md`) under
   `.jig/tasks/<taskId>/`.
4. Re-enter that phase by following its guide (passing the task folder):
   `intake`→`phases/intake.md`, `spec_plan`→`phases/spec-plan.md`,
   `implement`→`phases/implement.md`, `test`→`phases/test.md`,
   `review`→`phases/review.md`, `ship`→`phases/ship.md`,
   `shipped`→`phases/cleanup.md`. If `phase` is `done`, tell the
   user the task is already complete.
5. Continue the lifecycle from there.

### backlog
Groom deferred work in `.jig/backlog.md` — e.g. when there's free time to burn it down.
This is a maintenance flow, not a lifecycle phase; it reads and prunes the file and promotes
items into normal tasks. No dedicated script.

1. List the open items (`- [ ]`) from `.jig/backlog.md`. If there are none, say the backlog
   is empty and stop.
2. Context-check each item (or the ones the user cares about) — index-first via
   `.jig/memory/`, plus the code: is it still relevant, already solved incidentally, a
   duplicate, or stale? Give your read per item.
3. **Prune** (with the developer's OK): check off (`- [x]`) or delete items that are already
   done, obsolete, or no longer wanted. Commit the pruned `.jig/backlog.md` when `git.track_state`.
4. **Promote** an item the developer picks up now: start it as a normal task — run the
   **task** flow (see `### task`) with the item text as the request. When that task reaches
   `shipped`/`done`, check its source item off in `.jig/backlog.md`.
5. Report: items pruned, item(s) promoted to tasks, and how many remain open.

## Committing `.jig/` state
When `.jig/` is tracked (`git.track_state: true`, chosen at init), its files — a task's
`spec.md`/`progress.md`/`review.md`/`state.json`, refreshed `memory/*.md`, `backlog.md` — are
**committed alongside the code they describe**, never left as a trailing pile of dirt:
- **Intake & Spec-Plan** run on the base before the feature branch exists — they write `.jig/`
  but do **not** commit. Creating the branch at Implement carries those changes onto it, where
  they fold into the first code commit.
- **Implement / Test / Review** stage `.jig/` in the same commit as the code/tests/fixes. When
  a phase has no code to ride with (a clean Review pass, Ship's memory refresh), commit the
  `.jig/` changes on their own — on a feature branch these still merge via the PR.
- **Cleanup** runs on the base after the merge — commit and push (`git.push`) the small final
  state there directly; if the base is protected and rejects it, report and leave it.

When `.jig/` is **not** tracked (`git.track_state: false`, gitignored) or the repo is non-git,
skip all of this — `.jig/` lives on disk and is still resumable.

## Task state is script-owned
`state.json` and `spec.md`'s front-matter are two views of one fact, and the scripts write
both together. **Never edit either by hand** — not to fix a phase, not to record a PR, not
to "just set it to done". A direct edit updates one view and silently desynchronizes the
other, and it skips the mechanics attached to the transition:

- `set-state.mjs phase|advance` writes `state.json` **and** `spec.md`'s `status`, and a
  backward move into `implement` is what bumps `loops.test` / `loops.review` — so the
  fix-loop counters, and the `loops.max_*` bounds built on them, only stay honest if the
  phase moves through the script. There is no manual bump — `loop.mjs bump` is refused,
  because doing both would double-count.
- `set-state.mjs gate <gate> approved` writes both views, and refuses to approve `review`
  while `review.md` is still the scaffolded template.
- `set-state.mjs field pr|branch|base` is how those get recorded.
- `progress.mjs` is the only writer of `progress.md` entries; it rejects headings outside
  the lifecycle phase names, so qualifiers ("fix pass", "second round") go in the note.

`/jig status` surfaces any drift; `/jig doctor` reports it on its own and exits non-zero.

## Notes
- All commands operate on the current working directory as the project root.
- If `.jig/` does not exist when running `task`/`status`, tell the user to run
  `/jig init` first.
