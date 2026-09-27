/**
 * case-damped-resonator (audit §14 I20c). Second methods: RK4 integration of
 * m x″ + b x′ + k x = 0 for x(t) and the envelope, a numerical half-power search
 * on the driven response for the linewidth, and a direct discrete-time Fourier
 * transform of the sampled, truncated ring-down for the windowed linewidth.
 */
import { describe, expect, it } from 'vitest';
import { DAMPED_RESONATOR_CASE as C, windowedLinewidthHz } from '../../src/cases/damped-resonator.js';

const base = { f0_Hz: 1000, Q: 1000, x0_m: 1e-6, t_s: 0.1, t_obs_s: 20 };
const run = (i: Partial<typeof base> = {}) => C.run({ ...base, ...i });
const out = (i: Partial<typeof base> = {}) => run(i).outputs as Record<string, number | null>;
const failed = (i: Partial<typeof base>) => run(i).checks.filter((k) => !k.holds).map((k) => k.id);

/** RK4 on x″ = −(ω0/Q) x′ − ω0² x from (x0, 0). */
function rk4(f0: number, Q: number, x0: number, t: number, steps: number): number {
  const w0 = 2 * Math.PI * f0;
  const acc = (x: number, v: number) => -(w0 / Q) * v - w0 * w0 * x;
  const h = t / steps;
  let x = x0;
  let v = 0;
  for (let k = 0; k < steps; k++) {
    const k1x = v, k1v = acc(x, v);
    const k2x = v + (h / 2) * k1v, k2v = acc(x + (h / 2) * k1x, v + (h / 2) * k1v);
    const k3x = v + (h / 2) * k2v, k3v = acc(x + (h / 2) * k2x, v + (h / 2) * k2v);
    const k4x = v + h * k3v, k4v = acc(x + h * k3x, v + h * k3v);
    x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  }
  return x;
}

/** FWHM of a peaked function g on (0, ∞), by bisection either side of its maximum near `peak`. */
function fwhm(g: (w: number) => number, peak: number, span: number): number {
  const grid = 2000;
  let top = peak;
  for (let k = 0; k <= grid; k++) {
    const w = peak - span + (2 * span * k) / grid;
    if (w > 0 && g(w) > g(top)) top = w;
  }
  let [lo, hi] = [Math.max(top - (2 * span) / grid, 1e-12), top + (2 * span) / grid];
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 200; k++) {
    const a = hi - phi * (hi - lo);
    const b = lo + phi * (hi - lo);
    if (g(a) > g(b)) hi = b;
    else lo = a;
  }
  top = (lo + hi) / 2;
  const half = g(top) / 2;
  const edge = (from: number, to: number) => {
    let a = from, b = to;
    for (let k = 0; k < 100; k++) {
      const m = (a + b) / 2;
      if (g(m) > half) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  return edge(top, top + 4 * span) - edge(top, Math.max(top - 4 * span, 1e-12));
}

describe('case-damped-resonator — the ring-down', () => {
  it('envelope at 0.1 s: x0 e^{−πf0 t/Q}/√(1 − 1/(4Q²)) = 7.304e-7 m by hand', () => {
    const hand = (1e-6 * Math.exp((-Math.PI * 1000 * 0.1) / 1000)) / Math.sqrt(1 - 1 / 4e6);
    expect(out().envelope_m).toBeCloseTo(hand, 20);
    expect(out().envelope_m).toBeCloseTo(7.3040e-7, 10);
  });

  it('x(t) matches an RK4 integration of the equation of motion (Q = 5 and Q = 0.8)', () => {
    for (const Q of [5, 0.8]) {
      const x = out({ f0_Hz: 10, Q, x0_m: 0.02, t_s: 0.37 }).x_m!;
      expect(Math.abs(x - rk4(10, Q, 0.02, 0.37, 20000))).toBeLessThan(1e-12);
    }
  });

  it('|x(t)| never exceeds the envelope, and touches it within 0.1% once per half period at Q = 1000', () => {
    const f = { f0_Hz: 10, Q: 1000, x0_m: 1, t_obs_s: 1e4 };
    let max = 0;
    for (let k = 0; k <= 2000; k++) {
      const t = 3 + (0.05 * k) / 2000;
      const o = out({ ...f, t_s: t });
      expect(Math.abs(o.x_m!)).toBeLessThanOrEqual(o.envelope_m! * (1 + 1e-12));
      max = Math.max(max, Math.abs(o.x_m!) / o.envelope_m!);
    }
    expect(max).toBeGreaterThan(0.999);
  });

  it('the linewidth f0/Q is the exact FWHM of the velocity response |ω χ(ω)|², at Q = 2 as at Q = 100', () => {
    for (const Q of [2, 100]) {
      const w0 = 2 * Math.PI * 7;
      const velocity = (w: number) => (w * w) / ((w0 * w0 - w * w) ** 2 + ((w * w0) / Q) ** 2);
      expect(Math.abs(fwhm(velocity, w0, w0 / Q) / (2 * Math.PI) / out({ f0_Hz: 7, Q }).linewidth_Hz! - 1)).toBeLessThan(1e-9);
    }
  });

  it("control: the displacement response's FWHM is not f0/Q at Q = 2 (only for Q ≫ 1)", () => {
    const w0 = 2 * Math.PI * 7;
    const displacement = (w: number) => 1 / ((w0 * w0 - w * w) ** 2 + ((w * w0) / 2) ** 2);
    expect(Math.abs(fwhm(displacement, w0, w0 / 2) / (2 * Math.PI) / (7 / 2) - 1)).toBeGreaterThan(0.01);
  });
});

describe('case-damped-resonator — the finite record', () => {
  /** FWHM in Hz of the DTFT power of e^{−αt} cos(2π f_d t) sampled at fs over [0, T). */
  function dtftLinewidth(f0: number, Q: number, T: number, fs: number): number {
    const alpha = (Math.PI * f0) / Q;
    const fd = f0 * Math.sqrt(1 - 1 / (4 * Q * Q));
    const n = Math.round(T * fs);
    const xs = Array.from({ length: n }, (_, k) => Math.exp((-alpha * k) / fs) * Math.cos((2 * Math.PI * fd * k) / fs));
    const power = (w: number) => {
      let re = 0, im = 0;
      for (let k = 0; k < n; k++) {
        re += xs[k]! * Math.cos((w * k) / fs);
        im -= xs[k]! * Math.sin((w * k) / fs);
      }
      return re * re + im * im;
    };
    return fwhm(power, 2 * Math.PI * fd, 2 * Math.PI * Math.max(f0 / Q, 1 / T)) / (2 * Math.PI);
  }

  it('the windowed linewidth matches a direct DTFT of the sampled record, resolved (T = 20 s) and not (T = 0.5 s)', () => {
    for (const T of [20, 0.5]) {
      const ours = out({ f0_Hz: 50, Q: 50, t_obs_s: T, t_s: 0 }).linewidth_windowed_Hz!;
      expect(Math.abs(ours / dtftLinewidth(50, 50, T, 400) - 1), `T = ${T}`).toBeLessThan(0.01);
    }
  }, 60000);

  it('a long record recovers f0/Q; a short one tends to the sinc² width 0.8859/T', () => {
    expect(windowedLinewidthHz(Math.PI, 1e3)).toBeCloseTo(1, 12);
    expect(windowedLinewidthHz(1e-6, 2) * 2).toBeCloseTo(0.88589, 4);
  });

  it('the resolution check is conservative: at its threshold the record broadens the line by < 1e-9, at 1/t_obs = f0/Q by 16%', () => {
    expect(Math.abs(out({ t_obs_s: 10 }).windowed_excess!)).toBeLessThan(1e-9);
    expect(failed({ t_obs_s: 10 })).toEqual([]);
    expect(out({ t_obs_s: 1 }).windowed_excess!).toBeCloseTo(0.1633, 3);
    expect(failed({ t_obs_s: 1 })).toEqual(['resolved']);
  });

  it('a read-out after the record ends is refused', () => {
    expect(failed({ t_s: 21 })).toEqual(['in-record']);
  });
});

describe('case-damped-resonator — outside the underdamped premise', () => {
  it('Q = 0.3: the ring-down outputs are undefined (null), not extrapolated; the linewidth f0/Q is still exact', () => {
    const o = out({ Q: 0.3 });
    expect(o.x_m).toBeNull();
    expect(o.envelope_m).toBeNull();
    expect(o.f_d_Hz).toBeNull();
    expect(o.linewidth_windowed_Hz).toBeNull();
    expect(o.linewidth_Hz).toBeCloseTo(1000 / 0.3, 9);
    expect(failed({ Q: 0.3 })).toEqual(['underdamped', 'single-lorentzian']);
    expect(run({ Q: 0.3 }).unchecked.join(' ')).toMatch(/does not evaluate it/);
  });

  it('critical damping Q = 1/2 is not underdamped', () => {
    expect(failed({ Q: 0.5 })).toContain('underdamped');
    expect(failed({ Q: 0.5000001 })).not.toContain('underdamped');
  });

  it('refuses a non-positive frequency, Q or record, and a negative time', () => {
    expect(() => run({ f0_Hz: 0 })).toThrow(/f0_Hz must be/);
    expect(() => run({ Q: -1 })).toThrow(/Q must be/);
    expect(() => run({ t_obs_s: 0 })).toThrow(/t_obs_s must be/);
    expect(() => run({ t_s: -1 })).toThrow(/t_s must be/);
  });
});
