# Project Memory — Index

<!-- jig:memory-placeholder — `/jig init` (Phase 0) overwrites this file while this
     line is here. Writing this file by hand instead? Delete this line, and a later
     `/jig memory-refresh` will leave your version alone. -->

_One or two sentences: what this project is, and who uses it._

## Tech stack

- _Language, framework, runtime, datastore — the things a newcomer must have installed._

## Contents

- [Architecture](architecture.md) — system shape, boundaries, and the components that make it up
- [Modules](modules.md) — where each part of the codebase lives, grouped by area
- [Conventions](conventions.md) — the style, patterns, and rules code here is expected to follow
- [Glossary](glossary.md) — domain terms, so a spec and the code mean the same thing
- [Runbook](runbook.md) — how to build, test, and run the project
- [Risks](risks.md) — fragile areas and gotchas, highest severity first

## Read this first

_The two to five decisions that are load-bearing and cheap to break by accident.
Each one: what the rule is, and what breaks if it's violated. This is the highest-value
section in Project Memory — a phase that reads nothing else should still read this._

1. _e.g. **Money is integer minor units** — never a float, never a decimal string doing arithmetic._
