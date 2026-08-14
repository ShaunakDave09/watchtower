# Agent instructions

## SQL queries (`server/queries.py`)

Write every query directly and fully exposed inside the function that
executes it. Do not extract WHERE-clause/predicate building into a shared
helper function (e.g. no `_dimension_predicates`-style function returning a
list of predicates for multiple callers to join) — that hides the actual SQL
text and makes a broken query harder to find and debug.

- The whole query should be readable top-to-bottom as literal SQL in one
  place, in the same shape you'd hand-write in a SQL client: one predicate
  per line, `AND` aligned under the first.
- Local variables and simple `if`/`query += "..."` blocks are fine for
  predicates that conditionally apply (e.g. a filter that's dropped
  entirely when set to "All") — just keep that logic inside the one
  function, not factored out into something other queries call into.
- Case-insensitive matches: uppercase the value in Python and wrap both
  sides in `upper()` in the SQL (`upper("COLUMN") = upper(%(param)s)`) —
  don't rely on exact `=`, since the same value can appear with
  inconsistent casing across rows.
- Some duplication between similar queries is expected and fine. Don't
  introduce a shared function to remove it. Clean and simple to read/debug
  now beats DRY — that can be revisited later if it's ever actually needed.
