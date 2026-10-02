/**
 * v0.11 catalog-full edges — per-edge value pin + catalog drift guard.
 *
 * Each edge gets one closed-form value pin, recomputed from the SAME
 * PhysicalConstants the wrapped evaluator uses (so the 1e-12 pins are
 * exact-arithmetic comparisons, not fitted tolerances). None of the wrapped
 * evaluators carry internally-fitted constants — every formula is closed-form
 * in (ℏ, c, G, k_B, e) plus caller inputs — so all pins are recomputed
 * closed forms. Plus the beId/status drift-guard pattern from
 * catalog-tranche.test.ts: every edge's beId exists in BRIDGE_EQUATIONS, its
 * confidence equals the catalog status, and its beId is NOT in the rejected
 * set.
 */
import { describe, it, expect } from 'vitest';
import {
  be11Edge,
  be13Edge,
  be15Edge,
  be17Edge,
  be18Edge,
  be20Edge,
  be22Edge,
  be23Edge,
  be24Edge,
  be25Edge,
  be26Edge,
  be27Edge,
  be30Edge,
  be31Edge,
  be33Edge,
  be34Edge,
  be36Edge,
  be38Edge,
  be39Edge,
  be41Edge,
  be43Edge,
  be45Edge,
  be46Edge,
  be47Edge,
  be49Edge,
  be50Edge,
  CATALOG_FULL_EDGES,
  evaluateEdge,
} from '../../src/composition/index.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { REJECTED_BRIDGE_IDS } from '../../src/bridges/rejected.js';
import { PhysicalConstants } from '../../src/core/types.js';

const { hbar, c, G, kB, e } = PhysicalConstants;

const relErr = (actual: number, expected: number): number =>
  expected === 0
    ? Math.abs(actual)
    : Math.abs(actual - expected) / Math.abs(expected);

const PIN = 1e-12;

describe('BE-11 — decoherence master rate edge', () => {
  it('matches γ_0 (λ/λ_0)² to relErr ≤ 1e-12', () => {
    const g0 = 3.5, lam = 2, lam0 = 0.5;
    const expected = g0 * (lam / lam0) * (lam / lam0);
    expect(
      relErr(
        evaluateEdge(be11Edge, {
          'relaxation-rate': g0,
          'system-environment-coupling': lam,
          'reference-coupling': lam0,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-13 — Einstein trace edge', () => {
  it('matches R = 4Λ − (8πG/c⁴)T to relErr ≤ 1e-12', () => {
    const Lambda = 1.1e-52, T = 1e-9;
    const expected = 4 * Lambda - (8 * Math.PI * G * T) / (c * c * c * c);
    expect(
      relErr(
        evaluateEdge(be13Edge, {
          'cosmological-constant-curvature': Lambda,
          'stress-energy-trace': T,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-15 — coarsening length edge', () => {
  it('matches L = √(Γ t) to relErr ≤ 1e-12', () => {
    const gamma = 3, t = 12;
    const expected = Math.sqrt(gamma * t);
    expect(
      relErr(evaluateEdge(be15Edge, { 'model-a-mobility': gamma, time: t }), expected),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-17 — Einstein-Cartan squared invariant edge', () => {
  it('matches S² = prefactor² · (T·T) to relErr ≤ 1e-12', () => {
    const pre = 1.46e88, tor = 2.5e-30;
    const expected = pre * tor;
    expect(
      relErr(
        evaluateEdge(be17Edge, {
          'einstein-coupling-prefactor-squared': pre,
          'torsion-contraction-scalar': tor,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-18 — Higgs-like dark mass edge', () => {
  it('matches m = g·v to relErr ≤ 1e-12', () => {
    const g = 0.99, v = 174;
    expect(
      relErr(
        evaluateEdge(be18Edge, { 'yukawa-coupling': g, 'vacuum-expectation-value': v }),
        g * v,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-20 — cosmological-constant density edge', () => {
  it('matches ρ_Λ = c²Λ/(8πG) to relErr ≤ 1e-12', () => {
    const Lambda = 1.1e-52;
    const expected = (c * c * Lambda) / (8 * Math.PI * G);
    expect(
      relErr(evaluateEdge(be20Edge, { 'cosmological-constant-curvature': Lambda }), expected),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-22 — topological entanglement entropy edge', () => {
  it('matches S = α·L − γ to relErr ≤ 1e-12', () => {
    const alpha = 1e9, L = 5e-9, gamma = Math.log(2);
    const expected = alpha * L - gamma;
    expect(
      relErr(
        evaluateEdge(be22Edge, {
          'area-law-coefficient': alpha,
          'boundary-length': L,
          'topological-entanglement-entropy': gamma,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-23 — SYK Planckian resistivity edge', () => {
  it('matches ρ = ρ_0 + (m* k_B T)/(n_e e² ℏ)·α_SYK to relErr ≤ 1e-12', () => {
    const rho0 = 1e-8, mstar = 9.1e-31, ne = 1e28, T = 100, aSYK = 1;
    const thermal = (mstar * kB * T) / (ne * e * e * hbar);
    const expected = rho0 + thermal * aSYK;
    expect(
      relErr(
        evaluateEdge(be23Edge, {
          'residual-resistivity': rho0,
          'effective-mass': mstar,
          'carrier-density': ne,
          temperature: T,
          'syk-coefficient': aSYK,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-24 — FRET efficiency edge', () => {
  it('matches η = R_0⁶/(R_0⁶ + R⁶) to relErr ≤ 1e-12', () => {
    const R = 6e-9, R0 = 5e-9;
    const expected = 1 / (1 + Math.pow(R / R0, 6));
    expect(
      relErr(
        evaluateEdge(be24Edge, { 'donor-acceptor-distance': R, 'foerster-radius': R0 }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-25 — IIT intrinsic information edge', () => {
  it('matches ii = p_cond·log₂(p_cond/p_marg) to relErr ≤ 1e-12', () => {
    const pc = 0.5, pm = 0.25;
    const expected = pc * Math.log2(pc / pm);
    expect(
      relErr(
        evaluateEdge(be25Edge, {
          'conditional-probability': pc,
          'marginal-probability': pm,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-26 — DNA tunneling rate edge', () => {
  it('matches Γ = ν₀ exp[−(2/ℏ)√(2m(V−E))·L]·f to relErr ≤ 1e-12', () => {
    const nu0 = 1e13, m = 1.67e-27, VE = 1e-20, width = 1e-10, f = 1;
    const p = Math.sqrt(2 * m * VE);
    const wkb = (2 / hbar) * (p * width);
    const expected = nu0 * Math.exp(-wkb) * f;
    expect(
      relErr(
        evaluateEdge(be26Edge, {
          'attempt-frequency': nu0,
          'tunneling-mass': m,
          'barrier-height': VE,
          'barrier-width': width,
          'biological-rate-correction': f,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-27 — effective temperature edge', () => {
  it('matches T_eff = T(1 + Σ/(k_B T)) to relErr ≤ 1e-12', () => {
    const T = 300, sigma = 5e-21;
    const expected = T * (1 + sigma / (kB * T));
    expect(
      relErr(
        evaluateEdge(be27Edge, { temperature: T, 'active-noise-energy': sigma }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-30 — FLM first law edge', () => {
  it('matches δS_EE = δ⟨H_R⟩ (identity) to relErr ≤ 1e-12', () => {
    const dH = 0.37;
    expect(
      relErr(evaluateEdge(be30Edge, { 'modular-hamiltonian-variation': dH }), dH),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-31 — Benincasa-Dowker Ricci scalar edge', () => {
  it('matches R = (4/√6)ℓ_P⁻²·[1+N_0−9N_1+16N_2−8N_3] to relErr ≤ 1e-12', () => {
    const N0 = 2, N1 = 1, N2 = 0, N3 = 0, lP = 1.616255e-35;
    const bracket = 1 + N0 - 9 * N1 + 16 * N2 - 8 * N3;
    const expected = ((4 / Math.sqrt(6)) * bracket) / (lP * lP);
    expect(
      relErr(
        evaluateEdge(be31Edge, {
          'causal-set-count-0': N0,
          'causal-set-count-1': N1,
          'causal-set-count-2': N2,
          'causal-set-count-3': N3,
          'planck-length': lP,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-33 — Hertz-Millis correlation length edge', () => {
  it('matches ξ = ξ_0 (T/T_0)^(−1/z) to relErr ≤ 1e-12', () => {
    const xi0 = 1e-9, T = 4, T0 = 1, nu = 0.71, z = 1;
    const expected = xi0 * Math.pow(T / T0, -1 / z);
    expect(
      relErr(
        evaluateEdge(be33Edge, {
          'reference-correlation-length': xi0,
          temperature: T,
          'reference-temperature': T0,
          'static-exponent-nu': nu,
          'dynamic-exponent-z': z,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-34 — Kibble-Zurek defect density edge', () => {
  it('matches n = (τ_Q/τ_0)^(−dν/(1+zν))·exp(−mc²/k_B T_reh) to relErr ≤ 1e-12', () => {
    // Eve L-3 fix: m = 0 made exp(−mc²/k_B T_reh) ≡ 1, leaving the
    // curved-spacetime suppression branch (the bridge's distinguishing
    // term) value-untested. A proton-scale defect mass at T_reh = 1e13 K
    // gives a suppression factor ~e⁻¹·⁰⁹ — squarely probed.
    const tauQ = 1e-6, tau0 = 1e-12, d = 1, nu = 1, z = 1,
      m = 1.67262192369e-27, Treh = 1e13;
    const exponent = -(d * nu) / (1 + z * nu);
    const scaling = Math.pow(tauQ / tau0, exponent);
    const expected = scaling * Math.exp(-(m * c * c) / (kB * Treh));
    expect(
      relErr(
        evaluateEdge(be34Edge, {
          'quench-timescale': tauQ,
          'microscopic-relaxation-time': tau0,
          'spatial-dimension': d,
          'static-exponent-nu': nu,
          'dynamic-exponent-z': z,
          'defect-rest-mass': m,
          'reheating-temperature': Treh,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-36 — GW170817 speed ratio edge', () => {
  it('matches (c_GW − c)/c to relErr ≤ 1e-12', () => {
    // Eve L-1 fix: 1+1e-16 === 1 in float64 (sub-epsilon), so the old
    // pin asserted 0 ≡ 0 and never probed the formula. 1e-12 is
    // representable and physically GW170817-adjacent.
    const cGW = c * (1 + 1e-12);
    const expected = (cGW - c) / c;
    expect(
      relErr(evaluateEdge(be36Edge, { 'gravitational-wave-speed': cGW }), expected),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-38 — MOND force edge', () => {
  it('matches F = F_N·√[(1+√(1+4/z²))/2] to relErr ≤ 1e-12', () => {
    const FN = 1e-10, m = 1, a0 = 1.2e-10;
    const z = FN / (m * a0);
    const nu = Math.sqrt((1 + Math.sqrt(1 + 4 / (z * z))) / 2);
    const expected = FN * nu;
    expect(
      relErr(
        evaluateEdge(be38Edge, {
          'newtonian-force': FN,
          mass: m,
          'mond-acceleration-scale': a0,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-39 — asymptotic-safety β_g edge', () => {
  it('matches β_g = 2g + A g² + B g³ − C g²λ to relErr ≤ 1e-12', () => {
    const g = 0.7, lam = 0.4, A = -2, B = 1, C = 3;
    const expected = 2 * g + A * g * g + B * g * g * g - C * g * g * lam;
    expect(
      relErr(
        evaluateEdge(be39Edge, {
          'newton-coupling-dimensionless': g,
          'cosmological-constant-dimensionless': lam,
          'truncation-coefficient-a': A,
          'truncation-coefficient-b': B,
          'truncation-coefficient-c': C,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-41 — Swampland tower mass edge', () => {
  it('matches m(φ) = m₀ exp(−α|φ−φ₀|/M_P) to relErr ≤ 1e-12', () => {
    const m0 = 100, alpha = 1, phi = 3, phi0 = 1, MP = 10;
    const expected = m0 * Math.exp(-(alpha * Math.abs(phi - phi0)) / MP);
    expect(
      relErr(
        evaluateEdge(be41Edge, {
          'reference-mass': m0,
          'swampland-coefficient': alpha,
          'scalar-field-value': phi,
          'scalar-field-reference': phi0,
          'planck-mass': MP,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-43 — ER=EPR entropy edge', () => {
  it('matches S = k_B A/(4 ℓ_P²) with ℓ_P²=ℏG/c³ to relErr ≤ 1e-12', () => {
    const A = 1e-60;
    const lP2 = (hbar * G) / (c * c * c);
    const expected = (kB * A) / (4 * lP2);
    expect(
      relErr(evaluateEdge(be43Edge, { 'wormhole-cross-section-area': A }), expected),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-45 — TCC e-folds edge', () => {
  it('matches N_e_max = ln(M_P/H_inf) − γ ln(r/0.01) to relErr ≤ 1e-12', () => {
    // Eve L-2 fix: r = 0.01 zeroed the γ·ln(r/0.01) term — any γ (or a
    // sign error on it) passed. r = 0.05 exercises the correction.
    const MP = 1.22e19, Hinf = 1e14, r = 0.05, gamma = 1;
    const expected = Math.log(MP / Hinf) - gamma * Math.log(r / 0.01);
    expect(
      relErr(
        evaluateEdge(be45Edge, {
          'planck-mass-energy': MP,
          'inflation-hubble-energy': Hinf,
          'tensor-to-scalar-ratio': r,
          'tcc-correction-coefficient': gamma,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-46 — anthropic probability edge', () => {
  it('matches P = A exp(−α/Λ) to relErr ≤ 1e-12', () => {
    const A = 1, alpha = 2, lambda = 2;
    const expected = A * Math.exp(-alpha / lambda);
    expect(
      relErr(
        evaluateEdge(be46Edge, {
          'measure-normalization': A,
          'anthropic-model-parameter': alpha,
          'landscape-parameter': lambda,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-47 — BBN dark-sector rate edge', () => {
  it('matches dY/dt = ⟨σv⟩_SM n_p n_n − ⟨σv⟩_dark n_χ² ε − 3HY to relErr ≤ 1e-12', () => {
    const H = 1, Y = 1e10, svSM = 1e-30, np = 1e20, nn = 1e20,
      svDark = 1e-31, nchi = 1e15, eps = 0.5;
    const expected = svSM * np * nn - svDark * nchi * nchi * eps - 3 * H * Y;
    expect(
      relErr(
        evaluateEdge(be47Edge, {
          'hubble-rate': H,
          'nucleon-yield-density': Y,
          'sm-reaction-rate-coefficient': svSM,
          'proton-density': np,
          'neutron-density': nn,
          'dark-reaction-rate-coefficient': svDark,
          'dark-species-density': nchi,
          'transfer-efficiency': eps,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-49 — quantum Darwinism edge', () => {
  it('matches I(S:F_k) = I(S:E) − α k^(−β) to relErr ≤ 1e-12', () => {
    const ISE = 2, alpha = 1, k = 4, beta = 1;
    const expected = ISE - alpha * Math.pow(k, -beta);
    expect(
      relErr(
        evaluateEdge(be49Edge, {
          'total-mutual-information': ISE,
          'darwinism-magnitude': alpha,
          'fragment-count': k,
          'darwinism-decay-exponent': beta,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('BE-50 — Wheeler-Feynman time-symmetric field', () => {
  it('matches A = (A_ret + A_adv)/2 to relErr ≤ 1e-12', () => {
    const Aret = 3, Aadv = 1;
    const expected = (Aret + Aadv) / 2;
    expect(
      relErr(
        evaluateEdge(be50Edge, {
          'retarded-field-amplitude': Aret,
          'advanced-field-amplitude': Aadv,
        }),
        expected,
      ),
    ).toBeLessThanOrEqual(PIN);
  });
});

describe('catalog-full drift guard', () => {
  it('CATALOG_FULL_EDGES has 26 members', () => {
    expect(CATALOG_FULL_EDGES).toHaveLength(26);
  });

  it('every edge beId exists in BRIDGE_EQUATIONS, confidence === status, NOT rejected', () => {
    for (const edge of CATALOG_FULL_EDGES) {
      const entry = BRIDGE_EQUATIONS.find((e) => e.id === edge.beId);
      expect(entry, `BE-${edge.beId} must exist in BRIDGE_EQUATIONS`).toBeDefined();
      expect(
        edge.confidence,
        `${edge.id}: confidence must equal catalog status`,
      ).toBe(entry?.status);
      expect(
        REJECTED_BRIDGE_IDS.has(edge.beId as number),
        `${edge.id}: must NOT wrap a rejected bridge`,
      ).toBe(false);
    }
  });

  it('no edge wraps a NOT-A-BRIDGE id (28/29/32/35/40)', () => {
    const rejected = new Set([28, 29, 32, 35, 40]);
    for (const edge of CATALOG_FULL_EDGES) {
      expect(rejected.has(edge.beId as number)).toBe(false);
    }
  });
});
