# Atlas Phase 1 — design note (Sprint 1: relation contracts as an additive overlay)

**Status:** draft for Adam vet A1. Authorized by the Sprint 1 promotion in
[`ACTIVE.md`](../../ACTIVE.md).

**Goal.** Carry the Sprint 0 pilot's relation vocabulary onto the existing records as optional
overlay fields (`relation`, `conventions`, `counterexamples`, `regime`), without changing the
behaviour of any record that does not opt in. The overlay does not change `status`. The catalog
stays 55 rows and 41 edges.

**The one-sentence contract of this sprint:** a `BridgeEdge` or `BridgeEquationEntry` with no
overlay field must behave byte-identically to today. If that is ever false, the sprint has failed,
whatever else passes.

---

## 0. ⚠ A CONTRADICTION INSIDE THE IMPLEMENTATION PLAN — resolved here, flagged for Adam

The plan asks for two incompatible things about the same matrix cell:

- **Brief S1.2a** lists among the *defined* rows to test: *"exact∘approximation either order =
  approximation"*.
- **Task L1.1** lists among the four *conservative* rows that must return `'no-composite-claim'`:
  *"exact ∘ approximation needs `K` for the exact map"*.

A cell cannot be both `approximation` and `no-composite-claim`. One of the two briefs would have
produced a test asserting the opposite of the other, and whichever agent ran second would have
"fixed" a passing test to match its own brief. **This is the same defect class that cost Sprint 0
real time — a wrong statement in the specification, not in the code — and it is exactly what the
Phase 0 curation-cost log identified as the true cost driver.**

**My first resolution was WRONG, and the source refuted it. Recording both, because the correction
is the useful part.**

I initially ruled for `approximation`, reasoning that this type system's `exact-equivalence`
carries `IDENTITY_BOUND` (`K = 1`, `δ = 0`), so `composeBounds` is defined and the conservative
row's premise — unknown `K` — does not apply. That reasoning is defeated by a qualifier written
into `src/atlas/error-algebra.ts:13-14`:

> *"An exact equivalence contributes `IDENTITY_BOUND` **in the norms these Phase 0 bridges state**
> — not in every norm (design note §9 YELLOW (a))."*

So `K = 1` is real but **norm-relative**. Composing an exact equivalence with an approximation is
sound only if both are stated in the SAME norm. `ApproximationBound.norm` is a mandatory `string`
from Phase 0. The cell stays `'no-composite-claim'` because the matrix does not define it;
widening the table is the reviewed act in Phase 2 §4, not a new `norm?` field.

**Resolution adopted:**

| Cell | Verdict | Why |
|---|---|---|
| `exact-equivalence ∘ approximation` (either order) | **`no-composite-claim`** | The cell is not in the defined table. `ApproximationBound.norm` is a mandatory `string` from Phase 0. Widening the table is a reviewed act (Phase 2 §4), not a new `norm?` field. |
| `derivation ∘ approximation` (either order) | **`no-composite-claim`** | A `derivation` carries no bound at all. |

**Brief S1.2a is therefore the incorrect one** and must not be implemented as written; L1.1's
conservative row stands. But L1.1's stated *reason* — "needs `K` for the exact map" — is also
imprecise: `K` is known. The difference matters because it names the fix: the norm has to be on
the bound, and `ApproximationBound.norm` is already a mandatory `string` from Phase 0. The cell
stays `'no-composite-claim'` until the table is widened by the reviewed act in Phase 2 §4.
Adding `norm?` does not define the cell. "Unknown `K`" would have suggested the wrong remedy.

**Adam: attack this anyway.** I reversed myself once here already. The specific question is
whether norm-relativity is a real obstruction or whether the Phase 0 bridges happen to state a
common norm, in which case the cell is definable today with a documented precondition.

---

## 1. Reconciliation — which name survives, and where it lives

`src/atlas/types.ts` becomes the home of the relation vocabulary.
`src/composition/probe/types.ts` keeps `RelationKind` and `AuditState` and **imports nothing from
atlas**. The dependency runs one way or `docs:deps` reports a cycle.

### 1.1 The collision that must NOT be merged

`RelationKind` and `RelationType` both contain the member `'approximation'`, and they mean
different things:

| | `RelationKind` (probe, 9 members) | `RelationType` (atlas, 8 members) |
|---|---|---|
| Answers | what a record **is** | how two records **relate** |
| Arity | one record | an ordered pair of models |
| `'approximation'` means | this statement is itself approximate | model A approximates model B, with a bound and a horizon |

**They are orthogonal and both stay.** Merging them would make "this record is an approximation"
indistinguishable from "these two models are related by an approximation" — and the second carries
a mandatory `ApproximationBound` the first has no room for.

**Mapping rule.** There is no total function from `RelationKind` to `RelationType`, and none is
defined. A record's `kind` never determines its overlay's `relation`. Where both are present they
are independent facts, and a test pins that no code derives one from the other.

### 1.2 Field reconciliation

For each field of the discovery plan's `ScientificRelationRecord` sketch and each field of Sprint
0's `AtlasBridge`, the surviving name:

| Concept | `ScientificRelationRecord` | `AtlasBridge` (Sprint 0) | **Survives as** | Home |
|---|---|---|---|---|
| what relates to what | `source` / `target` | `premises[]` / `conclusion` | `premises` / `conclusion` | `src/atlas/types.ts` |
| the relation | `relationType` | `relation` | `relation` | `src/atlas/types.ts` |
| the map | `mapping` | `transformation` (+ `inverse?`) | `transformation` / `inverse?` | `src/atlas/types.ts` |
| validity | `validityDomain` | `regime` | `regime` | `src/atlas/types.ts` |
| error | `errorBound` | `bound?` (`ApproximationBound`) | `bound?` | `src/atlas/types.ts` |
| what survives the map | — | `preserves` / `doesNotPreserve` | both, unchanged | `src/atlas/types.ts` |
| support | `evidence` | `evidence: ReadonlySet<EvidenceTag>` | **derived, never stored** — see §3 | `src/atlas/derive-evidence.ts` |
| refutation | `counterexamples` | `counterexamples` | `counterexamples` | `src/atlas/types.ts` |
| sign/unit choices | `conventions` | — (absent in Sprint 0) | `conventions` (new) | `src/atlas/types.ts` |

**One overlay, not two.** `RelationContract` is the single discriminated union over the eight
`RelationType` members. There is no second relation record anywhere.

---

## 2. The composition table — a conservative UNDER-approximation of Blueprint v2 §4.2

`composeRelation(first, second)` is a literal 8×8 matrix. **Every cell not named below is
`'no-composite-claim'`.** That default is deliberate: a wrong composite type is a false physical
claim, while `'no-composite-claim'` is merely silence.

### 2.1 Defined cells (8 of 64)

| First ∘ Second | Result | Justification |
|---|---|---|
| `exact-equivalence` ∘ `exact-equivalence` | `exact-equivalence` | Isomorphisms compose; the inverse is the composed inverse. |
| `derivation` ∘ `derivation` | `derivation` | Entailment is transitive. |
| `exact-equivalence` ∘ `derivation` | `derivation` | Relabelling before a derivation leaves a derivation. |
| `derivation` ∘ `exact-equivalence` | `derivation` | …and after it. |
| `coarse-graining` ∘ `coarse-graining` | `coarse-graining` | Discarding twice discards; errors add via `composeBounds`. |
| `restriction` ∘ `restriction` | `restriction` | Narrowing twice narrows. |
| `exact-equivalence` ∘ `restriction` | `restriction` | Relabelling before a restriction is a restriction. |
| `restriction` ∘ `exact-equivalence` | `restriction` | …and after it. **Added on Adam A1 RED.** |

### 2.2 The four conservative rows — named, so widening them is a reviewed act

Each of these has a defensible composite in §4.2 that this sprint declines to encode, because the
edge data that would justify it does not exist until Phase 2:

1. **`analytic-continuation` ∘ X** — valid only if X preserves the analyticity domain. No field
   records an analyticity domain. → `'no-composite-claim'`.
2. **`structural-analogy` ∘ `derivation`** — transports only statements inside the preserved
   structure. `preserves[]` is free text in Sprint 1, not a checkable set. → `'no-composite-claim'`.
3. **`approximation` composed with anything exact** (`derivation ∘ approximation` and
   `exact-equivalence ∘ approximation`, both orders) — see §0. For `derivation` there is no bound
   at all; for `exact-equivalence` the identity holds in the norm a bridge states, and
   `ApproximationBound.norm` is already a mandatory `string`. The matrix does not define the cell.
   → `'no-composite-claim'`. Widening it is Phase 2 §4: fail the pinned silent-cell count first,
   assert each new cell, and name the edge field that licenses it. One order has been widened that
   way: `approximation` then `exact-equivalence` is `'approximation'`, licensed by the exact
   bridge's declared norm transports (`docs/planning/ADR-transported-norm-composition.md`). The
   other orders stay silent.
4. **`X` ∘ `deformation-quantization`** — the classical limit of a quantization is never the
   identity. This is a statement ABOUT the composite, not that the composite is undefined; encoding
   it needs an ħ-order field that does not exist. → `'no-composite-claim'`.
5. **`structural-analogy` ∘ `structural-analogy`** — **demoted from the defined table on Adam A1
   YELLOW.** I had it as `structural-analogy`, reasoning that preserved structure is the
   intersection of the two. Adam's objection is better: **analogy is not transitive.** A analogous
   to B and B analogous to C does not give A analogous to C — the shared structure can dilute to
   nothing across a chain, and the intersection argument assumes a common structure the type does
   not record. The design's own principle decides it: a wrong composite is a false physical claim,
   silence is only silence. → `'no-composite-claim'`.

**The cell count is pinned by a test.** `tests/atlas/composition-table.test.ts` asserts exactly
**56** `'no-composite-claim'` cells of 64 (8 defined), with a comment naming this document. Widening the table
then fails that test and forces a reviewed change, instead of silently growing the set of physical
claims the library makes.

---

## 3. Evidence tags are DERIVED, never stored

`EvidenceTag` values on a catalog row are computed from what the row actually carries, at read
time. No catalog row stores an evidence set, and `derive-evidence.ts` has no write path. A stored
`evidence` set on an atlas record is the separate Phase 0 rule; this derivation does not write it.

| Tag | Derived from |
|---|---|
| `dimension-checked` | a passing dimensional witness exists for the record |
| `symbolically-checked` | a passing symbolic witness exists |
| `numerically-supported` | a passing numeric witness exists |
| `convention-checked` | `conventions` declares **at least one** field AND every field it declares is consumed by a witness — see the exploit below |
| `contradicted` | an unresolved counterexample — one with no `resolvedBy`. `Counterexample` has no `resolvedBy`, so any counterexample counts |
| `proposed` | the fallback when nothing above fires |

`empirically-supported`, `reviewed`, and `unresolved` are members of the `EvidenceTag` union.
This derivation does not emit them. A confrontation entry does not yield `empirically-supported`.

### ⚠ The rule as first written DID invent evidence — Adam A1 RED, confirmed by execution

My first draft said `convention-checked` requires *"`conventions` present AND every field it
declares is consumed by a witness."* Adam attacked it with the empty object, and he is right:

```js
conventions = {}          // present
declared    = []          // declares nothing
witnesses   = []          // no evidence of any kind
declared.every(consumed)  // => TRUE, vacuously
```

I ran exactly this rather than reasoning about it, and it derives `convention-checked` on a record
with **zero witnesses**. A universal quantifier over a possibly-empty set is trivially satisfied,
so the safety rule inverted into a free tag — the one outcome §3 exists to make impossible.

**Fix:** require a non-empty declaration. `conventions` must declare **at least one** field before
the tag can be earned. `tests/atlas/derive-evidence.test.ts` pins the empty-object case explicitly
as a regression, named for this finding.

**The generalizable rule, applied to every other tag here:** any `.every()` in a tag derivation
must be paired with a non-emptiness check, or the tag is free. The other tags survive this audit
because each is an *existential* over witnesses (`some`), which is false on the empty set rather
than true — `convention-checked` was the only universal in the table, and it was the only defect.

**The rule that makes this incapable of inventing evidence:** a tag is emitted **only** when the
artifact it names is present and passing. There is no default-true tag, no tag derived from another
tag, and no tag derived from `reviewStatus`. A record with no witnesses derives exactly
`{'proposed'}` — never `{'reviewed'}`, however much prose it carries.

**Truthful migration.** Existing rows have no overlay, so they derive `{'proposed'}` and nothing
else. **Migration adds no evidence to any existing record.** Any future commit that appears to
raise a row's evidence without adding a witness is a bug, and the coverage report in
`src/atlas/coverage.ts` is what makes it visible: it reports counts BY TAG, so a jump is legible.

---

## 4. BE-35's double status — membership and refutation are different facts

BE-35 appears both in the catalog and in `REJECTED_BRIDGE_ADJUDICATIONS`. Sprint 1 adds no
membership rule for this. It **reuses** the existing precedence in `adjudicateBridgeEntry`
(`src/bridges/membership.ts`): the rejection adjudication wins, and the catalog row is retained
with its rejected disposition. The function reads `REJECTED_BRIDGE_IDS`, the set derived from
those adjudications. The caller passes that verdict in; `deriveEvidenceForVerdict` does not keep
its own rejected-id list.

`adjudicateBridgeEntry` returns three verdicts. Beside `'not-a-bridge'` and `'bridge'` there is
`'unadjudicated'`, returned when either endpoint of `entry.bridges` is `'unknown'`.

Membership and refutation are different facts. A `'not-a-bridge'` verdict does **not** force
`contradicted`. That reading invented a refutation for a row with no counterexample.
`deriveEvidence` runs normally.

- `contradicted` is derived only from an unresolved counterexample (no `resolvedBy`). Today's
  `Counterexample` type has no `resolvedBy`, so any counterexample counts as unresolved.
- `'unadjudicated'` derives `{'proposed'}` only — never `contradicted`, and never a checked tag.
- `'bridge'` runs the §3 derivation.

| Verdict | Derives |
|---|---|
| `'not-a-bridge'` | `deriveEvidence` runs normally. The verdict does not force `contradicted`. |
| `'unadjudicated'` | `{'proposed'}` only |
| `'bridge'` | the §3 derivation |

`tests/atlas/derive-evidence.test.ts` pins all three, using a real catalog entry per verdict
rather than a hand-built fixture, so the test fails if the verdict set ever grows a fourth member.

---

## 4a. Breakage risk of the three optional fields — MEASURED, not assumed

Scout SC1 went unresponsive, so the blocking items were verified directly. Every claim below
carries the command that produced it; the scout's eventual answer is a second method, not the
only one.

| Risk | Finding | Verdict |
|---|---|---|
| Schema rejects new fields | `data/bridge-catalog.schema.json` contains **zero** occurrences of `additionalProperties` (`grep -c` → 0), so there is no `additionalProperties: false`. New optional fields validate. | **Safe** |
| A test pins the edge key set | No test matches `Object.keys(edge)`. The only `Object.keys(...).sort()` snapshots are `public-api-stability.test.ts:68,107`, over the `numerical` and `metric` **module exports**, not over edges. | **Safe** |
| A serializer emits the new fields | No `JSON.stringify` anywhere in `src/composition/*.ts`. | **Safe** |
| Catalog deep-equal | `tests/bridges/catalog-json.test.ts:84` runs `expect(artifact.entries).toEqual(live)` — the committed `data/bridge-catalog.json` against the live registry. | **THE ONE REAL RISK** |

**The rule that follows:** adding the fields to the *interface* is safe, because an absent optional
field is absent on both sides of the deep-equal. Setting `relation`, `conventions`,
`counterexamples`, or `regime` on an existing row is allowed. It changes the live registry
relative to the committed artifact, and `catalog-json.test.ts` fails until `bun run catalog:json`
regenerates it. What stays fixed is the count — `BRIDGE_EQUATIONS` stays 55 rows, `CATALOG_GRAPH`
stays 41 edges — and `status` is not changed by the overlay.

## 5. What this sprint explicitly does NOT do

- Optional overlay fields (`relation`, `conventions`, `counterexamples`, `regime`) may be set on
  existing rows. `BRIDGE_EQUATIONS` stays 55 rows; `CATALOG_GRAPH` stays 41 edges. `status` is
  not changed by the overlay.
- This sprint adds no new export on `src/index.ts`. Phase 6's API review
  ([`Atlas-API-Review.md`](Atlas-API-Review.md)) later promotes Tier 1 as the `atlas` namespace
  from `src/atlas/public.ts`, re-exported from `src/index.ts`.
- No change to `composeEdges` behaviour for operands without `relation`.
- No `Association` semantics beyond a registry of typed pairs — the registry is a container, and
  it makes no composite claims.

## 6. Open items for Adam (A1)

1. **§0 is the priority, and I have already been wrong there once.** `exact-equivalence`
   contributes `IDENTITY_BOUND` only in the norm a bridge states. Is that a real obstruction to
   composing with an `approximation`, or do the Phase 0 bridges in fact share a norm, making the
   cell definable today behind a stated precondition? A wrong answer here either adds a false
   claim or needlessly silences a true one.
2. Does the §2.1 table leave exactly one overlay, with no path from `RelationKind` to
   `RelationType`?
3. Is the §3 derivation rule incapable of inventing evidence? Attack it by trying to construct a
   record that derives a tag it has not earned.
4. Does any brief store derived data on a row?
5. Is BE-35's double status handled without a fourth rule — and is §4's claim about
   `adjudicateBridgeEntry` true of the source?
6. Are the §2.2 conservative rows a genuine under-approximation of §4.2, or does any of them
   silently assert something §4.2 denies?

---

## 7. Adam A1 verdict (Gemini 2.5 Pro, 2026-09-20) and dispositions

**Two RED, two YELLOW. Every one of them changed the design; none was waved through.**

| # | Finding | Verdict | Disposition |
|---|---|---|---|
| 1 | §0 norm-relativity is a REAL obstruction, not over-caution. An exact equivalence is an isometry only with respect to its own norm `N_T`; composing with an approximation stated in `N_A` needs the Lipschitz constant of the transformation **in `N_A`**. | GREEN on the reversal | Kept as `'no-composite-claim'`. `ApproximationBound.norm` is a mandatory `string` from Phase 0. The cell stays undefined until the reviewed widening in Phase 2 §4; adding `norm?` does not define it. |
| 2 | **`restriction ∘ exact-equivalence` was missing.** `A→B` by restriction then `B≡C` gives `C` a restriction of `A`; the logic is symmetric to the `derivation` pair I *did* define both ways, so the omission had no principle behind it. | **RED** | **Accepted — cell added** to §2.1. |
| 3 | **`convention-checked` derived evidence it had not earned** via the empty `conventions` object (vacuous universal). | **RED** | **Accepted — confirmed by execution, not argument**, and fixed with a non-emptiness requirement plus a pinned regression test. See §3. |
| 4 | `structural-analogy ∘ structural-analogy`: **analogy is not transitive**; shared structure dilutes across a chain. | YELLOW | **Accepted — demoted** to `'no-composite-claim'` (§2.2 row 5). The design's own principle decides it. |
| 5 | The `'approximation'` member appearing in BOTH `RelationKind` and `RelationType` is a maintainability hazard, however orthogonal. | YELLOW | **Explicitly ACCEPTED, not fixed.** Renaming either member edits an existing type, which violates this sprint's one absolute constraint (records without overlay fields behave byte-identically). The mitigation stays the §1.1 test pinning that no code maps one onto the other. **Revisit in Phase 6**, when a public-API review is in scope and a rename is no longer a silent breaking change. Recorded here so the acceptance is a decision rather than an omission. |

**Net effect on the table: still 8 defined cells and 56 `'no-composite-claim'`** — the demotion and
the addition cancel. That the pinned count is unchanged while its CONTENT changed is itself a
warning about item 4 of the open list: **a count pin does not detect a swap.** The test therefore
pins the count *and* asserts each of the 8 defined cells individually.

**Cost note for the Phase 1 curation log** (the instrumentation Phase 0 could not supply): design
review found 4 defects before any code was written, 2 of them capable of shipping a false claim.
Consistent with Phase 0's finding that specification quality, not relation type, drives cost.
