/**
 * The phase drift between the full pendulum and the linear oscillator,
 * MEASURED by integrating both with `_ode.ts` RK4 — independent of the
 * integrator in `src/atlas/oscillators/phase-translation.ts` and of any
 * closed form. Both are released from rest at `theta0`; each phase is read
 * off the zero crossings (crossing k at π/2 + kπ), with the angle variable
 * linear in time between them.
 *
 * @module tests/atlas/_phase-drift
 */
import { rk4 } from './_ode.js';

function crossings(accel: (x: number) => number, theta0: number, tEnd: number, steps: number): number[] {
  const { samples } = rk4((_t, y) => [y[1]!, accel(y[0]!)], [theta0, 0], 0, tEnd, steps);
  const out: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (a.y[0]! > 0 !== b.y[0]! > 0) out.push(a.t + ((b.t - a.t) * a.y[0]!) / (a.y[0]! - b.y[0]!));
  }
  return out;
}

function phaseAt(anchors: readonly number[], t: number): number {
  let pt = 0;
  let pp = 0;
  for (let k = 0; k < anchors.length; k++) {
    const p = Math.PI / 2 + k * Math.PI;
    if (t <= anchors[k]!) return pp + ((p - pp) * (t - pt)) / (anchors[k]! - pt);
    pt = anchors[k]!;
    pp = p;
  }
  return Number.NaN;
}

/** The measured lead of the linear phase over the pendulum's, at each pendulum crossing up to `tEnd`. */
export function measuredDrift(
  theta0: number,
  T0: number,
  tEnd: number,
  stepsPerPeriod: number,
): { t: number; drift: number }[] {
  const w2 = (2 * Math.PI / T0) ** 2;
  const steps = Math.ceil((tEnd / T0) * stepsPerPeriod);
  const pend = crossings((x) => -w2 * Math.sin(x), theta0, tEnd, steps);
  const lin = crossings((x) => -w2 * x, theta0, tEnd, steps);
  return pend
    .map((c, k) => ({ t: c, drift: phaseAt(lin, c) - (Math.PI / 2 + k * Math.PI) }))
    .filter((r) => Number.isFinite(r.drift));
}

/** The first time the measured drift reaches `tolerance`, interpolated between crossings; NaN if not by `tEnd`. */
export function measuredHorizon(theta0: number, T0: number, tolerance: number, tEnd: number, stepsPerPeriod: number): number {
  let prev = { t: 0, drift: 0 };
  for (const r of measuredDrift(theta0, T0, tEnd, stepsPerPeriod)) {
    if (r.drift >= tolerance) return prev.t + ((tolerance - prev.drift) * (r.t - prev.t)) / (r.drift - prev.drift);
    prev = r;
  }
  return Number.NaN;
}
