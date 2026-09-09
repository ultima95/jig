# Conventions

<!-- jig:memory-placeholder — `/jig init` (Phase 0) overwrites this file while this
     line is here. Writing this file by hand instead? Delete this line, and a later
     `/jig memory-refresh` will leave your version alone. -->

What code here is expected to look like. A violation is a review finding.

<!-- Group with `## <topic>` headings (Language, Money, Dates, API, Security, Data,
     Frontend, Testing, …). One rule per bullet, written as an instruction, and where
     it is non-obvious add "— because <reason>": a rule whose reason is recorded
     survives being argued with. Show the idiom in a short code span when a sentence
     would be vaguer than the code. -->

## _topic_

- _the rule, imperative — because <what goes wrong otherwise>_

## Security

_Rules whose violation should block a review outright. Keeping them under their own
heading is what lets the Review phase's `security` dimension cite them directly._

- _e.g. every query filters on `userId` — including fetch-by-primary-key._

## Commits

_The commit convention for this repo, if it isn't plain Conventional Commits — the
Implement phase reads this and it takes precedence over its own default._
