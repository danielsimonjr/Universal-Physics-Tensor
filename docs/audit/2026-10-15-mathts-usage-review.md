# MathTS usage review, 2026-10-15

A read of `master` at `f0aa620` (10.0.0 plus the Lean move, #509) for the places where UPT computes something MathTS already states, and for the places where it should not. Each finding below says what was found, what was done, and, where MathTS could not carry the quantity, why it stays local. The measured table at the end is the record behind the one witness that moved. Status and counts that will change live in `NOTES.md`; this file is the review.

## What UPT already read from MathTS

Eighteen names from seventeen files: the formula parser and compiler (`parse`, `compileExpr`), the scalar builder and evaluator (`createScalarBuilder`, `evaluateScalar`), the classical RK4 and GL4 steps (`solveODESystem` with `dt`, `gaussLegendre4`), the Legendre nodes (`rootsLegendre`), the exact null space (`rationalNullspace` with core `Fraction`), the metric inverse and determinant (`inv`, `det`), the GUM propagation (`propagateUncertainty`), the eigenvalues of a correlation matrix (`eigvals`), the CODATA 2022 constants, the rank-N `Tensor` and the autograd tape. All of those stay.

## Findings, by what was done

### Replaced by the MathTS statement of the same quantity

| Where | Was | Now | Checked how |
|---|---|---|---|
| `atlas/oscillators/bridges-limits.ts` | a local AGM for `(2/π)K(sin(θ0/2)) − 1` | `ellipticK(sin²(θ0/2))`, whose route is the AGM (`K = π/(2·AGM(1, √(1−m)))`) | the Landen series to 9 places; the W7 witness and the 0.0158525311 edge value unchanged |
| `atlas/oscillators/pendulum-motion.ts` | the nome from two AGMs | `exp(−π K(cos²)/K(sin²))` from `ellipticK` | the small-amplitude nome `k²/16 + 8(k²/16)²` to 14 places |
| `composition/probe/study.ts` | a Lanczos `lnGamma`, a Lentz `betaCf`/`betaI`, a `gammaSeries` | `lgamma`, `betainc`, `gammainc` (lower tail) | the χ²₂, χ²₄ and F closed forms to 10–12 places, unchanged tests |
| `atlas/diffusion/numerics.ts` | `ln C(n, k)` as a sum of logs; a hand trapezoid | `lgamma`; `trapz` | the exact integer logarithm (table below); WD3b's exact Gaussian norm to 1e-9 |
| `atlas/benchmark/stats.ts` | `Z95 = 1.959963984540054`; `ln C(n, k)` as a sum of logs | `normalQuantile(0.975)`; `lgamma` | the textbook Wilson intervals; McNemar's `158/4096` to 12 places |
| `atlas/benchmark/hybrid-retrieval.ts` | a cosine loop | core `pairwiseDot` (pairwise summation; takes the frozen `Float32Array`) | a vector against itself is exactly 1; the frozen-vector ranking tests |
| `numerical/perihelion-finder.ts` | a median; a hand cubic Hermite | `median`; `hermiteInterp` on the two unit-interval nodes | the perihelion and round-trip tests, unchanged |
| `numerical/quadrature.ts` | `P₁₆'` by the three-term recurrence | `16(x P₁₆ − P₁₅)/(x² − 1)` on `legendreP` | Σ weights = 2 to 1e-15; the degree-31 exactness test |
| `cases/quadrature.ts` | an adaptive Simpson rule | `quad` (adaptive G7–K15), scaled to order one first | the resistor-noise and Brownian-sphere cases, unchanged |
| `cases/lumped-cooling.ts` | a bisection per eigenvalue; an RK4 loop | `findRoot` (Brent) on each `((k−1)π, kπ)`; `solveODESystem` with `dt` per step | the `(n+½)π` roots at Bi = 1 to 1e-14; the closed-form time to 1e-7 |
| `cases/damped-resonator.ts` | a bisection for the half-power point | `findRoot` on `power/half − 1` | `α/π` at a long window to 12 places |
| `atlas/oscillators/pendulum-motion.ts` | a bisection for θ0 of a period error; a secant for a zero crossing | `findRoot` on `err/eps − 1`; `findRoot` on the partial RK4 step | θ0 round trip to 12 places; the W7b/W7c phase witnesses |
| `composition/probe/structure.ts` | normal-equation sums for the log-log slope; mean loops | `linearRegression(...).slope` with core `sumSquaredDeviations` for the degeneracy test; `meanOf` | a power law recovered to 12 places |
| `composition/probe/fit.ts` | `Σ f y / Σ f²` and RMSE loops | core `pairwiseDot`; `norm2` of the residuals over √n | the probe family and module tests, unchanged |
| `composition/bridge-analysis.ts`, `cli/commands/derive.ts` | two copies of mean and coefficient of variation | one `ratioSpread` in `numerical/statistics.ts` (`mean`, `std` uncorrected), reached by the CLI through the barrel | the derive and bridge-analysis tests, unchanged |
| `dimensional/buckingham.ts` | a number-backed `Frac` with its own gcd | core `Fraction` (bigint-backed, reduced by its constructor); the denominator scan stays, because `Fraction.fromNumber`'s continued fraction would accept an irrational | the Buckingham tests, unchanged |
| `dimensional/exact-scale.ts` | a bigint gcd | `gcd` on its `bigint, bigint` signature | the exact unit-scale table against MathTS, unchanged |

Every typed MathTS function returns `unknown`; each site reads the number back with a `typeof` check and throws otherwise. No cast.

### Kept local, with the reason

- **The upper incomplete gamma** (`gammaQ` in `composition/probe/study.ts`). MathTS `gammaincp` is `1 − gammainc`, and `chiSquaredCDF` is built on the same subtraction, so both round a far upper tail to 0 (`gammaincp(5, 80)` = 0 where Q = 2.5e-28). The χ² p-value of a bad fit is that tail. The continued fraction stays, with its front factor from `lgamma`; the lower tail (`chiSquareCdf` below `x < a + 1`) is `gammainc`, which is the series there. MathTS PR: compute Q directly.
- **The perihelion residual bisection** (`bisectCubic`). MathTS `findRoot` has one `tol` and stops on `|b − a| < tol` as well as `|f| < tol`; `tauTolerance` is a residual tolerance in the units of dr/dτ, and the width stop would end the search at a bracket of `tauTolerance` in `s`, where the residual can be far above it. MathTS PR: a separate `xtol`.
- **The 2×2 Newton solve** of the Kerr spherical orbit (`spacetime-metrics.ts`): an explicit determinant with a scale-free singularity test reads more honestly than a typed `lusolve` whose return must be unpacked from a matrix kind. Not changed.
- **The scalar function table** (`numerical/formula-contract.ts`): `Math.sqrt`, `Math.exp` and the rest are what MathTS itself calls for a scalar. Not changed.
- **The finite-difference bridge gradient** (`diff/bridge-gradient.ts`): the step `max(|x|, 1)·∛ε` with the representable denominator is the central-difference optimum; MathTS `derivative` is symbolic, and its numeric `gradient` takes samples, not a function. Not changed.
- **The weighted normal equations** of the probe study (`solveWeighted`): equilibrated, pivoted, with a scale-free singular test that returns `null`. MathTS `leastSquares` forms the normal equations and throws on an exact singularity only; a near-singular basis would come back as a number. Not changed.
- **The lattice and field solvers** (FTCS heat, leapfrog string, acoustic): explicit stencils on a grid, written in the model's own variables so the dictionary under test never enters the solver. MathTS `solveParabolicPDE` would hide that. Not changed.

### MathTS defects found while reading it (reported upstream as a PR)

1. `gammaincp` and the distribution CDFs lose the far upper tail (above).
2. `findRoot` conflates the residual and bracket-width tolerances, and accepts a `NaN` endpoint value (`NaN · f(b) > 0` is false, so the sign check passes).
3. `quad` accepts a panel below an absolute error of 1e-14 whatever the integral's scale, so an SI-scaled integrand must be scaled by the caller.
4. The typed functions refuse a `Float32Array` and return a `Promise` for a `Float64Array`; the synchronous stable primitives live in `core` (`pairwiseDot`, `norm2`, `pairwiseSum`, `neumaierSum`, `sumSquaredDeviations`).

Items 2 and 3 are recorded in `TOOLS.md` ("How they lie") so the next reader does not rediscover them.

### Dependency ranges

`@danielsimonjr/mathts-matrix` `^0.7.8`, `-expression` `^0.10.2`, `-tensor` `^0.2.24`, `-autograd` `^0.3.18` (were 0.7.6, 0.10.0, 0.2.22, 0.3.16); `-functions` `^0.68.2` and `-core` `^0.18.0` were already the published latest. The lockfile was regenerated with `bun install`.

## Measured: the binomial logarithm

`ln C(n, n/2)` by the retired sum of logs and by `lgamma`, each minus the exact value (`Decimal(math.comb(n, n/2)).ln()` at 60 digits), 2026-10-15:

| n | exact | Σ ln error | lgamma error |
|---|---|---|---|
| 100 | 66.78384165201743 | +4.0e-15 | +4.0e-15 |
| 1 000 | 689.4672615678512 | +1.1e-12 | −1.8e-13 |
| 10 000 | 6926.640819060820 | +3.4e-11 | −1.5e-11 |
| 100 000 | 69308.73579940940 | −1.5e-9 | +4.9e-11 |

The comment that the sum was "exact enough for the n ≤ 10⁵ used here" was wrong by two orders at the top of that range. The witness WD1 (`ab-walk-diffusion`, 1000 steps) moved by 5.5e-9 relative in its fine error when the walk switched to `lgamma`, toward the exact value; `data/atlas/witness-results.json` was regenerated by `bun run atlas:witness-results`.

## Follow-up, the same day

The owner ruled that the session merges without waiting on review. MathTS #365 was merged, its changesets release (#366) merged, and Release run 1011 published `@danielsimonjr/mathts-functions@0.68.3`. UPT then moved to `^0.68.3` and retired the two copies the table above kept local: `gammaQ` is `gammaincp` (direct in the upper tail), the perihelion residual root is `findRoot` with `xtol: 0` (`rootOnCubic`; the search stops on `|P| ≤ tauTolerance` alone, the old contract), and `cases/quadrature.ts` passes `atol: 0` instead of scaling the integrand first. The "Kept local" list above is the record of the state before 0.68.3; after it, only the 2×2 Newton solve, the scalar function table, the finite-difference gradient, the weighted normal equations and the lattice solvers stay local, each for the reason given there. The delegation test's two scans were updated to the retired state and run green with the perihelion, probe, case and dependency-pin suites.

## How the review was done

A grep of every `@danielsimonjr/mathts-*` import under `src/`, a grep of every function whose name says it computes a statistic, a root, an integral or a special function, and a runtime probe of each MathTS candidate (call form, return type, and the value against a closed form) before any file changed. The source-scan test `tests/numerical/mathts-delegation.test.ts` was written first and proved red on the unchanged tree (eight failures, the log kept beside this note's commit); its value checks are second methods, computed from closed forms rather than from the routine they check.
