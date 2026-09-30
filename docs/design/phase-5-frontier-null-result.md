# Frontier and null-result output

Design for one readable account of what the catalog does not connect and
of what was examined and did not become a connection. The release slot is
recorded in `todo.md`. This note is the design. No implementation follows
from the file existing. Approval and what has landed are recorded outside
this file.

This is the discovery-program item whose output is a coincidence-rejection
catalog and a frontier map. It is not the atlas invalid-bridge benchmark,
and it is not a confidence-weighted magnitude gate. Those are different
programs. This note does not reopen either one.

This note does not widen the composition table, add a symbol, edit
`src/canonical`, or change the shape of `--at`.

## 1. Problem

A reader can already ask several commands what might be connected, and
each command answers a different question. `upt candidates` lists
same-dimension pairs and says they are a review surface. The negative
catalog records membership rejections. `upt probe scan` lists frontier
gaps, some of which the probe can search and some of which it cannot.
Confrontations that were dropped stay in notes.

None of those answers is the pair the program asked for: which
proposed connections were rejected, and which connections are absent
together with what would test them. A reader who treats a candidate
list as that pair is misled. A new score that collapses the two
questions into one number would hide the same distinction.

## 2. Contract

Two lists stay separate. Neither list is a verdict and neither list
changes a score.

- **Null results.** A record that was examined and did not become an
  accepted connection. The reason is one the program already states:
  a membership rejection from the negative catalog, a candidate the
  link proposer already labels as not a bridge, or a confrontation
  the registry already marks unconfrontable or data-pending. The
  output quotes that reason. It does not invent a reason, and it does
  not add a verdict value.
- **Frontier.** A connection the catalog does not contain. Each row
  names the two sides and the reason they are not connected, using a
  reason the graph already computes (no shared quantity, no edge, or
  a gap kind `upt probe scan` already emits). If a registered
  observation would test that row, the row names that observation. If
  none is registered, the row says the observation is absent. The
  command does not invent a number, a dataset, or a citation.

The text prints the two headings and the count of rows under each.
JSON carries the two arrays and does not merge them into one array
with a tag that a reader can miss. An empty list is printed as empty.
Silence is not an empty list.

A candidate that is also a frontier row may appear in both lists.
The output does not delete it from one list to tidy the other.

Contested adjudications stay contested. This note does not decide
them. A contested row is absent from the null-result list until an
adjudication exists.

## 3. What stays refused

- No new physics and no new dataset. A missing observation stays
  missing.
- No change to discovery ordering, candidate ranking, probe search, or
  confrontation outcomes.
- No promotion of a coincidence to a bridge, and no demotion of an
  established bridge.
- The composition table, `src/canonical`, sigma, and `--at` are
  untouched.
- The release tag, the version bump, and publication stay with
  Mothership. This note does not perform them.

## 4. Tests that hold the contract

After approval, the tests are the contract. They are not part of this
change.

- A membership rejection that is in the negative catalog appears in
  the null-result list with that record's reason. An established
  bridge that is not in the negative catalog does not.
- A frontier row whose observation is not registered says so, and the
  output contains no invented numeric residual for it.
- A fixture graph with no rejections and no missing edges prints both
  lists as empty. That is the control that an empty buffer is not a
  pass.
- Marking an established bridge as a null result fails the first
  test. Omitting the empty-list text fails the third.

## 5. Approval

Approval of this note accepts the two lists, the refusal to invent an
observation, and the refusal to change a score. It does not accept an
implementation, an adjudication of a contested bridge, or a release.
