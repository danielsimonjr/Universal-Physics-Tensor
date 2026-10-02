# Atlas Roadmap — subagent-driven implementation plan

> **Status as of 2026-10-02.** This file keeps the counts, names, and pins it was written with. The live split is [`NOTES.md`](../../NOTES.md): ten atlas bridges and fourteen catalog ids (be-12, 16, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63) are Lean kind `bridge` at PhysJS `2e09357f9674bc60b60b378155a1623c27dc7b04`. `formally-proved` means that kind only. BE-13's catalog name is Einstein trace reduction. The gap list is [`docs/planning/Bridge-Gap-Inference.md`](Bridge-Gap-Inference.md). The S4.3 line that `formally-proved` holds iff `formalRef.fidelity !== 'unreviewed'` is the rule this plan specified.

**Executes:** [`ROADMAP.md`](../../ROADMAP.md) (2026-09-20), phases 0–6.
**Baseline:** `universal-physics-tensor@0.45.2`, `master`, suite ≈ 3,700 passing across ~353 files.
**Revision 2**, after an independent adversarial review and a codebase-consistency audit of
revision 1; §9 lists what changed. Nothing in this
document is authorized until the Lead promotes a sprint into [`ACTIVE.md`](../../ACTIVE.md).
Phase 0 is the only sprint specified at brief-level detail on every task; later phases are
specified to the same structure but their briefs are finalized by the Lead after the
preceding phase's Eve report, because each phase's types depend on what the previous phase
measured.

This plan follows the swarm/dev-workflow stage mapping codified in `todo.md` §Conventions:
the **Lead** (orchestrator) owns design notes, plan text, dispatch, all commits, and wrap
artifacts; **implementation agents** execute file-scoped briefs and never commit;
**Adam** (design/plan adversarial vet, pre-implementation) and **Eve** (empirical value-level
verification, post-implementation) are always independent of the authoring agent. Model
mapping for Adam/Eve lives in `todo.md` §Reasoning tier.

**Plan-doc audit note.** `tools/plan-doc-audit` walks `ACTIVE.md` only by
default (`audit.ts` line 341), so the `- [ ]` boxes in this file are inert records, not a
completion ledger. Do not "fix" them; the sprint's `ACTIVE.md` line is the audited ledger.

**Catalog facts every brief relies on** (verified against the tree at 0.45.2):

- Bridge ids are **numbers** (`BridgeEquationEntry.id: number`, `BridgeEdge.beId: number |
  null`, `CONFRONTATIONS: ReadonlyMap<number, …>`). "BE-37" in prose is `37` in code.
- 55 catalog rows (ids 11–65); 41 graph edges over 38 distinct `beId`s (11 and 42 carry two
  edges each; one edge has `beId: null`). **17 catalog rows have no graph edge:** BE-28, 29,
  32, 35, 40, 44, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65. BE-51 and BE-52 **do** have
  edges (`be51Edge`, `be52Edge` in `src/composition/edges/calibration.ts`).
- The set `CLAUDE.md` calls "13 closed-form bridges BE-51/52/55…65" is the **no-AST** set
  (no `BRIDGE_RHS_BY_ID` entry), not the no-edge set, and `tractability_class: 'closed-form'`
  is also set on AST-bearing rows such as BE-11. This plan says "AST-less" for that set.
- 19 confrontations (ids 11, 21, 23, 35, 36, 37, 48, 51, 52, 55, 56, 58, 59, 60, 61, 62, 63,
  64, 65). Of the ten S1.5 audit targets, BE-37 and BE-48 are catalog-status `speculative`;
  the other eight are `established`. BE-35 is **both** confronted (`stringent`) and in
  `REJECTED_BRIDGE_ADJUDICATIONS` (`not-a-bridge`).
- 109 canonical entries; since Sprint 3 `tests/canonical/canonical-count-prose.test.ts` pins
  every prose statement of the number against `CANONICAL_EQUATIONS.length`.
- The named dimension constants the oscillator entries use are **module-local** except
  `FREQUENCY` and `MASS` (`src/dimensional/types.ts`); `SPRING_CONSTANT`, `INDUCTANCE`,
  `CAPACITANCE` are `const … = dim(…)` inside the entry files and cannot be imported.
- A generic RK4 exists: `integrateRK4(system, y0, lambda0, lambda1, steps): number[]` in
  `src/numerical/null-ray-integrator.ts` (`@internal`, final state only, no trajectory).
- There is **no JSON Schema validator** in the tree (the probe's schema test is a
  hand-rolled structural pin of the schema file). There is **no parser-registry stub hook**
  (`src/numerical/formula-registry.ts` has a module-private cache and no reset); the house
  pattern for peer-dependent tests is skip-when-absent plus `tests/peers-required.test.ts`.
- `tests/api/public-tag-vs-index-invariant.test.ts` requires every `@public`-tagged
  declaration under `src/` to be reachable from `src/index.ts` or an `exports` subpath;
  `scripts/package-smoke.mjs` requires every `exports` target to exist in the pack;
  `tests/api/public-surface.test.ts` snapshots the root export keys.
- `tests/cli/*.test.ts` import `runCli` from `dist/cli/main.js`; only `pretest: tsc`
  guarantees `dist/`, so a scoped CLI test run needs `bun run build` first. Bad flag values
  are signalled by throwing `CliError` (main maps it to exit 1); unknown flags are
  `UsageError` (exit 2).

---

## 0. Orchestration contract (applies to every sprint)

### 0.1 Roles and agent types

| Role | Agent type (Claude Code `Agent` tool) | Runs | Owns |
|---|---|---|---|
| Lead | the interactive session | foreground | design note, `ACTIVE.md` line, dispatch, scoped-test runs between waves, commits, CHANGELOG, `todo.md`, `bun run docs:deps`, `bun run catalog:json` / `atlas:json` regeneration, stale-docs gate |
| Scout | `Explore` (read-only) | background, before Wave 1 | pre-flight facts the briefs cite (signatures, fixture formats, pinned counts) |
| Implementer | `general-purpose` | background, one per brief, parallel within a wave | exactly the files its brief lists; scoped vitest; a deviation report |
| Adam | per `todo.md` §Reasoning tier (text-only MCP; inline the design note) | after the design note, before Wave 1 | GREEN / YELLOW / RED on the design note and on every brief |
| Eve | per `todo.md` §Reasoning tier | after the last wave, before wrap | recomputes every numeric claim from first principles; value-blind-test hunt; doc-drift hunt |

### 0.2 Standing rules baked into every implementer brief

1. **Pre-execution verification gate first.** Read the real source files named in the brief
   before writing a test. Never trust an inline snippet in this plan over the source; the
   house lesson (`CLAUDE.md` §Workflow gotchas) is that plan snippets are routinely wrong about
   node kinds, builder names, and fixture shapes. Report every mismatch as a deviation.
2. **File scope is a hard boundary.** Create or modify only the paths under "Owns". If the
   task needs a change outside the scope, stop, write the need into the deviation report, and
   continue with everything that does not depend on it.
3. **TDD with scoped vitest only.** `bunx vitest run tests/<path>` per cycle. Never run the
   full suite (that is the Lead's job at the wave boundary). Never bare `bun test`.
4. **No commits, no pushes, no `git add`.** The Lead is the single writer. Generated
   artifacts (`data/atlas/*.json`, `data/bridge-catalog.json`) are regenerated and committed
   by the Lead at wrap, never by an implementer.
5. **Never fabricate.** A witness that cannot be derived from the cited source is reported as
   `unresolved` with the reason, not approximated. A metadata field whose value is unknown is
   left `undefined` / `'not-yet-audited'`.
6. **Ignore errors in files outside your scope** (parallel agents are editing them).
7. **Deviation report** (mandatory, last section of the agent's final message):
   `Followed as written / Deviated (what, why, evidence) / Blocked (what is needed) /
   Tests added (paths + counts) / Symbols added (for the plan-doc audit) / Measured values
   (every number a tolerance was set against, as measured)`.
8. **ESM `.js` extensions on every relative import.** `tsc` is the pretest; a missing
   extension fails the wave.
9. **A tolerance may be tightened, never loosened.** If a stated expectation cannot be met,
   the witness is reported `unresolved` with the measured value; the Lead re-derives, not the
   agent.
10. **Every new symbol under `src/atlas/` is tagged `@internal`.** A `@public` tag there
    fails `public-tag-vs-index-invariant.test.ts` unless the symbol is reachable from the
    `./atlas` subpath, and nothing atlas-side is public before Phase 6.

### 0.3 Wave mechanics

- Agents in one wave own disjoint file sets and run concurrently on the same working tree
  (house convention; no per-agent worktrees, so nothing needs merging).
- **No brief may import, read, or depend on a file created by another brief in the same
  wave.** Shared helpers, shared types, and shared model registries land one wave earlier.
  A same-wave dependency is a plan defect; report it, do not work around it.
- Between waves the Lead runs `bun run build` and `bunx vitest run tests/atlas` (plus any
  test directories the wave touched), reads every deviation report, spot-verifies at least one
  claim per report against the source (agent reports are inputs, not records), and only then
  dispatches the next wave.
- A wave is not done until every brief's tests pass in isolation **and** together.
- Sprint end, in this order: Eve report → fixes → stale-docs gate (README counts, CONTRIBUTING
  review tasks, the five living `docs/architecture/` docs, `cli/README.md` counts, research
  cross-references, `bun run docs:deps`, regeneration of every committed JSON artifact whose
  source changed) → full `bun run test` → CHANGELOG + `todo.md` + `ROADMAP.md` §7 pointer →
  commit → push.

### 0.4 Invariants no brief may violate (from `CLAUDE.md` and the discovery plan §0)

- No Python; zero hard dependencies; optional peers degrade gracefully. Schemas are
  documentation plus hand-rolled pins (no validator in the tree).
- Nothing new is re-exported from `src/index.ts` before Phase 6. New surface lives on the
  `universal-physics-tensor/atlas` subpath and is `@internal`. Additive optional fields on
  existing public types are allowed.
- `BridgeEquationStatus`, `EdgeConfidence`, `EpistemicStatus`, `VettedCandidate`,
  `AdjudicationVerdict` are never replaced or adapted into one another. The overlay never
  changes a row's `status` (BE-37 and BE-48 stay `speculative`).
- `upt discover`, `candidates`, `ground`, `connectors`, `predict`, `confront` are frozen verbs.
- The 41-edge `CATALOG_GRAPH` and the 55-entry `BRIDGE_EQUATIONS` do not change shape; the
  pinned funnel counts (132 / 7 / 35 / 20 / 0 / 70) do not move.
- Nothing under `src/` imports a `scorer/` fixture directory (extend the existing import-graph
  guard pattern to `tests/fixtures/atlas/`).
- `src/bridges/index.ts` and `src/composition/edge.ts` import atlas **types only**, and only
  from `src/atlas/types.ts`, never from the `src/atlas/index.ts` barrel: `src/atlas/` imports
  `bridges/*` and `composition/*`, so a barrel import would close a cycle `docs:deps` reports.
- Derived data is never stored on registry rows: `evidenceTags` is computed
  (`deriveEvidenceTags`), never a field on `BridgeEquationEntry` or `BridgeEdge`, because a
  `ReadonlySet` serializes as `{}` and would break `catalog-json.test.ts`'s deep-equal pin.
- Any brief that edits a `BRIDGE_EQUATIONS` row invalidates `tests/bridges/catalog-json.test.ts`
  until the Lead runs `bun run catalog:json`; the brief says so in its report and the Lead
  regenerates at the wave boundary.

### 0.5 Brief template

Every brief below is written in this shape; the Lead pastes it verbatim into the `Agent`
prompt, prefixed with §0.2.

```
BRIEF <id> — <title>
Agent: <type>   Wave: <n>   Depends on: <brief ids from EARLIER waves only>
Owns (create): ...        Owns (modify): ...        Forbidden: everything else
Pre-execution gate: <files to read, commands to run, facts to confirm>
Tasks: <numbered, each with the test to write first and the assertion it makes>
Definition of done: <tests, counts, invariants>
Report: deviation report per §0.2 item 7
```

---

## Sprint 0 — Oscillator pilot (ROADMAP Phase 0, target v0.46)

**Goal.** Five typed bridges, one rejection, fifteen executable witnesses, one complete record,
the `(K, δ)` algebra, and the family's regime records, all under `src/atlas/`, off the public
barrel, with no change to any existing type. Measure curation cost per bridge by relation type.

**The fifteen witnesses (closed list).** `W1, W1a, W1b, W2, W2b, W3, W4, W5, W6, W7, W7b,
W7c, W8, W8b, W9`. Ids `1–9` with suffixes are the Blueprint v2 §6 check ids; `W6` is the
Blueprint's "check 6" (associativity, §4.3); `W7c` is the RK4 cross-check this plan adds
because the Blueprint's `verify_pilot.py` is not in hand and its fifteenth check is
unidentified. The evidence-rule test (S0.6) and Eve (E0) work from this list.

**Entry conditions.** `ACTIVE.md` carries the Sprint 0 line; the design note
`docs/planning/Atlas-Phase-0-Design.md` exists and Adam has returned GREEN or a resolved
YELLOW on it.

### S0.W0 — Lead + Scout + Adam (sequential)

**Lead task L0.1 — design note.** Write `docs/planning/Atlas-Phase-0-Design.md` fixing:
the `src/atlas/` module layout below; the type set (§S0 types) verbatim; the model
registry (§S0 models) with each bridge's `premises` and `conclusion`; the decision that pilot
types are throwaway if Phase 1 disagrees; the curation-cost log format (one row per bridge:
relation type, person-hours authoring, person-hours review, witness count); and the witness
table with the numeric expectations from §S0.W2 below, **as corrected in revision 2** (R = 2
for the RLC match, R = 4 for the counterexample; W8b on velocity; W5 at 1e-4 sup-norm; W9 at
0.5%).

**Scout brief SC0 — pre-flight facts** (`Explore`, "medium" breadth). Return, with file:line:

- Exact export list of `src/dimensional/buckingham.ts` (`buckinghamPi`, `DimensionalVariable`,
  `PiGroup`, `BuckinghamResult`, `BuckinghamVerdict`) and how `PiGroup.exponents` and
  `PiGroup.formula` name variables; what `buckinghamPi` returns for a variable whose dimension
  is all zeros (a dimensionless input) — its own trivial group, or dropped?
- The `l1` builder signature in `src/canonical/entries/_l1-build.ts`; the four oscillator
  entries' ids, `regime`, and `epistemicStatus` (`CE-simple-harmonic-frequency`
  `mechanics.ts`, `CE-lc-resonance` `electromagnetism.ts`, `CE-oscillator-energy`
  `fluids-waves.ts`, `CE-spring-potential-energy` `mechanics.ts`); the exact `dim(…)`
  arguments of the module-local `SPRING_CONSTANT`, `INDUCTANCE`, `CAPACITANCE` so S0.1 can
  redefine them identically.
- The `D(L, M, T, Theta)` fixture in `tests/fixtures/dimension.ts`.
- `integrateRK4` in `src/numerical/null-ray-integrator.ts`: signature and whether the
  `ODESystem` type is exported, so `tests/atlas/_ode.ts` can wrap it for the final state and
  add its own sampling loop.
- The four readers of `package.json` `exports` (`tests/api/public-tag-vs-index-invariant.test.ts`,
  `scripts/package-smoke.mjs`, `tests/api/public-surface.test.ts`,
  `tools/create-dependency-graph/create-dependency-graph.ts` ≈ line 111) and what each does
  with a subpath whose `dist/` target does not exist yet.
- The `tests/composition/probe/import-graph.test.ts` guard, verbatim.
- `tests/bridges/catalog-json.test.ts`: the deep-equal pin pattern, and
  `scripts/emit-catalog-json.mjs`: it imports `dist/**` via `pathToFileURL`, reads
  `packageVersion` from `package.json`, emits `$schema`, `schemaVersion`, `count`, `entries`,
  `confrontations`, `adjudications`; the `catalog:json` script runs `npm run build` first.

**Adam vet A0.** Inputs: the design note + every S0 brief inlined. Required outputs: a verdict
per brief; specifically whether the fifteen witnesses' numeric expectations are derivable from
the stated models (Adam recomputes at least: pendulum relative period error at 0.2 rad, the
RLC side-condition match `R = 2`, the chain dispersion error coefficient 1/24, the chirped
Gaussian product, the W8b velocity jump). RED on any brief blocks that brief only.

### S0 types (fixed by the design note; the W1 agent implements them verbatim or reports why not)

```ts
// src/atlas/types.ts  (@internal throughout)
export type RelationType =
  | 'derivation' | 'exact-equivalence' | 'restriction' | 'approximation'
  | 'coarse-graining' | 'analytic-continuation' | 'structural-analogy'
  | 'deformation-quantization';

export type EvidenceTag =
  | 'proposed' | 'reviewed' | 'dimension-checked' | 'convention-checked'
  | 'symbolically-checked' | 'numerically-supported' | 'formally-proved'
  | 'empirically-supported' | 'contradicted' | 'unresolved';

export type LimitCharacter = 'regular' | 'singular' | 'unknown';

/**
 * A regime coordinate. Either a π-group `buckinghamPi` produced from the family's
 * dimensioned parameters (keyed by `PiGroup.formula`), or a dimensionless INPUT of the
 * model (an initial datum such as θ0, a wavenumber-lattice product qa) declared as a
 * `DimensionalVariable` with the zero dimension, which is its own trivial group. Derived
 * quantities such as ζ = ½ (m k / b²)^(−½) are NOT groups; write the inequality on the
 * group (`m k / b² > 1/4`) and record the display alias in `alias`.
 * (Name note: `src/composition/bridge-prediction.ts` has a module-local, unexported
 * `interface Regime` for tensor-cell placement; different concept, no import collision.)
 */
export interface RegimeInequality {
  readonly group: string;           // PiGroup.formula, or the dimensionless input's name
  readonly op: '<' | '<=' | '>' | '>=';
  readonly bound: number;
  readonly alias?: string;          // 'ζ < 1', for display only
}
export interface Regime {
  readonly family: string;                       // 'oscillators'
  readonly inequalities: readonly RegimeInequality[];
  readonly groupDefinitions: Readonly<Record<string, PiGroup>>; // traceability to the dimension matrix
}

export interface ApproximationBound {
  readonly K: number;               // Lipschitz constant of the map, stated norm
  readonly delta: number;           // uniform error, same norm
  readonly norm: string;            // 'relative period', 'sup |x − x_reduced| for t ≥ 5 m/b', ...
  readonly domain: string;          // where the bound holds
  readonly horizon: string;         // MANDATORY prose: 't ≪ 16 T0/θ0²'
  /** MANDATORY machine form of `horizon`: true while the bound is claimed to hold. */
  readonly horizonHolds: (t: number, params: Readonly<Record<string, number>>) => boolean;
  readonly parameterRange?: string; // 'θ0 ≤ 0.5 rad'
  readonly limitCharacter: LimitCharacter;
}

export interface Witness {
  readonly id: string;              // 'W7b'
  readonly kind: 'symbolic' | 'numeric' | 'formal';
  readonly test: string;            // test file path
  readonly tolerance?: string;      // as stated in the brief
}

export interface AtlasModel {
  readonly id: string;              // 'model-spring', 'model-lc', ...
  readonly family: string;
  readonly stateSpace: string;
  readonly dynamics: string;        // display form of the ODE
  readonly observables: readonly string[];
  readonly parameters: readonly DimensionalVariable[];   // dimensioned
  readonly dimensionlessInputs: readonly string[];        // 'theta0', 'qa'
  readonly canonicalRefs: readonly string[];   // 'CE-simple-harmonic-frequency', ...
  readonly regime: Regime;
}

export interface Counterexample {
  readonly description: string;
  readonly witness: string;         // 'W2b'
}

/** Field set = Blueprint v2 §3.1 Bridge record + citations. */
export interface AtlasBridge {
  readonly id: string;              // 'ab-spring-lc'
  readonly relation: RelationType;
  readonly premises: readonly string[];   // model ids (many)
  readonly conclusion: string;            // model id (one)
  readonly transformation: string;        // 'u = x/x0 (or q/q0), τ = ω0 t'
  readonly inverse?: string;              // 'x = x0 u, t = τ/ω0' (required for exact-equivalence)
  readonly preserves: readonly string[];
  readonly doesNotPreserve: readonly string[];
  readonly sideConditions: readonly string[];
  readonly bound?: ApproximationBound;    // required iff relation === 'approximation'
  readonly regime: Regime;
  readonly counterexamples: readonly Counterexample[];
  readonly evidence: ReadonlySet<EvidenceTag>;
  readonly witnesses: readonly Witness[];
  readonly citations: readonly string[];
  readonly reviewStatus: 'proposed' | 'reviewed';
}

export interface AtlasRejection {
  readonly id: string;              // 'ax-cubic-spring-lc'
  readonly claimed: RelationType;
  readonly premises: readonly string[];
  readonly conclusion: string;
  readonly reason: string;
  readonly survivingGroup: string;  // 'beta·x0²·k⁻¹'
  readonly witnesses: readonly Witness[];
}

export class MissingHorizonError extends Error {}
export class MissingLipschitzError extends Error {}
```

### S0 models and bridge endpoints (fixed by the design note)

| Model id | Dynamics | `canonicalRefs` |
|---|---|---|
| `model-spring` | `m x'' + k x = 0` | `CE-simple-harmonic-frequency`, `CE-spring-potential-energy`, `CE-oscillator-energy` |
| `model-lc` | `L q'' + q/C = 0` | `CE-lc-resonance` |
| `model-damped-spring` | `m x'' + b x' + k x = 0` | — |
| `model-rlc` | `L q'' + R q' + q/C = 0` | — |
| `model-pendulum` | `θ'' + (g/ℓ) sin θ = 0` | — |
| `model-chain` | `m u_n'' = κ(u_{n+1} − 2u_n + u_{n−1})` | — |
| `model-wave-1d` | `u_tt = c² u_xx` | `CE-wave-speed` |
| `model-cubic-spring` | `m x'' + k x + β x³ = 0` | — |
| `model-first-order` | `b x' + k x = 0` (the `m → 0` reduced model) | — |

Bridge endpoints: `ab-spring-lc`: `['model-spring'] → 'model-lc'` (exact equivalence; the
path finder treats exact equivalences as bidirectional); `ab-damped-rlc`:
`['model-damped-spring'] → 'model-rlc'`; `ab-pendulum-linear`: `['model-pendulum'] →
'model-spring'` (the linearized pendulum is a linear oscillator with `ω0² = g/ℓ` in angle
variables); `ab-damped-massless`: `['model-damped-spring'] → 'model-first-order'`;
`ab-chain-wave`: `['model-chain'] → 'model-wave-1d'`. The two-hop path
`model-pendulum → model-spring → model-lc` therefore exists and composes as
`approximation ∘ exact-equivalence = approximation` with bound `(1, θ0²/16)`; exact edges
contribute the identity bound **in every norm**, so the composite's norm is the
approximation edge's.

### S0.W1 — foundation (2 agents, parallel; nothing in W1 depends on anything in W1)

**BRIEF S0.1 — atlas types, error algebra, regime derivation, model registry**
Agent: general-purpose. Wave 1. Depends on: SC0.
Owns (create): `src/atlas/types.ts`, `src/atlas/error-algebra.ts`, `src/atlas/regime.ts`,
`src/atlas/oscillators/dimensions.ts`, `src/atlas/oscillators/models.ts`, `src/atlas/index.ts`,
`tests/atlas/error-algebra.test.ts`, `tests/atlas/regime.test.ts`, `tests/atlas/models.test.ts`.
Owns (modify): none. Forbidden: everything else, including `package.json`.
Pre-execution gate: read `src/dimensional/buckingham.ts` lines 30–80 and 260–330; read
`src/composition/probe/types.ts` lines 14–60 to confirm the atlas types do not shadow the
probe's `RelationKind` / `AuditState` names (they must not: use `RelationType`, and do not
define `AuditState` in Sprint 0); read `src/composition/probe/index.ts` for the `@internal`
barrel style; read the SC0 answers on the zero-dimension variable and on the module-local
dimension constants.
Tasks:
1. `types.ts` exactly as §S0 types (report any deviation).
2. `oscillators/dimensions.ts`: redefine `SPRING_CONSTANT`, `INDUCTANCE`, `CAPACITANCE`,
   `DAMPING` (`M T⁻¹`), `CUBIC_STIFFNESS` (`M L⁻² T⁻²`) via `dim` from
   `src/dimensional/ast-builders.ts` with the **same** arguments the entry files use (SC0);
   import `FREQUENCY`, `MASS` from `src/dimensional/types.ts`. Test: each redefined constant
   deep-equals the value the canonical entry's `governing[]` carries for that quantity.
3. `error-algebra.ts`: `composeBounds(outer: {K, delta}, inner: {K, delta})` returning
   `{ K: outer.K * inner.K, delta: outer.K * inner.delta + outer.delta }`; `IDENTITY_BOUND =
   { K: 1, delta: 0 }`; `composeBoundPath(bounds: readonly ({K, delta} | null)[])` that throws
   `MissingLipschitzError` when a `null` (K-less) bound sits anywhere but the **last** position
   and returns `{ bound, terminal: boolean }` otherwise.
   Tests first (**W6**): associativity on a triple where the two bracketings differ from the
   reversed order, so the test proves associativity and not commutativity — with
   `∘` meaning outer-after-inner, `(2,1)∘((3,2)∘(5,7)) = ((2,1)∘(3,2))∘(5,7) = (30, 47)`,
   while the reversed order `(5,7)∘((3,2)∘(2,1))` is `(30, 32)`
   <!-- CORRECTED 2026-09-20 by the Lead after Adam returned RED on this line. Revision 2
        said `(30, 17)`, which is arithmetically wrong: inner `(3,2)∘(2,1)` = `(6, 5)`, then
        `(5,7)∘(6,5)` = `K = 5*6 = 30`, `delta = 5*5 + 7 = 32`. Verified by executing the
        composition rule, not by re-reading it. The witness's PURPOSE survives either way -
        both bracketings give `(30, 47)` and the reversed order differs - but an implementer
        following the number verbatim would have asserted a false value. -->; identity both sides;
   `[b1, null, b2]` throws; `[b1, b2, null]` returns `{ bound: b2∘b1, terminal: true }`;
   geometric growth: folding `(2, 0.1)` ten times gives `K = 1024`.
4. `regime.ts`: `deriveRegimeGroups(family, parameters: DimensionalVariable[],
   dimensionlessInputs: string[]): Record<string, PiGroup>` — π-groups from `buckinghamPi`
   over the dimensioned parameters, keyed by `PiGroup.formula`, plus one trivial group per
   dimensionless input keyed by its name; `regimeHolds(regime, groupValues):
   { ok: boolean; violated: RegimeInequality[] }`.
   Tests first: `{m, b, k}` with dims `M`, `M T⁻¹`, `M T⁻²` yields exactly one π-group whose
   exponents are `{m: 1, k: 1, b: -2}` up to overall sign (assert on the sign-normalized
   vector); `regimeHolds` with the inequality `m·k·b⁻² > 0.25` (alias `ζ < 1`) at
   `m k / b² = 1` ok and at `0.1` violated, naming the inequality; a dimensionless input
   `theta0` appears as a trivial group and `theta0 < 0.5` evaluates.
5. `oscillators/models.ts`: the nine models of §S0 models, each with `regime` from
   `deriveRegimeGroups` and `canonicalRefs` restricted to ids that exist (test: every
   `canonicalRefs` entry resolves in `CANONICAL_EQUATIONS`).
6. `index.ts` re-exports everything `@internal`.
Definition of done: the three test files pass; `tsc` clean on `src/atlas`; no import from
`src/composition/probe/`; no `@public` tag anywhere under `src/atlas/`.

**BRIEF S0.2 — ODE helper, subpath export, import guard, schema documentation**
Agent: general-purpose. Wave 1. Depends on: SC0.
Owns (create): `tests/atlas/_ode.ts`, `tests/atlas/ode-helper.test.ts`,
`data/schemas/atlas-record.v0.json`, `tests/atlas/import-graph.test.ts`,
`tests/atlas/exports-subpath.test.ts`, `tests/fixtures/atlas/README.md`.
Owns (modify): `package.json` (`exports["./atlas"]` only, mirroring `./probe`; and add
`"test:atlas": "vitest run tests/atlas"` and `"atlas:json": "npm run build && node
scripts/emit-atlas-json.mjs"` to `scripts`).
Pre-execution gate: read `package.json` `exports`; read
`tests/composition/probe/import-graph.test.ts`; read `data/schemas/discovery-run.v0.json`;
read `src/numerical/null-ray-integrator.ts` (`integrateRK4`); read SC0's answer on the four
readers of the `exports` map. Note for the report: `bun run package:check` is expected red
between this brief landing and the W1 boundary (the `./atlas` target does not exist until
S0.1's `src/atlas/index.ts` compiles); the Lead verifies it green at the boundary.
Tasks:
1. `_ode.ts` with the **exact** signature
   `rk4(f: (t: number, y: readonly number[]) => number[], y0: readonly number[], t0: number,
   t1: number, steps: number, sampleEvery = 1): { y: number[]; samples: Array<{ t: number;
   y: number[] }> }` (fixed-step classical RK4; `samples` includes `t0` and `t1`). Implement
   the stepping locally (the in-tree `integrateRK4` returns only the final state and is
   `@internal` to `src/numerical/`; wrapping it would import a numerical internal into a test
   helper for no gain — state this in the file header). Test: `y' = −y` relative 1e-8 at
   1000 steps over `[0, 1]`; `y'' = −y` as a 2-vector reproduces `cos` within 1e-8 at
   `t = 2π` with 4000 steps; the final state agrees with `integrateRK4` to 1e-12 on `y' = −y`
   (one cross-check import is acceptable in a test).
2. `exports["./atlas"]` → `dist/atlas/index.{js,d.ts}`. Test: `exports-subpath.test.ts`
   reads `package.json` and asserts the three keys exist and point under `dist/atlas/`.
3. `tests/atlas/import-graph.test.ts`: nothing under `src/` mentions
   `fixtures/atlas` together with `scorer`.
4. `data/schemas/atlas-record.v0.json`: draft-07 schema **as documentation** (there is no
   validator in the tree) for the JSON projection `{ schemaVersion: "0", packageVersion,
   family, models[], bridges[], rejections[] }`; encode "`bound.horizon` required when
   `relation === "approximation"`" with `if/then` so an external validator can enforce it.
   A structural pin test of the schema file (the probe pattern) is S0.6's.
Definition of done: the four tests pass; `bun run build` unaffected.

### S0.W2 — the five bridges, one rejection, witnesses (3 agents, parallel)

All three W2 briefs depend only on W1 outputs: `src/atlas/types.ts`,
`src/atlas/oscillators/{dimensions,models}.ts`, `tests/atlas/_ode.ts`. Each brief's
pre-execution gate: read those files and the four oscillator canonical entries. Tolerances
are stated per witness; an agent may tighten, never loosen (§0.2 rule 9), and reports every
measured value.

**BRIEF S0.3 — bridges 1 and 2 (exact equivalence, side condition)**
Agent: general-purpose (physics-literate). Wave 2. Depends on: S0.1, S0.2.
Owns (create): `src/atlas/oscillators/bridges-exact.ts`, `tests/atlas/oscillators-exact.test.ts`.
Tasks:
1. Bridge 1 `ab-spring-lc` (`exact-equivalence`): `transformation: 'u = x/x0 or q/q0, τ = ω0 t'`,
   `inverse: 'x = x0 u, t = τ/ω0'`; preserves `['natural frequency', 'energy up to scale',
   'phase portrait']`; does not preserve `['physical interpretation', 'units']`; side
   conditions `['m, k, L, C > 0', 'lossless', 'unforced', 'x0, q0 nonzero']`; evidence
   `{'dimension-checked', 'numerically-supported', 'symbolically-checked'}` only if the
   corresponding witness passes in this test file (W1, W1a, W1b).
   - **W1** (symbolic, no peer): with `u = x/x0`, `τ = ω0 t`, `ω0² = k/m`, substitute into
     `m x'' + k x` and assert the coefficient of `u` after dividing by `k x0` is exactly `1`
     (rational arithmetic on the exponent bookkeeping, not floating point). Same for LC with
     `ω0² = 1/(LC)`.
   - **W1a** (numeric): integrate spring `(m=2, k=8)` and LC `(L=0.5, C=0.25)` from
     `u(0)=1, u'(0)=0` in their own variables, map both to `u(τ)` at `τ ∈ {π/2, π, 3π/2, 2π}`,
     assert `|u_spring − u_lc| < 1e-8` and both within `1e-8` of `cos τ`.
   - **W1b** (inverse maps): `x = x0 u`, `t = τ/ω0` round-trip on a sampled trajectory
     recovers the original within 1e-12; the initial conditions map `x'(0) = x0 ω0 u'(0)`.
2. Bridge 2 `ab-damped-rlc` (`exact-equivalence` with side condition): side condition
   `b/√(mk) = R√(C/L)` (equivalently `ζ_mech = b/(2√(mk))` equals `ζ_RLC = (R/2)√(C/L)`).
   - **W2** (numeric, condition satisfied): `m=1, k=4, b=1` gives `ζ_mech = 0.25`;
     `L=2, C=0.125` gives `√(C/L) = 0.25`; the side condition then **requires `R = 2`**
     (`ζ_RLC = (2/2)·0.25 = 0.25`). Both nondimensionalize to `u'' + 0.5 u' + u = 0`;
     trajectories agree within 1e-8 at four τ values. The agent derives `R` from the side
     condition in the test and asserts it equals 2 — do not hard-code it.
   - **W2b** (counterexample): same `L, C` with **`R = 4`** gives `ζ_RLC = 0.5 ≠ 0.25`;
     assert the trajectories differ by more than `1e-2` at `τ = π`. Register the
     counterexample on **bridge 1**: "adding `R` to bridge 1 breaks it" (`witness: 'W2b'`).
Definition of done: all witnesses pass; `bridges-exact.ts` exports `BRIDGE_SPRING_LC`,
`BRIDGE_DAMPED_RLC`; the evidence set on each bridge contains only tags whose witness is in
this file; every `Witness.test` path is this file.

**BRIEF S0.4 — bridges 3 and 4 (non-uniform approximation, singular limit)**
Agent: general-purpose (physics-literate). Wave 2. Depends on: S0.1, S0.2.
Owns (create): `src/atlas/oscillators/bridges-limits.ts`, `tests/atlas/oscillators-limits.test.ts`.
Tasks:
1. Bridge 3 `ab-pendulum-linear` (`approximation`), `['model-pendulum'] → 'model-spring'`,
   bound `{ K: 1, delta: θ0²/16, norm: 'relative period error', domain: 'θ0 ≤ 0.5 rad',
   horizon: 't ≪ 16 T0/θ0²', horizonHolds: (t, {T0, theta0}) => t < 16 * T0 / theta0**2,
   parameterRange: 'θ0 ≤ 0.5 rad', limitCharacter: 'regular' }`.
   - **W7** (period error): exact period via the complete elliptic integral
     `T = (2/π) T0 K(sin(θ0/2))` computed by the AGM (`K(k) = π / (2·AGM(1, √(1−k²)))`);
     at `θ0 = 0.2` assert `T/T0 − 1 ∈ [0.002505, 0.002507]` (truth 0.0025057; Blueprint
     0.002506) and that the residual `(T/T0 − 1) − θ0²/16` lies in `[5.70e-6, 5.76e-6]`
     (truth 5.744e-6; the next series term `11θ0⁴/3072 = 5.729e-6` accounts for it).
   - **W7b** (non-uniformity): phase drift per cycle is `2π·(T/T0 − 1)`; assert the cycle
     count at which the drift reaches `π/2` lies in `[99, 101]` (truth 99.77) for `θ0 = 0.2`,
     and that `bound.horizonHolds(200 * T0, {T0, theta0: 0.2})` is `false` while
     `horizonHolds(10 * T0, …)` is `true` (admission and query rule).
   - **W7c** (RK4 cross-check): integrate the nonlinear pendulum for `100 T0` with 20,000
     steps per `T0` (2×10⁶ steps; ≈ 0.7 s in Node). Reference grid: the linear oscillator's
     zero crossings at `t = (n + ½) T0 / 2`. Measure the lag of the pendulum's zero crossing
     nearest `t = 100 T0` against that grid, in degrees of the linear phase. Assert it is
     within **0.05°** of the elliptic-integral prediction `360° · (100 − 100 T0/T)` =
     **89.98°** (100 periods of `T0` are 99.75 pendulum cycles). RK4 global phase error at
     this step is ~1e-10 rad, so 0.05° is a test of the physics, not of the integrator.
2. Bridge 4 `ab-damped-massless` (`approximation`, singular),
   `['model-damped-spring'] → 'model-first-order'`, bound with `limitCharacter: 'singular'`,
   `norm: 'sup |x − x_reduced| for t ≥ 5 m/b'`, `K: 1`, `delta: 2(1 + |v0|) m/b` (see W8b),
   `horizon: 't ≥ 5 m/b (outside the boundary layer)'`, `horizonHolds: (t, {m, b}) =>
   t >= 5 * m / b`.
   - **W8** (order drop and roots): for `k=1, b=1`, `m ∈ {1e-1, 1e-2, 1e-3}` the two
     characteristic roots satisfy `|r_slow + k/b| < 2m` (truth 0.127, 0.0102, 0.0010 vs
     bounds 0.2, 0.02, 0.002) and `|r_fast·m + b| < 2m`.
   - **W8b** (lost initial condition — it shows in the **velocity**, not the position).
     Integrate the full model (`m = 1e-3, k = b = 1`) from `x(0)=1, x'(0)=v0` with
     `v0 ∈ {0, 5}` and compare with the reduced model `b x' + k x = 0` from `x(0)=1`.
     Position: for `t ≥ 5m/b` assert `|x_full − x_red| < 2(1+v0)·m` (truth 9.9e-4 and
     5.9e-3 vs bounds 2e-3 and 1.2e-2): the offset is `O((1+v0) m)`, the matched-asymptotics
     correction, and does not vanish. Velocity: at `t = 0.5 m/b` with `v0 = 5` assert
     `|x'_full − x'_red| > 1` (truth 3.6), and at `t = 5 m/b` assert `< 0.05` (truth 0.034):
     that is the boundary layer of thickness `~m/b`, and the reduced model cannot carry `v0`.
Definition of done: witnesses pass; both bridges carry a non-empty `horizon` and a
`horizonHolds`; a test asserts that constructing an `approximation` bridge through the
module's `makeApproximation(...)` helper with an empty `horizon` throws `MissingHorizonError`.

**BRIEF S0.5 — bridge 5 (coarse-graining), the rejection, and the two quantum witnesses**
Agent: general-purpose (physics-literate). Wave 2. Depends on: S0.1, S0.2.
Owns (create): `src/atlas/oscillators/bridges-coarse.ts`, `src/atlas/oscillators/rejections.ts`,
`src/atlas/witnesses/quantum-support.ts`, `tests/atlas/oscillators-coarse.test.ts`,
`tests/atlas/quantum-support.test.ts`.
Tasks:
1. Bridge 5 `ab-chain-wave` (`coarse-graining`), `['model-chain'] → 'model-wave-1d'`:
   reduction map `u_n(t) → u(x = na, t)`, information lost `'modes with q > π/a'`, closure
   `'long-wavelength, qa ≪ 1'`.
   - **W9** (dispersion): lattice `ω(q) = 2√(κ/m)|sin(qa/2)|`, continuum `ω = c q` with
     `c² = κa²/m`. For `κ = m = a = 1` and `qa ∈ {0.1, 0.2, 0.4}` assert the relative error
     `1 − ω_lattice/ω_cont` equals `(qa)²/24` **within 0.5% of itself** (the relative
     deviation is `−(qa)²/80`: 1.3e-4, 5.0e-4, 2.0e-3; the next series term is `(qa)⁴/1920`).
     Assert the lattice band edge at `qa = π` has `ω = 2√(κ/m)` and the continuum has no band
     edge (the information-loss witness).
2. Rejection `ax-cubic-spring-lc`: claimed `exact-equivalence`, premises
   `['model-cubic-spring', 'model-lc']`, surviving group `β x0² / k`.
   - **W3** (Buckingham survival): `buckinghamPi` over `{m, k, β, x0}` with `β` of dimension
     `M L⁻² T⁻²` (`CUBIC_STIFFNESS`) yields exactly one group whose exponents are
     proportional to `{β: 1, x0: 2, k: −1, m: 0}`; the LC model's variable set `{L, C, q0}`
     admits **no** group (`verdict === 'dimensionally-independent'`; the dimension matrix has
     rank 3). Assert `rejections.ts` lists the rejection with witness `W3`.
3. `quantum-support.ts` (pure functions, no bridge yet; consumed by Phase 3):
   `chirpedGaussianUncertaintyProduct(s, alpha, hbar = 1)` returning `(ħ/2)√(1 + 16α²s⁴)`, and
   `wickRotatedSchrodingerCoefficients(hbar, m)` returning `{ diffusion: hbar/(2m),
   reactionSign: -1, reactionScale: 1/hbar }`.
   - **W4**: at `α = 0` the product is exactly `ħ/2`; at `s = 1, α = 0.5` it is
     `(ħ/2)·√5 = 1.1180…`; numerically confirm via direct quadrature that for the discretized
     wavefunction `ψ = N exp(−x²/4s² + iαx²)` on `x ∈ [−12s, 12s]` with 4001 points,
     `σx = s` (rel 1e-6) and `σp` computed from `ħ²∫|ψ'|² dx − |ħ∫ψ* ψ' dx|²` matches the
     closed form within 1e-6 relative (truth: rel 2e-15 at this grid).
   - **W5**: the substitution `t = −iτ` in `iħ∂tψ = −(ħ²/2m)∇²ψ + Vψ` yields
     `∂τφ = (ħ/2m)∇²φ − Vφ/ħ`. Test with the exact free heat-kernel evolution of a Gaussian,
     `φ(x, τ) = (s²/σ(τ))^{1/2} exp(−x²/(4σ(τ)))`, `σ(τ) = s² + ħτ/(2m)`, `ħ = m = s = 1`,
     `τ = 0.3`, on `x ∈ [−8, 8]` with 2001 points, second-order central differences in `x`
     and `τ`: assert `sup|∂τφ − (ħ/2m)∂xxφ| / sup|∂τφ| < 1e-4` (truth 7e-6 at this grid; a
     pointwise relative norm is undefined at the zeros of `∂τφ`, so the sup-norm ratio is the
     stated norm).
Definition of done: all witnesses pass; W3's LC assertion uses `verdict`, not a count.

### S0.W3 — assembly, export, evidence rule (1 agent)

**BRIEF S0.6 — family assembly, JSON projection, pins, evidence-tag rule**
Agent: general-purpose. Wave 3. Depends on: S0.1–S0.5.
Owns (create): `src/atlas/oscillators/index.ts`, `src/atlas/serialize.ts`,
`scripts/emit-atlas-json.mjs`, `tests/atlas/serialize.test.ts`, `tests/atlas/atlas-json.test.ts`,
`tests/atlas/schema-pin.test.ts`, `tests/atlas/evidence-rule.test.ts`.
Owns (modify): `src/atlas/index.ts` (add re-exports).
Pre-execution gate: read `scripts/emit-catalog-json.mjs` and `tests/bridges/catalog-json.test.ts`
and copy their conventions (imports `dist/**` via `pathToFileURL`, writes `packageVersion`
from `package.json`, deep-equal pin of the committed artifact against the live registry);
read every W2 module.
Tasks:
1. `OSCILLATOR_FAMILY = { family: 'oscillators', models, bridges, rejections }`.
2. `serialize.ts`: `toAtlasJson(family)` producing the shape of `atlas-record.v0.json`;
   sets serialized as sorted arrays; functions (`horizonHolds`) serialized as their
   `horizon` prose only; `PiGroup` exponents emitted as-is. `serialize.test.ts`: round-trip
   stability (`toAtlasJson` is deterministic) and a hand-rolled check that every
   `relation === 'approximation'` bridge in the output has a non-empty `bound.horizon`, and
   that a mutated copy with `horizon` removed **fails** that check.
3. `schema-pin.test.ts`: structural pin of `data/schemas/atlas-record.v0.json` (`required`
   arrays, the `if/then` on `horizon`), the probe pattern.
4. `atlas-json.test.ts`: deep-equal of `data/atlas/oscillators.json` against
   `toAtlasJson(OSCILLATOR_FAMILY)` from `dist/` (the `catalog-json.test.ts` pattern), so a
   stale artifact fails CI the way a stale catalog does.
5. `evidence-rule.test.ts`: for every bridge and rejection in the family, every
   `EvidenceTag` present has at least one `Witness` whose `id` is in the closed list of
   fifteen, and every `Witness.id` appears as a whole word (`/\bW7b\b/`, word-boundary, not
   substring — `W1` must not match `W1a`) in an `it(`/`test(` title in the file named by
   `Witness.test`, scanning **all** of `tests/atlas/*.test.ts`. A tag without a witness is a
   failure; a witness id outside the closed list is a failure.
6. `scripts/emit-atlas-json.mjs` writes `data/atlas/oscillators.json`. **The Lead runs it and
   commits the output** at the wave boundary; the agent only verifies that a second run is
   byte-identical.
Definition of done: `bunx vitest run tests/atlas` green after the Lead regenerates the
artifact.

### S0 — Eve verification brief E0 (independent, after W3)

Inline for Eve: `src/atlas/**`, `tests/atlas/**`, `data/atlas/oscillators.json`, the design
note. Eve must, from first principles and without the tests:
1. Recompute `T/T0 − 1` at `θ0 = 0.2` via the elliptic integral and via the series to six
   significant figures; state both; confirm the W7 windows bracket the truth (0.0025057;
   residual 5.744e-6).
2. Recompute the cycle count for a 90° phase lag (99.77) and the lag after `100 T0` (89.98°).
3. Recompute the RLC side condition from `ζ_mech = b/(2√(mk))`, `ζ_RLC = (R/2)√(C/L)` and
   confirm `R = 2` matches and `R = 4` gives `ζ = 0.5`.
4. Recompute the dispersion coefficient `1/24` and the deviation `−(qa)²/80`.
5. Recompute the chirped-Gaussian product at `s = 1, α = 0.5` (`√5/2`).
6. Recompute the singular-limit roots, the `O((1+v0)m)` position offset, and the velocity
   jump at `t = 0.5 m/b`.
7. Hunt for value-blind tests: any `expect(x).toBeDefined()` or `toBeGreaterThan(0)` standing
   in for a physics assertion; list them.
8. Hunt for evidence-tag theatre: any tag not backed by a witness the rule test would catch,
   and any witness id whose test title does not actually run the stated computation.
9. Read `data/atlas/oscillators.json` and confirm no field was populated by guess (every
   `citations[]` entry resolves to a real source; every `preserves[]` item is defended by a
   witness or a side condition; `reviewStatus` is `'proposed'` everywhere until a physicist
   review lands).
Verdict per item; the Lead fixes RED/YELLOW items before wrap.

### S0 — Lead wrap checklist (L0.2; inert boxes, see the plan-doc audit note)

- [ ] Curation-cost log filled from the agents' reports (hours per bridge by relation type)
      into the design note; this number gates Sprint 4 and Sprint 5 scope.
- [ ] `node scripts/emit-atlas-json.mjs` run and `data/atlas/oscillators.json` committed.
- [ ] `bun run build && bun run test` full suite green; `bun run package:check` green
      (the `./atlas` subpath target now exists); count recorded in CHANGELOG.
- [ ] `bun run docs:deps` (new `src/atlas/` changes the dependency graph); the hand-written
      `docs/architecture/OVERVIEW.md` / `COMPONENTS.md` metric tables re-measured (this is the
      drift class that failed `master` twice; do not skip).
- [ ] `CLAUDE.md` source map gains one row for `src/atlas/`; `CLAUDE.md` release procedure
      gains "`bun run atlas:json` after the bump, before `docs:deps`" — the atlas artifact
      embeds `packageVersion`, exactly the `DEPENDENCY_GRAPH.md` drift class, and
      `atlas-json.test.ts` is the gate that will catch a release that forgets it. Also correct
      `CLAUDE.md`'s "13 closed-form bridges … carry no graph edge" to the audited fact (13
      AST-less; 17 edgeless; BE-51/52 have edges).
- [ ] `ROADMAP.md` §7 Phase 0 row → `shipped vX.Y.Z` + pointer to this plan.
- [ ] `todo.md` Active queue entry; `ACTIVE.md` line closed.
- [ ] Independent physicist review requested via `CONTRIBUTING.md` physics-review surface
      (five contracts + the rejection); the request text is in the CHANGELOG entry;
      `reviewStatus` flips to `'reviewed'` only when that review lands.

**Sprint 0 exit criteria** = ROADMAP Phase 0 exit criteria. If Eve's item 9 finds any guessed
field, the sprint does not close until it is `undefined` or sourced.

---

## Sprint 1 — Relation contracts as an additive overlay (ROADMAP Phase 1, target v0.47–v0.48)

**Goal.** `relation?`, `conventions?`, `counterexamples?` on existing records as optional
fields (on `BridgeEdge`, on `BridgeEquationEntry`, and — `conventions?` only — on
`CanonicalEquation`); evidence tags **derived**, never stored; an `Association` registry; the
composition table with `no-composite-claim` as the default; one overlay reconciled with the
probe's existing `RelationKind` / `AuditState`.

### S1.W0 — Lead + Scout + Adam

**Lead task L1.1 — design note** `docs/planning/Atlas-Phase-1-Design.md`. Must contain the
**reconciliation table**: for each field of the discovery plan §3 `ScientificRelationRecord`
sketch and each field of the Sprint 0 `AtlasBridge`, the single name that survives, where it
lives (`src/atlas/types.ts` becomes the home; `src/composition/probe/types.ts` keeps
`RelationKind` and `AuditState` and imports nothing from atlas), and the rule that maps the
probe's `RelationKind` (what a record *is*) onto the atlas `RelationType` (how two records
*relate*): they are orthogonal and both stay. Must also contain the complete composition
matrix over the eight types with `'no-composite-claim'` in every unspecified cell, **stated
as a conservative under-approximation of Blueprint v2 §4.2**: the three rows that condition
on edge data ("analytic continuation ∘ X only if X preserves the analyticity domain";
"analogy ∘ derivation: transport only for statements in preserved structure"; "exact ∘
approximation needs `K` for the exact map") and the row "limit ∘ quantization is never the
identity" (a statement about the composite, not that it is undefined) all map to
`'no-composite-claim'` until Phase 2 supplies edge data. And the truthful-migration rule
(discovery plan §3.1). And the BE-35 precedence rule (see S1.3).

**Scout brief SC1.** Return with file:line: every constructor of `BridgeEdge` (object
literals with `kind: 'bridge' | 'law'`) under `src/composition/edges/*.ts`, and the
`beId` → edge-variable map for 37, 51, 52 in `calibration.ts`; the
`edgeToJunction` / `buildVizModel` signatures and `VizOptions` fields in
`src/composition/graph-viz.ts`; the `src/bridges/membership.ts` precedence rule
(`adjudicateBridgeEntry`) that reads `REJECTED_BRIDGE_ADJUDICATIONS`; the `CanonicalForms`
interface; the `upt recover` command (flags: `--json` only) and where it prints per-bridge
findings; every test that pins `Object.keys(edge)`, a `BridgeEdge` snapshot, or the
`BridgeEquationEntry` shape (`tests/bridges/catalog-json.test.ts` deep-equals
`data/bridge-catalog.json` against the live registry; `data/bridge-catalog.schema.json` has
no `additionalProperties: false`, so new optional fields pass the schema but any row edit
requires `bun run catalog:json`); how `CandidateAdjudication.id` encodes its pair
(`a~b`, sorted kebab slugs via `candidateId`) and the four `'decoy'` verdicts.

**Adam vet A1.** Specifically: does the reconciliation leave exactly one overlay; does the
matrix's conservative reading match §4.2 row by row with the four deviations named; is the
derived-tag rule in S1.3 incapable of inventing evidence; does any brief store derived data
on a row; is BE-35's double status handled without a fourth rule.

### S1 briefs

**BRIEF S1.1 — overlay fields (types only)**
Agent: general-purpose. Wave 1.
Owns (modify): `src/composition/edge.ts` (add `relation?: RelationContract`,
`conventions?: Conventions`, `counterexamples?: readonly Counterexample[]`),
`src/bridges/index.ts` (the same three optional fields on `BridgeEquationEntry`; interface
change only, no row edits; type-only import from `src/atlas/types.ts`, never the barrel — the
17 edgeless rows have no other home for their overlay, and even edge-bearing rows are the
per-bridge record), `src/canonical/canonical-equation.ts` (add `conventions?`),
`src/atlas/types.ts` (add `RelationContract` as the discriminated union over the eight types
with each type's required content from Blueprint v2 §4.1, and `Conventions { heatWorkSign?:
'Q-W' | 'Q+W'; metricSignature?: '-+++' | '+---'; fourierNormalization?: 'unitary' |
'physics' | 'none'; unitSystem?: 'SI' | 'gaussian' | 'natural'; capacitorChargeSign?: '+' |
'-' }`).
Owns (create): `tests/atlas/overlay-types.test.ts`.
Pre-execution gate: read SC1's list of pins; run `tests/bridges/catalog-json.test.ts` and
`tests/composition/compose*.test.ts` scoped before and after.
Tasks: add the fields; a test constructs a `BridgeEdge` without any overlay field
(type-checks) and one with each relation type carrying exactly its required content (a
missing `bound.horizon` on `approximation` is a **type** error via a required field).
Definition of done: `tsc` clean for `src` and `tests`; SC1's pins unchanged; `docs:deps`
reports no new cycle.

**BRIEF S1.2a — the composition table (pure)**
Agent: general-purpose. Wave 1 (parallel with S1.1; depends only on Sprint 0's
`RelationType`).
Owns (create): `src/atlas/composition-table.ts`, `tests/atlas/composition-table.test.ts`.
Tasks: `composeRelation(first: RelationType, second: RelationType): RelationType |
'no-composite-claim'` as a literal 8×8 matrix per the design note. Tests: the defined rows
(equivalence∘equivalence = equivalence; exact∘exact = derivation; exact∘approximation either
order = approximation; coarse∘coarse = coarse; analogy∘analogy = analogy); the four
**conservative** rows named in L1.1 return `'no-composite-claim'` and the test says so in its
title ("conservative reading of §4.2", not "every row"); and a test that **counts** the
`'no-composite-claim'` cells and pins the count with a comment naming the design note, so
that widening the table is a visible, reviewed change rather than a silent one.
Definition of done: matrix test pins the count; module imports nothing from `composition/`.

**BRIEF S1.2b — `composeEdges` consults the table; `UndefinedCompositionError`**
Agent: general-purpose. Wave 2. Depends on: S1.1, S1.2a.
Owns (modify): `src/composition/compose.ts` (one guarded block), `src/composition/edge.ts`
(add `UndefinedCompositionError` beside `DomainViolationError`).
Owns (create): `tests/composition/compose-relation.test.ts`.
Tasks: in `composeEdges`, if **both** operands carry `relation`, call `composeRelation`; on
`'no-composite-claim'` throw `UndefinedCompositionError` (message names both ids and types);
otherwise set `relation` on the composed edge to the composite type with a
`derivedFrom: [first.id, second.id]` note. If either operand lacks `relation`, behaviour is
byte-identical to today. Tests: the 41-edge `CATALOG_GRAPH` composes exactly as before
(`tests/composition/compose*.test.ts` scoped, unchanged); two Sprint 0 bridges wrapped as
`BridgeEdge`s compose per the table; an `approximation` after `deformation-quantization`
throws.

**BRIEF S1.3 — derived evidence tags (truthful migration) and coverage**
Agent: general-purpose. Wave 2. Depends on: S1.1.
Owns (create): `src/atlas/derive-evidence.ts`, `tests/atlas/derive-evidence.test.ts`,
`src/atlas/coverage.ts`, `tests/atlas/coverage.test.ts`.
Pre-execution gate: read `src/bridges/confrontations.ts` (`CONFRONTATIONS: ReadonlyMap<number, …>`,
`CONFRONTATION_RIGOR`), `src/bridges/rejected.ts`, `src/dimensional/bridge-check.ts`
(`inferDimensionForBridge`, `EXPECTED_DIMENSION_BY_BRIDGE`) and
`tests/bridges/dimensional-signature-catalog.test.ts` to learn what "the pin passes" means
mechanically (the derivation must call the same validator the test calls, not read the test).
Tasks:
1. `deriveEvidenceTags(beId: number): { tags: ReadonlySet<EvidenceTag>; notes: Record<string, string> }`
   with exactly three rules: `dimension-checked` iff the catalog RHS validates to its
   registered `dimensional_signature` (call `inferDimensionForBridge`; the 13 AST-less
   bridges yield no tag — not `unresolved`, which is reserved for a check that ran and timed
   out); `empirically-supported` iff `CONFRONTATIONS.has(beId)`, with the rigor tier in
   `notes`; `contradicted` iff `REJECTED_BRIDGE_ADJUDICATIONS` names it (reason linked as a
   `Counterexample`). **No fourth rule and no precedence:** the tags are a vector. Tests:
   `37` → `{dimension-checked, empirically-supported}` with `stringent`; `28` →
   `{dimension-checked, contradicted}`; `51` → `{empirically-supported}` only (AST-less);
   **`35` → `{dimension-checked, empirically-supported, contradicted}`** — both confronted
   (`stringent`) and adjudicated `not-a-bridge`; the test title says this is by design (a
   relation can be quantitatively confirmed and still not be a regime-crossing bridge).
2. `coverage.ts`: `overlayCoverage()` → `{ schema, audited, verified, notYetAudited }` over the
   55 catalog rows + 109 canonical entries (**atlas families are not in the denominator**;
   they are reported separately as `atlas: { bridges, reviewed }`), where "audited" means a
   human set `relation` or `conventions` on the row, and "verified" means the derived tag set
   is non-empty. Test pins `schema = 158` and the initial `audited` (0 before S1.5; 10 after).
Definition of done: the three-rule test is exhaustive; a fourth branch would need a test that
names it.

**BRIEF S1.4 — `Association` registry, convention check, `upt recover` surfacing**
Agent: general-purpose. Wave 3. Depends on: S1.1, S1.2b.
Owns (create): `src/atlas/association.ts`, `src/atlas/conventions.ts`,
`tests/atlas/association.test.ts`, `tests/atlas/conventions.test.ts`, `tests/cli/recover-conventions.test.ts`.
Owns (modify): `src/composition/compose.ts` (only the block S1.2b added), `src/cli/commands/recover.ts`
(one extra line per bridge when a convention mismatch exists), `src/cli-api.ts` (export
`checkConventions`), `cli/README.md` (one sentence under `upt recover`).
Pre-execution gate: read `docs/research/orphan-connector-adjudication.md` and
`src/composition/adjudication.ts` (`ADJUDICATIONS`; the pair is encoded in `id` as `a~b` —
split on `~`; four `'decoy'` verdicts) — the seed population is the decoy verdicts and the
named shared-constant coincidences; read `CanonicalForms`; read
`src/cli/commands/recover.ts` end to end.
Tasks:
1. `Association { id; kind: 'shared-constant' | 'shared-symbol' | 'shared-structure' |
   'historical-influence'; between: [string, string]; note; citation }` and
   `ASSOCIATIONS` seeded from every `'decoy'` adjudication (id-linked, `between` from the
   `~`-split id, note copied verbatim, no new physics). Test: every seed's `between` pair
   resolves to real quantity names in the composition quantity registry; `ASSOCIATIONS`
   contains no pair that is also a `CATALOG_GRAPH` edge; `buildVizModel` never emits an
   association as an edge.
2. `checkConventions(a, b)` → list of mismatched keys (undefined on either side is "unknown",
   never a mismatch). Wire into `composeEdges` behind the S1.2b guard, and into `upt recover`
   as an advisory line. Tests: `'Q-W'` vs `'Q+W'` mismatches; `'-+++'` vs `undefined` does
   not; `runCli(['recover'])` output is unchanged when no row carries conventions.

**BRIEF S1.5 — audit ten catalog rows and the five Sprint 0 bridges through the overlay**
Agent: general-purpose (physics-literate). Wave 3. Depends on: S1.1–S1.3.
Owns (modify): `src/atlas/oscillators/bridges-*.ts` (re-register through `RelationContract`),
and exactly ten catalog rows in `src/bridges/index.ts` (`BRIDGE_EQUATIONS`) chosen by the
Lead from the **data-confronted** set: BE-37, BE-51, BE-52, BE-55, BE-58, BE-59, BE-21,
BE-35, BE-11, BE-48 (eight `established`; **BE-37 and BE-48 are `speculative` and stay so**
— the overlay never touches `status`; BE-35 is also `not-a-bridge`, and its `relation` is
recorded as what the equation *is* within its regime, with the rejection linked as a
`counterexample`), adding `relation`, `conventions`, and `counterexamples` only where the
cited source supports each value. Where the bridge also has a graph edge (BE-37, BE-51, and
BE-52 all do — `be37Edge`, `be51Edge`, `be52Edge` in `src/composition/edges/calibration.ts`;
BE-11 and BE-21 have edges too, per SC1's map), copy the same `relation` onto each edge so
row and edge never disagree. `src/composition/edges/calibration.ts` and the other edge files
SC1 names are therefore in this brief's Owns (modify).
Owns (create): `tests/atlas/audited-catalog.test.ts`.
Rule: every added value carries a `// source:` comment naming the reference and section; a
value the agent cannot source is left `undefined` and listed in the report. Tests: each of the
ten rows carries `relation`; for every `beId` present in both registries the row and the edge
agree; `overlayCoverage().audited === 10`; no row's `status` changed (snapshot the ten
statuses before and after).
Definition of done: Eve samples three of the ten against the sources. **Lead wrap must run
`bun run catalog:json`** (row edits invalidate the deep-equal pin; the brief reports that
`tests/bridges/catalog-json.test.ts` is expected red until then).

### S1 — Eve brief E1
Spot-check three audited rows' `relation` and `conventions` against the cited sources;
attempt to construct an evidence tag by any path other than the three rules; confirm BE-35
yields all three tags; attempt to compose two overlay-carrying edges whose types are not in
the table and confirm the throw; confirm the 41-edge graph's composition results are
unchanged (recompute two composed values from before/after `dist/`); confirm
`overlayCoverage` numbers by independent count; confirm `data/bridge-catalog.json` was
regenerated, not hand-edited; confirm no `status` changed.

### S1 — Lead wrap
Standard checklist (§0.3) plus: `bun run catalog:json`; `CLAUDE.md` bridge-encoding patterns
section gains "relation contract + conventions" bullets; `cli/README.md` `upt recover` note.

---

## Sprint 2 — Regimes and error-carrying paths (ROADMAP Phase 2, target v0.49–v0.50)

**Goal.** `regime?` on edges and catalog rows beside `ValidityDomain`; uniformity fields
enforced at admission; machine-checkable horizons queried; `(K, δ)` path bounds through
`propagateUncertainty`; regime overlap and uncovered-region reports; `upt regime` and
`upt path` verbs; `upt map --relation= --evidence=` filters.

### S2.W0
**Lead L2.1 design note** `Atlas-Phase-2-Design.md`: the `regime?: Regime` field semantics on
`BridgeEdge` and on `BridgeEquationEntry` relative to `ValidityDomain.predicate` (both may be
present; when both are, `evaluateEdge` checks the predicate as today and **additionally**
`regimeHolds` when the caller supplies group values; a regime never replaces a predicate
silently); the path-bound API including `findPath`; the horizon query (`horizonHolds` from
Sprint 0 is the machine form; the CLI evaluates it); the two verbs' flag specs and `--json`
shapes; the GR spine re-expression (`r_s/r`, `v/c`) that must leave every confrontation
number unchanged.
**Scout SC2:** `src/cli/args.ts` `FlagSpec` shape (`valueStyle: 'attached' | 'next' |
'either' | 'none'`, `repeatable?`); `src/cli/output.ts` `emitJson` envelope and the
non-finite sanitizer; how `map.ts` parses `--source` and `--format`; `src/cli-api.ts` barrel
export style; the `tests/cli/*.test.ts` in-process `runCli` convention and
`tests/cli/golden/confront.txt`; `VizOptions` fields (`title?`, `extraJunctions?`); the
current CLI command count in `cli/README.md` (it says 15 at lines ≈192 and ≈345) versus
`CLAUDE.md` (19) versus the registry (19 modules in `src/cli/commands/index.ts`) — report so
the wrap reconciles all three.
**Adam A2:** does the path-bound rule refuse a K-less middle edge; is the regime check
additive; are the CLI verbs flat and registered via the barrel; is the horizon query real.

### S2 briefs

**BRIEF S2.1 — `regime?` on `BridgeEdge` and `BridgeEquationEntry`, admission, overlap, uncovered regions**
Wave 1. Owns (modify): `src/composition/edge.ts` (`regime?: Regime`), `src/bridges/index.ts`
(`regime?: Regime` on `BridgeEquationEntry`, type-only import), `src/atlas/regime.ts`
(`intersectRegimes`, `regimeOverlap(a, b): 'disjoint' | 'overlap' | 'nested'` on shared
group names; `uncoveredRegions(family, models, samples)` — grid-sample the family's group
box and list cells no model's regime covers; `admitApproximation(bridge)` throwing
`MissingHorizonError` when `horizon` is empty or `horizonHolds` is absent).
Owns (create): `tests/atlas/regime-admission.test.ts`.
Tests: overlap classification on the oscillator family's `m k / b²` and `theta0`
inequalities; admission throws on empty horizon; the Sprint 0 five bridges all admit; the
oscillator family's uncovered region at `theta0 > 0.5` is reported.

**BRIEF S2.2 — path bounds, `findPath`, and `propagateUncertainty` extension**
Wave 1. Owns (create): `src/atlas/path-bound.ts`, `tests/atlas/path-bound.test.ts`.
Owns (modify): `src/composition/uncertainty.ts` — add an **optional** fourth parameter
`opts?: { bound?: ApproximationBound }` whose only effect is to include `bound.delta` in the
returned `sigma` in quadrature and to echo `bound` in the result; default behaviour unchanged
(scoped `tests/composition/enumerate-uncertainty.test.ts` must not change).
Tasks: `findPath(family, from, to)` (BFS over `premises`/`conclusion`, exact equivalences
bidirectional; single-premise chains only this sprint); `boundPath(bridges)` →
`composeBoundPath` over `bridge.bound ?? null` (non-approximation exact types contribute
`IDENTITY_BOUND` in every norm; a K-less approximation in the middle throws
`MissingLipschitzError`) plus `composeRelation` folded along the path. Tests:
`findPath('oscillators', 'model-pendulum', 'model-lc')` returns `[ab-pendulum-linear,
ab-spring-lc]`; its bound is `(1, 0.0025)` at `theta0 = 0.2` with norm `'relative period
error'` and composite relation `approximation`; `[approx(K=2, δ=0.1), approx(K=3, δ=0.2)]` →
`(6, 0.5)`; K-less middle throws; K-less last is allowed and the result says `terminal: true`.

**BRIEF S2.3 — `upt regime` and `upt path`**
Wave 2. Depends on: S2.1, S2.2.
Owns (create): `src/cli/commands/regime.ts`, `src/cli/commands/path.ts`,
`tests/cli/regime.test.ts`, `tests/cli/path.test.ts`.
Owns (modify): `src/cli/commands/index.ts` (two import lines), `src/cli-api.ts` (export
`OSCILLATOR_FAMILY`, `regimeHolds`, `regimeOverlap`, `uncoveredRegions`, `boundPath`,
`findPath`), `src/cli/main.ts` (help text lines only), `cli/README.md`.
Pre-execution gate: read `confront.ts` end to end and copy its structure (flags, HELP, `run`,
`emitJson`; a bad flag value **throws `CliError`**, which `main.ts` maps to exit 1; unknown
flags are rejected by the parser as `UsageError`, exit 2; `run` returns 0 on success).
Tasks: `upt regime <family> [--at group=value …] [--json]` lists models valid at the point,
the violated inequality for each invalid one, and the uncovered regions; `upt path <from>
<to> [--at …] [--json]` prints the path, the composite relation type per the table, the
composed `(K, δ)` with its norm, whether every horizon holds at `--at` (evaluating
`horizonHolds`), and `'no composite claim'` when the table says so. Tests: exit 0/1/2 cases;
`--json` envelope shape; `path model-pendulum model-lc --at theta0=0.2 T0=1 t=10` returns
`approximation`, `(1, 0.0025)`, horizons hold; the same with `t=1000` reports the pendulum
horizon violated (`16/0.04 = 400`); `path` across a `no-composite-claim` pair prints the
phrase and exits 0 (an answer, not an error).

**BRIEF S2.4 — `upt map --relation= --evidence=`**
Wave 2. Owns (modify): `src/composition/graph-viz.ts` (`VizOptions.relation?`,
`VizOptions.evidence?`; edges lacking the overlay are **kept** when no filter is set and
**dropped** when a filter is set, and the legend states how many were dropped for lacking
metadata; `evidence` is evaluated through `deriveEvidenceTags(beId)` for edges with a
numeric `beId`, never read from a row), `src/cli/commands/map.ts` (two flags),
`cli/README.md`. Owns (create): `tests/composition/graph-viz-filters.test.ts`,
`tests/cli/map-filters.test.ts`.
Tests: `--relation=approximation` on `--source=both` yields exactly the audited approximation
edges (count pinned from S1.5); the dropped-for-lack-of-metadata count is printed.

**BRIEF S2.5 — GR spine regimes (physics-literate)**
Wave 2. Owns (modify): the three GR spine catalog rows (BE-37, BE-51, BE-52) in
`src/bridges/index.ts`, **and their three graph edges** `be37Edge`, `be51Edge`, `be52Edge` in
`src/composition/edges/calibration.ts`, gain `regime` on the groups `r_s/r` and `v/c` (weak
field, slow motion) with bounds sourced from the confrontation's own inputs. Owns (create):
`tests/atlas/gr-spine-regime.test.ts`.
Test: the three `residualInSigma` values from `upt confront --json` (via `runCli`) for
be-37/51/52 equal the values pinned in the test to all printed digits (snapshot the numbers,
not the bytes; `tests/cli/golden/confront.txt` pins the text separately and must not change);
`regimeHolds` is true at each confrontation's inputs; row and edge regimes agree. **Lead wrap
runs `bun run catalog:json`.**

### S2 — Eve E2
Recompute the composed `(K, δ)` for the pendulum→spring→LC path; query past `16T0/θ0²`
through `upt path --at` and confirm the horizon reports violated; verify the three GR
residuals are unchanged to all printed digits; attempt to get a K-less edge into the middle
of a path through the CLI.

### S2 — Lead wrap
Standard, plus `catalog:json`; `cli/README.md` command tables and its "all N" sentences,
`CLAUDE.md`'s "19 data-bearing commands", and the registry count reconciled to one number
(the sprint adds two commands); `docs/architecture/DATAFLOW.md` gains the path query.

---

## Sprint 3 — Hyperedges, models, and the poster index (ROADMAP Phase 3, target v0.51–v0.52)

**Goal.** `Statement` and `Derivation` (many premises → one conclusion), the `Model` record
promoted from Sprint 0's `AtlasModel` (boundary/initial data, symmetry group),
`CanonicalEquation.model?`, the sixteen poster entries with hidden supporting nodes, all
fifteen Appendix A bridge lines typed as Appendix A types them, `upt map --source=poster`.

### S3.W0
**Lead L3.1 design note** `Atlas-Phase-3-Design.md`: `Statement { id; context: Context;
model: ModelId; ast?: ExprNode; sourceExpression: string; display: string }` with `Context`
carrying quantity types, gauge/frame choices, conventions, and assumptions;
`Derivation { id; premises: StatementId[]; conclusion: StatementId; sideConditions;
contextUnion }` where the union is **compatibility-checked** (convention conflicts via
`checkConventions`; incompatible assumptions are never pooled, Blueprint v2 §5.2 step 2);
the multicategory composition (only exact hyperedges compose; the result's premises are the
union minus internal conclusions); the `Model` record fields; the poster table (Blueprint v2
Appendix A) with, per entry, the existing `CE-*` id or "new L1 entry"; the hidden-node list
(action principle, Noether, full Maxwell set, Lorentz group, central limit theorem) each as a
`Statement` with its `sourceExpression`; and the fifteen Appendix A bridge lines with their
types exactly as ROADMAP Phase 3 now lists them.
**Scout SC3:** which of the sixteen poster entries already exist in `src/canonical/entries/`;
the `l1` and `nonmonomial.ts` patterns for adding L1 entries (the count was unpinned when this was written; `canonical-count-prose.test.ts` now pins it;
`tests/canonical/registry.test.ts` and `seed-l-layer.test.ts` compare against
`CANONICAL_EQUATIONS.length`, so the count lives only in `CHANGELOG.md`, `ROADMAP.md`, and
the architecture docs); whether `EinsteinFieldEquationNode` can be referenced from a
`Statement`; `buildVizModel`'s cluster/junction model for adding a `'poster'` source.
**Adam A3:** every poster edge type against Appendix A line by line; that `7 ↔ 16` is an
association for the historical link only and a hyperedge {full Maxwell, spacetime structure}
→ 16 otherwise; that `6 ↔ 13` carries self-adjoint + lower-bounded, with `V = 0` only for the
Gaussian kernel; that the hidden-node test is meaningful.

### S3 briefs (file scopes fixed at dispatch; structure below)

- **S3.0 `Model` record + `CanonicalEquation.model?`** (Wave 1) — `src/atlas/model.ts`
  promoting `AtlasModel` (adds `boundaryData`, `initialData`, `symmetryGroup?`),
  `src/canonical/canonical-equation.ts` (`model?: string`), tests; the nine Sprint 0 models
  migrate.
- **S3.1 statements + derivations + multicategory compose** (Wave 1) — `src/atlas/statement.ts`,
  `src/atlas/derivation.ts`, tests: composing `D1: {A, B} ⊢ C` with `D2: {C, E} ⊢ F`
  yields `{A, B, E} ⊢ F`; composing when `D2` does not consume `C` throws; a context union
  with a convention conflict throws; a union with contradictory assumption strings (declared
  via an `excludes` list on `Context`) throws.
- **S3.2 missing L1 canonical entries** (physics-literate, Wave 1) — only the poster entries
  SC3 reports absent, added via `l1` / `nonmonomial.ts` patterns with sources; the **doc**
  counts (CHANGELOG entry, ROADMAP §3, architecture docs) updated by the Lead at wrap; the
  report states the new `CANONICAL_EQUATIONS.length`.
- **S3.3 poster statements, hidden nodes, typed edges, associations** (physics-literate,
  Wave 2) — `src/atlas/poster/{statements,derivations,associations}.ts` and tests: sixteen
  statements each with a non-empty `context.assumptions` matching Appendix A; **all fifteen**
  Appendix A bridge lines, typed as ROADMAP Phase 3 lists them; `7 ↔ 16` (historical) and
  `3, 14 → *` in `associations`, not derivations; the chirped-Gaussian and Wick witnesses
  from Sprint 0 attached to `13 ↔ 4` and `6 ↔ 13`.
- **S3.4 hidden-node test + `upt map --source=poster`** (Wave 2) — `graph-viz.ts` poster
  source, `map.ts` flag, tests: removing `statement-noether` from the registry makes at least
  two derivations report a dangling premise (`validatePoster()` returns them); association
  edges render dashed (a string assertion on the Mermaid/DOT output).

### S3 — Eve E3
Line-by-line check of the sixteen qualifications and the fifteen typed edges against
Blueprint v2 Appendix A; attempt to find a poster edge recorded as a derivation that
Appendix A calls an association or approximation; confirm the doc counts were updated to the
measured `CANONICAL_EQUATIONS.length`.

---

## Sprint 4 — Verification workflow and checked bridges (ROADMAP Phase 4, target v0.53–v0.55)

**Goal.** The five-step workflow as code paths; symbolic witnesses through the optional MathTS
peer with `unresolved` on absence or timeout; numeric witnesses with convergence reported;
`formalRef` with a fidelity field; derived `formally-proved` / `symbolically-checked`;
diffusion and wave families; ≥ 20 bridges across ≥ 5 relation types.

**Scope rule.** The Sprint 0 curation-cost log sets the bridge count. If measured cost makes
20 unreachable in the sprint window, the Lead cuts the count in the design note and says so;
the exit criterion "≥ 5 relation types" is not cut.

### S4.W0
**Lead L4.1 design note**: the numeric `Witness` extension (`convergence?: { coarse: number;
fine: number; ratio: number }` from two resolutions); the rule that `symbolically-checked`
and `formally-proved` tags are **derived** from a committed results artifact
(`data/atlas/witness-results.json`, produced by a Lead-run script, never by a test) and never
hand-set; `formalRef { system: 'lean4-physlib' | 'other'; statement: string; version: string;
axioms: string[]; fidelity: 'two-formalizers' | 'back-translation' | 'sanity-lemmas' |
'unreviewed' }`; the applicability checker's side-condition rules (division needs nonzero;
squaring adds solutions; transcendental arguments dimensionless — the last already exists in
`validator.ts`); the "review and version" step as `reviewStatus` + a `revision` field; the
diffusion and wave family model lists; **how the peer-absent path is tested** (there is no
registry stub: the witness runner takes the parser as an injected parameter, defaulting to
`getFormulaParser()`, so tests pass `null` for the absent path and a stub for the present
path without touching the registry).
**Scout SC4:** `src/numerical/formula-registry.ts` (`getFormulaParser`, `getFormulaParserKind`,
`getFormulaDimensionChecker`, `parsePhysics`; module-private cache, no reset hook); the
skip-when-absent pattern in `tests/numerical/formula-mathts.test.ts` and
`tests/peers-required.test.ts` (`UPT_REQUIRE_PEERS`); how `compose-symbolic.ts` /
`expr-simplify.ts` degrade; the `it.skip`/`GL4_LONG` pattern for long tests;
`src/canonical/entries/fluids-waves.ts` diffusion/wave entries.
**Adam A4:** can any path set `formally-proved` without a reviewed `formalRef`; is
`unresolved` the outcome of every timeout and peer-absence path; does any test write to the
tree; does the injected-parser design leave the registry untouched.

### S4 briefs (structure)

- **S4.1 applicability checker** — `src/atlas/applicability.ts`: dimensions (existing
  validator), conventions (S1.4), side conditions (nonzero-divisor and squaring rules over the
  AST), model compatibility (premise models share a family or a declared bridge). Tests on
  synthetic ASTs: `a / b` without `b ≠ 0` side condition → finding; `x² = y²` → "adds
  solutions" finding.
- **S4.2 witness runners** — `src/atlas/witness-symbolic.ts`: `runSymbolicWitness(w, parser =
  getFormulaParser())`; with a parser, simplify `lhs − rhs` under a wall-clock budget and
  return `checked | unresolved`; with `null`, return `unresolved` with reason
  `'peer-absent'`. `src/atlas/witness-numeric.ts`: runs a numeric witness at two resolutions
  and records `convergence`. Tests inject a stub parser for the present path and `null` for
  the absent path; a third test runs the real registry under the skip-when-absent pattern.
- **S4.3 `formalRef`, results artifact, derived tags** — `scripts/emit-witness-results.mjs`
  (Lead-run) writes `data/atlas/witness-results.json`; a pin test deep-equals it against a
  fresh run (the `atlas-json` pattern). `deriveEvidenceTags` gains exactly two rules:
  `formally-proved` iff `formalRef.fidelity !== 'unreviewed'`; `symbolically-checked` iff the
  results artifact records `checked` for a symbolic witness of that bridge. Lint test: the
  string literals `'formally-proved'` and `'symbolically-checked'` may appear under
  `src/atlas/` **only** in `types.ts` and `derive-evidence.ts` (file allow-list, not an
  initializer heuristic).
- **S4.4 diffusion family** (physics-literate) — models (Fick, heat equation, random walk),
  bridges: random walk → diffusion (coarse-graining, with the `Δx²/Δt` closure), heat ↔
  diffusion (exact equivalence), Schrödinger free particle ↔ heat (analytic continuation,
  reusing Sprint 0 W5), each with witnesses and convergence; regime groups (Fourier number,
  Péclet where applicable).
- **S4.5 wave family** (physics-literate) — models (1D wave, d'Alembert solution, string,
  sound in a fluid), bridges: chain → wave (already), string → 1D wave (restriction),
  sound-speed relation (derivation from linearized Euler + adiabatic EOS, a **hyperedge** with
  two premises), dispersion-free limit; witnesses.
- **S4.6 five formal references** (physics-literate, out-of-tree work) — identify five
  statements among the ~20 bridges that have a checked counterpart in Physlib (or record
  `system: 'other'`); fill `formalRef` with `version` and `axioms`; fidelity set by a
  reviewer who has not seen the source (`back-translation`) or by sanity lemmas the brief
  writes as tests in `tests/atlas/formal-sanity.test.ts` (instantiate the statement on a
  known case). Any statement without a real checked counterpart is left without a
  `formalRef` and reported; the count target moves, the honesty rule does not.

### S4 — Eve E4
Attempt to obtain `formally-proved` on a bridge with `fidelity: 'unreviewed'`; run the
symbolic runner with `null` and confirm every witness reports `unresolved`; run `bun run
test:atlas` twice and confirm the tree is clean (no test writes an artifact); recompute two
diffusion and two wave witness numbers; count relation types across admitted bridges (≥ 5).

---

## Sprint 5 — The invalid-bridge benchmark (ROADMAP Phase 5, target v0.56)

**Goal.** A frozen, independently authored, taxonomy-balanced benchmark with a scorer no
`src/` file can import; κ reported from two named raters; pre-registered thresholds
including practical value and curation cost; an honest power report.

**Independence rule.** The items are authored by physicists who have not read
`src/atlas/`. Subagents may **not** author benchmark items. Subagents build the harness,
the scorer, the statistics, the leakage checks, and the pre-registration template, and they
may draft *candidate* items only into a `contested/` staging area that is excluded from the
frozen set until an independent author accepts or rewrites them. Every item carries an
`authorship` field (`'independent' | 'contested-draft'`) and the pre-registration note names
the two κ raters; the repo cannot enforce independence, so the note is the enforcement and
Eve checks it.

**Held-out family.** Must be a family **not encoded under `src/atlas/`** by Sprint 4, or the
atlas condition is scored on physics it already contains. Oscillators, diffusion, and waves
are all in-distribution. The held-out family is **first-order relaxation** (RC discharge,
Newton cooling, radioactive decay, viscous settling) and it must never be added to
`src/atlas/` while the benchmark is live (a test asserts no `model-*` id under `src/atlas/`
names it).

### S5.W0
**Lead L5.1 design note**: the eight failure kinds with one worked example each (drawn from
Blueprint v2 §7.2 and the Sprint 0 rejection); the item schema (`{ id; kind: 'valid' |
'invalid'; failureKind?; premises; conclusion; claimedRelation; family; renamedVariant?;
authorship; source }`); the held-out family fixed as above; the pre-registration note
template with all six Blueprint §7.3 criteria (false promotion = 0; invalid-bridge rejection
vs best LLM baseline, paired 95% interval excluding zero; recall at depth 10 vs embeddings;
abstention reported; **practical value** — time and error rate tracing a known derivation
with the atlas vs references; **curation cost** — person-hours per admitted bridge by type).
**Scout SC5:** the Family B fixture layout (`tests/fixtures/discovery/<case>/{public,scorer}/`,
five cases) and its `score.ts` contract; the probe's `serialize.ts` (`canonicalJson`,
`sha256Hex`, `hashCanonical`) for item hashing; `src/canonical/normal-form.ts`
(`normalForm(node: ExprNode): string`, `structurallyEqual(a, b)`) — items must therefore
carry an `ExprNode`, not only display text, for the leakage check to run.

### S5 briefs (structure)

- **S5.1 item schema + loader + leakage checks** — `tests/fixtures/atlas/benchmark/{public,scorer}/`,
  `src/atlas/benchmark/loader.ts` (reads `public/` only), tests: a scorer file mentioned in
  `src/` fails the import guard; an item whose `normalForm` collides with an in-distribution
  family item is flagged as leakage; renamed-variable variants are detected as the same item
  by normal form and must be in the **same** split; the held-out family is absent from
  `src/atlas/`.
- **S5.2 atlas condition runner** — `src/atlas/benchmark/run-atlas.ts`: for each item, run the
  applicability checker + composition table + regime check and emit `accept | reject |
  abstain` with the failure kind it detected; abstention is a first-class outcome.
- **S5.3 baseline runners (in-tree, deterministic)** — text retrieval (token overlap), symbol
  matching, typed structural search (normal-form match), and a recall-at-depth-10 scorer.
  Embeddings and LLM conditions are **out of process** via the probe's backend NDJSON
  protocol (`backend-protocol.ts`, `runBackendWorker`); this brief adds the request/response
  shapes only.
- **S5.4 statistics + power report** — `src/atlas/benchmark/stats.ts`: Wilson interval,
  McNemar paired test, Cohen's κ, and `powerReport(nPerClass)` that prints the interval the
  frozen set can afford; tests against textbook values (Wilson at 48/60 = 0.80 →
  [0.682, 0.882]; at 160/200 → [0.739, 0.850]; McNemar on a known 2×2; κ on a known
  confusion matrix).
- **S5.5 pre-registration note** (Lead-owned, not an agent): `docs/research/atlas-benchmark-
  preregistration.md` with thresholds, raters, and held-out family frozen **before** any
  condition runs; committed with the hash of the frozen item set.

### S5 — Eve E5
Recompute Wilson/McNemar/κ on the test cases; attempt to import a scorer from `src/`; check
that no held-out item shares a normal form with an in-distribution item and that the
held-out family is absent from `src/atlas/`; confirm the pre-registration commit precedes the
first results commit in `git log`; confirm every frozen item's `authorship` is
`'independent'`.

---

## Sprint 6 — Study, scoped release, discovery hypothesis (ROADMAP Phase 6, target v0.57+)

**Goal.** Run the seven conditions and the ablation; test the link-prediction hypothesis
once; publish the versioned export; governance; API review.

### S6 briefs (structure)

- **S6.1 condition orchestration** — `scripts/run-atlas-study.mjs` driving the in-tree
  conditions and the out-of-process ones through the backend protocol, logging versions;
  results to `docs/research/atlas-study-results.md` with the reproducer command per figure
  (house rule: every figure regenerates from a command); recall@10 and abstention per
  condition from S5.3/S5.4.
- **S6.2 ablation** — `types only / + assumptions / + dimensions & conventions / + regimes`
  as four configurations of the S5.2 runner; paired statistics per configuration.
- **S6.3 link prediction over the typed graph** — a deterministic structural predictor
  (common-premise / common-model neighbourhood) against the typed-search baseline on held-out
  known bridges; **one** result, stated as ROADMAP Phase 6 requires, no hub/gap claims beyond
  "hypothesis about the representation". Product A untouched (a test asserts `discovery.ts`
  is not imported by anything under `src/atlas/`).
- **S6.4 versioned export** — `data/atlas/atlas.json` (all families), JSON-LD projection
  with stable ids, QUDT/SI-DF identifiers where they resolve (a resolution table checked in;
  unresolved kinds left blank), PROV-O-shaped provenance; schema bump to `v1` only if a
  breaking field change happened; `atlas-json.test.ts` extended to the combined artifact.
- **S6.5 `upt atlas <id>`** — per-bridge report with every qualification visible
  (relation, side conditions, regime, bound + horizon, evidence tags with their witnesses,
  counterexamples, formalRef fidelity, `reviewStatus`); CLI count reconciled again in wrap
  (22).
- **S6.6 governance note** (Lead-owned) — `docs/planning/Atlas-Governance.md`: named
  maintainers per model family, the contested-entry policy, contribution by small PRs,
  licensing of data and code.
- **S6.7 API review (Lead + Adam)** — decide, symbol by symbol, what moves from `@internal`
  on the subpath to `@public` on `src/index.ts`; update `tests/api/public-surface.test.ts`
  and `public-tag-vs-index-invariant.test.ts` expectations; `package.json` stays `0.x`.

### S6 — Eve E6
Fresh-environment reproduction of every published check from a clean clone; verify the
paired statistics against the raw per-item outputs; verify that no output hides a
qualification (`upt atlas` on three bridges vs. their source records).

---

## 7. Cross-sprint test strategy

| Invariant | Pinned by | Sprint |
|---|---|---|
| Nothing under `src/` imports an atlas or discovery `scorer/` | `tests/atlas/import-graph.test.ts` | 0 |
| Every evidence tag on a bridge has a named, existing witness from the closed list | `tests/atlas/evidence-rule.test.ts` (word-boundary match) | 0 |
| Approximation bridges carry a horizon and a `horizonHolds` (type + admission) | S0.4 / S1.1 / S2.1 tests | 0–2 |
| `(K, δ)` composition is associative with identity `(1, 0)` (non-commutative triple) | `tests/atlas/error-algebra.test.ts` | 0 |
| Committed atlas JSON equals the live registry | `tests/atlas/atlas-json.test.ts` | 0 |
| No `@public` tag under `src/atlas/` before Phase 6 | `tests/api/public-tag-vs-index-invariant.test.ts` (existing) | 0 |
| K-less bound never in the middle of a path | `tests/atlas/path-bound.test.ts` | 2 |
| Composition table `no-composite-claim` cell count is pinned and named as conservative | `tests/atlas/composition-table.test.ts` | 1 |
| Edges without overlay compose byte-identically to today | existing `tests/composition/compose*.test.ts` unchanged | 1 |
| Only three (later five) rules derive evidence tags; tags never stored on rows; BE-35 gets all three | `tests/atlas/derive-evidence.test.ts` + file allow-list lint | 1, 4 |
| Row and edge `relation` / `regime` agree for every shared `beId`; no `status` changes | `tests/atlas/audited-catalog.test.ts`, `gr-spine-regime.test.ts` | 1, 2 |
| Committed catalog JSON equals the live registry after row edits | `tests/bridges/catalog-json.test.ts` (existing) | 1, 2 |
| 41 edges, 55 bridges, funnel pins 132/7/35/20/0/70 unchanged | existing pins | all |
| GR spine residuals unchanged after regimes | `tests/atlas/gr-spine-regime.test.ts` (numbers) + `tests/cli/golden/confront.txt` | 2 |
| Associations never rendered as graph edges | `tests/atlas/association.test.ts` | 1 |
| Hidden poster nodes are load-bearing | `validatePoster()` test | 3 |
| `formally-proved` requires reviewed `formalRef`; tests never write artifacts | allow-list lint + derivation test + E4 | 4 |
| Held-out family absent from `src/atlas/`; no normal-form collision across the split | S5.1 tests | 5 |
| Product A not imported by atlas | S6.3 import test | 6 |

## 8. Scheduling and cost notes

- Sprint 0 is three waves: W1 (2 agents) → W2 (3 agents) → W3 (1 agent), plus Scout, Adam,
  Eve. Six implementer dispatches total. Each W2 brief is sized to one agent session; if an
  agent reports it could not finish, the Lead splits the remaining witnesses into a W2b
  dispatch rather than extending the brief.
- Physics-literate briefs (S0.3–S0.5, S1.5, S2.5, S3.2–S3.3, S4.4–S4.6) should run on the
  strongest available implementer model; mechanical briefs (S0.2, S2.3, S2.4, S5.4) can run
  on a faster tier. The mapping is the Lead's call at dispatch and is recorded in the sprint's
  Review-Findings note.
- No sprint starts until the previous sprint's Eve items are closed and its curation-cost row
  is in the log. Sprint 4 and Sprint 5 scopes are set from that log, not from this plan.

## 9. Revision log

**Revision 2 (2026-09-20)** — after an independent adversarial review (Adam-role) and a
codebase-consistency audit of revision 1. Changes that alter what an implementer would do:

*From the adversarial review*
- S0.3 W2/W2b: the RLC match needs `R = 2` (revision 1 said `R = 1`, which gives
  `ζ = 0.125`); the counterexample is `R = 4`, not `R = 2` (which was the matching case).
- S0.4 W7: removed a self-contradictory "< 2e-6" clause; residual window is `[5.70e-6, 5.76e-6]`.
- S0.4 W7c: the RK4 cross-check asserts within 0.05° of the predicted 89.98° lag, against
  the linear oscillator's zero-crossing grid (revision 1 said "within 3° of 90°" with no
  reference grid).
- S0.4 W8b: the singular limit's lost initial condition shows in the **velocity**; position
  assertions now use the `O((1+v0)m)` matched-asymptotics offset (revision 1's `1e-3` and
  `> 1e-2` position assertions both fail as written).
- S0.5 W5: sup-norm ratio on a stated interval at `1e-4` (revision 1's pointwise `1e-6` is
  unachievable with second-order stencils and undefined at the zeros of `∂τφ`).
- S0.5 W9: tolerance 0.5% (5% could not fail).
- S0.1 W6: associativity triple chosen so the reversed order differs.
- S0.6: no JSON-Schema validator exists in the tree; replaced "validates against the schema"
  with the `catalog-json` deep-equal pin pattern plus a hand-rolled horizon check and a
  structural schema pin; the Lead, not the agent, commits the artifact; `atlas:json` added
  to the release procedure.
- S0.W1/W2: `tests/atlas/_ode.ts` (full typed signature) and `models.ts` moved to Wave 1 to
  remove a same-wave race; §0.3 now forbids same-wave dependencies outright.
- S0 types: `horizonHolds` (machine-checkable horizon, needed for the Phase 2 exit),
  `parameterRange`, `Witness`, `transformation` / `inverse`, `reviewStatus`; regime
  coordinates distinguish π-groups from dimensionless inputs (`ζ` is not a π-group; the
  inequality is on `m k / b²`); bridge endpoints fixed so the two-hop path exists.
- S1: S1.2 split into S1.2a (pure table, Wave 1) and S1.2b (compose guard, Wave 2) to remove
  a hidden same-wave dependency on S1.1; S1.4 moved to Wave 3 and now owns `compose.ts` and
  `recover.ts`; `evidenceTags` is derived only, never a row field; `catalog:json`
  regeneration added to S1/S2 wraps; coverage denominator excludes atlas families; the
  composition matrix is named a conservative under-approximation of §4.2 with four rows
  called out.
- S2: `regime?` on `BridgeEquationEntry`; `findPath` and `uncoveredRegions` assigned; GR
  residuals pinned as numbers, not bytes; CLI count reconciliation (README says 15, CLAUDE.md
  says 19) added to the wrap.
- S3: `Model` record and `CanonicalEquation.model?` given a brief (S3.0); all fifteen
  Appendix A lines; compatibility-checked context union.
- S4: witness results produced by a Lead-run script, never by tests; convergence recorded;
  lint rule is a file allow-list.
- S5: held-out family changed to first-order relaxation (waves are built in S4); `authorship`
  field and named raters; practical-value and curation-cost criteria restored; power report.
- S6: governance note (S6.6); recall@10 scored.

*From the codebase audit*
- Bridge ids are numbers everywhere (`deriveEvidenceTags(beId: number)`, `CONFRONTATIONS.has(37)`).
- BE-51 and BE-52 **have** graph edges; the edgeless set is 17 rows, and "13" is the
  AST-less set. S1.1's rationale, S2.5's owned files (`be37Edge`, `be51Edge`, `be52Edge`),
  and the L0.2 `CLAUDE.md` correction follow from this.
- BE-37 and BE-48 are `speculative`; S1.5 no longer calls the ten "established" and pins
  that no `status` changes.
- BE-35 is both confronted and rejected; S1.3 tests all three tags on it, no precedence.
- No parser-registry stub exists; S4.2 injects the parser as a parameter.
- SUPERSEDED: `canonical-count-prose.test.ts` now pins the canonical count in prose; S3.2
  updates the docs AND that gate holds them to the registry.
- `integrateRK4` exists in `null-ray-integrator.ts`; S0.2 keeps a local helper (trajectory
  sampling) and cross-checks the final state against it.
- The four readers of `package.json` `exports` are named in SC0; `modules.test.ts` was a
  dud pointer and is removed; `@public` tags under `src/atlas/` are forbidden by rule (§0.2
  item 10) because `public-tag-vs-index-invariant.test.ts` would fail.
- The oscillator dimension constants are module-local; S0.1 redefines them in
  `oscillators/dimensions.ts` and tests equality with the entries' `governing[]` values.
- Adjudication pairs are encoded in `id` as `a~b`; S1.4 splits on `~`.
- `confront.ts` signals bad values by throwing `CliError`; S2.3's gate says so.
- `tests/cli/golden/confront.txt` pins confront text; S2.5 must leave it unchanged.
- `emit-catalog-json.mjs` conventions spelled out for S0.6 (`pathToFileURL`, `packageVersion`,
  the extra `confrontations`/`adjudications` sections).

## Documents this plan will create (per sprint)

`docs/planning/Atlas-Phase-<n>-Design.md` · `docs/planning/Atlas-Phase-<n>-Review-Findings.md`
(Adam + Eve, verbatim) · the sprint's `ACTIVE.md` line · CHANGELOG entry · `ROADMAP.md` §7 row
update · for Sprint 5 and 6, the `docs/research/` pre-registration and results notes ·
`docs/planning/Atlas-Governance.md` (Sprint 6).
