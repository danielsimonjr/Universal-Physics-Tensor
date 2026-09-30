# Tier 8 — probe-searchable frontier gaps

Design for what `upt probe scan` offers a person who wants to search an
expression, and for what it refuses to pretend is searchable. The release
slot is recorded in `todo.md`. This note is the design. Implementation
beyond the contract below follows approval of this note. Approval and what
has landed are recorded outside this file.

This note does not widen the composition table, add a Stefan–Boltzmann
symbol, or change the shape of `--at`.

## 1. Problem

`upt probe` is Product B: a bounded search over expressions and residuals.
`upt discover` is Product A: a review of whether two quantities are the
same quantity. The frontier scanner wraps Product A surfaces as gaps so
one command can list them. Those wrappers are relation-link gaps and
regime-transition gaps. They are not expression searches. A scan that
lists only them offers a problem the probe cannot run, and a user who
treats the list as a Product B frontier is misled.

ROADMAP §8 records the finding: the scan should make at least one gap
kind searchable, or it should say which kinds it can serve. Hybrid
retrieval is a different item in that section. Its contract is
`docs/design/tier-11-hybrid-retrieval.md`. This note does not change
that search, its fallback, or its tests.

## 2. Contract

Two lists stay separate.

- **Product A wrappers.** `scanFrontier` projects link candidates,
  isolated-bridge connectors, and empty regime pairs. Every wrapper has
  `searchable: false`. `problemFromResidualGap` refuses `relation-link`
  and `regime-transition`. The text points at `upt discover`.
- **Expression gaps.** One `prediction-residual` gap per applied case.
  The id is `fg-expr-` plus the case id. Each record is a `FrontierGap`
  built from that id and the case title. Its observations are empty.
  `searchable` is true. The list is concatenated after the wrappers, so
  the wrapper list's own length does not change when a case is added.
  Listing the gap is not a fitted residual and is not a problem file.

`upt probe scan` defaults to the searchable list, so the catalog scan
lists the expression gaps. `--all` prints both. `--searchable-only` is
the default and is rejected together with `--all`. A scan that has gaps
and none of them searchable prints the warning that names the zero,
points at `upt discover`, and points at `upt probe run --problem=FILE`.
That warning is the wording for a scan that really has no searchable
gap. It is not the wording for the catalog scan, which lists the
expression gaps.

`upt probe show <id>` reads the combined list, so an expression-gap id
and a wrapper id both resolve. A wrapper still says it is not searchable.
An expression gap says it is searchable.

`upt probe run` still requires a problem file. An expression gap is a
typed handle and a summary. It does not carry a dataset, a target
dimension, or a governing set. Listing it does not start a search and
does not fit a formula. The user writes the problem file, as the help
already says. A named baseline and a dataset belong in that file. The
scan does not invent them.

JSON for a scan reports `total`, `searchable`, and whether the result is
the searchable list or the combined list. Text for the default scan names
how many Product A wrappers were hidden.

## 3. What stays refused

- A relation-link gap, a connector, or a regime-transition gap does not
  become searchable under this note. Making one searchable is a different
  design: it would turn a Product A review into an expression search.
- The expression-gap id is not a problem file. The command does not
  invent observations for a case.
- No new search grammar, no new operator, and no change to the
  composition table. No change to the hybrid-retrieval contract.
- The release tag, the version bump, and publication stay with
  Mothership. This note does not perform them.

## 4. Tests that hold the contract

A drift guard on the catalog graph:

- every wrapper has `searchable: false`;
- every expression gap is `prediction-residual`, `searchable`, and
  `fg-expr-<case id>` for a registered applied case;
- the combined list is the wrappers plus those gaps, with no other
  searchable kind;
- the default command output contains an expression-gap id and does not
  contain the zero-searchable warning;
- `--all` contains a relation-link id and says it is not searchable;
- the zero-searchable warning is tested by calling it directly, so the
  wording remains covered once the catalog scan lists expression gaps.

A new applied case adds one expression gap and nothing else. A change
that marks a wrapper searchable fails the guard.

## 5. Approval

Approval of this note accepts the contract in §2 and the refusals in §3.
It does not accept a new search, a searchable Product A wrapper, or a
release. Those are separate decisions.
