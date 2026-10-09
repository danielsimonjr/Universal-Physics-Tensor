# UPT Benchmarks

Benchmark suite for `universal-physics-tensor`. Uses [Vitest bench](https://vitest.dev/guide/features.html#benchmarking) (tinybench under the hood, already bundled with Vitest — no extra install).

## Requirements

- The test suite's Node floor, **Node ≥ 22.6** (`tests/node-floor.test.ts`; the published library's `engines.node` is 18, which is the floor of what ships, not of the development tools).

## Running

```sh
# Interactive benchmark run (human-readable output)
npm run bench

# One pass, written to bench/results.json (gitignored) for a side-by-side with an earlier run
npm run bench:ci
```

No CI job runs either command. `bench:ci` is a name, not a workflow: nothing collects
`bench/results.json`, and a regression does not break the build (see Philosophy).

## Files

The table is every `*.bench.ts` in this directory; a file missing from it, or listed and absent,
is a defect in this README.

| File | Purpose |
|---|---|
| `sanity.bench.ts` | Toolchain validation only. Benchmarks `Math.sqrt` — no UPT imports. Runs even with a broken build. |
| `ad.bench.ts` | Autodiff forward + reverse mode on `fn(x) = x·x`, across shapes `[10] … [100,100]`, on `MathTSEngine` (the MathTS packages are required dependencies). |
| `geodesic.bench.ts` | Schwarzschild radial-geodesic RK4 integration (cycloid-radial infall, `M = M_sun`, `r₀ = 100·r_s`) at 1k / 5k / 10k step counts. |
| `covariant-eikonal.bench.ts` | BE-37 Shapiro-delay RK4 eikonal evaluator — the 4096-step solar-grazing eikonal path vs. the covariant `evaluateCovariantEikonalNumerical` path. |
| `covariant-eikonal-step-sweep.bench.ts` | BE-37 covariant-eikonal evaluator swept across RK4 step counts (Earth–Mars superior-conjunction geometry) — probes the Shapiro residual-floor vs. step-count trade-off. |
| `null-ic-reconstruction.bench.ts` | PC-1.5 null-IC reconstruction-variance bench: 1000 machine-epsilon-scale perturbations of `g^{tt}` probe whether BE-37's null-IC `Math.sqrt` drives the ~2.5e-4 Shapiro residual floor. |
| `geodesic-conservation.bench.ts` | PC-1.5 conservation diagnostic: Mercury 100-orbit GL4 integration recording max `|ΔE/E|` and max `|ΔL/L|` (conserved-charge drift via Killing-vector contractions). |
| `gl4-mercury-1000step.bench.ts` | BR-2 profiling baseline: GL4 Mercury 1000-step integration, split into full-integrator vs. Christoffel-evaluation-isolated cases to measure the Christoffel share of GL4 wall-time. |
| `gl4-picard-alloc.bench.ts` | PO-1 allocation diagnostic: the per-call cost of `solveGL4Stage` (the Picard inner solver) on the Mercury perihelion state. |
| `kretschmann-symmetry.bench.ts` | O-3 baseline for the Kretschmann scalar (`computeKretschmann`), measure-only. |
| `painleve-gullstrand-pipeline.bench.ts` | O-6 baseline: the Painlevé–Gullstrand metric closures and the PG → Riemann → Kretschmann pipeline, measure-only. |
| `pderiv-grid.bench.ts` | `pderivNumericalFn` order 2 vs order 4 on a Schwarzschild spatial grid (the cost of the default-order flip). |
| `ricci-lowering.bench.ts` | PO-2 curvature-cost diagnostic: Riemann → Ricci → metric-lowering pipeline on a Schwarzschild fixture. |
| `weyl-lowering.bench.ts` | Weyl tensor assembly from a vacuum-like Riemann/Ricci fixture. |

## Philosophy

These benchmarks establish **baselines**, not thresholds. There are **no threshold gates that fail CI**; the baselines recorded in `docs/architecture/benchmarks.md` are read by a person, and a regression does not break the build.

## Exclusion from npm tarball

`bench/` is excluded from the published npm tarball. The `files` field in `package.json` whitelists `dist/`, `bin/`, `data/`, `README.md` and `LICENSE`; `scripts/package-smoke.mjs` (`bun run package:check`) checks the packed contents.
