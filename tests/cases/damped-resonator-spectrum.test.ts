/**
 * Proposal 17, test-side: the windowed linewidth of case-damped-resonator
 * from a SAMPLED spectrum. `windowedLinewidthHz` is a closed form of the
 * truncated ring-down that drops the negative-frequency pole (the Q ≫ 1
 * approximation) and locates the half-power point with MathTS `findRoot`.
 * The second method samples x(t) = e^{−αt} cos(ω_d t) on [0, T) at fs ≫ f0,
 * reads |X(f)|² with MathTS `goertzel` at any frequency, and finds the
 * half-power points on each side of the peak with `findRoot`. The sampled
 * spectrum keeps both poles, so at low Q it MEASURES the one the closed form
 * drops: that is a finding about the closed form, recorded as such.
 */
import { findRoot, goertzel } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { windowedLinewidthHz } from '../../src/cases/damped-resonator.js';

/** FWHM in Hz of the Goertzel power of the sampled ring-down, half-power points by Brent on each side of f_d. */
function sampledLinewidthHz(f0: number, Q: number, T: number, fs: number, sign = -1): number {
  const w0 = 2 * Math.PI * f0;
  const alpha = w0 / (2 * Q);
  const fd = f0 * Math.sqrt(1 - 1 / (4 * Q * Q));
  const N = Math.round(T * fs);
  const samples = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / fs;
    samples[i] = Math.exp(sign * alpha * t) * Math.cos(2 * Math.PI * fd * t);
  }
  const P = (f: number): number => goertzel(samples, f, fs);
  const half = P(fd) / 2;
  const width = Math.max(f0 / Q, 1 / T);
  const hi = findRoot((f) => P(f) / half - 1, fd, fd + 3 * width, { tol: 1e-13, xtol: 0, maxIter: 200 });
  const lo = findRoot((f) => P(f) / half - 1, Math.max(fd - 3 * width, 1e-9), fd, { tol: 1e-13, xtol: 0, maxIter: 200 });
  return hi - lo;
}

const alphaOf = (f0: number, Q: number): number => (2 * Math.PI * f0) / (2 * Q);

describe('case-damped-resonator — the windowed linewidth from the sampled spectrum (goertzel)', () => {
  const f0 = 1000;
  const fs = 320_000;

  it('Q = 1000, T = 1 s: the closed form and the sampled spectrum agree to 1e-7 (measured 2.4e-8)', () => {
    const closed = windowedLinewidthHz(alphaOf(f0, 1000), 1);
    const sampled = sampledLinewidthHz(f0, 1000, 1, fs);
    expect(Math.abs(sampled / closed - 1)).toBeLessThan(1e-7);
  });

  it('Q = 1000, T = 0.3 s (the record barely resolves the line): agree to 5e-6 (measured 5e-7)', () => {
    const closed = windowedLinewidthHz(alphaOf(f0, 1000), 0.3);
    const sampled = sampledLinewidthHz(f0, 1000, 0.3, fs);
    expect(Math.abs(sampled / closed - 1)).toBeLessThan(5e-6);
  });

  it('FINDING: Q = 50, T = 0.2 s — the sampled spectrum keeps the negative-frequency pole the closed form drops, and the two differ by 1e-5 to 1e-4 (measured 2.7e-5)', () => {
    const closed = windowedLinewidthHz(alphaOf(f0, 50), 0.2);
    const sampled = sampledLinewidthHz(f0, 50, 0.2, fs);
    const rel = Math.abs(sampled / closed - 1);
    expect(rel).toBeGreaterThan(1e-5);
    expect(rel).toBeLessThan(1e-4);
  });

  it('control: a closed form with α = ω0/Q (the factor 2 slipped) is caught by the sampled record, by O(1)', () => {
    const slipped = windowedLinewidthHz(2 * alphaOf(f0, 1000), 1);
    const sampled = sampledLinewidthHz(f0, 1000, 1, fs);
    expect(Math.abs(sampled / slipped - 1)).toBeGreaterThan(0.3);
  });

  it('negative result about a tempting control: a record mirrored in time (e^{+αt}) has the same |X(f)|, so it cannot be told apart', () => {
    const decaying = sampledLinewidthHz(f0, 1000, 0.3, fs, -1);
    const growing = sampledLinewidthHz(f0, 1000, 0.3, fs, +1);
    expect(Math.abs(growing / decaying - 1)).toBeLessThan(1e-5);
  });
});
