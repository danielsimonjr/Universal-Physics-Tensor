/**
 * Atlas Phase 4, S4.5 — the numerics behind the wave family's witnesses.
 *
 * Each function evaluates one claim at a RESOLUTION, so the numeric witness
 * runner can record how the error shrinks under refinement. No function
 * asserts an order; the runner reports the ratio (Phase 4 design note §2.3).
 *
 * @module atlas/waves/numerics
 */

/** Parameters of the WS1 string fixture. @internal */
export interface StringFixture {
  /** Tension F. */
  readonly tension: number;
  /** Linear mass density μ. */
  readonly mu: number;
  /** Final time. */
  readonly tEnd: number;
}

/**
 * WS1 — the displacement at the midpoint `x = ½, t = tEnd` of a string of unit
 * length with fixed ends, from a leapfrog solution of `μ y_tt = F y_xx` written
 * in the string's OWN variables, starting from `y = sin(πx)` at rest.
 *
 * The comparison target, `sin(πx) cos(π c t)` with `c = √(F/μ)`, is the 1-D
 * wave equation's solution, so the pair tests the restriction's dictionary.
 * The Courant number `cΔt/Δx` is held at 1/2.
 *
 * @param cells - spatial intervals (made even so the midpoint is a node).
 * @internal
 */
export function stringLeapfrogMidpoint(cells: number, f: StringFixture): number {
  const nx = 2 * Math.ceil(cells / 2);
  const dx = 1 / nx;
  // Courant 1/2 from the string's own coefficients: Δt = ½ Δx √(μ/F).
  const dtMax = 0.5 * dx * Math.sqrt(f.mu / f.tension);
  const steps = Math.ceil(f.tEnd / dtMax);
  const dt = f.tEnd / steps;
  const r2 = (f.tension * dt * dt) / (f.mu * dx * dx);

  let prev = new Float64Array(nx + 1);
  let cur = new Float64Array(nx + 1);
  let next = new Float64Array(nx + 1);
  for (let i = 0; i <= nx; i++) prev[i] = Math.sin(Math.PI * i * dx);
  // First step from rest: y¹ = y⁰ + ½ r² δ²y⁰ (second-order start).
  for (let i = 1; i < nx; i++) {
    cur[i] = prev[i]! + 0.5 * r2 * (prev[i + 1]! - 2 * prev[i]! + prev[i - 1]!);
  }
  for (let n = 1; n < steps; n++) {
    for (let i = 1; i < nx; i++) {
      next[i] = 2 * cur[i]! - prev[i]! + r2 * (cur[i + 1]! - 2 * cur[i]! + cur[i - 1]!);
    }
    [prev, cur, next] = [cur, next, prev];
  }
  return cur[nx / 2]!;
}

/** Parameters of the WS2 d'Alembert fixture. @internal */
export interface DalembertFixture {
  readonly c: number;
  /** The point `(x, t)` the residual is evaluated at. */
  readonly x: number;
  readonly t: number;
  /** Base finite-difference step; the resolution divides it. */
  readonly h0: number;
}

/** The two profiles of WS2: deliberately different, so neither direction is trivial. */
const profileRight = (s: number): number => Math.exp(-s * s);
const profileLeft = (s: number): number => 0.5 * Math.exp(-((s - 1) * (s - 1)) / 0.5);

/**
 * The d'Alembert form `u = f(x − ct) + g(x + ct)` with the WS2 profiles.
 *
 * @internal
 */
export function dalembert(x: number, t: number, c: number): number {
  return profileRight(x - c * t) + profileLeft(x + c * t);
}

/**
 * WS2 — the finite-difference residual `|u_tt − c² u_xx|` of the d'Alembert
 * form at one point, step `h = h0/resolution` in both variables. Exactly zero
 * in the limit; the runner records how fast the estimate gets there.
 *
 * @internal
 */
export function dalembertResidual(resolution: number, f: DalembertFixture): number {
  const h = f.h0 / resolution;
  const u = (x: number, t: number): number => dalembert(x, t, f.c);
  const utt = (u(f.x, f.t + h) - 2 * u(f.x, f.t) + u(f.x, f.t - h)) / (h * h);
  const uxx = (u(f.x + h, f.t) - 2 * u(f.x, f.t) + u(f.x - h, f.t)) / (h * h);
  return Math.abs(utt - f.c * f.c * uxx);
}

/** Parameters of the WS3 acoustic fixture. @internal */
export interface AcousticFixture {
  /** Ambient pressure p₀. */
  readonly p0: number;
  /** Ambient density ρ₀. */
  readonly rho0: number;
  /** Adiabatic index γ. */
  readonly gamma: number;
  readonly tEnd: number;
}

/**
 * The adiabatic equation of state `p(ρ) = p₀ (ρ/ρ₀)^γ` — the SECOND premise of
 * the sound-speed hyperedge — and its derivative at `ρ`.
 *
 * @internal
 */
export function adiabaticSlope(rho: number, f: AcousticFixture): number {
  return (f.gamma * f.p0 * Math.pow(rho / f.rho0, f.gamma - 1)) / f.rho0;
}

/**
 * WS3 — the pressure perturbation at `x = ¼, t = tEnd` from a staggered
 * leapfrog solution of the LINEARIZED EULER equations
 * `∂ρ′/∂t = −ρ₀ ∂v/∂x`, `ρ₀ ∂v/∂t = −∂p′/∂x`, closed by the ADIABATIC EOS
 * `p′ = (dp/dρ)|ρ₀ ρ′`, on a periodic unit domain from `p′ = sin 2πx` at rest.
 *
 * Both premises enter in their own form: the Euler pair steps `ρ′` and `v`,
 * and the only link from `ρ′` to `p′` is {@link adiabaticSlope}. The
 * comparison target `sin(2πx) cos(2π c t)` with `c² = γ p₀/ρ₀` is the SOUND
 * model's solution, so the pair tests the hyperedge's derivation.
 *
 * @param cells - grid intervals (made a multiple of 4 so `x = ¼` is a node).
 * @internal
 */
export function acousticLeapfrogQuarter(cells: number, f: AcousticFixture): number {
  const nx = 4 * Math.ceil(cells / 4);
  const dx = 1 / nx;
  const slope = adiabaticSlope(f.rho0, f);
  const cMax = Math.sqrt(slope);
  const dtMax = (0.5 * dx) / cMax;
  const steps = Math.ceil(f.tEnd / dtMax);
  const dt = f.tEnd / steps;

  // ρ′ at nodes i·Δx; v at half-nodes (i + ½)Δx, periodic.
  const rho = new Float64Array(nx);
  const v = new Float64Array(nx);
  for (let i = 0; i < nx; i++) rho[i] = Math.sin(2 * Math.PI * i * dx) / slope;
  const pressure = (i: number): number => slope * rho[(i + nx) % nx]!;
  // Half step from rest: v^{1/2} = −(Δt/2ρ₀) ∂p′/∂x.
  for (let i = 0; i < nx; i++) v[i] = (-(0.5 * dt) / f.rho0) * ((pressure(i + 1) - pressure(i)) / dx);
  for (let n = 0; n < steps; n++) {
    for (let i = 0; i < nx; i++) {
      const dv = (v[i]! - v[(i - 1 + nx) % nx]!) / dx;
      rho[i] = rho[i]! - dt * f.rho0 * dv;
    }
    if (n < steps - 1) {
      for (let i = 0; i < nx; i++) v[i] = v[i]! - (dt / f.rho0) * ((pressure(i + 1) - pressure(i)) / dx);
    }
  }
  return pressure(nx / 4);
}

/**
 * Speed of sound from the adiabatic (Laplace) and isothermal (Newton) closures.
 *
 * @internal
 */
export function soundSpeeds(p0: number, rho0: number, gamma: number): {
  readonly adiabatic: number;
  readonly isothermal: number;
} {
  return { adiabatic: Math.sqrt((gamma * p0) / rho0), isothermal: Math.sqrt(p0 / rho0) };
}

/**
 * Relative phase-velocity error of the Klein–Gordon mode against the
 * dispersion-free wave: `√(1 + (ω₀/(c k))²) − 1`.
 *
 * This is the exact quantity the approximation bound of `ab-klein-gordon-wave`
 * is stated in; it is increasing in `ω₀/(c k)`, so its value at the edge of the
 * declared range is the supremum over the range.
 *
 * @internal
 */
export function kleinGordonPhaseError(omega0: number, c: number, k: number): number {
  const ratio = omega0 / (c * k);
  // `√(1 + r²) − 1` as `expm1(½ log1p(r²))`: the naive difference cancels to 0 below
  // r ≈ 1e-8 and falls below the true error (not a bound) around r ≈ 1e-7.
  return Math.expm1(0.5 * Math.log1p(ratio * ratio));
}

/**
 * WS4 — the Klein–Gordon phase velocity `√(c² + ω₀²/k²)` at wavenumber
 * `k = k₀ · resolution`. It tends to the wave speed `c` as `k` grows: the
 * dispersion-free limit, approached from above.
 *
 * @internal
 */
export function kleinGordonPhaseVelocity(
  resolution: number,
  omega0: number,
  c: number,
  k0: number,
): number {
  const k = k0 * resolution;
  return Math.sqrt(c * c + (omega0 * omega0) / (k * k));
}

// ── Sprint 4 closure: Klein–Gordon limits, weak damping ────────────────────

/**
 * The relative error of the non-relativistic kinetic frequency: the
 * Klein–Gordon mode's `ω − ω₀ = ω₀(√(1 + x²) − 1)` against the free
 * Schrödinger particle's `ω₀ x²/2` under `ħ/m ↦ c²/ω₀`, with `x = c k/ω₀`.
 * Equals `|(√(1 + x²) − 1)/(x²/2) − 1|`, increasing in x.
 *
 * @internal
 */
export function kgNonrelativisticError(x: number): number {
  if (x === 0) return 0;
  // Algebraically `x² / (1 + √(1 + x²))²`: with `s = 1 + √(1 + x²)`, `√(1 + x²) − 1 = x²/s`,
  // so the quantity is `|(2/s) − 1| = (s − 2)/s = x²/s²`. The naive difference of the two
  // ratios returned 8.9e-5 at x = 1e-6, where the error is 2.5e-13.
  const s = 1 + Math.sqrt(1 + x * x);
  return (x * x) / (s * s);
}

/**
 * WS6 — `u(tEnd)` of the SPATIALLY UNIFORM Klein–Gordon field on a periodic
 * grid, stepped by leapfrog in the full PDE `u_tt = c² u_xx − ω₀² u` from
 * `u = 1` at rest, with `steps` time steps. The uniform mode's Laplacian
 * vanishes, so the field should follow the oscillator solution `cos(ω₀ t)`.
 *
 * @internal
 */
export function kgUniformModeValue(
  steps: number,
  c: number,
  omega0: number,
  tEnd: number,
  cells = 16,
): number {
  const dt = tEnd / steps;
  const dx = 1 / cells;
  let prev = new Float64Array(cells).fill(1);
  let cur = new Float64Array(cells);
  let next = new Float64Array(cells);
  const lap = (a: Float64Array, i: number): number =>
    (a[(i + 1) % cells]! - 2 * a[i]! + a[(i - 1 + cells) % cells]!) / (dx * dx);
  for (let i = 0; i < cells; i++) {
    cur[i] = prev[i]! + 0.5 * dt * dt * (c * c * lap(prev, i) - omega0 * omega0 * prev[i]!);
  }
  for (let n = 1; n < steps; n++) {
    for (let i = 0; i < cells; i++) {
      next[i] = 2 * cur[i]! - prev[i]! + dt * dt * (c * c * lap(cur, i) - omega0 * omega0 * cur[i]!);
    }
    [prev, cur, next] = [cur, next, prev];
  }
  return cur[0]!;
}

/**
 * Relative phase-velocity error of a stiff string against the flexible string:
 * `√(1 + β) − 1` with `β = EI k²/F`. Increasing in β, so its value at the
 * domain edge is the supremum over the domain.
 *
 * @internal
 */
export function stiffStringPhaseError(F: number, EI: number, k: number): number {
  // `√(1 + β) − 1` as `expm1(½ log1p(β))`, which keeps its precision as β → 0.
  return Math.expm1(0.5 * Math.log1p((EI * k * k) / F));
}

/**
 * WS7 — the stiff string's phase velocity `√(F/μ + (EI/μ)k²)` at wavenumber
 * `k = k₀/resolution`: it tends to the flexible-string speed `√(F/μ)` as the
 * wavelength grows.
 *
 * @internal
 */
export function stiffStringPhaseVelocity(
  resolution: number,
  F: number,
  mu: number,
  EI: number,
  k0: number,
): number {
  const k = k0 / resolution;
  return Math.sqrt(F / mu + (EI / mu) * k * k);
}
