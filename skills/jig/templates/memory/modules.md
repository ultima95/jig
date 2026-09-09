# Modules

<!-- jig:memory-placeholder — `/jig init` (Phase 0) overwrites this file while this
     line is here. Writing this file by hand instead? Delete this line, and a later
     `/jig memory-refresh` will leave your version alone. -->

Where each part of the codebase lives, grouped by area.

<!-- Group with `## <area>` headings (`apps`, `packages`, `src/services`, …) so this
     file stays scannable as it grows, and a spec can cite a stable anchor such as
     `modules.md#apps`. One line per module: path in backticks, then its job. Keep it
     to a clause — anything longer belongs in Architecture or Risks. -->

## _area_

- `_path/to/module_` — _what it is responsible for_

## Where new code goes

_The routing rules a newcomer would otherwise have to guess. One line per case._

- _e.g. a new HTTP endpoint → `apps/api/src/routes/`, with its logic in `services/`._

## Testing notes

_Per-area gotchas about running or writing tests — fixtures, required services,
anything that has already cost someone an hour._
