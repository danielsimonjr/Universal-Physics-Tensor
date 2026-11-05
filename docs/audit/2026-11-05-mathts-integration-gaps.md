# UPT ↔ MathTS integration gaps, 2026-11-05

A read of UPT `master` at `6c5a904c` (post-#578 / #580 unit thin layer) against the
**published npm latest** of `@danielsimonjr/mathts-*` on 2026-11-05 (America/Chicago).
This file is the review. Status that will move lives in `NOTES.md` or `ACTIVE.md`;
this document is the contract of what was measured today.

It does not authorize work. `ACTIVE.md` is the gate. It implements nothing, merges
nothing, and does not publish MathTS.

**Starting points, not rubber stamps.**
`docs/audit/2026-10-15-mathts-usage-review.md` and
`docs/plans/MATHTS_UNITS_AND_CASES_PLAN.md` named earlier gaps. Several of those
numeric items are **closed** on current npm (upper-tail `gammaincp`, `findRoot`
`xtol`, `quad` `atol`, day symbol `d`, refusal registry). Several unit-grammar
items are **still true** on latest core `0.21.1`. Discovery APIs (scalar search)
exist in MathTS now and did not when the October review was written.

**How this was checked.** UPT sources and tests under `src/` and `tests/`;
`package.json` / `bun.lock`; gap oracle `tests/dimensional/mathts-unit-gaps.test.ts`;
delegation suite `tests/numerical/mathts-delegation.test.ts`. MathTS behavior was
probed by installing latest packages **outside this tree** (`/tmp/mathts-probe`)
and by reading https://github.com/danielsimonjr/MathTS via the GitHub API
(`functions/src/scalar-search.ts`, `expression/src/scalar-enumerate.ts`,
`docs/plans/SYMBOLIC_REGRESSION_EXPANSION_PLAN.md`, MathTS `CHANGELOG.md`).
MathTS was not cloned into this repository.

Uncertainty is marked. A name that was not imported at runtime is not claimed
to work.

---

## 1. Current state — what UPT already delegates

UPT is a physics-formula and equation discovery engine. MathTS is the numeric,
symbolic-scalar, unit-scale, and tensor substrate. The public UPT names stay;
the implementations behind many of them already call MathTS.

### 1.1 Units

Thin wrapper over `@danielsimonjr/mathts-core` (not a direct `mathts-units`
dependency). Policy overrides live in `src/dimensional/mathts-unit-wrapper.ts`
and are pinned by tests that read both sides.

| What | MathTS symbol | UPT owner |
|---|---|---|
| Exact-scale arithmetic | `decimalExactScale`, `ratioExactScale`, `multiplyExactScales`, `divideExactScales`, `powerExactScale`, `addExactScales`, `exactScaleToNumber` | `src/dimensional/exact-scale.ts` |
| File scale expressions | `readScaleExpression` | `src/dimensional/unit-data.ts` |
| Agreed scales | `Unit.exactScale`, `getUnitRow`, `toSiDimensionVector`, `unitRowExactOffset` | `src/dimensional/mathts-unit-delegation.ts`, `units.ts` |
| Agreed spellings (A5 set) | `Unit.parse` | wrapper `A5_DELEGATED_TEXTS` |
| Log/ratio refusals | `REFUSED_UNIT_SPELLINGS` | wrapper; `data/units.json` keeps only `ton` |
| `H0_SI` factor | `Unit.exactScale('km/s/Mpc')` | `src/core/constants.ts` (tier 0; cannot import `convertValue`) |

**UPT overrides that remain (verified on core 0.21.1):** `ton` refused while
MathTS parses the US short ton (907.18474 kg); affine temperature inside a
compound refused (`degC/s`); sub-kilo parsec prefixes (`mpc`) stay local
(`SHORT_UP_ONLY` in MathTS); `bit` stays ln 2 on the 7-vector while MathTS
reports scale 1 on axis 8. Cycles stay a count: `convertValue('1 Hz', 'rad/s')`
is 1 with `cycles: 1`; MathTS `.to('rad/s')` is 2π.

### 1.2 Numerics and specials

`@danielsimonjr/mathts-functions` is the bulk import. The October review's
replacements still hold; `tests/numerical/mathts-delegation.test.ts` scans the
sources.

| Area | MathTS | Files |
|---|---|---|
| Formula parse / compile | `parse`, `compileExpr` | `src/numerical/formula-mathts.ts`, `formula-dimension.ts` |
| Scalar trees | `createScalarBuilder`, `evaluateScalar` | `src/composition/expr-eval.ts` |
| Simplify / gensym | `parse`, `simplify` | `src/composition/expr-simplify.ts`, `algebraic-equivalence.ts` |
| ODE | `solveODESystem` (`dt`), `gaussLegendre4` | `rk4-trajectory.ts`, `gl4-integrator.ts` |
| Roots / interp | `findRoot` (`xtol: 0` at perihelion), `hermiteInterp`, `median` | `perihelion-finder.ts`, `covariant-eikonal.ts`, `cases/methods.ts`, pendulum |
| Quadrature | `quad` (`atol: 0`), `rootsLegendre`, `legendreP`, `trapz` | `cases/quadrature.ts`, `numerical/quadrature.ts`, `atlas/diffusion/numerics.ts` |
| Specials | `ellipticK`, `jacobiSN`, `lgamma`, `gammainc`, `gammaincp`, `betainc`, `normalQuantile`, `normalCDF` | oscillators, probe study, benchmark stats, `discovery.ts` |
| Linear algebra (functions) | `inv`, `det`, `ols`, `matrixRank`, `rationalNullspace` | spacetime metrics, probe, Buckingham, canonical-compare |
| Stats / graph | `mean`, `std`, `linearRegression`, `propagateUncertainty`, `fisherExact`, `connectedComponents`, `bootstrapCI`, `permutationTest`, `studentTTest`, `gradient` | statistics, probe, axis-audit, link-prediction |
| Signal | `rfft` | `atlas/oscillators/position-translation.ts` |
| Eigenvalues | `eigvals` from **matrix** | `evaluator-uncertainty.ts`; atlas exact-propagators also import `DenseMatrix`, `matrixExpm` |
| Stable sums | core `pairwiseDot`, `pairwiseSum`, `norm2`, `sumSquaredDeviations` | retrieval, probe fit/structure |
| Rational | core `Fraction`; functions `gcd` | Buckingham, formula-shape, identifiability, exact-scale |
| RNG | `random`, `seedProbabilityRng` | `atlas/witness-symbolic.ts` |

### 1.3 Constants

Measured CODATA 2022 values are read from `@danielsimonjr/mathts-functions`
exports in `src/core/constants.ts` (`codata(...)`). Exact SI definitions stay
stated here. `src/dimensional/constant-rows.ts` names the MathTS export as the
second method.

### 1.4 Tensors and autograd

| Piece | Package | File |
|---|---|---|
| Rank-N `Tensor` engine | `mathts-tensor` | `src/numerical/mathts-engine.ts` (only engine; subpath export) |
| Forward / reverse AD | `mathts-autograd` (dynamic import) | same; `src/diff/bridge-ast-gradient.ts` |
| Finite-difference gradient | **not** MathTS | `src/diff/bridge-gradient.ts` → `finite-difference.ts` |

### 1.5 Expression / composition / discovery (already MathTS-backed)

UPT discovery is **not** symbolic regression today. `upt discover` vets quantity
identifications (`src/composition/discovery.ts`) with graph structure,
identifiability, and retrodiction; `normalCDF` is the only MathTS call in that
file. Formula-candidate search is the probe enumerator
(`src/composition/probe/generator.ts`): Buckingham monomials plus a power-law
fit via `ols`. Scalar evaluation of composed trees already lowers through
MathTS (`expr-eval.ts`).

### 1.6 Declared but unused in `src/`

`docs/architecture/INTEGRATION_MAP.md` is still right on this point:
**no file under `src/` imports** `mathts-wasm`, `mathts-parallel`, or
`mathts-workerpool`. They are required dependencies (historical peer-chain /
horizon). `mathts-functions` 0.72.0 itself depends on parallel and gpu; UPT
does not call those surfaces.

`INTEGRATION_MAP.md` §Local still says the unit table has “no direct MathTS
call.” That sentence is **stale** relative to #578/#580. The live owners are
the wrapper and delegation modules above.

---

## 2. Pin drift

UPT `package.json` ranges vs npm `latest` on 2026-11-05, and the versions
`bun.lock` actually resolved (regex on the lockfile; a lockfile can name a
package more than once).

| Package | UPT range | Lock resolved | npm latest | Drift |
|---|---|---|---|---|
| `mathts-autograd` | `^0.3.21` | 0.3.21 | **0.4.0** | minor floor behind; caret does **not** admit 0.4 |
| `mathts-core` | `^0.21.0` | 0.21.0 | **0.21.1** | patch; caret admits it |
| `mathts-expression` | `^0.11.1` | 0.11.1 | **0.12.1** | minor floor behind; caret does not admit 0.12 |
| `mathts-functions` | `^0.70.1` | 0.70.1 | **0.72.0** | two minors behind; caret **admits** 0.72 on a clean install |
| `mathts-matrix` | `^0.8.1` | 0.8.1 | **0.9.0** | minor floor behind |
| `mathts-parallel` | `^0.7.1` | 0.7.1 | **0.8.0** | minor floor behind; unused in `src/` |
| `mathts-tensor` | `^0.2.27` | 0.2.27 | **0.3.0** | minor floor behind |
| `mathts-wasm` | `^0.3.0` | 0.3.1 | 0.3.1 | lock already latest; unused in `src/` |
| `mathts-workerpool` | `^0.2.6` | 0.2.7 | **0.3.0** | lock on 0.2.7; latest is 0.3.0; unused in `src/` |

**Breaking risks that were actually checked**

- **Shared `Fraction` / `rationalNullspace`.** UPT Unreleased already records
  that core 0.21.0 dropped the prototype `isFraction` flag a 0.19.0
  `Fraction` carried, so a mixed core graph breaks Buckingham. Latest
  `mathts-functions@0.72.0` depends on `core ^0.21.1`, `expression ^0.12.1`,
  `matrix ^0.9.0`, `parallel ^0.8.0`. Raising only `functions` (which the
  `^0.70.1` caret allows) without the rest of that generation is the known
  break. One coordinated bump, one lockfile, is the safe UPT PR.
- **`toSiDimensionVector` returns `Fraction`s** (0.21.0 generation). Already
  adapted. 0.21.1 was not re-audited line-by-line; the unit probes on 0.21.1
  matched the 0.21.0 gap oracle.
- **Autograd 0.4.0 / tensor 0.3.0.** Not exercised against UPT
  `MathTSEngine` in this session. Treat as **unknown break risk** until the
  engine-conformance suite (`tests/numerical/engine-conformance.mathts.test.ts`,
  `mathts-autograd.test.ts`) runs on those minors. Do not bump them in the
  same PR as an unrelated docs or units change.
- **Functions 0.72 vs 0.70.1.** 0.72 is the published home of `searchScalars`
  / `runScalarSearch` and SR-1–SR-17. UPT 0.70.1 already has `gammaincp`,
  `xtol`, `atol` (landed at 0.68.3). The SR surface is what a bump buys for
  discovery; the shared-core hazard is what it costs if done alone.

`tests/tools/package-deps.test.ts` pins the nine ranges exactly. Any floor
move updates that table in the same PR.

---

## 3. Package map

Every published `@danielsimonjr/mathts-*` name found by `npm view` /
`npm search` on 2026-11-05, plus three packages `npm view` sees that
`npm search` did not list (`units`, `linalg`, `numbers`). Verdicts:

- **must** — UPT already depends, or a complete integration cannot proceed without it.
- **should** — take when the first caller exists; do not add as a declaration-only dep.
- **later** — real, but after must/should work or after a MathTS gap closes.
- **never** — wrong layer, duplicate of an existing import, or conflicts with UPT law.

| Package | npm | Verdict | Why |
|---|---|---|---|
| `mathts-core` | 0.21.1 | **must** | Units, `Fraction`, stable sums, `H0` scale. Already imported. |
| `mathts-functions` | 0.72.0 | **must** | Numerics, CAS-lite, constants, SR driver (`searchScalars`). Already imported. |
| `mathts-expression` | 0.12.1 | **must** | `createScalarBuilder`, `enumerateScalars`, grammar. Already imported. |
| `mathts-tensor` | 0.3.0 | **must** | Only `TensorEngine`. Already imported. |
| `mathts-autograd` | 0.4.0 | **must** | AST bridge gradients. Already imported (dynamic). |
| `mathts-matrix` | 0.9.0 | **must** | `eigvals` / `matrixExpm` at uncertainty and atlas sites. Already imported. |
| `mathts-units` | 0.7.0 | **later** | Re-export of the core `Unit` API (55 exports; same class names). Adding it duplicates `core` unless UPT drops the core unit imports. Prefer one owner (`core`) until MathTS documents a units-only surface UPT needs. |
| `mathts-expression` (SR half) | — | **should** (already have) | `enumerateScalars` / `ScalarGrammar` is the missing discovery substrate UPT's probe still reimplements as Buckingham monomials only. |
| `mathts-linalg` | 0.2.0 | **later** | Focused re-export (29 names: `svd`, `qr`, `lu`, `eig`, wasm twins). UPT already calls `inv`/`det`/`ols`/`rationalNullspace`/`eigvals` from functions/matrix. Take linalg only when a discovery path needs a decomposition functions does not export under the same contract. |
| `mathts-statistics` | 0.4.2 | **later** | 183 exports; SciPy-oracle package. Overlaps `functions` (`linearRegression`, `chiSquaredCDF`, …). Probe study already uses `gammaincp` / `betainc` from functions. Do not take a second copy of the same CDF. Revisit if a statistic exists **only** here and the probe needs it. |
| `mathts-numbers` | 0.1.23 | **never** | Re-export of `Fraction` / Complex / BigNumber. UPT already imports `Fraction` from core. A second `Fraction` constructor is the 0.21.0 identity bug again. |
| `mathts-parallel` | 0.8.0 | **later** | Unused in `src/`. MathTS SR worker scoring (`searchScalars` `parallel`) is the first honest caller. Keep as a transitive/required dep until that caller exists; do not invent a UPT thread pool. |
| `mathts-workerpool` | 0.3.0 | **later** | Same: unused; backs parallel. |
| `mathts-wasm` | 0.3.1 | **later** | Unused. Typed functions already dispatch wasm asynchronously (see §4). Do not call wasm from UPT until a measured hot path exists and the sync/`Float32` contract is closed. |
| `mathts-parser` | 0.1.29 | **never** | Focused re-export of `parse`. UPT already uses `parse` from functions. |
| `mathts-evaluator` | 0.1.28 | **never** | Focused re-export of compile/evaluate. Same as `compileExpr` / `evaluateScalar` already imported. |
| `mathts-ast` | 0.1.28 | **never** | Focused AST constructors. UPT's physics tree is `ExprNode` (`dimensional/ast-types.ts`), not MathTS `Node`. |
| `mathts-arithmetic` | 0.1.74 | **never** | Thin re-export of `add`/`multiply`. `Math.*` and functions already cover scalars. |
| `mathts-trigonometry` | 0.1.74 | **never** | Same. |
| `mathts-signal` | 0.1.74 | **later** | `rfft` already comes from functions. Take signal only if a DSP API is removed from functions. |
| `mathts-plot` | 0.4.17 | **never** (this program) | Headless SVG. Outward-facing; not discovery. Owner-only if a CLI plot is ever wanted. |
| `mathts-gpu` | 0.2.1 | **later** | Foundation only; already a functions/matrix dependency. No UPT kernel. |
| `mathts-workbook` | 0.5.3 | **never** | `.mtsw` notebook runtime. Not the catalog/CLI. |
| `mathts-compat` | 0.4.36 | **never** | mathjs compatibility. UPT left Path B / mathjs. Importing compat would reintroduce a second evaluator. |

`@danielsimonjr/typed-function` is published but is **not** a `mathts-*`
package. MathTS core/functions already depend on it. UPT should not take it
directly.

There is **no** `@danielsimonjr/mathts-symbolic-regression` (404 on npm).
SR lives in `expression` + `functions` by MathTS design (their
`scalar-enumerate.ts` comment, SR plan).

---

## 4. Gaps MathTS must close

Each row: UPT contract today, MathTS on **npm latest** (probed 2026-11-05
unless noted), impact on the discovery engine, suggested MathTS PR shape,
priority.

Priority: **P0** = wrong or unsafe result if ignored, or a pin that can
silently break; **P1** = blocks deleting a local grammar/enumerator UPT still
owns; **P2** = polish or optional convention.

### 4.1 Units

Verified on `@danielsimonjr/mathts-core@0.21.1` (same answers as the UPT gap
oracle against 0.21.0).

| ID | UPT contract | MathTS latest | Discovery impact | MathTS PR shape | P |
|---|---|---|---|---|---|
| U1 refusals | `dB`, `dBm`, `dBW`, `Np`, `Mach`, `mach` → `UnitRefusedError` with a reason | **Closed.** `REFUSED_UNIT_SPELLINGS`; `Unit.parse('dB')` throws “refused: …”. UPT wrapper maps that to its class | None remaining | None. Keep the wrapper class map | — |
| U2 `ton` | `UnitRefusedError` (short / long / metric) | Still parses US short ton, scale 907.18474 | A delegated parse would silently pick 2000 lb | Either refuse `ton` in MathTS with a reason, or export an ambiguous-ton result. Do **not** silently pick one convention | P2 |
| U3 affine compounds | `degC/s`, `1*degC` refused | `degC/s` parses as a temperature rate | A rate of an affine unit is not a well-defined SI scale without a reading mode | Refuse affine bases inside products/quotients, or require an explicit `absolute`/`difference` flag on parse | P1 |
| U4 difference temps | `convertValue('25 degC', 'K', 'difference')` = 25 | `.to('K')` / `.toSI()` always add offset (`1 degC` → 274.15). Offset is separately available (`unitRowExactOffset`) | Difference ΔT in catalog checks would shift by 273.15 if someone called `.to` | `to(target, { reading: 'difference' })` that omits offset; keep `.to` absolute | P1 |
| U5 glued products | `m2K` = m²·K; `Vs`, `cm^2/Vs`, `mmin`, `NN` parse | All `UnitParseError` “not found” | Applied-case and CLI literals UPT already admits would bounce off a fully delegated parser | Accept the same glued-product / glued-power grammar UPT `units.ts` documents; exact symbol still wins over a prefix (`mm` stays millimetre) | P1 |
| U6 Unicode superscript | `K²` = K^2 | `Unexpected "²"` | Same as U5 for printed units | Accept `¹²³⁻` on a factor | P1 |
| U7 ambiguous splits | `mol/mL`, `mAs` → `AmbiguousUnitError` naming both readings | `mol/mL` is one reading, 10⁶ mol/m³. `mAs` is “not found” | A single reading hides a dimensionally distinct split | Return ≥2 dimensionally distinct readings; do not pick one | P1 |
| U8 `bit` / ln 2 | `bit` is ln 2 nat, dimensionless 7-vector. `unit-convention.ts` uses that scale | Scale 1 on bit axis (index 8). `toSiDimensionVector` throws unless `{ ignoreExtra: true }`, and then the scale is still 1 | Every information quantity (Landauer, nat/bit) would change | A built-in **dimensionless information scale** (`bit = ln2` on the 7-vector), or a documented `Unit.parse` option. Adopting axis-8 scale 1 is a **breaking UPT change** and is not this program | P0 |
| U9 angle / Hz cycles | `convertValue('1 Hz','rad/s')` = 1, `cycles: 1`. Angular path multiplies by 2π | `exactScale('Hz')` = 1 (agrees). `.to('rad/s')` = 2π | Evaluator angular parameters would double-count 2π if `.to` were used | Keep `exactScale` cycle-free; if `.to` stays 2π, document it as angular conversion only. A `cycles` count on the result, matching UPT, is the integration closer | P1 |
| U10 sub-kilo `pc` | Every SI prefix on `pc` (`mpc` = pc/1000) | `kpc`/`Mpc`/`Gpc` parse; `mpc` “not found” (`SHORT_UP_ONLY`) | Cosmology literals (`mpc`) stay on the local grammar | Allow the full SI prefix set on `pc`, or export the prefix-set so UPT can apply it without a second splitter | P2 |
| U11 UPT-only / wider table | Admission is `data/units.json`. `furlong` is `UnknownUnitError` | Wider table (`furlong` scale 201.168, yard, mile, cup, …) | Widening admission changes CLI goldens and is a product choice | Do not ask MathTS to delete those rows. UPT keeps the admission list | — |
| U12 day `d` | `d` = 86400 s; `dm` = decimetre | **Closed** in 0.20.0 / 0.21.0. Probed: `d` = 86400 | None | None | — |

`Unit.createUnit` remains process-global. UPT must not call it (plan A; still
true). Missing spellings stay on `data/units.json` until they are built-in
rows.

### 4.2 Numerics

| ID | UPT contract | MathTS latest | Discovery impact | MathTS PR shape | P |
|---|---|---|---|---|---|
| N1 `gammaQ` / upper tail | χ² survival of a bad fit is the far upper tail | **Closed** since functions 0.68.3. Probed `gammaincp(5, 80)` = 3.24e-29 (nonzero). `chiSquaredCDF(160, 10)` is still 1 — **do not** read the tail as `1 − cdf` (`TOOLS.md`) | Probe study already calls `gammaincp` | Keep the direct-Q implementation; do not revert to `1 − P` | — |
| N2 `findRoot` `xtol` | Perihelion residual stop is `|P| ≤ tauTolerance`, not a width in `s` | **Closed.** `findRoot` source contains `xtol`. UPT passes `{ tol, xtol: 0 }` | None if callers keep `xtol: 0` on residual contracts | Keep `xtol` independent of `tol` | — |
| N3 `quad` `atol` | SI-scaled integrals (noise ~1e-13) need no absolute floor | **Closed.** `atol` exists; UPT passes `atol: 0` | Applied cases stay honest | Keep `atol` | — |
| N4 typed arrays / sync | Retrieval and probe pass `Float32Array` / `Float64Array` and need a number now | **Still open.** core `pairwiseDot(Float32Array)` works (probed 14). functions `mean(Float32Array)` throws `Unexpected type` (expected Array or Float64Array or Matrix). `TOOLS.md`: typed functions return a `Promise` for `Float64Array` | A discovery loop that calls typed `mean`/`dot` on embeddings or observation columns either throws or becomes async by accident | (a) accept `ArrayLike<number>` / `Float32Array` on the typed stats; (b) document which exports are sync JS vs async wasm; (c) never return `Promise` for a length-3 mean | P0 |
| N5 `leastSquares` vs soft singularity | Probe `solveWeighted` returns `null` on a scale-free near-singular pivot | `leastSquares` exists; October review: throws only on exact singularity, returns a number when nearly singular | A near-collinear basis would become a “fit” the holdout cannot falsify honestly | Equilibrated, pivoted solve that can return “singular” (not a silent huge coefficient). Optional; UPT can keep `solveWeighted` forever (§5) | P2 |
| N6 `solveParabolicPDE` | Atlas heat/wave witnesses use explicit stencils in the model’s own variables | `solveParabolicPDE` exists (export probed) | Using it would hide the dictionary under test | No MathTS change required. Do not wrap the atlas stencils | — |

### 4.3 Discovery APIs (what complete integration needs)

UPT’s discovery engine has three layers that could stand on MathTS. None of
them should become “call SR and believe the string.”

| Need | UPT today | MathTS latest | Gap | MathTS PR shape | P |
|---|---|---|---|---|---|
| D1 bounded expression search | `probe/generator.ts`: Buckingham monomials + optional `2π`; power-law `F = C Π π^a` via `ols` | `enumerateScalars` (`expression`) + `searchScalars` / `runScalarSearch` (`functions`). Grammar: `+ - * / ^`, `exp`, `log`/`ln`, `log2`, `log10`, `sin`/`cos`/`tan`, hyperbolic, `abs`; SR-10 adds `sqrt`, `atan`. Formula **strings** are rejected; callers build `ScalarNode` | No UPT import of `searchScalars`. Trees are a different type than `ExprNode`. No holdout protocol, no catalog-graph vetting | Keep SR string-free. Export a documented `ScalarNode` ↔ printable form. Optional: a hook that rejects a tree UPT’s `validate()` would reject | P1 |
| D2 dimensional admit | `dimensionallyDetermines` / 7-vector `Dimension` | SR-9: `inferScalarDimension`, `solveParameterDimensions`, `unitToRationalDimension`, opt-in `dimensions` on `searchScalars` (MathTS changelog). Uses MathTS’s **length-10** vector (angle, bit, solid angle) | Bit/angle mismatch (U8/U9) makes a raw MathTS dimension filter disagree with UPT admission | Accept a caller-supplied dimension equality (UPT passes 7-vector after overrides), or a `mapUnit` hook. Do not hard-code axis-8 `bit` | P1 |
| D3 composition | `enumerateCompositions` walks **bridge edges**, not expression trees | No graph-of-relations API | Correct: composition is UPT | None | — |
| D4 Buckingham | `buckingham.ts`: `Fraction` + `rationalNullspace`; denominator scan stays local (`Fraction.fromNumber` would accept irrationals) | Same primitives; no π-group printer, no “determines” predicate | Printer, unique-name check, and irrational refusal stay UPT | Optional: a `rationalNullspace` that accepts UPT’s 7-column integer matrix without a second `Fraction` brand | P2 |
| D5 candidate ranking | Probe fit (`ols` / `solveWeighted`), residual, permutation tests; discover uses retrodiction + `normalCDF` | `fitScalarParameters` (l2/l1/huber, LM/BFGS/Nelder-Mead), Pareto hall of fame, `paretoFront` / `selectFrontModel` | Attractive — and a **second method** problem if UPT both searches and scores with the same simplifier/fitter | If used, UPT must keep an independent holdout and the existing falsifiers. MathTS should keep ranking loss and refit loss documented as one objective (SR-3 already does) | P2 |
| D6 linalg for search | `ols`, `matrixRank`, `inv` | `mathts-linalg` decompositions; functions already has `svd`, `eig`, `leastSquares` | No missing primitive that blocks search | None until a measured need | P2 |
| D7 statistics package | functions CDFs / tests | `mathts-statistics` overlap | Dual CDFs would drift | MathTS: one owner per named distribution. UPT: stay on functions until that is documented | P2 |
| D8 tensor search | Engine is for metrics / AD, not formula search | `tensorEig`, `tensorSvd`, `contractNetwork` | Formula discovery is scalar. Tensor SR is out of scope | None | — |

`symbolicEqual` is **not** a discovery closer. UPT `algebraic-equivalence.ts`
deliberately uses `simplify` and refuses `symbolicEqual` because from 0.68.4
it is the same simplifier — not a second method (law 7).

---

## 5. Stay UPT-local forever

Verified in source. These must not move to MathTS.

| Item | Where | Why it stays |
|---|---|---|
| Kerr 2×2 Newton | `src/numerical/spacetime-metrics.ts` `solveSpherical` / `sphericalJacobian` | Explicit 2×2 determinant, scale-free singularity test (`\|det\| < 1e-18 · scale²`), geometrized units so a solar radius does not wipe the L-column. A typed `lusolve` whose return must be unpacked is the wrong honesty. Still local (October review; code unchanged in kind). |
| Weighted soft-singularity normals | `src/composition/probe/study.ts` `solveWeighted` | Equilibrated, partial pivot, returns `null` when a pivot is `< 1e-13`. MathTS `leastSquares` (October) throws only on exact singularity. A near-singular basis must not become a candidate coefficient. |
| Lattice / field stencils | `atlas/diffusion/numerics.ts` `heatFtcsCentre`; `atlas/waves/numerics.ts` `stringLeapfrogMidpoint`, `acousticLeapfrogQuarter` | Explicit FTCS / leapfrog in the **model’s own variables** so the dictionary under test never enters the solver. `solveParabolicPDE` would hide that. |
| Finite-difference bridge gradient | `src/diff/bridge-gradient.ts`, `finite-difference.ts` | Step `max(\|x\|, 1)·∛ε` with representable denominator `(x+h)−(x−h)`. MathTS `derivative` is symbolic; typed `gradient` takes samples, not a function of a named struct. AST-AD is already MathTS (`bridge-ast-gradient.ts`). |
| Scalar function table + dimension rules | `src/numerical/formula-contract.ts` `SCALAR_FUNCTIONS` | Arity, numeric body, and **dimension rule** for each documented function. MathTS has no physics dimension checker. `Math.sqrt` et al. are what MathTS itself calls for a scalar. |
| `ExprNode` + formula grammar | `dimensional/ast-types.ts`, validator | Physics tree, not MathTS `Node`. Lowering is already MathTS. |
| 7-vector `Dimension`, `siUnitOf`, `derivedUnitOf` | `algebra.ts`, `expr-print.ts` | No MathTS counterpart. `formatUnits` spellings do not round-trip through `parseUnit`. |
| Natural / geometrized conventions | `src/dimensional/natural-units.ts` | `--natural` (ħ = c = 1, h = 2π) and `--geometrized` (+ G = 1). Policy on which constants may be 1. MathTS has no object for this. |
| Quantity unit conventions | `unit-convention.ts` | Which quantity is spoken in GeV, bit, nat, or J/K. |
| Admission list, spelling notes, UPT error classes | `data/units.json`, wrapper | Product policy. MathTS’s wider table (`furlong`) must not widen UPT. |
| `bit` = ln 2 override | wrapper `applyBitScaleOverride` | Adopting MathTS axis-8 scale 1 is a breaking change to information quantities. |
| Cycles as a count | `convertValue` / evaluator-inputs | 2π is applied only when a parameter is marked angular. |
| Lean / PhysJS surfaces | `lean/`, `formal/lean/*`, `src/atlas/physjs-*.ts` | Formal evidence (`formally-proved`) is derived from reviewed `formalRef`s. MathTS is not a proof checker. Do not move theorems, the manifest, or the gate. |
| Catalog / atlas records | `data/bridge-catalog.json`, atlas models | Relations, regimes, witnesses. Not mathematics libraries. |
| Discovery vetting | `composition/discovery.ts` | Graph identifications, retrodiction, axis gates. SR must not replace this. |
| Buckingham irrational refusal | `buckingham.ts` denominator scan | `Fraction.fromNumber` continued-fraction would accept an irrational exponent. |
| Algebraic-equivalence method split | `algebraic-equivalence.ts` | Must not call `symbolicEqual` as a “second” check. |
| Applied-case catalog + methods | `data/applied-cases.json`, `src/cases/methods.ts` | Physics records and the integrals/roots/ODEs an expression cannot state. MathTS supplies `quad` / `findRoot` / `solveODESystem`; it does not own the cases. |
| Process-global `Unit.createUnit` | — | Forbidden. Two tables, two lifetimes. |

---

## 6. Recommended sprint order

Small, independently mergeable PRs. Two tracks. No PR in this list is opened
by this file.

### 6.1 UPT track

| # | PR | Notes |
|---|---|---|
| UPT-0 | **This document** | Docs only. |
| UPT-1 | Coordinated pin bump to the 0.21.1 / 0.72 generation **after** engine-conformance is green on a local install of latest tensor/autograd | One PR: `package.json` floors + `tests/tools/package-deps.test.ts` + `bun.lock`. Includes core 0.21.1, functions 0.72.0, expression 0.12.1, matrix 0.9.0, parallel 0.8.0, and **only if tests pass** tensor 0.3.0 / autograd 0.4.0 / workerpool 0.3.0. If tensor/autograd fail, bump the rest and leave those two floors. |
| UPT-2 | Delete unused **direct** deps `mathts-wasm`, `mathts-parallel`, `mathts-workerpool` **or** document the first `src/` import | Prefer delete if UPT-1 leaves them unused. Re-add when `searchScalars({ parallel })` is a real caller (UPT-5). Red first: package-deps test. |
| UPT-3 | Do **not** add `mathts-units` / `mathts-numbers` / focused re-exports | Negative PR: a test that `package.json` does not list them. Optional. |
| UPT-4 | Gap-oracle refresh only when a MathTS release closes U5–U7 or U3–U4 | Flip the corresponding `mathts-unit-gaps.test.ts` rows in the same PR that widens `A5_DELEGATED_TEXTS`. One grammar family per PR (glued, then ambiguity, then difference). |
| UPT-5 | Probe opt-in: `enumerateScalars` / `searchScalars` behind a flag, **admit** = UPT `validate` + 7-vector | Does not replace `generator.ts` in the same PR. Holdout and existing falsifiers stay. Atlas-blind if any benchmark item is authored. |
| UPT-6 | Lower more A5 texts that already agree (no MathTS wait) | Only texts the oracle already treats as agreements. |
| UPT-7 | After MathTS closes U5–U7: delete the local glued splitter / ambiguity authority | Plan A6/A7. Wrapper keeps admission, `ton`, `bit`, cycles, notes, error classes. |

Lean proofs and PhysJS wiring are not on this track.

### 6.2 MathTS track (owner publishes)

| # | PR | Closes |
|---|---|---|
| MT-1 | Document sync vs async vs wasm for typed stats; accept `Float32Array` on `mean`/`dot` or refuse with a sync alternative named in the types | N4 |
| MT-2 | Glued products + Unicode superscripts (`m2K`, `Vs`, `cm^2/Vs`, `K²`, …) | U5, U6 |
| MT-3 | Multiple dimensionally distinct readings (`mol/mL`, `mAs`) | U7 |
| MT-4 | Refuse affine units in compounds; `to(..., { reading: 'difference' })` | U3, U4 |
| MT-5 | Optional dimensionless `bit = ln2` (or parse option); do not break axis-8 callers | U8 |
| MT-6 | `cycles` on conversion results; keep `exactScale('Hz') === 1` | U9 |
| MT-7 | Full SI prefixes on `pc`, or export the prefix-set | U10 |
| MT-8 | `ton` refusal or ambiguous result | U2 |
| MT-9 | SR: caller-supplied dimension equality / `mapUnit` (7-vector) | D2 |
| MT-10 | `leastSquares` soft-singularity result (optional) | N5 |

Publish remains the owner’s job. UPT does not patch MathTS from this tree.

---

## 7. Out of scope / non-goals

- Implementing any row of §6 in this PR.
- Merging, tagging, npm publish, or a GitHub release of either repo.
- Moving Lean proofs or changing PhysJS / `formalRef` fidelity.
- Widening UPT admission to the whole MathTS unit table.
- Changing `bit` to axis-8 scale 1, or `convertValue(Hz → rad/s)` to 2π.
- Calling `Unit.createUnit`.
- Replacing `upt discover` vetting with `searchScalars`.
- Adding `mathts-compat`, `mathts-plot`, `mathts-workbook`, or focused
  re-export packages as declaration-only dependencies.
- Authoring atlas benchmark items from a session that has read `src/atlas/`.
- GPU kernels, notebooks, mathjs shims.
- Treating `INTEGRATION_MAP.md` as live status (it is architecture; the unit
  “no direct MathTS call” line is already behind the code).

---

## Counts (this document, 2026-11-05)

Open MathTS-must-close gaps with a priority assigned above:

| Priority | IDs |
|---|---|
| P0 | U8 (`bit`), N4 (typed arrays / sync) — **2** |
| P1 | U3, U4, U5, U6, U7, U9, D1, D2 — **8** |
| P2 | U2, U10, N5, D4, D5, D6, D7 — **7** |

Closed since the October review / units plan, re-verified today: U1 refusals,
U12 day `d`, N1 `gammaincp`, N2 `xtol`, N3 `atol`. Psi/torr prefixes and A5
delegation are UPT-side closures (#578/#580), not MathTS gaps.

---

## Could not verify

- Runtime of UPT `MathTSEngine` / autograd against `mathts-tensor@0.3.0` and
  `mathts-autograd@0.4.0` (packages installed in `/tmp`, not loaded into UPT
  tests).
- Line-level changelog of core `0.21.0` → `0.21.1` (probes matched 0.21.0
  oracle behavior; no breaking unit change seen).
- Whether `functions@0.70.1` (UPT lock) already exports `searchScalars`.
  Latest 0.72.0 does; the SR plan says SR-1–SR-17 are on MathTS `main`.
- Completeness of `npm search` (it omitted `units`, `linalg`, `numbers`;
  those were recovered with `npm view`). Other unscoped names were not
  invented.
- `mean(Float64Array)` return shape (typed-function object). The `Float32Array`
  refusal is the claim that matters.
- Whether MathTS `leastSquares` on 0.72.0 still matches the October
  near-singularity behavior (N5 marked P2 / optional).
