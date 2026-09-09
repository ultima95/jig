# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-09-10

### Added

- `/jig doctor` also checks that a shipped task actually left a trail: a task at `ship`,
  `shipped`, or `done` must have an `implement`, `test`, and `review` entry in its
  `progress.md`. A gate can be approved and a task closed while the work it attests to was
  never recorded, and nothing caught that. A phase recorded under a non-conforming heading
  (`## … — Implement`, `## … — Implement (review fix loop) + Test`) is reported as exactly
  that rather than as missing, since "never happened" and "happened, badly labelled" need
  different fixes.

### Removed

- `loop.mjs bump`. Bumping became automatic in 0.8.0, which left a manual bump that would
  silently double-count and trip `loops.max_*` a round early. It had no callers, so rather
  than keep warning about it in three places the command now refuses and names the
  transition that replaced it. `loop.mjs reset` is unchanged.

## [0.8.0] - 2026-09-10

### Added

- `/jig doctor` (`scripts/doctor.mjs`) -- audits every task for state drift: `state.json`
  disagreeing with `spec.md`'s front-matter (`status`, `gate_spec_plan`, `gate_review`), and
  a review gate approved with no `review.md` ever written. Exits non-zero when it finds any.
  `/jig status` runs the same check and appends the result, so drift surfaces without being
  asked for.
- `/jig status --all` -- `done` tasks are now hidden by default with a count; `--all` shows
  them. The task column also sizes itself to the widest id instead of shearing at 40 chars.
- `review.md` gained `round` and a populated `fix` column, and preserves a hand-written
  `## Summary` section across rewrites.
- Explorer slices may now carry `modules[].group`, `risks[].severity`, and topic-grouped
  `conventions` (`[{topic, rules[]}]`). All three are optional and the older shapes still
  render, so existing `.slices/*.json` keep working.

### Changed

- **Loop counters are now bumped by the phase transition.** Moving a task back from `test`
  or `review` into `implement` is the fix loop, so `set-state.mjs` increments
  `loops.test` / `loops.review` itself. Previously this relied on the agent also running
  `loop.mjs bump`, and when it didn't, `loops.max_test` / `loops.max_review` silently
  stopped bounding anything. The Test and Review phase guides no longer bump by hand.
- **The review gate refuses to approve an unwritten report.** `set-state.mjs gate review
  approved` now fails while `review.md` is still the scaffolded template -- a clean pass
  still owes a `_none_` table.
- **`/jig memory-refresh` no longer overwrites hand-authored memory.** Generated files carry
  a `<!-- jig:generated` marker; files without it (and past the scaffold placeholder) are
  left untouched and the fresh draft is written beside them as `<name>.generated.md` to be
  merged. Curated Project Memory used to be one command away from being replaced by a
  re-derived draft.
- **`progress.md` entries follow a schema.** `progress.mjs` rejects headings outside the
  lifecycle phase names, so qualifiers ("fix pass", "second round") go in the note instead
  of the heading, and `Spec & Plan` / `spec_plan` can no longer denote the same phase. The
  task template no longer seeds an `intake` entry, which used to duplicate the one Intake
  writes. Cleanup now labels its entry `cleanup` rather than `shipped`.
- Severity values in `review.md` normalize `med` to `medium`, and a `|` inside a claim is
  escaped rather than shearing the row into extra cells.
- **Project Memory is written to be read.** Generated `modules.md` groups modules under a
  `## <area>` heading instead of one flat list, so the file stays scannable as it grows and
  a spec can cite `modules.md#apps`; `risks.md` sorts highest-severity first and shows the
  rating inline; `conventions.md` renders topic headings; `index.md` says what each file
  holds rather than just linking it.
- **The scaffold templates are now skeletons rather than one-line stubs.** Each memory file
  ships with its section headings and, in a comment, how to write an entry — because on a
  mature repo Project Memory is hand-authored, and an empty file gives an author nothing to
  follow. `risks.md` in particular steers to a short labelled `Bite / Signal / Mitigation`
  block over a three-column table, which degrades into paragraph-length cells that no longer
  wrap or diff readably. `index.md` gained a "Read this first" section for the handful of
  load-bearing decisions.
- Placeholder detection for the overwrite guard is now the machine marker
  `<!-- jig:memory-placeholder`, with the pre-0.8 prose still honoured. A skeleton the
  author fills in becomes protected as soon as that line is deleted, as each template says.

### Fixed

- Slugs no longer truncate mid-word (`...-github-actions-t`) -- the 50-char cap now falls on
  a word boundary. A `/` in a title is a separator rather than glue, so `lint/test` slugs as
  `lint-test`, not `linttest`.

## [0.7.0] - 2026-08-24

### Added

- `/jig init` now walks the developer through `.jig/config.yml` in ten grouped,
  plain-language questions after Phase 0 scans the repo -- project commands, gates, trust
  level, track defaults, loops, memory, review, ship mode, and git workflow/cleanup --
  instead of silently leaving them at scaffold defaults. Project build/test commands are
  suggested from Phase 0's own runbook findings when available. An upfront question lets
  developers skip straight to the defaults, and the wizard only runs on a fresh scaffold
  (or `--force`), never against an existing config.

## [0.6.0] - 2026-08-22

### Changed

- Intake now asks its clarifying questions in plain language. Questions are sorted by who
  can answer them: observable behavior is asked about in words from the user's world,
  while internal mechanism is decided by the agent, disclosed in one line, and logged under
  "Assumptions & resolved questions". Every question offers concrete choices with a
  recommendation and an escape hatch. `spec.md` is unchanged and stays precise -- only the
  conversation gets plainer.
- Spec & Plan reads decisions back in the same plain language at the hard spec gate.

### Fixed

- CLI entry scripts no longer no-op when invoked through a symlinked skill path. All 10
  scripts gated their main block on ``import.meta.url === `file://${process.argv[1]}` ``,
  comparing a URL string to a raw path; because installers link the skill into
  `.claude/skills/` and `SKILL.md` invokes scripts via `<SKILL_DIR>`, every command exited
  0 printing nothing. A shared `isMain()` helper now compares real paths, which also fixes
  paths containing spaces, `#`, or `?`.

## [0.5.0] - 2026-07-09

### Added
- `git.branch_from` config key (`remote` | `local`, default `remote`): Implement branches off
  a fresh `origin/<base>` by default, or the local `<base>` ref. Falls back to `local` (with a
  note) when the remote is unreachable.

### Changed
- Implement now enforces a per-track **starting-point gate** before creating the feature branch
  (STOP on full/fast, warn on hotfix) when the tree is dirty outside `.jig/` or HEAD is detached.
- Release notes are now sourced from this `CHANGELOG.md` (the Release workflow publishes
  the tagged version's section as the release body), instead of auto-generated commit lists.

### Fixed
- Implement cut the feature branch with a bare `git checkout -b`, which branched off whatever
  HEAD happened to be (e.g. a prior task's branch after a push) instead of the resolved base.
  It now branches from the resolved/fresh base explicitly.

## [0.4.0] - 2026-07-08

### Changed
- **Renamed the project from "SDLC Harness" to Jig.** The command is now `/jig`
  (was `/sdlc`); the skill, npm package, and plugin are named `jig`.
- Renamed the config key `git.track_sdlc` → `git.track_state`.

### Backward compatibility
- The state directory resolves to `.jig/` for new repos but still recognizes an
  existing `.sdlc/` directory, so repos scaffolded before the rename keep working.
- A legacy `git.track_sdlc` key in `.sdlc/config.yml` is accepted as an alias for
  `git.track_state`.
- `sdlc` is retained as a discovery keyword/trigger.

## [0.3.0] - 2026-07-07

### Added

- `/sdlc config` command to view, edit, and validate `.sdlc/config.yml`:
  - `show` (default) — print settings grouped by section with allowed values.
  - `get <key>` — print a single value by dotted path (e.g. `gates.review`).
  - `set <key> <value>` — validate against a baked-in schema and rewrite one line,
    preserving indentation and inline comments.
  - `check` — static validation (`OK`/`WARN`/`ERR` + summary); exits non-zero on any
    error, so it works in CI.
- Zero new dependencies — a hand-rolled YAML-subset parser, matching the harness's
  zero-dependency design.

### Fixed

- `/sdlc config set` now preserves the alignment padding before an inline comment when
  it rewrites a line (previously the gap collapsed to a single space).

## [0.2.2] - 2026-07-07

### Fixed

- Harness state under `.sdlc/` is committed alongside the code it describes, instead of
  being left as an uncommitted pile.

## [0.2.1] - 2026-07-07

### Added

- Tag-triggered GitHub release workflow (`.github/workflows/release.yml`).

### Fixed

- `/sdlc cleanup` handles squash- and rebase-merged pull requests when verifying a merge.

## [0.2.0] - 2026-07-07

### Added

- Feature-branch lifecycle: create `<type>/<slug>` at Implement, push and open a PR at
  Ship, and `/sdlc cleanup` after merge.
- `/sdlc backlog` to groom deferred work in `.sdlc/backlog.md`.

[Unreleased]: https://github.com/ultima95/jig/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/ultima95/jig/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/ultima95/jig/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/ultima95/jig/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ultima95/jig/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ultima95/jig/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ultima95/jig/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ultima95/sdlc-harness/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/ultima95/sdlc-harness/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/ultima95/sdlc-harness/releases/tag/v0.2.1
[0.2.0]: https://github.com/ultima95/sdlc-harness/releases/tag/v0.2.0
