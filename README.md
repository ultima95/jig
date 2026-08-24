<div align="center">

# 🏗️ Jig

**A jig for AI coding agents — a portable, gated software development lifecycle shipped as a single Claude Code skill.**

Understand the codebase once, then drive every task through a repeatable, human‑gated lifecycle: **intake → spec & plan → implement → test → review → ship**.

![Claude Code skill](https://img.shields.io/badge/Claude%20Code-skill-8A2BE2)
![tests](https://img.shields.io/badge/tests-97%20passing-2ea44f)
![node](https://img.shields.io/badge/node-%E2%89%A5%2018-339933?logo=nodedotjs&logoColor=white)
![dependencies](https://img.shields.io/badge/dependencies-zero-0aa)
![install](https://img.shields.io/badge/install-npx%20skills-111)
![version](https://img.shields.io/badge/version-0.6.0-informational)

</div>

---

## ✨ Why

AI coding agents are great at *writing code* and bad at *process*: they skip clarification, forget project conventions, ship untested changes, and re‑learn the codebase every session. Jig gives an agent a **repeatable lifecycle** with human checkpoints, bounded fix‑loops, adversarial review, and a durable **Project Memory** — so the same disciplined flow runs on every task, in any repo.

- 🧠 **Understands your codebase first** — Phase 0 fans out explorers and writes durable Project Memory.
- 🚦 **Human gates where they matter** — approve the plan, approve the ship. Configurable per task.
- 🔁 **Bounded loops** — Implement⇄Test until green; Review→Implement for real findings only.
- 🎚️ **Tracks** — a feature gets the full treatment; a hotfix gets a fast, safe path.
- 📦 **Portable** — one skill, **zero** third‑party dependencies, **zero** Workflow‑tool reliance. Just Node ≥ 18.

---

## 🔄 The lifecycle

```mermaid
flowchart LR
  subgraph P0["🧠 Phase 0 · once (refreshable)"]
    direction LR
    I["Investigate<br/>(parallel explorers)"] --> X["Extract"] --> M[("📦 Project<br/>Memory")]
  end

  subgraph LOOP["🔁 Per task · repeats"]
    direction LR
    IN["Intake &<br/>Clarify"] --> SP["Spec &<br/>Plan"]
    SP -->|"🚦 approve plan"| IM["Implement"]
    IM --> T["Test"]
    T -->|"❌ fail (bounded)"| IM
    T --> RV["Review<br/>(fan-out + verify)"]
    RV -->|"real findings"| IM
    RV -->|"🚦 approve to ship"| SH["Ship<br/>(branch · push · PR)"]
    SH -->|"awaiting merge"| CL["Cleanup<br/>(/jig cleanup)"]
    CL --> DONE(["✅ done"])
  end

  M -. "reads (index-first)" .-> IN
  SH -. "refresh" .-> M
```

Two invariants no path may drop: **a test proves the change**, and **Ship refreshes Project Memory** (so it never goes stale).

---

## 📦 Install

**Via the skills CLI** (recommended):

```bash
npx skills add ultima95/jig
```

**Or as a Claude Code plugin:**

```text
/plugin marketplace add ultima95/jig
/plugin install jig@ultima95
```

Then **restart Claude Code** so the `jig` skill is picked up. Requires Claude Code + **Node.js ≥ 18**.

---

## 🚀 Commands

| Command | What it does |
| --- | --- |
| `/jig init` | 🧠 Investigate the repo, build **Project Memory**, and walk through `.jig/config.yml` (skippable). |
| `/jig task "<request>"` | 🎫 Take an issue / bug / feature from intake all the way to shipped. |
| `/jig status` | 📋 List tasks and their current phase / gate state. |
| `/jig config [get\|set\|check]` | ⚙️ View, set, or validate `.jig/config.yml`. |
| `/jig resume [<YYYYMMDD>/<slug>]` | ⏯️ Resume a paused task at its saved phase. |
| `/jig cleanup [<YYYYMMDD>/<slug>]` | 🧹 After a merged PR: verify the merge, delete the branch, return to the base branch, and close the task. |
| `/jig backlog` | 🗒️ Groom deferred work in `.jig/backlog.md`: review with context, prune resolved/stale items, promote one to a task. |
| `/jig memory-refresh` | ♻️ Re‑run Phase 0 to refresh Project Memory. |

---

## 🎚️ Tracks

The `track` scales *which phases run* and *how heavy the gates are* — auto‑suggested from the task type, overridable at intake.

| Track | Intake | Spec & Plan | Test | Review | Gates |
| --- | --- | --- | --- | --- | --- |
| **full** *(feature)* | brainstorm | full spec | full | fan‑out + verify | both **hard** |
| **fast** *(bug / chore)* | 1–3 questions | light spec | ✓ | single‑pass | spec soft, review hard‑lite |
| **hotfix** *(urgent)* | confirm + repro | one‑liner | **regression test (never skipped)** | quick self‑review | both **soft** |

---

## 🧭 How it works

- **One skill, on‑demand guides.** A slim `SKILL.md` dispatcher loads only the current phase guide from `phases/` — context stays lean.
- **Inline agent fan‑out.** Phase 0 explorers and Review reviewers/verifiers are dispatched inline via the Agent tool — no Workflow‑tool dependency, fully portable.
- **Deterministic core, tested.** The mechanical parts — slug/date naming, state & gate transitions, bounded loop counters, findings dedupe + majority‑verdict, memory rendering — are dependency‑free Node scripts with **87 unit tests**.
- **Everything is files.** `.jig/` holds `config.yml`, `backlog.md` (deferred work), `memory/*.md`, and `tasks/<YYYYMMDD>/<slug>/` (`spec.md` · `progress.md` · `review.md` · `state.json`) — git‑versioned (opt‑out at init) and resumable.

```text
skills/jig/
├── SKILL.md              # dispatcher: init · task · status · config · resume · cleanup · backlog · memory-refresh
├── phases/               # understand · intake · spec-plan · implement · test · review · ship
├── agents/               # explorer · reviewer · verifier  (inline subagent roles)
├── scripts/              # deterministic, unit-tested Node helpers (+ lib/)
└── templates/            # config.yml, spec/progress/review, memory/*
```

---

## ⚙️ Configuration

`.jig/config.yml` (created by `/jig init`) controls Jig per repo:

- **`project`** — `build` / `test` / `lint` commands
- **`gates`** — `spec_plan` & `review`: `hard | soft | off`
- **`trust_level`** — `strict | normal | trusted`: how much confirmation Ship asks for before pushing / opening a PR
- **`tracks.default_by_type`** — which track each task type starts on
- **`loops`** — `max_test`, `max_review` (bounded fix‑loops)
- **`review`** — `dimensions` + `verify: adversarial`
- **`ship`** — `mode: commit | pr`
- **`git`** — `track_state` (commit `.jig/` state alongside code, or gitignore it — set during the init config walkthrough) + feature-branch lifecycle: `branch` (create `<type>/<slug>` at Implement), `base` (`auto` or an explicit branch — prefer explicit for a stable default), `branch_from` (`remote` = branch off fresh `origin/<base>`; `local` = local base ref), `push`, `cleanup` (`on_merge | off`), `delete_remote`
- **`memory`** — `graph: auto|on|off`, `refresh: on_ship|manual`

Manage these with **`/jig config`**: `show` (view all), `get <key>`, `set <key> <value>` (validates and preserves comments), and `check` (validate — exits non-zero on errors, so it works in CI).

---

## 🧪 Development

```bash
npm test    # runs the Node unit tests for the bundled scripts (87, zero deps)
```

---

## 🔖 Versioning

Follows [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`. Bump the version in **both** `package.json` and `.claude-plugin/plugin.json`:

| Bump | Change | e.g. `0.2.1` → | When |
| --- | --- | --- | --- |
| **patch** | last digit (`+0.0.1`) | `0.2.2` | backward‑compatible bug fix |
| **minor** | middle digit (`+0.1.0`, patch resets) | `0.3.0` | backward‑compatible feature |
| **major** | first digit (`+1.0.0`, rest reset) | `1.0.0` | breaking change |

Release notes come from [`CHANGELOG.md`](CHANGELOG.md) ([Keep a Changelog](https://keepachangelog.com/) format). To cut a release:

1. Move the `## [Unreleased]` entries into a new `## [X.Y.Z] - YYYY-MM-DD` section in `CHANGELOG.md`.
2. Bump the version in **both** `package.json` and `.claude-plugin/plugin.json`.
3. Commit, then tag and push:

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

The **Release** workflow (`.github/workflows/release.yml`) runs the tests, extracts that version's `CHANGELOG.md` section, and publishes it as the GitHub release body (falling back to auto‑generated notes if the section is missing).

---

## 📐 Design

Built the disciplined way — brainstorm → spec → per‑milestone plans → subagent‑driven execution with two‑stage review, across **7 tested milestones**, each merged green.

<div align="center"><sub>Built with Claude Code · gated, tested, portable.</sub></div>
