/**
 * PO-1 allocation diagnostic — `gl4Step` Picard-iteration overhead.
 *
 * Carried forward from v0.5.1 (deferred per `todo.md` → "Bench harnesses").
 * Measures the per-call cost of `gl4Step` on Mercury perihelion
 * canonical state — the hot path inside `integrateGeodesicGL4` whose
 * Picard inner solver allocates per-iteration `(x, p)` arrays.
 *
 * **What this bench is for**: providing a baseline that future allocator-
 * pressure refactors can compare against. If a future commit replaces the
 * Picard inner-loop's nested-array allocation with a `Float64Array` pool,
 * this bench's `gl4Step` mean-time should drop measurably.
 *
 * **What this bench is NOT**: a gate. Per v0.6.1 Design Decision #5,
 * informational-only — there are no threshold assertions.
 *
 * Initial conditions match `bench/geodesic-conservation.bench.ts` (Mercury
 * perihelion, canonical SI units). Inputs are built once outside the
 * bench callback (F4 discipline).
 *
 * @see src/numerical/gl4-integrator.ts  (gl4Step internals)
 * @see bench/geodesic-conservation.bench.ts  (IC reference)
 */
import { bench, describe } from 'vitest';
import {
  schwarzschildGInverseFn,
  schwarzschildDgInverseFn,
  schwarzschildRs,
} from '../tests/fixtures/schwarzschild.js';
import { gl4Step } from '../src/numerical/gl4-integrator.js';
import { C_SI, G_SI } from '../src/core/constants.js';

// ---------------------------------------------------------------------------
// Mercury perihelion IC (canonical, SI) — identical to geodesic-conservation.
// ---------------------------------------------------------------------------

const M_KG = 1.989e30;
const A_M = 5.79e10;
const E_ORB = 0.2056;

const r_s = schwarzschildRs(M_KG);
const r_p = A_M * (1 - E_ORB);

const c = C_SI;
const c2 = c * c;
const G = G_SI;

const L = Math.sqrt(G * M_KG * A_M * (1 - E_ORB * E_ORB));
const E = c * Math.sqrt((1 - r_s / r_p) * (c2 + (L * L) / (r_p * r_p)));

const X0: [number, number, number, number] = [0, r_p, Math.PI / 2, 0];
const P0: [number, number, number, number] = [-E, 0, 0, L];

// Step size: one orbit / 1000 steps (proper-time units)
const T_ORBIT = 2 * Math.PI * Math.sqrt((A_M * A_M * A_M) / (G * M_KG));
const H_STEP = T_ORBIT / 1000;

const G_INV_FN = schwarzschildGInverseFn(M_KG);
const DG_INV_FN = schwarzschildDgInverseFn(M_KG);

// ---------------------------------------------------------------------------
// Bench suite
// ---------------------------------------------------------------------------

const PICARD_OPTS = { picardTol: 1e-12, picardMaxIter: 50 };

describe('PO-1: gl4Step allocation diagnostic (Mercury perihelion)', () => {
  bench(
    'gl4Step — one step at Mercury perihelion',
    () => {
      // One step per invocation. Picard inner-loop allocates per
      // iteration; the bench accumulates allocator pressure across
      // iterations because each call's Picard solver may run 1-3 iters.
      gl4Step(
        { x: X0 as readonly number[], p: P0 as readonly number[] },
        H_STEP,
        G_INV_FN,
        DG_INV_FN,
        PICARD_OPTS,
      );
    },
    { iterations: 200, time: 5_000 },
  );

  bench(
    'gl4Step — 100-step batch (amortize bench overhead)',
    () => {
      // Batched form: 100 sequential steps with state-advance.
      // Lets the bench measure steady-state allocator cost rather than
      // per-call setup overhead.
      let state = { x: X0 as readonly number[], p: P0 as readonly number[] };
      for (let i = 0; i < 100; i++) {
        const result = gl4Step(state, H_STEP, G_INV_FN, DG_INV_FN, PICARD_OPTS);
        // Use the advanced state as the new starting point.
        // (Not a physically meaningful trajectory — bench-only.)
        state = { x: result.x, p: result.p };
      }
    },
    { iterations: 50, time: 10_000 },
  );
});
