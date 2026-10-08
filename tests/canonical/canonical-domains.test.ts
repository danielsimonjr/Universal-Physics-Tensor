import { describe, expect, it } from 'vitest';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { DomainViolationError } from '../../src/bridges/evaluation-errors.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';

const C = 299792458;
const EV = 1.602176634e-19;

const UNSET_IN_DOMAIN = new Set(['CE-mb-most-probable-speed']);

type Bind = Record<string, number>;
interface Case {
  readonly id: string;
  readonly good: Bind;
  readonly bad: readonly (readonly [string, Bind])[];
}

const CASES: readonly Case[] = [
  { id: 'CE-schwarzschild-radius', good: { mass: 1.989e30 }, bad: [['M<0', { mass: -1.989e30 }]] },
  { id: 'CE-string-wave-speed', good: { tension: 100, 'linear-density': 0.01 }, bad: [['T<0', { tension: -100 }], ['mu<0', { 'linear-density': -0.01 }]] },
  { id: 'CE-simple-harmonic-frequency', good: { 'spring-constant': 100, mass: 1 }, bad: [['k<0', { 'spring-constant': -100 }]] },
  { id: 'CE-pendulum-period', good: { length: 1, gravity: 9.81 }, bad: [['g=0', { gravity: 0 }]] },
  { id: 'CE-sound-speed', good: { pressure: 101325, density: 1.204, gamma: 1.4 }, bad: [['rho<0', { density: -1.204 }]] },
  { id: 'CE-laplace-pressure', good: { 'surface-tension': 0.072, 'droplet-radius': 1e-3 }, bad: [['r<0', { 'droplet-radius': -1e-3 }]] },
  { id: 'CE-dynamic-pressure', good: { density: 1.2, 'flow-velocity': 30 }, bad: [['rho<0', { density: -1.2 }]] },
  {
    id: 'CE-kinetic-pressure',
    good: { 'number-density': 2.5e25, 'molecular-mass': 4.65e-26, 'mean-square-speed': 2.5e5 },
    bad: [['<v2><0', { 'mean-square-speed': -2.5e5 }]],
  },
  { id: 'CE-wave-speed', good: { frequency: 440, wavelength: 0.78 }, bad: [['f<0', { frequency: -440 }]] },
  { id: 'CE-shear-stress', good: { 'dynamic-viscosity': 1e-3, 'velocity-gradient': 100 }, bad: [['mu<0', { 'dynamic-viscosity': -1e-3 }]] },
  { id: 'CE-stokes-drag', good: { viscosity: 1e-3, radius: 1e-3, speed: 0.01 }, bad: [['r<0', { radius: -1e-3 }]] },
  {
    id: 'CE-thermal-diffusivity',
    good: { 'thermal-conductivity': 0.6, density: 1000, 'specific-heat-capacity': 4180 },
    bad: [['k<0', { 'thermal-conductivity': -0.6 }]],
  },
  {
    id: 'CE-photoelectric',
    good: { 'planck-constant': 6.62607015e-34, 'photon-frequency': 1.5e15, 'work-function': 4.3 * EV },
    bad: [['below threshold', { 'photon-frequency': 5e14 }]],
  },
  {
    id: 'CE-rydberg-formula',
    good: { 'rydberg-constant': 10973731.568, 'lower-level-n': 2, 'upper-level-n': 3 },
    bad: [['n1>n2', { 'lower-level-n': 3, 'upper-level-n': 2 }], ['fractional', { 'lower-level-n': 1.5 }], ['n=0', { 'lower-level-n': 0 }]],
  },
  { id: 'CE-stefan-boltzmann', good: { temperature: 5800 }, bad: [['T<0', { temperature: -5800 }]] },
  { id: 'CE-wien', good: { temperature: 5800 }, bad: [['T<0', { temperature: -5800 }]] },
  { id: 'CE-malus-law', good: { 'incident-intensity': 1, 'polarization-angle': Math.PI / 4 }, bad: [['I0<0', { 'incident-intensity': -1 }]] },
  {
    id: 'CE-snell-law',
    good: { 'incident-index': 1.5, 'angle-of-incidence': 0.5236, 'angle-of-refraction': 0.3398 },
    bad: [['degrees', { 'angle-of-refraction': 19.47 }], ['theta2=0', { 'angle-of-refraction': 0 }]],
  },
  {
    id: 'CE-compton-shift',
    good: { 'planck-constant': 6.62607015e-34, 'electron-mass': 9.1093837015e-31, 'speed-of-light': C, 'scattering-angle': Math.PI / 2 },
    bad: [['degrees', { 'scattering-angle': 90 }]],
  },
  { id: 'CE-de-broglie', good: { p: 1e-24 }, bad: [['p<0', { p: -1e-24 }]] },
  { id: 'CE-friedmann', good: { rho: 9.47e-27 }, bad: [['rho<0', { rho: -9.47e-27 }]] },
  {
    id: 'CE-friedmann-curvature',
    good: { rho: 9.47e-27, 'curvature-k': 1, 'scale-factor': 1e28 },
    bad: [['H2<0 (turned around)', { 'scale-factor': 1e26 }], ['a=0', { 'scale-factor': 0 }]],
  },
  { id: 'CE-hubble-distance', good: { 'hubble-rate': 2.2685e-18 }, bad: [['H<0', { 'hubble-rate': -2.2685e-18 }]] },
  { id: 'CE-bekenstein-hawking', good: { A: 1e6 }, bad: [['A<0', { A: -1e6 }]] },
  { id: 'CE-newton-gravitation', good: { mass: 1, 'secondary-mass': 1, r: 1 }, bad: [['r<0', { r: -1 }], ['r=0', { r: 0 }]] },
  { id: 'CE-lorentz-factor', good: { velocity: 0.6 * C, 'speed-of-light': C }, bad: [['v=c', { velocity: C }], ['v>c', { velocity: 1.1 * C }]] },
  { id: 'CE-kepler-third', good: { 'semi-major-axis': 1.496e11, mass: 1.989e30 }, bad: [['a<0', { 'semi-major-axis': -1.496e11 }]] },
  {
    id: 'CE-carnot-efficiency',
    good: { 'cold-reservoir-temperature': 300, 'hot-reservoir-temperature': 600 },
    bad: [['Tc>Th', { 'cold-reservoir-temperature': 600, 'hot-reservoir-temperature': 300 }], ['Tc<0', { 'cold-reservoir-temperature': -300 }], ['Th<0', { 'hot-reservoir-temperature': -600 }]],
  },
  { id: 'CE-clausius-entropy', good: { heat: 100, temperature: 300 }, bad: [['T<0', { temperature: -300 }]] },
  { id: 'CE-equipartition', good: { 'boltzmann-constant': 1.380649e-23, temperature: 300 }, bad: [['T<0', { temperature: -300 }]] },
  { id: 'CE-boltzmann-entropy', good: { 'boltzmann-constant': 1.380649e-23, 'microstate-count': 10 }, bad: [['W<1', { 'microstate-count': 0.5 }], ['W=0', { 'microstate-count': 0 }]] },
  { id: 'CE-ideal-gas', good: { temperature: 300, V: 1, N: 1e23 }, bad: [['T<0', { temperature: -300 }], ['V<0', { V: -1 }]] },
  { id: 'CE-heat-capacity', good: { mass: 1, 'specific-heat': 4180, 'temperature-change': 10 }, bad: [['m<0', { mass: -1 }]] },
  { id: 'CE-latent-heat', good: { mass: 1, 'specific-latent-heat': 2.26e6 }, bad: [['m<0', { mass: -1 }]] },
  { id: 'CE-jarzynski', good: { temperature: 300 }, bad: [['T<0', { temperature: -300 }]] },
  {
    id: 'CE-stokes-einstein',
    good: { 'boltzmann-constant': 1.380649e-23, temperature: 300, 'dynamic-viscosity': 1e-3, 'particle-radius': 1e-9 },
    bad: [['r<0', { 'particle-radius': -1e-9 }]],
  },
  {
    id: 'CE-mb-most-probable-speed',
    good: { 'boltzmann-constant': 1.380649e-23, temperature: 300, 'molecular-mass': 4.65e-26 },
    bad: [['T<0', { temperature: -300 }]],
  },
];

describe('canonical validity domains', () => {
  for (const c of CASES) {
    describe(c.id, () => {
      it('a point inside the domain gives a finite value (control: the rule is not a blanket refusal)', () => {
        const r = evaluateRelation(c.id, c.good);
        // The most-probable-speed coefficient has no source: its in-domain answer is `unset`, which is the tag's real meaning.
        if (UNSET_IN_DOMAIN.has(c.id)) expect(r.kind).toBe('unset');
        else expect(r.kind === 'value' && Number.isFinite(r.value), JSON.stringify(r)).toBe(true);
      });
      for (const [label, patch] of c.bad) {
        it(`${label} is a domain violation, not a value and not unset`, () => {
          expect(() => evaluateRelation(c.id, { ...c.good, ...patch })).toThrow(DomainViolationError);
        });
      }
    });
  }
});

describe('formula_latex is valid TeX (issue 484)', () => {
  it('has no control character', () => {
    const bad = CANONICAL_EQUATIONS.filter((e) => /[\u0000-\u0008\u000b-\u001f]/.test(e.formula_latex)).map((e) => e.id);
    expect(bad).toEqual([]);
  });
  it('names no TeX command without its backslash', () => {
    const bare = /(?<![\\A-Za-z])(Delta|geq|hbar|sigma|sqrt|pi|mu|frac)(?![A-Za-z])/;
    const bad = CANONICAL_EQUATIONS.filter((e) => bare.test(e.formula_latex.replace(/\\text\{[^}]*\}/g, ''))).map((e) => e.id);
    expect(bad).toEqual([]);
  });
  it('the matcher fires on the three recorded strings (control)', () => {
    const bare = /(?<![\\A-Za-z])(Delta|geq|hbar|sigma|sqrt|pi|mu|frac)(?![A-Za-z])/;
    expect(bare.test('Delta U = Q - W')).toBe(true);
    expect(bare.test('\\Delta U = Q - W')).toBe(false);
    expect(/[\u0000-\u0008\u000b-\u001f]/.test('p(x) = \frac{1}{2}')).toBe(true);
  });
});

describe('explain says why there is no recovered value', () => {
  it('names the refused domain, and a valid point does not', async () => {
    const { explainQuantity } = await import('../../src/composition/explain.js');
    const { CANONICAL_GRAPH } = await import('../../src/composition/canonical-graph.js');
    const bad = explainQuantity(CANONICAL_GRAPH, 'sound-speed', { pressure: 101325, density: -1.204, gamma: 1.4 });
    expect(bad.recoveredValue).toBeUndefined();
    expect(bad.summary).toMatch(/validity domain \(pressure >= 0 and density > 0\)/);
    const good = explainQuantity(CANONICAL_GRAPH, 'sound-speed', { pressure: 101325, density: 1.204, gamma: 1.4 });
    expect(good.recoveredValue).toBeGreaterThan(300);
    expect(good.summary).not.toMatch(/validity domain/);
  });
});
