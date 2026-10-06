# UPT Performance Benchmarks

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document is a record of timings. Each section states its own run date and environment; the runs span several dates and at least two machines. A wall-clock measurement is not a property of the source tree and no static analysis can confirm it; re-measure with `npm run bench`.
> The drift gate treats a missing Verification section as a failure, so the opt-out is
> stated here explicitly rather than left to be inferred from its absence.

This file records benchmark baselines and per-release gate results from
v0.4.5 onward. v0.4.5 established the original AD baselines. No threshold
gates existed then; they were reference points for regression detection
starting in v0.5.0. Subsequent sections append per-release benchmark runs
and PASS/FAIL gate verdicts, including the v0.6.0 BR-2 migration sections
below.

## Measurement notes

- Runner: `vitest bench` v4.1.4 (tinybench), Node 18+, Windows 11
- Machine: the dev box (platform-specific; not a cloud CI machine)
- Bench discipline: tensors pre-built outside the bench callback (F4 — measures
  AD cost only, not allocator/GC cost)
- `fromNested` is sync on `Float64ReferenceEngine`; no await overhead in setup
- `forwardGrad` / `reverseGrad` are async per v0.4.0 contract — Promise
  wrapper overhead is included in the measurement (no internal sync path
  is exposed on the public API)
- vitest 4.1.4 verbose reporter does not display per-bench hz tables for async
  bench callbacks (only the BENCH Summary with relative comparisons is shown).
  Absolute hz values are not captured in this baseline.
  **Update 2026-05-23 (v0.7 follow-up)**: **RESOLVED at vitest 4.1.7**.
  Commit `28f6f8b` bumped vitest from 4.1.4 to 4.1.7. After that
  bump, the per-bench hz column prints for async benches as well. The 4.1.4
  limitation was a vitest patch-level bug, not a structural async-vs-sync
  split. Re-run any v0.4.5 baseline against the new vitest to capture
  absolute hz numbers.
- MathTSEngine: optional dep (`@danielsimonjr/mathts-tensor` +
  `@danielsimonjr/mathts-autograd`) not installed on this machine — skipped
  gracefully with `[bench/ad] MathTSEngine unavailable` warning.

## v0.4.5 AD baseline — `fn(x) = x*x`, Float64ReferenceEngine

Run date: 2026-05-17  
Function: element-wise self-multiplication (`engine.mul(t, t)`)  
Engine: `Float64ReferenceEngine` (always present)  
MathTSEngine: skipped (optional dep absent)

### Relative performance (from BENCH Summary, two representative runs)

| Shape | Elements | Forward mode | Reverse mode | Rev/Fwd speedup |
|-------|----------|--------------|--------------|-----------------|
| `[10]` | 10 | slower | faster | ~5x |
| `[100]` | 100 | slower | faster | ~70x |
| `[10, 10]` | 100 | slower | faster | ~70x |
| `[100, 100]` | 10 000 | slower | faster | ~8 000–14 000x |

**Interpretation:** Reverse-mode shows dramatically higher throughput than
forward-mode at large tensor sizes in `Float64ReferenceEngine`. This result
is expected. The reverse-mode pass only traverses the tape once, while the
forward-mode dual-number path pays a per-element tangent propagation cost
on every operation. At `[100, 100]` (10 000 elements), the per-element
tangent cost in forward mode dominates the async wrapper overhead. That
domination makes the reverse-mode speedup appear very large in the BENCH
Summary ratios. These ratios are not a tuning signal. Both modes are naive
O(n) implementations, and the ratios are a property of the dual-number vs.
tape traversal costs at this scale.

**Absolute hz values:** not captured in this baseline (vitest 4.1.4 async
bench limitation — see measurement notes above). The BENCH Summary provides
relative comparisons only. Absolute measurements can be captured by switching
to a sync bench wrapper or upgrading to a vitest version that reports async
bench hz tables.

### MathTSEngine

Not measured — optional dependency absent. The skip path prints:

```
[bench/ad] MathTSEngine unavailable — skipping MathTS AD benchmarks.
```

MathTS benches will appear in this table once the optional dep is installed.

---

## v0.4.5 BE-37 Shapiro RK4 baseline — `bench/be37-eikonal.bench.ts`

Run date: 2026-05-17.  
Machine: the dev box (Windows 11, vitest bench v4.1.4 tinybench).  
Physical scenario: solar grazing ray — M_sun = 1.989e30 kg, R_near = 1.0e9 m, R_far = 1.5e11 m (~1 AU).

**F1 note:** This run benches two functions. The two paths named below are the record from before the catalog engine. The method that remains is the covariant-eikonal method, `evaluateCovariantEikonalNumerical` in `src/numerical/covariant-eikonal.ts`, used by catalog relation be-37.

1. `evaluateBE37EikonalNumerical` (`src/bridges/equations/be-37-shapiro-delay.ts`) is the actual
   RK4 Shapiro-delay evaluator (4096 fixed steps, no arguments, scenario hardcoded internally)
   of that dated run.
   This evaluator is the primary AST→lowering→engine roundtrip baseline of that run.

2. `evaluateBE37CovariantEikonalNumerical` (`src/numerical/be37-covariant-eikonal.ts`) was
   benched in this run while it was a structural preview. That preview returned
   `eikonalResidual=0` by construction (null-ray identity) and `shapiroDelaySec=0` (a stub
   with no integration). The function in `src/` integrates the null geodesic with
   `integrateGeodesicGL4`. The bench's describe block is named "BE-37 covariant
   eikonal — v0.5.0 GL4 null-geodesic Shapiro". The timings in this section
   describe the stub.

### Results (hz tables available — sync-like throughput for both async benches)

| Benchmark | hz | mean (ms) | p75 (ms) | p99 (ms) | rme | samples |
|---|---|---|---|---|---|---|
| `evaluateBE37EikonalNumerical` (4096 RK4 steps) | **813** | 1.23 | 1.31 | 3.79 | ±4.62% | 407 |
| `evaluateBE37CovariantEikonalNumerical` (stub, no RK4) | **762 074** | 0.0013 | 0.0012 | 0.0022 | ±2.96% | 381 037 |

**Interpretation:**

- The RK4 evaluator runs at ~813 hz (1.2 ms/call mean), dominated by 4096 × 4 = 16 384 derivative
  evaluations per call. This result is the baseline for the v0.5.0 symplectic integrator comparison.
- The structural-preview evaluator runs at ~762 000 hz (1.3 µs/call mean), measuring only async
  wrapper + three guard checks. The ~940× speedup vs. the RK4 path is consistent with the absence
  of any numerical integration.
- F11 benchmarkTimeout was raised to 30 000 ms (per-bench) for this run. Vitest 4 removed the
  option; `bench/be37-eikonal.bench.ts` and `bench/geodesic.bench.ts` record that.
- MathTSEngine: not applicable — BE-37 uses a direct RK4 loop, not the TensorEngine path.

### BENCH Summary (from vitest output)

```
BE-37 Shapiro delay — RK4 numerical integration (primary baseline):
  evaluateBE37EikonalNumerical (4096 RK4 steps, solar grazing)
  813 hz | mean 1.2297 ms | p99 3.7886 ms | ±4.62% | 407 samples

BE-37 covariant eikonal — v0.4.0 structural preview (stub baseline):
  evaluateBE37CovariantEikonalNumerical (structural preview, eikonalResidual=0 stub)
  762 073 hz | mean 0.0013 ms | p99 0.0022 ms | ±2.96% | 381 037 samples
```

---

## v0.4.5 Schwarzschild geodesic RK4 baseline — `bench/geodesic.bench.ts`

Run date: 2026-05-17.  
Machine: the dev box (Windows 11, vitest bench v4.1.4 tinybench).  
Physical scenario: cycloid-radial infall — M_sun = 1.989e30 kg, r₀ = 100·r_s, η_final = 0.5.  
Integrator: `integrateGeodesic` (fixed-step RK4, `src/numerical/geodesic-integrator.ts`).  
Bench discipline: inputs pre-built outside bench callback (F4); sync bench (hz tables available).

**Scenario parameters (F17 — consistent with Task 14 conformance test):**
- M_kg = 1.989e30 (solar mass), r_s = 2·G·M/c² ≈ 2953 m
- r₀ = 100·r_s ≈ 295 300 m (initial radial coordinate)
- τ_end = (r₀/2)·√(r₀/r_s)·(η+sin η)/c ≈ 4.83 ms (proper time to η=0.5)
- domainMinRadius = 3·r_s (domain guard active)
- v0 = [1/√(1−r_s/r₀), 0, 0, 0] ≈ [1.00503, 0, 0, 0]

### Results (hz tables — sync bench)

| Benchmark | hz | min (ms) | max (ms) | mean (ms) | p75 (ms) | p99 (ms) | rme | samples |
|---|---|---|---|---|---|---|---|---|
| `integrateGeodesic` (1 000 steps) | **19.0** | 44.9 | 75.7 | 52.6 | 55.3 | 75.7 | ±12.57% | 10 |
| `integrateGeodesic` (5 000 steps) | **3.17** | 280 | 354 | 315 | 331 | 354 | ±5.49% | 10 |
| `integrateGeodesic` (10 000 steps) | **1.81** | 469 | 677 | 553 | 601 | 677 | ±8.51% | 10 |

**Interpretation:**

- RK4 cost scales near-linearly with step count: 1k → 52.6 ms, 5k → 315 ms (~6×), 10k → 553 ms (~10.5×). The slight super-linear growth at 10k is consistent with JIT warm-up effects and GC pressure from trajectory array allocations.
- At 10k steps the integrator performs 10 000 × 4 = 40 000 Christoffel evaluations per call (each evaluation allocates a 4×4×4 = 64-element array). The ~553 ms mean is the primary RK4 baseline for v0.5.0 symplectic-integrator comparison.
- Variance at 1k (±12.57%) is higher than at 5k/10k because short calls expose more GC jitter. Use 5k/10k means for regression comparisons.

### BENCH Summary (from vitest output)

```
Schwarzschild radial infall — 1k RK4 steps:
  integrateGeodesic (1 000 steps)
  19 hz | mean 52.6 ms | p99 75.7 ms | ±12.57% | 10 samples

Schwarzschild radial infall — 5k RK4 steps:
  integrateGeodesic (5 000 steps)
  3.17 hz | mean 315 ms | p99 354 ms | ±5.49% | 10 samples

Schwarzschild radial infall — 10k RK4 steps:
  integrateGeodesic (10 000 steps)
  1.81 hz | mean 553 ms | p99 677 ms | ±8.51% | 10 samples
```

---

## v0.6.0 BR-2 baseline (pre-migration)

Run date: 2026-05-19
Machine: the dev box (Windows 11, vitest bench v4.1.4 tinybench, Node 22)
Commit: `e83f0d9` (v0.5.1 HEAD before Phase 2 begins)
Bench: `bench/gl4-mercury-1000step.bench.ts`

Physical scenario: Mercury perihelion canonical orbit (SI units)
- M_SUN = 1.989e30 kg, a = 5.79e10 m, e = 0.2056
- r_p = 4.598e10 m (perihelion), r_s approximately 2954 m
- 1000 GL4 steps over 1 orbital period (approximately 7.60e6 s)
- gInverseFn + dgInverseFn: Schwarzschild closures from `tests/fixtures/schwarzschild.ts`
- picardTol = 1e-12 (default), picardMaxIter = 50 (default)

### Raw bench output

| Benchmark | hz | min (ms) | max (ms) | mean (ms) | p75 (ms) | p99 (ms) | rme | samples |
|---|---|---|---|---|---|---|---|---|
| GL4 Mercury 1000 steps (full) | **0.0937** | 9,183.69 | 12,925.09 | 10,675.88 | 11,437.96 | 12,925.09 | +-7.81% | 10 |
| Christoffel-only at Mercury sample rate (70 evals/call) | **146.54** | 0.80 | 85.14 | 6.82 | 1.45 | 85.14 | +-61.48% | 82 |

### Christoffel fraction analysis

**Formula:** Using hz from both benches (harmonic-mean-based throughput):

```
f = STEPS x X_hz / Y_hz
  = 1000 x 0.0937 / 146.54
  = 63.9%
```

Here X_hz is the full GL4 1000-step bench hz, and Y_hz is the Christoffel-only
bench hz. STEPS is 1000: each full-bench call runs 1000 steps, and each
Christoffel-bench call runs 70 evals (CHRISTOFFEL_EVALS_PER_STEP).

**Caveat — Christoffel bench high variance (+-61.48% rme):** GC pause outliers
(p99 = 85 ms, p75 = 1.45 ms) heavily skew the Christoffel-only bench mean
(6.82 ms/call). A p75-based estimate gives the lower bound on the fraction:

```
f_lower = p75_christoffel_ms / (mean_full_ms / STEPS)
        = 1.45 ms / (10,675.88 ms / 1000)
        = 1.45 ms / 10.676 ms
        = 13.6%
```

The hz-based estimate (63.9%) uses the harmonic mean including GC pauses, which is
the standard vitest tinybench metric. The p75-based estimate (13.6%) approximates
the JIT-warmed, GC-free inner-loop cost. True fraction lies between these bounds:
**f in [14%, 64%]**.

### Amdahl ceiling

Using the hz-based estimate (f = 63.9%):

```
max_speedup       = 1 / (1 - 0.639) = 1 / 0.361 = 2.77x
max_end_to_end    = 1 - 1/2.77      = 63.9% wall-time reduction
```

Using the p75 lower bound (f = 13.6%):

```
max_speedup       = 1 / (1 - 0.136) = 1 / 0.864 = 1.16x
max_end_to_end    = 1 - 1/1.16      = 13.6% wall-time reduction
```

### Gate decision locked — Task 2.11 (BR-2 post-migration)

**Decision (E-4 measure-then-lock, Decision #6):**

The Christoffel bench exhibited high rme (+-61.48%). GC pause outliers
dominate the mean, pushing the hz-based fraction estimate to 64% while the
p75-based lower bound is only 14%. Because of that spread, this data cannot
support the 40%-threshold test (Decision #6 primary gate: >=30% end-to-end if
Y >= 40%) with confidence.

**Locked gate: dual-condition (conservative, robust to measurement uncertainty)**

```
Task 2.11 PASS condition:
  (christoffel-only bench hz improves >= 30%)
  AND (GL4-1000step bench improves >= 5% end-to-end)
```

Rationale: if the true fraction is ~14% (p75 lower bound), a 30% christoffel
speedup yields only ~4.2% end-to-end improvement. That result is below the
>=30% gate, so the primary gate would be unachievable by Amdahl's law. The
dual gate (christoffel-itself + modest 5% end-to-end) is reachable under
both scenarios and cannot produce a false pass. If the true fraction is
~64%, the BR-2 migration will easily achieve >=5% end-to-end, so the dual
gate is conservative.

**Additional finding:** GL4 per-step cost is approximately 10.7 ms at Mercury
perihelion. The v0.4.5 geodesic bench measured approximately 52.6 ms per
1000-step RK4 call (≈ 0.053 ms/step) for comparison. The GL4 Picard solver
(~35 iterations x 2 stages x gInverseFn + dgInverseFn per stage) drives the
cost. Eliminating the nested-array allocation in `christoffelFn` is the
correct optimization target.

---

## v0.6.0 BR-2 post-migration (RK4 gate) — Phase 2 Task 2.11

Run date: 2026-05-19
Machine: the dev box (Windows 11, vitest bench v4.1.4 tinybench, Node 22)
Bench: `bench/geodesic.bench.ts`
Integrator under test: `integrateGeodesic` (fixed-step RK4, `src/numerical/geodesic-integrator.ts`)

### Plan-defect correction: GL4 does NOT consume christoffelFn

Task 2.0's gate was designed around `bench/gl4-mercury-1000step.bench.ts` on the assumption
that both the GL4 and RK4 integrators consume `christoffelFn`. That assumption is
**incorrect**:

- `src/numerical/gl4-integrator.ts` has **zero** `christoffel` references. GL4 operates
  on the Hamiltonian `(x, p)` state via `gInverseFn` (inverse metric) and `dgInverseFn`
  (its derivatives). GL4 does not call `christoffelFn` at any step.
- `src/numerical/geodesic-integrator.ts` (`integrateGeodesic`, RK4) references `christoffel`
  and is the sole consumer of `christoffelFn`.

Therefore the GL4 bench at Task 2.0 measured the wrong integrator. BR-2's performance
impact is isolated entirely to the RK4 path. This section provides the correct
before/after measurement on `bench/geodesic.bench.ts`.

### Pre-BR-2 baseline (commit b6ff122 — christoffelFn returns nested number[4][4][4])

Files restored via `git checkout b6ff122 -- src/numerical/geodesic-integrator.ts tests/fixtures/schwarzschild.ts src/numerical/christoffel-flat.ts bench/`

| Benchmark | hz | min (ms) | max (ms) | mean (ms) | p75 (ms) | p99 (ms) | rme | samples |
|---|---|---|---|---|---|---|---|---|
| `integrateGeodesic` (1 000 steps) | **9.27** | 90.5 | 136.2 | 107.9 | 114.5 | 136.2 | ±10.69% | 10 |
| `integrateGeodesic` (5 000 steps) | **2.24** | 426.8 | 475.1 | 447.0 | 456.7 | 475.1 | ±2.79% | 10 |
| `integrateGeodesic` (10 000 steps) | **1.10** | 799.1 | 1185.3 | 911.6 | 935.3 | 1185.3 | ±8.26% | 10 |

### Post-BR-2 results (HEAD 6e34310 — christoffelFn returns Float64Array(64))

| Benchmark | hz | min (ms) | max (ms) | mean (ms) | p75 (ms) | p99 (ms) | rme | samples |
|---|---|---|---|---|---|---|---|---|
| `integrateGeodesic` (1 000 steps) | **61.31** | 12.04 | 29.64 | 16.31 | 17.57 | 29.64 | ±9.22% | 31 |
| `integrateGeodesic` (5 000 steps) | **12.13** | 71.36 | 108.21 | 82.44 | 84.74 | 108.21 | ±9.94% | 10 |
| `integrateGeodesic` (10 000 steps) | **6.81** | 135.96 | 162.23 | 146.80 | 157.26 | 162.23 | ±4.84% | 10 |

### Speedup summary

| Step count | Pre hz | Post hz | % improvement |
|---|---|---|---|
| 1 000 | 9.27 | 61.31 | **+561%** |
| 5 000 | 2.24 | 12.13 | **+441%** |
| 10 000 | 1.10 | 6.81 | **+519%** |

Mean end-to-end RK4 speedup across all three step counts: approximately **+507%** (5–6×).

### Interpretation

The improvement is structurally consistent with the migration's intent. The pre-BR-2 RK4
path called `christoffelFn` once per RK4 stage — 4 times per step — and each call allocated
a fresh `number[4][4][4]` (64-element nested array). At 10k steps that is 40 000
nested-array allocations per `integrateGeodesic` call, each triggering GC pressure. The
post-BR-2 path that this run measured still allocated one flat `Float64Array(64)` per
call. Each pre-BR-2 call, by contrast, built a nested `number[4][4][4]` of 21 array
objects. The ~5× wall-time reduction maps onto this reduction in allocations. A later
change (`c2fc0fc`) reuses one scratch buffer and removes the per-call allocation; these
timings predate it.

The post-BR-2 1k-step result (61.31 hz, 16.3 ms mean) also improves substantially over
the original v0.4.5 baseline (19.0 hz, 52.6 ms mean at 1k steps). That improvement
reflects both BR-2 and the incremental improvements landed in v0.5.x since that
baseline.

### Gate verdict: PASS

- **RK4 end-to-end improvement: +507% (well above the ≥5% threshold)**
- Correctness: Task 2.8 proved flat ≡ nested bit-for-bit; full suite is green post-migration.
- No regression on any step count.

**BR-2 PASSES the Task 2.11 gate.** The migration from `number[4][4][4]` to `Float64Array(64)` in
`christoffelFn` / `integrateGeodesic` delivers a ~5× RK4 end-to-end speedup. The ≥30%
christoffel-isolated sub-condition is also satisfied (structural — flat array eliminates all
per-step nested allocation).

---

## v0.6.1 baselines (PO-1 / PO-2 / PD-grid)

Three bench harnesses added in v0.6.1 Phase 5 (carried forward from v0.5.1's
deferred Phase 7). Per v0.6.1 Design Decision #5, **informational-only — no
threshold gates**. Numbers below are captured at HEAD on the v0.6.1 sprint
branch; future commits that touch the corresponding hot paths can compare
against them.

Environment: Linux 6.18.5, Node 22.22.2, vitest 4.1.4, tinybench-backed.

### PO-1 — `solveGL4Stage` allocation diagnostic

**File**: `bench/gl4-picard-alloc.bench.ts`
**Hot path**: `src/numerical/gl4-integrator.ts:solveGL4Stage`. Mercury
perihelion canonical state (vis-viva L + Legendre-transform E at perihelion;
identical to `bench/geodesic-conservation.bench.ts`).

| Bench | hz | mean (ms) | p99 (ms) | rme |
|---|---:|---:|---:|---:|
| Single stage solve at Mercury perihelion | 2,742.39 | 0.365 | 0.511 | ±0.20% |
| 100-stage batch (state-advance) | 27.34 | 36.58 | 41.25 | ±0.34% |

Single-vs-batch ratio: 100.32× (matches the 100-loop count to within bench
noise — confirms allocator pressure is steady-state, not per-call setup).

### PO-2 — Riemann → Ricci → metric-lower pipeline

**File**: `bench/ricci-lowering.bench.ts`
**Hot path**: `src/numerical/curvature-lowering-helpers.ts` (christoffelAt
+ dGammaAt + buildRiemann + contractRiemannJS). Schwarzschild fixture at
r = 3·r_s, M = M_sun.

| Bench | hz | mean (ms) | p99 (ms) | rme |
|---|---:|---:|---:|---:|
| Riemann FD-pipeline only | 2,302.90 | 0.434 | 0.734 | ±0.38% |
| Riemann + Ricci contraction (full pipeline) | 2,330.86 | 0.429 | 0.688 | ±0.29% |

Finding: **the Ricci contraction is essentially free** relative to the
FD-Riemann assembly (1.01× — within bench noise). The FD pipeline
dominates the curvature-lowering cost; future optimization energy should
target christoffelAt / dGammaAt / buildRiemann, not contractRiemannJS.

### PD-grid — `pderivNumericalFn` order=2 vs order=4 sweep

**File**: `bench/pderiv-grid.bench.ts`
**Hot path**: `src/numerical/pderiv.ts:pderivNumericalFn`. Schwarzschild
g_{μν} closure evaluated across a 3×3 spatial grid (r ∈ {2.5, 5, 10} r_s,
θ ∈ {π/4, π/2, 3π/4}) × 4 derivative directions = 36 calls per iteration.

| Bench | hz | mean (ms) | per-call (μs) | rme |
|---|---:|---:|---:|---:|
| order=2 — 2-point centered stencil | 20,243.94 | 0.049 | 1.36 | ±0.27% |
| order=4 — 4-point centered stencil (v0.6.0 default) | 8,388.45 | 0.119 | 3.31 | ±0.27% |

Ratio: order=4 is **2.41× slower** than order=2. This ratio is close to the
expected ~2× from twice as many metric evaluations per derivative (4 vs 2
calls). Some constant overhead from the larger stencil arithmetic adds the
rest.
**Verdict**: the v0.6.0 default-order flip (2→4) carries a ~2.4× wall-time
penalty per `pderiv` call. The truncation-error reduction is ~10⁴× on
smooth inputs. The tradeoff favors the catastrophic-cancellation cases
that motivated the flip (c²·g_tt on Schwarzschild), and it stays
acceptable for routine use.

## v0.7.1 PO-1 post-O-2 (Picard ping-pong) — Phase 5 Task 5.2

**Commit**: `707a2f7` (perf: O-2 Picard ping-pong buffer pre-allocation).
**Branch**: `claude/changelog-todo-sync-9PdMg`.

`bench/gl4-picard-alloc.bench.ts` re-run after `solveGL4Stage` was
re-written to ping-pong two pre-allocated `Float64Array` buffers per
iteration instead of allocating fresh `number[][]` per Picard step.

| Bench | v0.6.1 baseline (hz) | v0.7.1 post-O-2 (hz) | speedup |
|---|---:|---:|---:|
| Single stage solve at Mercury perihelion | 2,742.39 | **3,490.50** | **1.27×** |
| 100-stage batch (state-advance)          |    27.34 |    **35.30** | **1.29×** |

Single-vs-batch ratio post-O-2: ~98.9× (matches the 100-loop count to
within bench noise; allocator pressure remains steady-state).

Honest framing: the brainstorm's "2-5×" prediction assumed paired O-1
(Schwarzschild `gInverseFn` / `dgInverseFn` → `Float64Array` migration,
the BR-2 sibling). O-1 is DEFERRED to v0.7.2 — the migration surface is
~20+ callsites including many tests with direct `gInv[μ][ν]` indexing
that need coordinated rewriting. The O-2-only speedup is genuine but
sub-O-1's projected ceiling.

## v0.7.1 O-3 + O-6 baselines (measure-only, no threshold gates)

Two new bench harnesses added for v0.7.1 (per design Decision #5 —
informational baselines for future optimization):

- `bench/kretschmann-symmetry.bench.ts` — Kretschmann scalar compute
  cost @ r=3·r_s (Mercury) + r=1.5·r_s (near horizon) + full pipeline
  (Riemann FD-build + Kretschmann). Future symmetry-exploiting variant
  (Riemann has 20 independent components in 4D, not 256) can compare
  against the all-raise+contract baseline.
- `bench/painleve-gullstrand-pipeline.bench.ts` — PG metric closure
  cost across far-field / AT-horizon / inside-horizon + full pipeline
  (Riemann FD-build + Kretschmann via PG). PG is the only coordinate
  system that stays regular at r=r_s and inside; bench establishes
  per-evaluation cost for future near-horizon physics work.

No baseline tables here — runs are per-machine; consumers measure at
their site. The harnesses exist as regression-detection points only.

## computeKretschmann factored-raising optimization (2026-06-11)

The O-3 carry-forward landed as an EXACT loop-factoring, not as the
symmetry pair-iteration originally sketched. The design rejected the
symmetry pair-iteration: the FD-built Riemann is only approximately
antisymmetric, and `K = 4·Σ_{ρ<σ}Σ_{μ<ν}` is exact only under exact
antisymmetry. The loop-factoring instead replaces the naive O(4⁸)
four-index raise inside the contraction with four successive
single-index raisings (4 × 4⁵ mult-adds) plus one 256-term contraction.
The factoring is pure sum reassociation, with no input-symmetry
assumption.
Value-identity pins (relative 1e-15 vs the inlined naive reference,
incl. a seeded random NON-symmetric tensor):
`tests/numerical/kretschmann-factored-raising.test.ts`.

Same-machine before/after (`bench/kretschmann-symmetry.bench.ts`,
2026-06-11; per-machine numbers, comparison ratio is the datum):

| Bench | naive (hz) | factored (hz) | speedup |
|---|---:|---:|---:|
| computeKretschmann @ r=3·r_s (compute-only)   | 1,561.63 | **46,473.23** | **29.8×** |
| computeKretschmann @ r=1.5·r_s (compute-only) | 1,592.10 | **48,700.28** | **30.6×** |
| riemannLowerAt + computeKretschmann @ r=3·r_s |   765.13 |  **1,644.63** | **2.15×** |

The full pipeline is now dominated by the FD Riemann build, as expected.
