# Atlas Phase 5 — design note (L5.1): the invalid-bridge benchmark

Authorized by the Sprint 5 entry in [`ACTIVE.md`](../../ACTIVE.md). Briefs:
[`Atlas-Roadmap-Implementation-Plan.md`](Atlas-Roadmap-Implementation-Plan.md) §Sprint 5.

## 0. The independence wall — read this first

**No agent authors a frozen benchmark item.** That is how the loader behaves. It is not a
blocker: the owner dropped the human study on 2026-10-01. The sentence covers this session,
every subagent, and every local model. Agents build the harness, the loader, the leakage checks, the scorer
plumbing, the statistics and the pre-registration template. They may draft candidate items
ONLY into `tests/fixtures/atlas/benchmark/contested/`, with `authorship: 'contested-draft'`.
The loader refuses any frozen item whose authorship is not `'independent'`.

The consequence must be stated before any code exists, or the harness will be mistaken for
the study. **The human study is not a ROADMAP exit criterion** (owner, 2026-10-01). Held-out
family and the pre-registration thresholds remain what the harness froze. Two raters and
authors who have not read `src/atlas/` are how the set was filled. Neither is an exit
criterion. The harness
fixes the held-out family, freezes the thresholds and makes everything else mechanical; it
cannot supply the items or the ratings. Authors and raters may be people, or model instances
launched with no tools, no repository access and no shared context
(`scripts/atlas-benchmark-models.mjs`). Model roles are recorded as models, per call, with the
launch's isolation record, and model-rater κ is reported as model agreement, never as human
inter-rater reliability. The pre-registration note names who authored and rated the set.

## 1. The eight failure kinds

One worked example each. **These are TAXONOMY ILLUSTRATIONS, not benchmark items.** They
appear in this design note, which the independence rule forbids as a source for frozen items,
so none of them may be frozen.

| Kind | Worked example |
|---|---|
| `omitted-premise` | "Spring ↔ LC is exact" stated for the DAMPED pair without the side condition b/√(mk) = R√(C/L). The equivalence holds only on that condition (`ab-damped-rlc`). |
| `domain-violation` | Using the small-angle period 2π√(ℓ/g) at θ0 = 2 rad, far outside the θ0 ≤ 0.5 domain of `ab-pendulum-linear`. |
| `convention-mismatch` | Composing a first-law step written dU = Q − W with one written dU = Q + W, with no sign conversion. |
| `notation-collision` | Reading `k` as a spring constant in one premise and as a wavenumber in the other, so ω² = k/m silently becomes ω² = (wavenumber)/m. |
| `dimensional-coincidence` | Promoting two quantities to a bridge because they share a dimension (both L²T⁻¹: kinematic viscosity and a diffusion coefficient), when no mechanism connects them. |
| `non-uniform-limit` | Presenting the small-angle pendulum as uniform in time. At θ0 = 0.2 the phase drift reaches π/2 after about 100 cycles (W7b). |
| `false-inverse` | Presenting quantization as the inverse of the classical limit. Deformation quantization is not a left inverse of ħ → 0, because operator ordering is lost. |
| `analogy-promoted` | Promoting the cubic spring ↔ LC ANALOGY to an exact equivalence. The cubic spring keeps the group βx0²/k, and LC has nothing to match it (the Sprint 0 rejection `ax-cubic-spring-lc`). |

## 2. The item schema

```ts
interface BenchmarkItem {          // the PUBLIC half: no answer
  id: string;
  premises: string[];               // model descriptions, prose
  conclusion: string;
  claimedRelation: RelationType;
  family: string;                   // 'fluid-statics' for the held-out split
  split: 'in-distribution' | 'held-out';
  expr: ExprNode;                   // the claimed relation, for the leakage check
  renamedVariant?: string;          // id of the item this one renames
  authorship: 'independent' | 'contested-draft';
  source: string;                   // where the item came from (erratum, misconception, textbook)
}

interface ItemLabel {               // the SCORER half: the answer
  itemId: string;
  kind: 'valid' | 'invalid';
  failureKind?: FailureKind;        // REQUIRED iff kind === 'invalid'
}
```

The public half (`public/items.json`) never carries the answer. The label (`accept`, `reject`
or `abstain` expected, plus the failure kind a correct rejection names) lives in `scorer/`,
and no `src/` file may read `scorer/` (import-guard test, with a positive control).

## 3. Leakage — CORRECTION to the plan

The plan says renamed-variable variants "are detected as the same item by normal form".
**`normalForm` cannot do that, as measured:** it keys symbols by NAME, so `x/t` and `y/s` give
`/(sym:x,sym:t)` and `/(sym:y,sym:s)`, which are not equal. A leakage check built on it as
briefed would miss exactly the renamed variants it exists to catch.

**As built:** `leakageKey(expr)` renames every dimensioned symbol to its DIMENSION signature
before `normalForm`. Two items that differ only in variable names therefore collide. The rule
over-merges in one direction: it also merges genuinely different quantities of the same
dimension. **That direction is chosen on purpose.** For leakage, a false collision gets flagged
and reviewed, and a missed one contaminates the study. Dimensionless stubs keep their names,
because `normalForm` already tags them.

## 4. The held-out family — CORRECTION to the plan: fluid statics, not first-order relaxation

The plan fixes the held-out family as **first-order relaxation** on the premise that it is "not
encoded under `src/atlas/` by Sprint 4". **That premise is false, as measured.** Phase 0 encodes
`model-first-order` (`b x′ + k x = 0`), the conclusion of the singular limit
`ab-damped-massless`. That model IS the abstract first-order relaxation ODE, and RC discharge,
Newton cooling and radioactive decay are relabellings of it. Scoring the atlas on that family
would score it on structure it already contains, which is precisely the leakage the rule
forbids.

**Held-out family, as built: FLUID STATICS** — hydrostatic pressure p = p₀ + ρgh, Archimedes'
buoyancy, Pascal's principle, and the isothermal barometric formula. The measured footprint in
`src/atlas/` is zero: `hydrostat|buoyan|archimed|bernoulli|poiseuille` matches nothing.
Candidates were rejected for measured reasons. Orbits: poster statement 12 is universal
gravitation. Optics: 6 matches. Ideal-gas processes: 5 matches, and the adiabatic EOS is a
wave-family model. Circuits: 9. Electrostatics: 25. Steady viscous and inviscid FLOW was also set
aside by judgement, because it borders `model-stokes-drag` and `model-euler-linear` even where
no keyword matches.

`tests/atlas/benchmark.test.ts` pins the absence by scanning every model id, dynamics string and
bridge id across `ATLAS_FAMILIES`. A **positive control** runs the same scan with the ORIGINAL
family's marker and confirms it finds `model-first-order`. That marker was chosen after the leak
was known, so the control proves that the matcher fires; it does not prove that the original
marker list would have caught the leak. **Fluid statics must never be added to `src/atlas/` while the
benchmark is live.**

## 5. Pre-registration

The template lives at `docs/research/atlas-benchmark-preregistration.md` (S5.5). All six
Blueprint §7.3 criteria are written there before any condition runs: false promotion = 0;
invalid-bridge rejection against the best LLM baseline, with a paired 95% interval excluding
zero; recall at depth 10 against embeddings; abstention reported; practical value; and
curation cost. The note is committed with the hash of the frozen item set, and every change to
the set is an amendment that records the new hash. No condition may be scored against an empty
set and reported as a result.

## 6. The atlas condition (S5.2) — as built

`src/atlas/benchmark/run-atlas.ts` applies the applicability checker, the composition table and
the regime check to each item.

- **reject** when an instrument demonstrably fires. The triggers are a blocking applicability
  finding, a chain OVERCLAIMED as an exact equivalence, a structural analogy promoted to an
  equivalence, and a regime inequality that was checked and violated.
- **accept** ONLY when every instrument RAN and CLEARED. Absent side conditions, an absent or
  empty regime, an unchecked inequality, a `question` finding, or a chain the table declines all
  force abstention. This is S4.1's principle carried over: "no rule fired" is weaker than "valid".
- **abstain** otherwise, as a first-class outcome.

To support this, the item schema gains OPTIONAL machine fields: `sideConditions`,
`conventions`, `composedFrom` and `regime`. An item that omits one leaves that check unrun.

**Composition is strength-aware.** The table's non-declined results are exact-equivalence,
derivation, restriction and coarse-graining. The only implication asserted is exact-equivalence ⇒
derivation, so exact ∘ exact claimed as a derivation clears. A chain claimed as an EXACT
EQUIVALENCE that composes to something weaker is an overclaim. Through a restriction it maps to
`omitted-premise`, because the restriction's condition was dropped. Otherwise it maps to
`false-inverse`, because the claim asserts an inverse the one-way step lacks. Any other mismatch
is a question, never a rejection. A weaker claim that is still true must not be punished.

**Failure-kind naming is a mapping, and it is only as good as the mapping.** Dimensional
inconsistency is reported as `notation-collision`, its commonest cause. The scorer grades
"rejected" and "named the right kind" separately (S5.3).

## 7. Baselines (S5.3) — as built

`src/atlas/benchmark/baselines.ts` holds three deterministic retrieval baselines, in rising order
of structure: word-token Jaccard, symbol-name Jaccard, and typed structural search. The
structural search ranks an exact leakage-key match first and breaks ties on symbol overlap.
`recallAtK` scores them. Every ranking breaks ties on the reference id, so a rerun cannot
reorder a tie across the depth cut. A query with no ranking counts as a MISS in the
denominator. An answer key with no correct reference throws, and an empty truth set yields NaN,
never a flattering number. The tests pin the point of the ladder: symbol matching misses a
renamed claim, and structural search finds it.

`backend-shapes.ts` holds only the request and response shapes for embeddings and LLMs, which run
out of process through the probe's NDJSON worker protocol. It also holds a strict parser: **a
malformed response is an error, never a default**. An outcome defaulted to `abstain` would credit a
broken worker with the benchmark's preferred behaviour.

## 8. Statistics and power (S5.4) — as built

`src/atlas/benchmark/stats.ts` holds the statistics. **Every value was checked against a number
computed independently of the code:**

- Wilson: 48/60 → [0.682, 0.882] and 160/200 → [0.739, 0.850], the plan's textbook values.
- McNemar on b = 10, c = 2: χ² = 49/12 and exact p = 158/4096, both hand-computed.
- Cohen's κ on [[20, 5], [10, 15]] = 0.4, hand-computed.

**Newcombe's method 10** (Statistics in Medicine 17, 1998, 2635) gives the PAIRED difference
interval that the pre-registered "95% interval excluding zero" criterion needs. It is checked
against all 18 rows of the paper's Table III, to half a unit in the fourth decimal. Row 1/97/1/1
is held to one unit, because there the table disagrees with its own definition by one unit. Two
controls show the check can fail: method 8's values, and a wrong z. It is also pinned by
properties: the interval contains the point difference; it is antisymmetric when the two methods
swap; with φ = 0 it reduces exactly to the unpaired square-and-add of the two Wilson intervals;
and it separates a clearly better method on 60 paired items but not an even split. The properties
alone do not detect a mutant with the φ continuity correction removed. The published values do.

**The power report is the honest line.** At 0.8 accuracy, 60 items per class give ±10.0 points
and 200 give ±5.5. Unpaired intervals therefore cannot separate methods closer than about 20 or
11 points; the paired McNemar design is what narrows that gap. Wilson returns the analytically
exact endpoints 0 and 1 at x = 0 and x = n, rather than 0.9999999999999999.

## 9. The study (Phase 6, S6.1) — as built

`scripts/run-atlas-study.mjs` (`bun run atlas:study`) loads the frozen items and the answer key.
It runs the in-process conditions, scores each with `scoreCondition`, compares the atlas against
every other condition on the SAME invalid items with `pairedRejection` (Newcombe interval plus
McNemar), and writes `docs/research/atlas-study-results.md` with its reproducer command.

- **Empty frozen set ⇒ exit 3, and nothing is written.** This was measured on the committed tree.
  A results file from zero items would carry a table that reads like a measurement.
  `scoreCondition` throws on an empty key for the same reason.
- Unanswered items are COUNTED as wrong, never dropped. A wrong-kind rejection counts as rejected
  but not as kind-correct. Wrong accepts, abstentions and non-answers are separate columns.
- `scripts/atlas-benchmark-llm-local.mjs` runs local models from
  `tests/fixtures/atlas/benchmark/conditions/llm-local.config.json`.
- `scripts/run-atlas-study.mjs` scores a model's answers only when the file exists and covers
  every frozen item. A missing file or an unfinished item is not scored.
- Embeddings still have no in-repo worker.
- The numeric outcome of criterion 2 lives in `docs/research/atlas-study-results.md` and `NOTES.md`.

## 10. The ablation (Phase 6, S6.2) — as built

There are four cumulative configurations of the atlas runner (`ABLATION_CONFIGS`): **types only**,
**+ assumptions**, **+ dimensions & conventions**, and **+ regimes**. An applicability finding is
assigned to the instrument that produced it, so each layer switches on independently. Accept only
when every enabled instrument ran and cleared and at least one instrument ran. If no enabled
instrument applies, the outcome is abstain.

`scoreAblation` scores each row and pairs it against the row before it on the same invalid items.
The tests pin that four items, each built to be caught by exactly one layer, are rejected
cumulatively as 1, 2, 3 and 4.

**A defect avoided in the same change:** `runAtlasCondition` used `items.map(runAtlasOnItem)`.
Once the function takes a config, `map` passes the array INDEX as that config. It is now an
explicit lambda, and a test pins that the two paths agree.
