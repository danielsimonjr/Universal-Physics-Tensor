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
kind searchable, or it should say which kinds it can serve.

## 2. Contract

Two lists stay separate.

- **Product A wrappers.** `scanFrontier` projects link candidates,
  isolated-bridge connectors, and empty regime pairs. Every wrapper has
  `searchable: false`. `problemFromResidualGap` refuses `relation-link`
  and `regime-transition`. The text points at `upt discover`.
- **Expression search templates.** One template per applied case. The id is
  `fg-expr-` plus the case id, but a template is not a detected residual: it
  has no observations or baseline predictor and therefore is not a
  `FrontierGap` or a `prediction-residual` gap and is not searchable. The
  template list is concatenated after the wrappers for presentation, so the
  wrapper list's own length does not change when a case is added. A future
  `prediction-residual` entry is searchable only when its problem file
  supplies the named baseline and dataset required by the scanner contract.

`upt probe scan` defaults to the searchable list. `--all` prints wrappers and
templates. A template is an index entry for authoring a problem file; it is
not evidence that a residual has been observed and cannot be passed to
`upt probe run`.
`--searchable-only` is the default and is rejected together with `--all`.
A scan that has entries and none of them searchable prints the warning that
names the zero, points at `upt discover`, and points at
`upt probe run --problem=FILE`. That warning is the wording for a scan
that really has no searchable gap, including the current catalog scan whose
case entries are only templates.

`upt probe show <id>` reads the combined list, so an expression-template id
and a wrapper id both resolve. A template and a wrapper both say they are not
searchable.

`upt probe run` still requires a problem file. An expression template is a
typed handle and a summary. It does not carry a dataset, a target
dimension, or a governing set. Listing it does not start a search and
does not fit a formula. The user writes the problem file, as the help
already says.

JSON for a scan reports `total`, `searchable`, and whether the result is
the searchable list or the combined list. Text for the default scan names
how many non-searchable wrappers and templates were hidden.

## 3. What stays refused

- A relation-link gap, a connector, a regime-transition gap, or an
  expression search template does not become searchable under this note.
  Making one searchable is a different design: it would turn a review or an
  index entry into an expression search.
- The expression-template id is not a problem file. The command does not
  invent observations or a baseline predictor for a case.
- No new search grammar, no new operator, and no change to the
  composition table.
- The release tag, the version bump, and publication stay with
  Mothership. This note does not perform them.

## 4. Tests that hold the contract

A drift guard on the catalog graph:

- every wrapper has `searchable: false`;
- every expression template is a separate non-searchable scan entry, not a
  `FrontierGap` or `prediction-residual` gap, and is `fg-expr-<case id>` for
  a registered applied case;
- the exact, duplicate-free set of template ids equals
  `{fg-expr-${id} | id ∈ APPLIED_CASES}`;
- the combined list is the wrappers plus exactly those templates, with no
  other searchable kind; a `prediction-residual` is searchable only when its
  authored problem file has a baseline and dataset;
- the default command output contains the zero-searchable warning until a
  backed prediction-residual is registered;
- `--all` contains a relation-link id and says it is not searchable;
- the zero-searchable warning is tested by calling it directly, so the
  wording remains covered after the live scan is no longer empty.

A new applied case adds exactly one expression template and nothing else. A
change that omits a case, duplicates a template id, or marks a wrapper or
template searchable fails the guard.

## 5. Approval

Approval of this note accepts the contract in §2 and the refusals in §3.
It does not accept a new search, a searchable Product A wrapper, or a
release. Those are separate decisions.
