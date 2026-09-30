# Atlas API review (S6.7): what moves from `@internal` to `@public`

Moving a symbol onto the public API is an ADR-level decision, and it belongs to Mothership.
This note originally said the repository was private and unreleased, with no external
dependents, so the call was not owner-level. That premise is false: the repository is
public and published on npm. Whether a public-API change stays a Mothership call is an
open owner decision; this wording fix does not make it. `package.json` stays `0.x`
whatever is decided.

## 0. The starting point

Before this review every atlas symbol was `@internal`, reachable only through the
`universal-physics-tensor/atlas` subpath. The names exported by `src/atlas/index.ts` and by
`src/index.ts` share no name of any kind, so both shapes in §3 are open.

## 1. The criterion

A symbol is recommended for `@public` only when it passes all three tests:

1. **Settled semantics.** The contract has not changed within the last sprint, and no open item
   says it will.
2. **Independent evidence of correctness.** There are tests with positive controls, and the
   design has been reviewed in its own phase.
3. **No hidden coupling to the repository.** It works from the installed package, without
   `data/` artifacts or `tests/fixtures/`.

## 2. Recommendation by tier

### Tier 1 — PROMOTE (revised after the adversarial review, §5)

Only symbols whose contract did NOT change in Sprints 4–6 qualify, which is criterion 1 applied
consistently.

| Symbols | Why they pass |
|---|---|
| Types: `RelationType`, `EvidenceTag`, `LimitCharacter`, `RegimeInequality`, `Regime`, `ApproximationBound`, `Witness`, `Counterexample`, `AtlasRejection`, `AtlasModel` | The vocabulary. Unchanged since Phases 0–3 |
| `MissingHorizonError`, `MissingLipschitzError` | Thrown by promoted functions, so callers must be able to catch them by type |
| `regimeHolds`, `RegimeCheck` | The tri-state contract from Phase 2, unchanged since then |
| `composeBounds`, `composeBoundPath`, `IDENTITY_BOUND`, `BoundPair`, `ComposedPath` | The Phase 2 error algebra, unchanged |
| `composeRelation`, `COMPOSITION_TABLE`, `NO_COMPOSITE_CLAIM`, `CompositionResult`, `NoCompositeClaim` | Phase 3 table lookup, unchanged. `NoCompositeClaim` is included because `CompositionResult` names it |

### Tier 2 — DEFER one release (promising, but new in Sprints 4–6)

| Symbols | Why they wait |
|---|---|
| `checkApplicability`, `ApplicabilityFinding*` | Landed in S4.1, and its side-condition matcher is a shallow prose heuristic by its own documentation |
| `findPath`, `boundPath` | Scoped to ONE family, while bridges now cross families (`ab-kg-oscillator`). Promoting a single-family route API now would freeze a scope that is already too narrow |
| `toCombinedAtlasJson`, `toAtlasJsonLd`, `QudtResolution`, `ATLAS_ID_PREFIX` | Landed in S6.4. The QUDT table is repository data the caller must supply, which fails test 3 |
| `leakageKey` | Correct for its purpose, but it over-merges by design, so it is a leakage key and not a general equivalence |
| `AtlasBridge`, `FormalRef`, `FormalFidelity` | `AtlasBridge` gained `formalRef` in S4.3, and both types were added the same day. That is additive, but criterion 1 says unchanged within the last sprint |
| `deriveEvidence`, `NO_PASSING_WITNESSES`, `ALL_EVIDENCE_TAGS` | `deriveEvidence` gained its `formally-proved` rule in S4.3. Its `symbolically-checked` answer depends on the caller's `passingWitnessIds`, which come from an UNSHIPPED artifact. That is the same repository coupling that defers QUDT below, so promoting it would contradict this review's own rule |
| `ATLAS_FAMILIES`, `toAtlasJson`, `ATLAS_RECORD_SCHEMA_VERSION` | The families went from 1 to 3 and the bridges from 5 to 20 in Sprint 4, and the serializer gained `formalRef` output in S4.6. A public schema version for a format that moved this sprint invites churn |

### Tier 3 — KEEP `@internal`

| Symbols | Why |
|---|---|
| Everything under `benchmark/` (runner, baselines, stats, study, schema) | The benchmark surface is experimental, `runLinkPrediction`'s hypothesis was not supported, and promoting the harness would freeze it |
| `runLinkPrediction` | Its one result did NOT support the hypothesis it tests |
| Witness runners, `WITNESS_REGISTRY`, `runWitnessRegistry`, `artifactPassingWitnessIds` | Coupled to `data/atlas/witness-results.json`, which is not shipped (fails test 3) |
| Per-family constants: `BRIDGE_*`, `*_MODELS`, `*_BRIDGES`, the dimension constants | Content, not API. `ATLAS_FAMILIES` is the stable handle. Individual record names would turn every correction into a breaking change |
| Poster and derivation APIs | Phase 3. The "8 → 12" direction is recorded UNRESOLVED |
| `HELD_OUT_FAMILY`, `HELD_OUT_MARKERS`, `FAILURE_KINDS` | Benchmark internals |

## 3. HOW to promote — the recommended shape

**A namespace, not named root exports.** The recommendation is a `src/atlas/public.ts` facade
that exports ONLY Tier 1, plus one line in `src/index.ts`:

```ts
export * as atlas from './atlas/public.js';
```

The reasons:

- Tier 1 includes generic names (`Regime`, `Witness`, `Counterexample`). None collides with a root export, but
  at the root they would claim those names for the whole package. `atlas.Regime` claims nothing
  outside the namespace.
- The subpath `universal-physics-tensor/atlas` stays the full `@internal` surface for early
  adopters, and the root gets only the audited subset. That keeps two surfaces with two
  stability promises, which is what the `@internal`/`@public` split exists for.
- **The invariant test must be extended first (checked).** `tests/api/public-tag-vs-index-invariant.test.ts`
  recognises `export * from '…'` (its regex is `export\s+\*\s+from`). It does NOT recognise
  `export * as atlas from '…'`, so `@public` tags in the facade would fail it as unreachable until
  its parser learns the namespace form. `public-surface.test.ts` then gains one entry per promoted
  symbol.

**Named root exports**, the alternative, are simpler to import. They trade namespace hygiene for
that and would claim the generic names at the root.

## 4. The decision in §6 was applied

§6 is the decision in force: an additive `atlas` namespace, Tier 1 only, and `src/atlas/public.ts`
is the only public list. Tier 2 stays deferred under §2.

## 5. Adversarial review ("Adam", Gemini 2.5 Pro) and dispositions

The document text was inlined in full, and the reply began with the requested canary token, so it
answered the text rather than a guess.

| Finding | Severity | Disposition |
|---|---|---|
| Tier 1 promoted symbols that changed within the sprint (`deriveEvidence`, `FormalRef`/`FormalFidelity`, `ATLAS_FAMILIES`), which breaks criterion 1 | HIGH | **ACCEPTED.** They moved to Tier 2, and so did `AtlasBridge`, `toAtlasJson` and `ATLAS_RECORD_SCHEMA_VERSION`, on the same rule applied consistently |
| Contradiction: QUDT was deferred for repository coupling while `deriveEvidence` was promoted with the same coupling | HIGH | **ACCEPTED.** `deriveEvidence` moved to Tier 2 |
| The namespace freezes the root name `atlas`, and the invariant test cannot validate the shape yet | MEDIUM | **PARTLY ACCEPTED.** The tooling gap was already stated as a precondition (§3). The name freeze is real but small. Both shapes remain options, and the choice is part of the decision |
| A v0 schema version should not be public in a 0.x library while the format moves | LOW | **ACCEPTED** by the Tier 2 move above |

## 6. The shape, as a rule

- **ADDITIVE.** The public set is one namespace on the root, `export * as atlas from
  './atlas/public.js'`. No existing root export changes.
- **`src/atlas/public.ts` is the ONLY list of the public set.** Its size is derived from that file
  by `tests/api/atlas-public-closure.test.ts` and stated nowhere else.
- **The public set is CLOSED under type references.** No public type may name a non-public one.
  `tests/api/atlas-public-closure.test.ts` checks the whole class by a source-text scan, with
  controls, because the native TypeScript compiler offers no JavaScript API.
- Every declaration in the set is tagged `@public`, and the forward and reverse public-surface
  invariants cover the facade.
