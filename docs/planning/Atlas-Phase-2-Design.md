# Atlas Phase 2 — design note (Sprint 2: regimes and error-carrying paths)

**Status:** draft for Adam vet A2. Authorized by the Sprint 2 promotion in
[`ACTIVE.md`](../../ACTIVE.md).

**Goal.** Make *"at my operating point, which models are valid, and where does each stop"* a
query, and make path error a computed bound rather than prose.

---

## 0. The invariant this sprint is most likely to break, stated first

**The GR spine re-expression must leave every confrontation number unchanged.**

Sprint 2 re-expresses general-relativity validity conditions in dimensionless form (`r_s/r`,
`v/c`). That is a change of *description*, not of *physics* — so every number produced by
`listConfrontations()` and every GR test value must be **bit-identical** before and after.

This is the load-bearing invariant because it is the one that can break **silently**: a
re-expression that is subtly wrong still returns plausible numbers, still passes a smoke test, and
is only caught by comparing against the previous values. So it is pinned, not read:

- Capture every confrontation's numeric output **before** any Sprint 2 edit, as a committed golden.
- Assert equality **after**, with the golden in the repository rather than in an agent's memory.
- A tolerance is NOT acceptable here. The claim is "the description changed and the physics did
  not", and any nonzero delta falsifies it.

Sprint 0 lost time to a plan's arithmetic error that produced a confidently wrong test; this is the
same class, and a golden captured first is the only instrument that catches a regression in what
those numbers already cover.

### ⚠ THE GOLDEN IS NECESSARY AND **NOT SUFFICIENT** (Adam A2 RED)

I built this gate to answer "could this result have come out any other way?" and then failed to ask
it of the gate itself. **A bit-identical comparison proves the re-expression behaves identically
only on the subspace of physics those 19 confrontations span.**

Adam's failure mode, which is concrete and would be invisible here: suppose the re-expression
introduces a spin-dependent group whose correct condition is `f(a/M) < 1`, and it is implemented as
`f(a/M)² < 1`. **If all 19 confrontations are non-spinning (`a = 0`), both forms evaluate
identically** — `f(0) < 1` and `f(0)² < 1` — so the golden stays bit-for-bit identical while the
condition is catastrophically wrong for any Kerr case. The gate cannot see an error in a direction
its inputs never travel.

**So the golden is a regression gate, not a correctness proof, and it is labelled as one.** Every
new or re-expressed inequality additionally gets a **per-inequality unit test** exercising it
directly at three points: just inside the bound, just outside it, and exactly on it. Those tests
are what establish correctness; the golden only establishes that nothing already covered moved.
A boundary test is also where an `op` confusion (`<` vs `<=`) surfaces, which no full-system
confrontation would reveal.

---

## 1. `Regime` and `ValidityDomain` — two different claims, not one claim twice

| | `ValidityDomain` (shipped) | `Regime` (Sprint 0) |
|---|---|---|
| Form | `description: string` + `predicate: (inputs) => boolean` | `family` + `inequalities` over π-groups + `groupDefinitions` |
| Evaluates over | **raw named inputs** | **dimensionless groups** |
| Readable by a machine | No — an opaque closure | Yes — declarative inequalities |
| Traceable to the dimension matrix | No | Yes, keyed by `PiGroup.formula` |

**They coexist. A regime NEVER silently replaces a predicate.** This is the sprint's second
absolute rule, and the reason is not stylistic:

- A `predicate` is an arbitrary closure. It may encode conditions **no π-group captures** —
  positivity, integer-ness, a branch cut, a domain exclusion. Replacing it with a regime would
  discard those *invisibly*, because the resulting object still type-checks and still answers.
- A `Regime` carries traceability a closure cannot. Losing it would give up exactly what makes the
  regime queryable.

**Rule.** When both are present, `evaluateEdge` checks the `predicate` exactly as it does today,
and **additionally** evaluates `regimeHolds`. When only one is present, behaviour is unchanged from
today. There is no migration, no deprecation, and no code path in this sprint that reads a regime
*instead of* a predicate.

**The composition is logical AND, stated explicitly (Adam A2 YELLOW).** My first draft said
"additionally evaluates", which is not a specification — a reader had to guess what happens when
the two disagree, and Adam is right that a silent assumption is a future bug. Worse, the most
likely wrong guess is that the regime check *supersedes* the predicate when π-groups are supplied,
which is exactly the silent replacement §1 exists to prevent.

> The validity domain is satisfied **iff** `predicate(rawInputs) === true` **AND**
> `regimeHolds(piGroups) === true`.

A `'unknown'` from `regimeHolds` is therefore not satisfaction, by the same AND. Disagreement needs
no precedence rule because neither side wins: both must hold.

**The interface boundary that follows, and it must be explicit:** a regime is stated over π-groups,
so *someone* must compute group values from raw inputs. This sprint does **not** do that
computation implicitly inside `evaluateEdge` — inferring group values from raw inputs would be a
silent, lossy guess at the mapping. The caller supplies them.

### ⚠ ABSENT IS NOT SATISFIED — the first draft of this rule was unsound (Adam A2 RED)

I wrote "an absent group value is unknown, and unknown is *not* a violation", reasoning by analogy
to the conventions asymmetry Sprint 1 settled. **That analogy is false and the rule it produced
creates a silent pass.**

Adam's failure mode: a regime requires `Re > 2000` AND `Ma < 0.3`. A caller supplies `{ Ma: 0.1 }`
and — through a bug or an omission — never computes `Re`. The `Ma` check passes, the `Re` check is
SKIPPED because the value is absent, and the system concludes **the regime holds** — when `Re` may
have been 50, a gross violation. The caller's omission of the very data that would have revealed
the violation is what produced the confident pass.

**Why the conventions analogy does not carry.** Convention silence is a *meta*-question — which
convention a record was written in — and two records that never declare one are genuinely not in
conflict. A regime inequality is a **direct physical constraint**. Treating absence of evidence for
a constraint as evidence of its satisfaction is unsound, and the fact that both cases involve
"missing data" is a surface resemblance, not a shared structure.

**Corrected rule.** `regimeHolds` does NOT return a boolean. It returns a tri-state:

| Result | Meaning |
|---|---|
| `true` | every inequality was CHECKED and satisfied |
| `false` | at least one was checked and VIOLATED |
| `'unknown'` | at least one could not be checked, because its π-group value was absent |

`evaluateEdge` treats `'unknown'` as **a failure to confirm validity**, never as validity. The
conservative default is the point: a caller who supplies nothing gets `'unknown'`, not a pass.

---

## 2. Uniformity is not a construction-time throw

Sprint 0 established that an approximation's error may be **non-uniform** — the pendulum's phase
error grows without bound in time while its period error stays small. A bound with no statement of
what it is uniform *in* has not been analysed.

The first draft **enforced a uniformity statement at construction** — throwing, like
`MissingHorizonError` — on the reasoning that a validator running "later" can be skipped. That
conflates recording a `(K, δ)` with having finished the analysis of what it is uniform in. Under a
construction-time throw a researcher cannot record a derived bound until that analysis exists, so
they withhold the data or supply a placeholder, and a placeholder reads as an analysis.

**Contract.** `ApproximationBound.uniformity` is `readonly string[] | null`. `null` and `[]`
both mean not yet analysed: an empty list is a universal over nothing and must not count as an
analysis. Admission does not throw for that state, so a derived `(K, δ)` can be recorded before
the uniformity analysis exists. `propagateUncertainty` does not implement this gate.

`boundPath` (`src/atlas/path-bound.ts`) is the path gate. After the relation gate, and before
Lipschitz arithmetic, a bound whose `uniformity` is `null` or `[]` returns
`{ kind: 'no-claim', reason: 'uniformity-unanalysed' }` and no number. An edge with no `bound`
does not fail this gate. A non-empty `uniformity` names what the error is uniform in; it does not
by itself make the relation compose.

---

## 3. Path bounds: `(K, δ)` composed along a route

`(K, δ)` composition along a path is `boundPath` (`src/atlas/path-bound.ts`) / `composeBoundPath`
(`K₂K₁` and `K₂δ₁ + δ₂`). `propagateUncertainty` (`src/composition/uncertainty.ts`) is not that
operation. It propagates input sigmas through an edge. A deterministic `delta`, when a bound is
supplied, is reported beside `sigma` and is not folded into it.

1. **A path containing any edge whose relation composes to `'no-composite-claim'` has NO bound.**
   `boundPath` returns an explicit no-claim, never a number, and it does so at the relation gate,
   before Lipschitz arithmetic. A composed number over an undefined composite would be the most
   dangerous output this library could produce: precise-looking and unfounded.
2. **`ApproximationBound.norm` is a mandatory `string` from Phase 0.** Phase 2 does not add
   `norm?`. Phase 2 did not widen the composition table. Widening remains the reviewed act in §4:
   fail the pinned `'no-composite-claim'` count first, assert each new cell, and name the edge field
   that licenses it. `docs/planning/ADR-transported-norm-composition.md` is the one widening made
   that way.

---

## 4. Widening the composition table is a reviewed act

`norm` was already a mandatory string, and that fact does not widen the table. Any widening
must:

- fail the **pinned cell-count test** first (the `'no-composite-claim'` cells of the 64, pinned in
  `tests/atlas/composition-table.test.ts`), so the change is visible;
- assert each newly-defined cell individually, because — as Phase 1 learned when a demotion and an
  addition cancelled — **a count pin does not detect a swap**;
- state which edge field justifies the widening. A cell defined without the data that licenses it
  is a false claim wearing a table.

---

## 5. Out of scope, deliberately

- No change to `status`, `EdgeConfidence`, or any existing confrontation value.
- This sprint adds no new export on `src/index.ts`. Phase 6's API review
  ([`Atlas-API-Review.md`](Atlas-API-Review.md)) later promotes Tier 1 as the `atlas` namespace
  from `src/atlas/public.ts`, re-exported from `src/index.ts`.
- Row and edge counts stay 55 / 41.
- No migration of any `ValidityDomain` to a `Regime`.

---

## 6. Adam A2 verdict (Gemini 2.5 Pro, 2026-09-21) and dispositions

**Two RED, two YELLOW. All four accepted; all four changed the design before any code existed.**

| # | Finding | Verdict | Disposition |
|---|---|---|---|
| 1 | **The golden is necessary but NOT sufficient.** It proves identical behaviour only on the subspace the 19 confrontations span; a spin-dependent error is invisible if every one of them has `a = 0`. | **RED** | **Accepted.** Golden relabelled a REGRESSION gate; correctness now rests on per-inequality boundary tests (inside / outside / exactly on). See §0. |
| 2 | **"Absent ⇒ unknown ⇒ not a violation" is a silent pass.** A caller omitting `Re` gets a confident hold while `Re = 50` grossly violates. The conventions analogy is a surface resemblance: convention silence is a meta-question, a regime inequality is a direct physical constraint. | **RED** | **Accepted.** `regimeHolds` becomes tri-state; `'unknown'` is a failure to confirm, never validity. See §1. |
| 3 | "Additionally evaluates" is not a specification; the likely wrong guess is that the regime supersedes the predicate — the silent replacement §1 forbids. | YELLOW | **Accepted.** Composition stated as logical **AND**. |
| 4 | Uniformity at construction blocks recording a real bound whose uniformity is not yet analysed, forcing a placeholder — a lie that reads as an analysis. | YELLOW | **Accepted.** No construction-time throw. `uniformity` is `readonly string[] \| null`; `null` and `[]` mean not yet analysed. The refusal is `boundPath`'s `'uniformity-unanalysed'`, after the relation gate and before Lipschitz arithmetic. It is not inside `propagateUncertainty`. See §2. |

**What I got wrong, and the shape of it.** Both REDs are cases where I applied a rule that was
right *somewhere else*. The golden was the instrument I built to answer "could this have come out
any other way?" — and I never asked it of the gate. The absent-is-unknown rule was Sprint 1's
conventions asymmetry, reused on a situation with different structure. **A correct rule carried to
the wrong context is harder to catch than a wrong rule**, because it arrives with a track record.

## 7. Open items originally put to Adam (A2)

1. **§0 is the priority.** Is a committed golden of every confrontation number, compared with zero
   tolerance, sufficient to catch a wrong GR re-expression — or is there a way for the
   re-expression to be wrong while leaving all current numbers unchanged? If the latter, the
   golden is necessary but not sufficient and I need to know what else to pin.
2. Is "the caller supplies group values, absent ⇒ unknown ⇒ not a violation" right, or does it let
   a genuinely-violated regime pass silently as unknown? Compare with the conventions asymmetry
   Sprint 1 settled, and say whether the two cases are actually alike.
3. Does keeping `predicate` and `Regime` side by side create a way for them to **disagree**, and if
   so what should `evaluateEdge` do? I have deliberately not defined a precedence — say whether
   that is a hole.
4. Is enforcing uniformity at admission right, or does it make some legitimate bound
   unconstructible?
5. Anything I have not asked about — particularly anywhere this note assumes Sprint 0's `Regime`
   fits a purpose it was not designed for.
