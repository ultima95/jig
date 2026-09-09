# Architecture

<!-- jig:memory-placeholder — `/jig init` (Phase 0) overwrites this file while this
     line is here. Writing this file by hand instead? Delete this line, and a later
     `/jig memory-refresh` will leave your version alone. -->

_How the system is shaped, and which shapes are deliberate._

## System summary

_A paragraph: the runtime pieces and how a request flows through them._

## Boundaries

_What is allowed to talk to what, and what must not. One line each._

- _e.g. the web app never queries the database directly; it goes through the API._

## Components

_One bullet per deployable or major runtime piece: name, then its job in a clause._

- _**api** — HTTP layer; owns validation and auth._

## Key flows

_Two or three end-to-end paths worth tracing, in steps. Pick the ones a change is
most likely to touch._

### _e.g. Recording a purchase_

1. _step_

## Non-negotiables

_Decisions that look arbitrary but aren't, each with the consequence of breaking it.
If a reviewer should block a change for violating it, it belongs here._

- _e.g. **Single origin** — splitting the SPA and API across hostnames reintroduces
  CORS and breaks the same-site refresh cookie._
