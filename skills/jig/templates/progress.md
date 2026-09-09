# Progress — {{ID}}

<!-- Append-only. Each phase adds a dated entry: what happened, decisions,
     commands run, and test results. This is the audit trail and the context
     used by `/jig resume`. Newest entries at the bottom.

     Entries are written by `scripts/progress.mjs`, never by hand, so every
     heading reads `## YYYY-MM-DD — <phase>` with the phase spelled exactly as
     the lifecycle names it (intake, spec_plan, implement, test, review, ship,
     shipped, cleanup, done). Qualifiers like "fix pass" or "second round" go
     in the bullet text, not the heading — that keeps the file greppable. -->

Task created — the first entry lands when Intake records its outcome.
