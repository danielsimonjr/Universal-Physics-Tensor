/**
 * Phase-2 D2 — adjudicated regime-attribute AUDIT (2026-07-02).
 *
 * Pins the END-STATE `attributes` for every row the binding adjudication
 * record (`.superpowers/sdd/phase2/audit-table-draft.md`, "ADJUDICATION
 * RECORD" section) changes: 4 strips + 5 completes. Also pins the
 * `boundary-length` NO-CHANGE row (its COMPLETE was rejected — BE-22
 * topological-entanglement-entropy grounds, not the RT/horizon family),
 * the two named generics' attribute-free invariant, and a union-validity
 * walk over every registry quantity.
 *
 * Consumer enumeration (Task 2 Step 1): `placeQuantity`/`buildRegimeTensor`
 * (src/composition/bridge-prediction.ts, `upt predict`) read
 * `Quantity.attributes` directly — pinned below as the BEFORE/AFTER predict
 * surface. `canonical-graph.ts`'s `attributesOf()` stamps a CANONICAL
 * EQUATION's own `regime` field onto its governing variables — a wholly
 * separate mechanism this audit does not touch (Task-0 Finding F1; the
 * adjudication record's Option-A resolver instead has the not-yet-built
 * identity gate ignore canonical stamps entirely). `src/bridges/membership.ts`
 * does NOT compute from `Quantity.attributes` — `adjudicateBridgeEntry` uses
 * only the catalog `bridges: [a, b]` tuple + the `rejected.ts` overlay; its
 * docstring's "regime attribute" language is descriptive, not computed.
 */
import { describe, it, expect } from 'vitest';
import { allQuantities } from '../../src/composition/quantities.js';
import type { RegimeAttributes } from '../../src/composition/index.js';
import { placeQuantity, regimeKey } from '../../src/composition/bridge-prediction.js';

const SCALES = ['quantum', 'mesoscopic', 'classical', 'cosmological'];
const FORCES = ['gravitational', 'electromagnetic', 'weak', 'strong', 'emergent'];
const INFORMATION = ['von-neumann', 'shannon', 'kolmogorov', 'discord'];

const nodes = allQuantities();
const byName = new Map(nodes.map((q) => [q.name, q]));

function attrsOf(name: string): RegimeAttributes {
  const q = byName.get(name);
  if (!q) throw new Error(`no registry quantity named '${name}'`);
  return q.attributes;
}

describe('adjudicated end-state attributes (audit-table-draft.md, ADJUDICATION RECORD)', () => {
  it('STRIP: mass carries no attributes (was {scale: classical, force: gravitational})', () => {
    expect(attrsOf('mass')).toEqual({});
  });

  it('STRIP: temperature carries no attributes (was {scale: classical}; also resolves the hawking-temperature fold conflict)', () => {
    expect(attrsOf('temperature')).toEqual({});
  });

  it('STRIP (split→abstain): decoherence-rate scale is stripped (was {scale: classical})', () => {
    expect(attrsOf('decoherence-rate')).toEqual({});
  });

  it('STRIP (split→abstain): relaxation-rate scale is stripped (was {scale: classical})', () => {
    expect(attrsOf('relaxation-rate')).toEqual({});
  });

  it('COMPLETE: boundary-entanglement-entropy gains force: gravitational (RT holographic entropy)', () => {
    expect(attrsOf('boundary-entanglement-entropy')).toEqual({
      scale: 'quantum',
      information: 'von-neumann',
      force: 'gravitational',
    });
  });

  it('COMPLETE: donor-acceptor-distance gains force: electromagnetic (FRET dipole-dipole coupling)', () => {
    expect(attrsOf('donor-acceptor-distance')).toEqual({
      scale: 'mesoscopic',
      force: 'electromagnetic',
    });
  });

  it('COMPLETE: foerster-radius gains force: electromagnetic (same FRET family)', () => {
    expect(attrsOf('foerster-radius')).toEqual({
      scale: 'mesoscopic',
      force: 'electromagnetic',
    });
  });

  it('COMPLETE: mass-density gains force: gravitational (BE-19 LQC-bounce family)', () => {
    expect(attrsOf('mass-density')).toEqual({
      scale: 'cosmological',
      force: 'gravitational',
    });
  });

  it('COMPLETE: wormhole-entanglement-entropy gains force: gravitational (ER=EPR family)', () => {
    expect(attrsOf('wormhole-entanglement-entropy')).toEqual({
      scale: 'quantum',
      information: 'von-neumann',
      force: 'gravitational',
    });
  });

  it('NO CHANGE: boundary-length stays {scale: quantum} — its COMPLETE proposal was REJECTED (BE-22 topological-entanglement-entropy grounds, not the RT/horizon family)', () => {
    expect(attrsOf('boundary-length')).toEqual({ scale: 'quantum' });
  });
});

describe('generics invariant', () => {
  it('mass, temperature, time carry no attributes', () => {
    expect(attrsOf('mass')).toEqual({});
    expect(attrsOf('temperature')).toEqual({});
    expect(attrsOf('time')).toEqual({});
  });
});

describe('union validity — every stated axis value is within the RegimeAttributes unions', () => {
  for (const q of nodes) {
    it(`${q.name}: attributes are within-union`, () => {
      const { scale, force, information } = q.attributes;
      if (scale !== undefined) expect(SCALES).toContain(scale);
      if (force !== undefined) expect(FORCES).toContain(force);
      if (information !== undefined) expect(INFORMATION).toContain(information);
    });
  }
});

describe('upt predict surface (placeQuantity) — before/after the audit', () => {
  it('mass is now unplaceable (BEFORE: scale=classical|force=gravitational; AFTER: null — the strip removes it from the regime plane)', () => {
    expect(placeQuantity(byName.get('mass')!)).toBeNull();
  });

  it('temperature is now unplaceable (BEFORE: scale=classical; AFTER: null)', () => {
    expect(placeQuantity(byName.get('temperature')!)).toBeNull();
  });

  it('decoherence-rate is now unplaceable (BEFORE: scale=classical; AFTER: null)', () => {
    expect(placeQuantity(byName.get('decoherence-rate')!)).toBeNull();
  });

  it('relaxation-rate is now unplaceable (BEFORE: scale=classical; AFTER: null)', () => {
    expect(placeQuantity(byName.get('relaxation-rate')!)).toBeNull();
  });

  it('boundary-entanglement-entropy now places with the completed force coordinate (BEFORE: scale=quantum; AFTER: scale=quantum|force=gravitational)', () => {
    expect(regimeKey(placeQuantity(byName.get('boundary-entanglement-entropy')!)!)).toBe(
      'scale=quantum|force=gravitational',
    );
  });

  it('donor-acceptor-distance now places with the completed force coordinate (BEFORE: scale=mesoscopic; AFTER: scale=mesoscopic|force=electromagnetic)', () => {
    expect(regimeKey(placeQuantity(byName.get('donor-acceptor-distance')!)!)).toBe(
      'scale=mesoscopic|force=electromagnetic',
    );
  });

  it('foerster-radius now places with the completed force coordinate (BEFORE: scale=mesoscopic; AFTER: scale=mesoscopic|force=electromagnetic)', () => {
    expect(regimeKey(placeQuantity(byName.get('foerster-radius')!)!)).toBe(
      'scale=mesoscopic|force=electromagnetic',
    );
  });

  it('mass-density now places with the completed force coordinate (BEFORE: scale=cosmological; AFTER: scale=cosmological|force=gravitational)', () => {
    expect(regimeKey(placeQuantity(byName.get('mass-density')!)!)).toBe(
      'scale=cosmological|force=gravitational',
    );
  });

  it('wormhole-entanglement-entropy now places with the completed force coordinate (BEFORE: scale=quantum; AFTER: scale=quantum|force=gravitational)', () => {
    expect(regimeKey(placeQuantity(byName.get('wormhole-entanglement-entropy')!)!)).toBe(
      'scale=quantum|force=gravitational',
    );
  });

  it('boundary-length placement is unchanged (scale=quantum, no force — NO CHANGE row)', () => {
    expect(regimeKey(placeQuantity(byName.get('boundary-length')!)!)).toBe('scale=quantum');
  });
});

describe('GOVERNANCE PIN: the full audited surface (design D2, audit-table-draft.md)', () => {
  // GOVERNANCE PIN: the full audited surface (design D2). Changing any attribute
  // requires updating this table in the same commit with a rationale — same
  // protocol as the calibration benchmark's EXPECTED block.
  const AUDITED_END_STATE: Record<string, RegimeAttributes> = {
    'active-noise-energy': { scale: 'mesoscopic', force: 'emergent' },
    'attempt-frequency': { scale: 'quantum' },
    'barrier-height': { scale: 'quantum' },
    'barrier-width': { scale: 'quantum' },
    'boundary-entanglement-entropy': { scale: 'quantum', information: 'von-neumann', force: 'gravitational' },
    'boundary-length': { scale: 'quantum' },
    'brane-tension': { force: 'gravitational' },
    'carrier-density': { scale: 'quantum', force: 'electromagnetic', statistics: 'fermionic' },
    'coarsening-length': { scale: 'mesoscopic', force: 'emergent' },
    'cosmological-constant-curvature': { scale: 'cosmological', force: 'gravitational', symmetry: 'poincare' },
    'critical-density': { scale: 'quantum', force: 'gravitational' },
    'dark-fermion-mass': { scale: 'quantum', force: 'weak', statistics: 'fermionic' },
    'dark-species-density': { scale: 'cosmological' },
    'decoherence-rate': {},
    'defect-rest-mass': { scale: 'cosmological' },
    'donor-acceptor-distance': { scale: 'mesoscopic', force: 'electromagnetic' },
    'effective-mass': { scale: 'quantum', force: 'electromagnetic', statistics: 'fermionic' },
    'far-radius': { scale: 'classical', force: 'gravitational' },
    'foerster-radius': { scale: 'mesoscopic', force: 'electromagnetic' },
    'gravitational-wave-speed': { scale: 'cosmological', force: 'gravitational' },
    'grw-localization-rate': { scale: 'quantum' },
    'hubble-rate': { scale: 'cosmological', force: 'gravitational' },
    'impact-parameter': { scale: 'classical', force: 'gravitational' },
    'inflation-hubble-energy': { scale: 'cosmological', force: 'gravitational' },
    'lambda-mass-density': { scale: 'cosmological', force: 'gravitational' },
    'landauer-erasure-energy': { information: 'shannon' },
    'mass': {},
    'mass-density': { scale: 'cosmological', force: 'gravitational' },
    'microscopic-relaxation-time': { scale: 'quantum' },
    'minimal-surface-area': { scale: 'classical', force: 'gravitational' },
    'mond-force': { scale: 'classical', force: 'gravitational' },
    'mutation-rate': { scale: 'mesoscopic' },
    'near-radius': { scale: 'classical', force: 'gravitational' },
    'neutron-density': { scale: 'cosmological' },
    'newtonian-force': { scale: 'classical', force: 'gravitational' },
    'nucleon-yield-density': { scale: 'cosmological' },
    'planck-length': { scale: 'quantum', force: 'gravitational' },
    'planck-mass': { scale: 'quantum', force: 'gravitational' },
    'planck-mass-energy': { scale: 'quantum', force: 'gravitational' },
    'proton-density': { scale: 'cosmological' },
    'quantum-correlation-length': { scale: 'quantum' },
    'quench-timescale': { scale: 'cosmological' },
    'reference-correlation-length': { scale: 'quantum' },
    'reference-mass': { scale: 'quantum' },
    'relaxation-rate': {},
    'ricci-scalar': { force: 'gravitational', symmetry: 'poincare' },
    'scalar-field-reference': { scale: 'quantum' },
    'scalar-field-value': { scale: 'quantum' },
    'schwarzschild-radius': { scale: 'classical', force: 'gravitational' },
    'semi-major-axis': { scale: 'classical', force: 'gravitational' },
    'shapiro-delay': { scale: 'classical', force: 'gravitational' },
    'stress-energy-trace': { force: 'gravitational' },
    'superposition-extent': { scale: 'quantum' },
    'swampland-tower-mass': { scale: 'quantum' },
    'temperature': {},
    'time': {},
    'tunneling-mass': { scale: 'quantum' },
    'vacuum-expectation-value': { scale: 'quantum', force: 'weak' },
    'wormhole-cross-section-area': { scale: 'quantum', force: 'gravitational' },
    'wormhole-entanglement-entropy': { scale: 'quantum', information: 'von-neumann', force: 'gravitational' },
  };

  for (const [name, expectedAttrs] of Object.entries(AUDITED_END_STATE)) {
    it(`${name}: attributes match end-state pin`, () => {
      expect(attrsOf(name)).toEqual(expectedAttrs);
    });
  }
});
