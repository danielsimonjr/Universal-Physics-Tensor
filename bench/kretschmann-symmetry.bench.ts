/**
 * O-3 baseline — Kretschmann scalar computation (measure-only).
 *
 * Carried from v0.7.1 brainstorm-optimize.md candidate O-3. Established
 * the baseline for the naive O(4⁸) all-raise + contract operation inside
 * `computeKretschmann`. RESOLVED 2026-06-11: the optimization landed as
 * exact loop-factoring (four successive single-index raisings, no
 * symmetry assumption — see src/numerical/kretschmann.ts), measured at
 * ~30× compute-only / ~2.15× full-pipeline on this harness; before/after
 * hz recorded in docs/architecture/benchmarks.md. The bench remains as
 * the regression-detection point.
 *
 * Schwarzschild Mercury-orbit territory: r = 3·r_s where Eve's
 * regression test points cluster, plus near-horizon r = 1.5·r_s where
 * Kretschmann magnitude blows up (regularity sanity check).
 *
 * v0.7.1: no threshold gates — informational baseline only per design
 * Decision #5.
 *
 * @see src/numerical/kretschmann.ts (computeKretschmann)
 * @see src/numerical/curvature-lowering-helpers.ts (riemannLowerAt)
 */

import { bench, describe } from 'vitest';
import {
  schwarzschildGFn,
  schwarzschildGInverseFn,
  schwarzschildRs,
} from '../tests/fixtures/schwarzschild.js';
import { riemannLowerAt } from '../src/numerical/curvature-lowering-helpers.js';
import { computeKretschmann } from '../src/numerical/kretschmann.js';
import { MathTSEngine } from '../src/numerical/mathts-engine.js';

const M_KG = 1.989e30;
const r_s = schwarzschildRs(M_KG);
const ENGINE = new MathTSEngine();
const N = 4;

const G_FN = schwarzschildGFn(M_KG);
const G_INV_FN = schwarzschildGInverseFn(M_KG);

// Pre-compute Riemann tensors at both bench points so the bench
// measures ONLY the all-raise + contract cost (computeKretschmann),
// not the FD-pipeline cost.
const X_MERCURY: readonly number[] = [0, 3 * r_s, Math.PI / 2, 0];
const X_NEAR_HORIZON: readonly number[] = [0, 1.5 * r_s, Math.PI / 2, 0];

const R_MERCURY = riemannLowerAt(X_MERCURY, G_FN, G_INV_FN, N, ENGINE);
const R_NEAR_HORIZON = riemannLowerAt(X_NEAR_HORIZON, G_FN, G_INV_FN, N, ENGINE);

// O-4 (2026-06-11): computeKretschmann accepts the fixture's row-major
// Float64Array(16) directly — unflatten shim removed.
const G_INV_MERCURY = G_INV_FN(X_MERCURY);
const G_INV_NEAR_HORIZON = G_INV_FN(X_NEAR_HORIZON);

describe('O-3: Kretschmann scalar (compute-only, Riemann pre-built)', () => {
  bench(
    'computeKretschmann @ r=3·r_s (Mercury orbit)',
    () => {
      computeKretschmann(R_MERCURY, G_INV_MERCURY);
    },
    { iterations: 200, time: 5_000 },
  );

  bench(
    'computeKretschmann @ r=1.5·r_s (near horizon, K-magnitude amplified)',
    () => {
      computeKretschmann(R_NEAR_HORIZON, G_INV_NEAR_HORIZON);
    },
    { iterations: 200, time: 5_000 },
  );
});

describe('O-3: Kretschmann scalar (full pipeline incl. Riemann FD-build)', () => {
  bench(
    'riemannLowerAt + computeKretschmann @ r=3·r_s',
    () => {
      const R = riemannLowerAt(X_MERCURY, G_FN, G_INV_FN, N, ENGINE);
      computeKretschmann(R, G_INV_MERCURY);
    },
    { iterations: 30, time: 5_000 },
  );
});
