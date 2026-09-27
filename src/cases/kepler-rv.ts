/**
 * Applied case: the radial-velocity semi-amplitude of a star orbited by a
 * companion — what a spectrograph reads as the star's reflex motion, from the
 * two masses, the period, the eccentricity and the inclination.
 *
 * The scalar is the test-mass form of the Keplerian RV curve used to infer
 * m_p sin i (Lovis & Fischer, "Radial Velocity Techniques for Exoplanets", in
 * Seager (ed.), Exoplanets, 2010, eq. 1; Murray & Dermott, Solar System
 * Dynamics, 1999, §2.7). The parent is the two-body problem of two extended
 * bodies in general relativity. The case compares the test-mass K with the
 * exact Newtonian two-body K, and checks the three premises that make a fixed
 * Keplerian ellipse the right curve: a companion light beside the star, point
 * masses (no tides), and a weak field whose apsidal advance (BE-52, with the
 * total mass; Robertson 1938) does not reshape the curve over the record.
 *
 * @module cases/kepler-rv
 */
import { C_SI, G_SI } from '../core/constants.js';
import { evaluatePerihelionPrecession } from '../bridges/perihelion-precession.js';
import { check, requirePositive, type AppliedCase } from './types.js';

const ID = 'case-kepler-rv';

/** The Julian year, the year BE-52 takes (s). @internal */
export const JULIAN_YEAR_S = 365.25 * 86400;

/** m_p/M_* ceiling: the test-mass K then exceeds the two-body K by (1 + q)^{2/3} − 1 ≤ 0.67%. @internal */
export const MAX_MASS_RATIO = 0.01;

/** Ceiling on the stellar radius over the periastron separation, for point masses. @internal */
export const MAX_RADIUS_RATIO = 0.1;

/** G(M_* + m_p)/(c² a) ceiling for Newtonian gravity. @internal */
export const MAX_WEAK_FIELD = 1e-4;

/** e·Δω accumulated over the record (rad) ceiling for a fixed ellipse. @internal */
export const MAX_APSIDAL_MISFIT = 0.01;

export const KEPLER_RV_CASE: AppliedCase = {
  id: ID,
  title: 'Radial-velocity semi-amplitude of a star with a companion (mass ratio, tides, GR apsidal advance)',
  parameters: [
    { key: 'M_star_kg', quantity: 'stellar mass', symbol: 'M_*', unit: 'kg', meaning: 'mass of the star whose radial velocity is measured (1Msun = 1.989e30 kg), > 0' },
    { key: 'm_p_kg', quantity: 'companion mass', symbol: 'm_p', unit: 'kg', meaning: 'true mass of the companion (Jupiter ≈ 1.898e27 kg), > 0' },
    { key: 'P_s', quantity: 'orbital period', symbol: 'P', unit: 's', meaning: 'the orbital period the RV curve repeats with, > 0' },
    { key: 'e', quantity: 'eccentricity', symbol: 'e', unit: '', meaning: 'orbital eccentricity, 0 ≤ e < 1' },
    { key: 'sin_i', quantity: 'sine of the inclination', symbol: 'sin i', unit: '', meaning: 'sin of the angle between the orbit normal and the line of sight, 0 < sin i ≤ 1 (1 is edge-on)' },
    { key: 'R_star_m', quantity: 'stellar radius', symbol: 'R_*', unit: 'm', meaning: 'radius of the star (the Sun ≈ 6.957e8 m), > 0' },
    { key: 'T_obs_s', quantity: 'observing baseline', symbol: 'T_obs', unit: 's', meaning: 'time span of the RV record fitted with one fixed ellipse, > 0' },
  ],
  governing: {
    parent: [
      'r̈ = −G(M_* + m_p) r/r³ + O(G(M_* + m_p)/(c² r)) · (G(M_* + m_p)/r²)   (relative orbit, Newtonian term plus the 1PN Einstein–Infeld–Hoffmann terms)',
      'M_* r_* + m_p r_p = 0 about the barycentre; the measured v_r is the line-of-sight component of ṙ_*',
      'extended bodies: each is a point mass only if spherical and undeformed; tides and spin add quadrupole terms ∝ (R/r)²',
    ],
    scalar: [
      'K = (2πG/P)^{1/3} m_p sin i / M_*^{2/3} / √(1 − e²)   (test-mass form, m_p ≪ M_*)',
      'v_r(t) = K [cos(ν(t) + ω) + e cos ω],  ω fixed over the record',
      'a³ = G(M_* + m_p) P²/(4π²)   (Kepler III for the relative orbit; CE-kepler-third)',
    ],
    distinction:
      'The parent is a coupled vector problem for two finite, deformable bodies in curved spacetime; the scalar keeps one ' +
      'number K for a fixed Keplerian ellipse of the star about the barycentre and puts the whole mass in the star. Dropped: ' +
      'the companion\'s share of the total mass (O(q)), the apsidal advance and the other 1PN terms (O(GM/(c²a))), and ' +
      'the tidal and rotational quadrupoles (O((R_*/r)²)).',
  },
  observable: 'K_m_per_s',
  outputs: [
    { key: 'q', symbol: 'q', unit: '', meaning: 'mass ratio m_p/M_*' },
    { key: 'a_m', symbol: 'a', unit: 'm', meaning: 'semi-major axis of the relative orbit, from Kepler III with the total mass' },
    { key: 'a_star_m', symbol: 'a_*', unit: 'm', meaning: 'semi-major axis of the star\'s own orbit about the barycentre, a m_p/(M_* + m_p)' },
    { key: 'K_m_per_s', symbol: 'K', unit: 'm/s', meaning: 'RV semi-amplitude of the star, test-mass form (the scalar result)' },
    { key: 'K_two_body_m_per_s', symbol: 'K_2b', unit: 'm/s', meaning: 'the exact Newtonian two-body semi-amplitude (2πG/P)^{1/3} m_p sin i/(M_* + m_p)^{2/3}/√(1 − e²)' },
    { key: 'two_body_deviation', symbol: 'K/K_2b − 1', unit: '', meaning: 'relative excess of the test-mass K over the two-body K: (1 + q)^{2/3} − 1' },
    { key: 'r_peri_m', symbol: 'r_p', unit: 'm', meaning: 'periastron separation a(1 − e)' },
    { key: 'weak_field', symbol: 'G(M_* + m_p)/(c²a)', unit: '', meaning: 'the 1PN expansion parameter (half the Schwarzschild radius of the total mass, over a)' },
    { key: 'dphi_rad_per_orbit', symbol: 'Δω', unit: 'rad', meaning: 'GR apsidal advance per orbit 6πG(M_* + m_p)/(c²a(1 − e²)) (BE-52 with the total mass)' },
    { key: 'omega_dot_deg_per_yr', symbol: 'ω̇', unit: 'deg/yr', meaning: 'the same advance as a rate, degrees per Julian year' },
    { key: 'apsidal_misfit', symbol: 'e Δω T_obs/P', unit: '', meaning: 'eccentricity times the apsidal advance accumulated over the record (rad)' },
  ],
  conditions: [
    'an isolated binary: no third body within the record, the systemic velocity constant (it is fitted out as an offset)',
    'initial condition: the orbital elements (P, e, ω, time of periastron) are those at the start of the record',
    'the line of sight is fixed; the star\'s light traces its centre of mass (no spots, no convective blueshift variation)',
  ],
  comparison: {
    reference: 'the parent\'s Newtonian limit: the exact two-body semi-amplitude with the companion\'s mass in the total',
    valueKey: 'K_m_per_s',
    referenceKey: 'K_two_body_m_per_s',
    deviationKey: 'two_body_deviation',
    method: 'closed form of the two-body Keplerian semi-amplitude',
  },
  notIncluded: [
    'stellar activity (jitter), instrumental drift and the gravitational redshift and light-travel-time terms of the RV itself',
    'the other 1PN terms beside the apsidal advance (O(GM/(c²a)) in the P–a relation and in K), bounded by the weak-field check but not applied',
    'tidal orbital decay (dP/dt) and the tidal and rotational quadrupole precession, which the point-mass check bounds only by R_*/r_p',
    'the inclination itself: RV alone gives m_p sin i; sin i must come from a transit or astrometry',
  ],
  measurement: [
    'fit a Keplerian (P, K, e, ω, time of periastron, systemic offset) to the RV time series and compare the fitted K with K_m_per_s; ' +
      'with P and e fixed, the fitted K inverts to the minimum mass m_p sin i through the same relation',
    'where the two-body check fails, compare with K_two_body_m_per_s, which is the Newtonian parent',
    '`upt confront --bridge=be-52`: Mercury\'s anomalous perihelion advance, which tests the Δω formula the apsidal check uses',
  ],
  links: [
    { id: 'CE-kepler-third', role: 'T² = 4π²a³/(GM), with the assumptions two-body and M ≫ m; here with M → M_* + m_p' },
    { id: 'be-52', role: 'the GR perihelion advance Δφ = 6πGM/(c²a(1 − e²)), evaluated with the total mass (`upt evaluate be-52`)' },
    { id: 'CE-perihelion-precession', role: 'the canonical entry restating BE-52' },
    { id: 'CE-schwarzschild-radius', role: 'r_s = 2GM/c², whose ratio to a (halved) is the weak-field check\'s quantity' },
  ],
  examples: {
    valid: {
      args: ['M_star_kg=1Msun', 'm_p_kg=1.898e27', 'P_s=4332.59d', 'e=0.0489', 'sin_i=1', 'R_star_m=6.957e8', 'T_obs_s=12yr'],
      note: 'the Sun\'s reflex motion from Jupiter, seen edge-on over one orbit: K ≈ 12.5 m/s',
      fails: [],
    },
    failures: [
      {
        args: ['M_star_kg=1.434Msun', 'm_p_kg=2.79e27', 'P_s=1.09142d', 'e=0', 'sin_i=0.993', 'R_star_m=1.153e9', 'T_obs_s=10yr'],
        note: 'WASP-12 b, a 1.47 M_J planet on a 1.09 d orbit: the star\'s radius is a third of the separation, and the orbit is observed to decay by tides',
        fails: ['point-mass'],
      },
      {
        args: ['M_star_kg=1.3381Msun', 'm_p_kg=1.2489Msun', 'P_s=0.10225156248d', 'e=0.0877775', 'sin_i=0.99974', 'R_star_m=12km', 'T_obs_s=1yr'],
        note: 'the double pulsar PSR J0737−3039A/B timed for a year: equal masses, and a GR apsidal advance of ≈ 17°/yr',
        fails: ['test-mass', 'apsidal'],
      },
    ],
  },
  run(i) {
    requirePositive(ID, i, ['M_star_kg', 'm_p_kg', 'P_s', 'sin_i', 'R_star_m', 'T_obs_s']);
    const { M_star_kg: M, m_p_kg: m, P_s: P, e, sin_i: sinI, R_star_m: R, T_obs_s: tObs } = i as Record<string, number>;
    if (!Number.isFinite(e) || e < 0 || e >= 1) throw new Error(`${ID}: e must be in [0, 1) (got ${e})`);
    if (sinI > 1) throw new Error(`${ID}: sin_i must be in (0, 1] (got ${sinI})`);
    const total = M + m;
    const a = Math.cbrt((G_SI * total * P * P) / (4 * Math.PI * Math.PI));
    const root = Math.sqrt(1 - e * e);
    const n13 = Math.cbrt((2 * Math.PI * G_SI) / P);
    const K = (n13 * m * sinI) / Math.cbrt(M * M) / root;
    const K2b = (n13 * m * sinI) / Math.cbrt(total * total) / root;
    const rPeri = a * (1 - e);
    const weak = (G_SI * total) / (C_SI * C_SI * a);
    const dphi = evaluatePerihelionPrecession({ M_kg: total, a_m: a, e, T_yr: P / JULIAN_YEAR_S }).dphi_rad_per_orbit;
    const misfit = (e * dphi * tObs) / P;
    return {
      outputs: {
        q: m / M,
        a_m: a,
        a_star_m: (a * m) / total,
        K_m_per_s: K,
        K_two_body_m_per_s: K2b,
        two_body_deviation: K / K2b - 1,
        r_peri_m: rPeri,
        weak_field: weak,
        dphi_rad_per_orbit: dphi,
        omega_dot_deg_per_yr: ((dphi / P) * JULIAN_YEAR_S * 180) / Math.PI,
        apsidal_misfit: misfit,
      },
      checks: [
        check('test-mass', 'the companion is light beside the star, m_p ≪ M_*', 'm_p/M_*', m / M, '<=', MAX_MASS_RATIO,
          'chosen threshold: the test-mass K then exceeds the two-body K by (1 + q)^{2/3} − 1 ≤ 0.67%'),
        check('point-mass', 'point masses: the star is small beside the closest approach, R_* ≪ r_p', 'R_*/(a(1 − e))', R / rPeri, '<=', MAX_RADIUS_RATIO,
          'chosen threshold: tidal and rotational quadrupole terms scale as (R_*/r)² times a Love number or J2 (each < 1), kept ≤ 1%'),
        check('weak-field', 'Newtonian gravity: G(M_* + m_p)/(c²a) ≪ 1', 'G(M_* + m_p)/(c² a)', weak, '<=', MAX_WEAK_FIELD,
          'chosen threshold: the 1PN corrections to the P–a relation and to the orbital velocity are of this relative order'),
        check('apsidal', 'a fixed ellipse over the record: the GR apsidal advance does not reshape the RV curve', 'e Δω T_obs/P', misfit, '<=', MAX_APSIDAL_MISFIT,
          'chosen threshold: beyond the mean longitude (absorbed by the fitted phase), v_r depends on ω only at O(e), so the misfit is of order e Δω K; its coefficient (order one) is not encoded'),
      ],
      unchecked: [
        'no third body: an outer companion adds its own reflex signal and perturbs P and ω',
        'the companion\'s radius is also small beside r_p (only the star\'s is checked)',
      ],
    };
  },
};
