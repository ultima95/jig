# Phase 1 — Intake & Clarify

Goal: turn a raw request into an agreed understanding, through dialogue with the
developer. This phase is INTERACTIVE — run by the main agent in the live session,
NOT a subagent. Scaled by the task's `track` (see `state.json` / `spec.md` front-matter).
`<SKILL_DIR>` is this skill's base directory; `<taskDir>` is the task folder.

Memory (index-first, lazy): read `.jig/memory/index.md` for orientation; load a
specific memory file only if it helps clarify the request (e.g., `modules.md` to
locate the affected area). Do NOT bulk-load `.jig/memory/`.

## Steps
1. Read the task's `spec.md` and `state.json`. Confirm phase is `intake`.
2. Analyze the request: restate it in one line and list what is ambiguous or unstated.
   Skim `.jig/backlog.md` (deferred work from past tasks) — if any open item relates to this
   request, surface it so the developer can decide whether to fold it into scope now.
3. Ask the developer clarifying questions — scaled by `track`:
   - `full`: brainstorm thoroughly — requirements, approach, acceptance criteria, edge cases.
   - `fast`: 1–3 targeted questions only.
   - `hotfix`: confirm the bug and how to reproduce it; skip open-ended design questions.
   Ask one focused question at a time, following **§ Asking questions** below.
4. When requirement and approach are agreed, record them into `spec.md` **Part 1 — Spec**
   (Summary, Context, Problem/Goal, Requirements, Acceptance criteria, Out of scope,
   Assumptions & resolved questions). Keep acceptance criteria testable.
5. Append a dated entry to `progress.md` capturing the intake outcome and key decisions.
6. Advance to Spec & Plan:
   `node "<SKILL_DIR>/scripts/set-state.mjs" "<taskDir>" advance`
   (phase `intake` → `spec_plan`), then follow `<SKILL_DIR>/phases/spec-plan.md`.

## Asking questions

Capture requirements precisely **and** stay answerable by someone who does not read
code. These are not in tension: **ask in plain language, record the answer precisely.**
The conversation can be plain because `spec.md` is where exactness lives.

**1 — Sort by who can answer.** Split what is unclear into two piles:

- **Observable** — what a person using the thing sees, does, or gets. Ask these.
- **Internal** — mechanism only an engineer could decide. Do **not** ask. Pick the
  simplest option that satisfies the observable answers, state it in one line so the
  developer can object, and log it under *Assumptions & resolved questions* — e.g.
  "Upload progress goes in Redis with a 24h TTL; say so if you'd rather it was Postgres."

If the only people who could answer a question are engineers, it is not a requirements
question. Decide it and disclose it.

**2 — Plain words.** Name things from the user's world, not the codebase's: "the login
link", not "the token"; "the upload", not "the multipart stream". Describe the
*situation* a person is in, then ask what should happen — do not ask about the
mechanism. No unexplained jargon. Short sentences, one question per message.

**3 — Always offer choices.** Every question ships lettered options, the one you
recommend, and an escape hatch. "Not sure" is a valid answer: it means you pick and
disclose (rule 1).

The same requirement, asked wrong then right:

> ✗ Should token refresh be idempotent across concurrent requests, or do we accept a
> race on the rotation window?

> ✓ Someone has your app open in two tabs, and both try to refresh the login at the
> same moment. What should happen?
> - **a)** Both keep working, nobody gets logged out — *recommended, slightly more work*
> - **b)** One tab gets logged out and has to sign in again — *simpler*
> - **c)** Not sure — pick whichever is sane

Both capture the same requirement. Only the second can be answered by the person who
actually knows the answer.

## Notes
- This phase is a conversation — never guess at what the developer wants. Internal
  mechanism, by contrast, is yours to decide (see § Asking questions).
- Lock decisions under "Assumptions & resolved questions" so they aren't re-litigated later.
- Do **not** commit `.jig/` here — Intake runs on the base before the feature branch exists.
  Its writes ride onto the branch at Implement and fold into the first commit (see SKILL.md
  § Committing `.jig/` state).
