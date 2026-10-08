import { describe, it, expect } from 'vitest';
import { UniversalTensor, PhysicalConstants } from '../src/index.js';
import type { PhysicalLaw, BridgeEquation } from '../src/index.js';

const lawA: PhysicalLaw = {
  id: 'A',
  name: 'Law A',
  equation: 'A',
  scales: ['quantum'],
  forces: ['gravitational'],
  symmetries: ['poincare'],
  confidence: 1.0,
};

const lawB: PhysicalLaw = {
  id: 'B',
  name: 'Law B',
  equation: 'B',
  scales: ['quantum'],
  forces: ['gravitational'],
  symmetries: ['poincare'],
  confidence: 1.0,
};

function makeTensor(): UniversalTensor {
  return new UniversalTensor({
    rank: 3,
    scales: ['quantum', 'classical'],
    forces: ['gravitational', 'electromagnetic'],
  });
}

describe('UniversalTensor — cell-collision semantics (Round 3 fix)', () => {
  it('two laws sharing (scale, force) both survive — no overwrite', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    t.addLaw(lawB);
    expect(t.getStats().knownLaws).toBe(2);
    // One tensor cell now holds BOTH equation IDs (via Set accumulation)
    expect(t.getStats().occupiedCells).toBe(1);
    expect(t.getStats().totalEntries).toBe(2);
    // Verify both IDs are actually in the cell
    const cell = t.getCellContents({ scale: 'quantum', force: 'gravitational' });
    expect(cell).toContain('A');
    expect(cell).toContain('B');
  });

  it('two bridges sharing (source, target) both survive', () => {
    const t = makeTensor();
    const b1: BridgeEquation = {
      id: 'X',
      name: 'Bridge X',
      source: { scale: 'quantum', force: 'gravitational' },
      target: { scale: 'classical', force: 'gravitational' },
      equation: 'X',
      confidence: 1.0,
      validated: true,
      description: '',
    };
    const b2: BridgeEquation = { ...b1, id: 'Y', name: 'Bridge Y', equation: 'Y' };
    t.addBridge(b1);
    t.addBridge(b2);
    expect(t.getStats().bridgeEquations).toBe(2);
  });
});

describe('UniversalTensor — queryLaws filter completeness (Round 3 fix)', () => {
  it('query by information index excludes laws lacking that field', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    expect(t.queryLaws({ information: 'vonNeumann' })).toHaveLength(0);
  });

  it('query by dimension excludes laws lacking dimensions', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    expect(t.queryLaws({ dimension: 4 })).toHaveLength(0);
  });

  it('query by topology excludes laws lacking topologies', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    expect(t.queryLaws({ topology: 2 })).toHaveLength(0);
  });

  it('query by information matches laws that declare the measure', () => {
    const t = makeTensor();
    t.addLaw({ ...lawA, id: 'C', informationMeasures: ['vonNeumann'] });
    expect(t.queryLaws({ information: 'vonNeumann' })).toHaveLength(1);
  });

  it('topology: 0 is preserved (not dropped as falsy)', () => {
    const t = makeTensor();
    t.addLaw({ ...lawA, id: 'D', topologies: [0] });
    expect(t.queryLaws({ topology: 0 })).toHaveLength(1);
  });

  it('dimension: 0 is preserved (not dropped as falsy)', () => {
    const t = makeTensor();
    t.addLaw({ ...lawA, id: 'E', dimensions: [0] });
    expect(t.queryLaws({ dimension: 0 })).toHaveLength(1);
  });

  it('empty query returns all laws', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    t.addLaw(lawB);
    expect(t.queryLaws({})).toHaveLength(2);
  });

  it('multi-filter is AND (intersection, not union)', () => {
    const t = makeTensor();
    t.addLaw({ ...lawA, id: 'F', scales: ['quantum'], forces: ['gravitational'] });
    t.addLaw({ ...lawA, id: 'G', scales: ['classical'], forces: ['electromagnetic'] });
    expect(
      t.queryLaws({ scale: 'quantum', force: 'electromagnetic' })
    ).toHaveLength(0);
    expect(t.queryLaws({ scale: 'quantum', force: 'gravitational' })).toHaveLength(1);
  });
});

describe('UniversalTensor — Round 4 runtime validation', () => {
  it('rejects rank outside 3..6', () => {
    expect(() => new UniversalTensor({ rank: 7 as 6, scales: ['quantum'], forces: ['gravitational'] })).toThrow(RangeError);
    expect(() => new UniversalTensor({ rank: 2 as 3, scales: ['quantum'], forces: ['gravitational'] })).toThrow(RangeError);
  });

  it('rejects empty scales or forces', () => {
    expect(() => new UniversalTensor({ rank: 3, scales: [], forces: ['gravitational'] })).toThrow(TypeError);
    expect(() => new UniversalTensor({ rank: 3, scales: ['quantum'], forces: [] })).toThrow(TypeError);
  });

  it('rejects confidence outside [0,1]', () => {
    const t = makeTensor();
    expect(() => t.addLaw({ ...lawA, confidence: -0.1 })).toThrow(RangeError);
    expect(() => t.addLaw({ ...lawA, confidence: 1.5 })).toThrow(RangeError);
  });

  it('addLaw returns true for new, false for replacement', () => {
    const t = makeTensor();
    expect(t.addLaw(lawA)).toBe(true);
    expect(t.addLaw({ ...lawA, name: 'Law A v2' })).toBe(false);
    // The replacement is the one stored
    expect(t.getLaws()[0].name).toBe('Law A v2');
  });
});

describe('UniversalTensor — getCellContents (Round 4 API)', () => {
  it('returns both IDs when two laws share a cell', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    t.addLaw(lawB);
    const contents = t.getCellContents({ scale: 'quantum', force: 'gravitational' });
    expect(contents).toContain('A');
    expect(contents).toContain('B');
    expect(contents.length).toBe(2);
  });

  it('returns empty array for untouched cells', () => {
    const t = makeTensor();
    t.addLaw(lawA);
    expect(t.getCellContents({ scale: 'cosmological', force: 'weak' })).toEqual([]);
  });
});

describe('UniversalTensor — addEmergence populates tensorData', () => {
  it('addEmergence with indices puts the phenomenon in tensorData', () => {
    const t = makeTensor();
    t.addEmergence({
      id: 'turbulence',
      name: 'Hydrodynamic Turbulence',
      order: 3,
      indices: [{ scale: 'classical', force: 'electromagnetic' }],
      description: '',
      confidence: 0.9,
    });
    const contents = t.getCellContents({ scale: 'classical', force: 'electromagnetic' });
    expect(contents).toContain('turbulence');
  });

  it('rejects emergence with order < 3', () => {
    const t = makeTensor();
    expect(() => t.addEmergence({
      id: 'x', name: 'x', order: 2, indices: [], description: '', confidence: 1,
    })).toThrow(RangeError);
  });
});

describe('UniversalTensor — Round 5 cell-coherence (replacement with different axes)', () => {
  it('replacing a law with different scales/forces removes stale cells', () => {
    const t = makeTensor();
    t.addLaw({ ...lawA, scales: ['quantum'], forces: ['gravitational'] });
    // Replace same id with different scale/force:
    t.addLaw({ ...lawA, scales: ['classical'], forces: ['electromagnetic'] });

    expect(t.getStats().knownLaws).toBe(1);
    // Stale cell should be gone; new cell should hold the id
    expect(t.getCellContents({ scale: 'quantum', force: 'gravitational' })).toEqual([]);
    expect(t.getCellContents({ scale: 'classical', force: 'electromagnetic' })).toEqual(['A']);
    expect(t.getStats().occupiedCells).toBe(1);
  });

  it('replacing a bridge with different source/target removes stale cell', () => {
    const t = makeTensor();
    const b: BridgeEquation = {
      id: 'B', name: 'B', source: { scale: 'quantum', force: 'gravitational' },
      target: { scale: 'classical', force: 'gravitational' }, equation: '', confidence: 1,
      validated: true, description: '',
    };
    t.addBridge(b);
    t.addBridge({ ...b, source: { scale: 'quantum', force: 'electromagnetic' }, target: { scale: 'classical', force: 'electromagnetic' } });

    expect(t.getStats().bridgeEquations).toBe(1);
    expect(t.getBridgeCellContents(
      { scale: 'quantum', force: 'gravitational' },
      { scale: 'classical', force: 'gravitational' }
    )).toEqual([]);
    expect(t.getBridgeCellContents(
      { scale: 'quantum', force: 'electromagnetic' },
      { scale: 'classical', force: 'electromagnetic' }
    )).toEqual(['B']);
  });
});

describe('UniversalTensor — getBridgeCellContents (Round 5)', () => {
  it('retrieves bridge IDs at their source→target cell', () => {
    const t = makeTensor();
    const b: BridgeEquation = {
      id: 'B1', name: 'B1', source: { scale: 'quantum', force: 'gravitational' },
      target: { scale: 'classical', force: 'gravitational' }, equation: '', confidence: 1,
      validated: true, description: '',
    };
    t.addBridge(b);
    const found = t.getBridgeCellContents(
      { scale: 'quantum', force: 'gravitational' },
      { scale: 'classical', force: 'gravitational' }
    );
    expect(found).toEqual(['B1']);
  });
});

describe('UniversalTensor — Round 5 validation hardening', () => {
  it('rejects empty-string IDs on all add* methods', () => {
    const t = makeTensor();
    expect(() => t.addLaw({ ...lawA, id: '' })).toThrow(TypeError);
    expect(() => t.addLaw({ ...lawA, id: '   ' })).toThrow(TypeError);
  });

  it('addEmergence rejects confidence out of [0,1]', () => {
    const t = makeTensor();
    expect(() => t.addEmergence({
      id: 'E', name: 'E', order: 3, indices: [], description: '', confidence: 99,
    })).toThrow(RangeError);
  });

  it('addEmergence rejects non-integer order', () => {
    const t = makeTensor();
    expect(() => t.addEmergence({
      id: 'E', name: 'E', order: 3.5, indices: [], description: '', confidence: 1,
    })).toThrow(RangeError);
  });

  it('addEmergence rejects NaN order', () => {
    const t = makeTensor();
    expect(() => t.addEmergence({
      id: 'E', name: 'E', order: NaN, indices: [], description: '', confidence: 1,
    })).toThrow(RangeError);
  });
});

describe('UniversalTensor — Round 7 complete axis validation', () => {
  it('rejects laws with informationMeasures not in config', () => {
    const t = makeTensor();
    // Default config has ['vonNeumann', 'shannon'] for informationMeasures
    expect(() => t.addLaw({
      ...lawA,
      informationMeasures: ['kolmogorov'],
    })).toThrow(RangeError);
  });

  it('rejects laws with NaN or Infinity dimensions', () => {
    const t = makeTensor();
    expect(() => t.addLaw({ ...lawA, dimensions: [NaN] })).toThrow(RangeError);
    expect(() => t.addLaw({ ...lawA, dimensions: [Infinity] })).toThrow(RangeError);
    expect(() => t.addLaw({ ...lawA, dimensions: [3.5] })).toThrow(RangeError);
  });

  it('rejects laws with non-integer topologies', () => {
    const t = makeTensor();
    expect(() => t.addLaw({ ...lawA, topologies: [NaN] })).toThrow(RangeError);
    expect(() => t.addLaw({ ...lawA, topologies: [1.5] })).toThrow(RangeError);
  });

  it('accepts finite integer dimensions including 0 and negative', () => {
    const t = makeTensor();
    t.addLaw({ ...lawA, id: 'D0', dimensions: [0] });
    t.addLaw({ ...lawA, id: 'D1', dimensions: [-1] });
    t.addLaw({ ...lawA, id: 'D4', dimensions: [4] });
    expect(t.getStats().knownLaws).toBe(3);
  });

  it('rejects bridges with empty {} source == empty {} target', () => {
    const t = makeTensor();
    expect(() => t.addBridge({
      id: 'empty', name: 'empty', source: {}, target: {},
      equation: '', confidence: 1, validated: true, description: '',
    })).toThrow(RangeError);
  });
});

describe('UniversalTensor — Round 6 axis validation', () => {
  it('rejects laws with scales not in config', () => {
    const t = makeTensor();
    expect(() => t.addLaw({
      ...lawA, scales: ['cosmological'],  // not in config scales
    })).toThrow(RangeError);
  });

  it('rejects laws with forces not in config', () => {
    const t = makeTensor();
    expect(() => t.addLaw({
      ...lawA, forces: ['weak'],  // not in config forces
    })).toThrow(RangeError);
  });

  it('rejects laws with symmetries not in config', () => {
    const t = makeTensor();
    expect(() => t.addLaw({
      ...lawA, symmetries: ['conformal'],  // not in default config symmetries
    })).toThrow(RangeError);
  });

  it('rejects bridge with source == target (on-diagonal)', () => {
    const t = makeTensor();
    const same = { scale: 'quantum' as const, force: 'gravitational' as const };
    expect(() => t.addBridge({
      id: 'B', name: 'B', source: same, target: same,
      equation: '', confidence: 1, validated: true, description: '',
    })).toThrow(RangeError);
  });
});

describe('PhysicalConstants — CODATA accuracy', () => {
  it('speed of light is exact SI definition', () => {
    expect(PhysicalConstants.c).toBe(299792458);
  });

  it('Hubble constant matches Planck 2018 value (67.4 km/s/Mpc)', () => {
    // H0 s^-1 * 3.085677581491367e22 m/Mpc (the unit table's parsec) / 1000 m/km = 67.4 km/s/Mpc
    const kmSMpc = (PhysicalConstants.H0 * 3.085677581491367e22) / 1000;
    expect(kmSMpc).toBeCloseTo(67.4, 12);
  });

  it('Planck length is consistent with ℏ, G, c (relative error < 1e-5)', () => {
    const computedLP = Math.sqrt(
      (PhysicalConstants.hbar * PhysicalConstants.G) / PhysicalConstants.c ** 3
    );
    const relErr = Math.abs(PhysicalConstants.lP - computedLP) / computedLP;
    expect(relErr).toBeLessThan(1e-5);
  });
});
