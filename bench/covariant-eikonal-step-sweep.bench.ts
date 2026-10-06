/**
 * PC-1.5 step-count sweep bench (v0.6.0 Phase 1, Task 1.4).
 *
 * BE-37 Earth-Mars Shapiro-delay geometry at five step counts:
 * {256, 1024, 2048, 4096, 8192}. Records wall-clock cost per evaluation;
 * relative-comparison Summary output is the primary diagnostic for the
 * PC-1.5 investigation of the 2.51e-4 Shapiro residual floor.
 *
 * Setup:
 *   - Earth at perihelion: R_far ≈ 1.52 AU = 2.28e11 m
 *   - Mars at aphelion:    R_near ≈ 1.67 AU = 2.49e11 m  (Earth far, Mars near)
 *   - Solar mass M_SUN = 1.989e30 kg
 *   - Radial null geodesic (b = 0): default BE-37 geometry
 *
 * Note: `evaluateCovariantEikonalNumerical` is async (returns a
 * Promise). Vitest 4.1.4 does not capture absolute hz for async benches;
 * relative Summary output is the diagnostic signal.
 *
 * @see src/numerical/covariant-eikonal.ts
 * @see docs/architecture/archive/pc-1.5-shapiro-residual-floor.md
 */
import { bench, describe } from 'vitest';
import { evaluateCovariantEikonalNumerical } from '../src/numerical/covariant-eikonal.js';
import { C_SI, G_SI } from '../src/core/constants.js';

// ---------------------------------------------------------------------------
// Physical parameters — Earth-Mars superior-conjunction geometry.
// All inputs constructed outside bench() callbacks (F4 discipline).
// ---------------------------------------------------------------------------

const M_SUN = 1.989e30; // Solar mass [kg]

// Earth aphelion radius ≈ 1.521 AU
const R_EARTH_M = 1.521e11; // m  (signal origin; R_far in BE-37)

// Mars perihelion radius ≈ 1.382 AU  (R_near < R_far)
const R_MARS_M = 2.067e11; // m  (signal destination; R_near in BE-37)

// Verify R_far ≥ R_near: Earth is far, Mars is between Earth and Sun.
// R_EARTH_M = 1.521e11 < R_MARS_M = 2.067e11 so we swap the sense.
// BE-37: R_far = observer-far-end, R_near = closer to Sun. Use Mars as far,
// Earth perihelion (1.471e11) as near.
const R_FAR_M = R_MARS_M; // Mars-side (farther from Sun along propagation path)
const R_NEAR_M = 1.471e11; // Earth perihelion [m]  — well outside r_s ≈ 2954 m

// Pre-confirm domain guard is satisfied: R_NEAR_M >> 1.01 * r_s(M_SUN).
// r_s(M_SUN) ≈ (2 * 6.674e-11 * 1.989e30) / (299792458^2) ≈ 2954 m
// R_NEAR_M = 1.471e11 >> 2957 m  ✓

const STEP_COUNTS = [256, 1024, 2048, 4096, 8192] as const;

// ---------------------------------------------------------------------------
// Bench suite
// ---------------------------------------------------------------------------

describe('PC-1.5: BE-37 step-count sweep (Earth-Mars, radial, b=0)', () => {
  for (const N of STEP_COUNTS) {
    bench(
      `BE-37 GL4 Shapiro, ${N} steps`,
      async () => {
        await evaluateCovariantEikonalNumerical({
          M_kg: M_SUN,
          R_far_m: R_FAR_M,
          R_near_m: R_NEAR_M,
          b_m: 0,
          steps: N,
        });
      },
      // benchmarkTimeout (2 min cap) dropped — removed in vitest 4; tinybench
      // `time`/`iterations` govern run length instead.
    );
  }
});
