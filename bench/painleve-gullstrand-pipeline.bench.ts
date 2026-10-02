/**
 * O-6 baseline — Painlevé-Gullstrand metric pipeline (measure-only).
 *
 * Carried from v0.7.1 brainstorm-optimize.md candidate O-6. Establishes
 * the per-call cost of the PG metric closures (shipped in v0.7 follow-
 * up, closing the v0.6.0 near-horizon Kretschmann deferred item) and
 * the full PG → Riemann → Kretschmann pipeline.
 *
 * PG is the coordinate system that stays regular AT and INSIDE the
 * horizon (Schwarzschild coords are singular at r=r_s). This bench
 * exercises three regimes:
 *
 *   1. Far field (r = 10·r_s)   — should match Schwarzschild cost.
 *   2. AT horizon (r = r_s)     — Schwarzschild-coords-impossible.
 *   3. Inside horizon (r = 0.5·r_s) — Schwarzschild-coords-impossible.
 *
 * v0.7.1: no threshold gates — informational baseline only per design
 * Decision #5.
 *
 * @see src/numerical/painleve-gullstrand-metric.ts (PG closures)
 * @see src/numerical/curvature-lowering-helpers.ts (riemannLowerAt)
 * @see src/numerical/kretschmann.ts (computeKretschmann)
 */

import { bench, describe } from 'vitest';
import {
  painleveGullstrandGFn,
  painleveGullstrandGInverseFn,
} from '../src/numerical/painleve-gullstrand-metric.js';
import { schwarzschildRs } from '../tests/fixtures/schwarzschild.js';
import { riemannLowerAt } from '../src/numerical/curvature-lowering-helpers.js';
import { computeKretschmann } from '../src/numerical/kretschmann.js';
import { MathTSEngine } from '../src/numerical/mathts-engine.js';

const M_KG = 1.989e30;
const r_s = schwarzschildRs(M_KG);
const ENGINE = new MathTSEngine();
const N = 4;

const PG_G = painleveGullstrandGFn(M_KG);
const PG_G_INV = painleveGullstrandGInverseFn(M_KG);

const X_FAR: readonly number[] = [0, 10 * r_s, Math.PI / 2, 0];
const X_AT_HORIZON: readonly number[] = [0, r_s, Math.PI / 2, 0];
const X_INSIDE_HORIZON: readonly number[] = [0, 0.5 * r_s, Math.PI / 2, 0];

describe('O-6: PG metric closures (single-call cost)', () => {
  bench(
    'painleveGullstrandGFn @ r=10·r_s (far field)',
    () => { PG_G(X_FAR); },
    { iterations: 500, time: 3_000 },
  );

  bench(
    'painleveGullstrandGFn @ r=r_s (AT horizon)',
    () => { PG_G(X_AT_HORIZON); },
    { iterations: 500, time: 3_000 },
  );

  bench(
    'painleveGullstrandGInverseFn @ r=0.5·r_s (inside horizon)',
    () => { PG_G_INV(X_INSIDE_HORIZON); },
    { iterations: 500, time: 3_000 },
  );
});


// O-4 (2026-06-11): computeKretschmann now accepts the PG closures' flat
// Float64Array(16) layout directly — the v0.9.0 H-1 unflatten shim removed.

describe('O-6: PG full pipeline (Riemann FD-build + Kretschmann)', () => {
  bench(
    'riemannLowerAt + computeKretschmann @ r=10·r_s (PG far field)',
    () => {
      const R = riemannLowerAt(X_FAR, PG_G, PG_G_INV, N, ENGINE);
      computeKretschmann(R, PG_G_INV(X_FAR));
    },
    { iterations: 30, time: 5_000 },
  );

  bench(
    'riemannLowerAt + computeKretschmann @ r=1.5·r_s (PG near horizon)',
    () => {
      const X = [0, 1.5 * r_s, Math.PI / 2, 0] as const;
      const R = riemannLowerAt(X, PG_G, PG_G_INV, N, ENGINE);
      computeKretschmann(R, PG_G_INV(X));
    },
    { iterations: 30, time: 5_000 },
  );
});
