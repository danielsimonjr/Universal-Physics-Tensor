/**
 * Tests for `UniversalTensor.addCell` + the `compose` factory.
 * (v0.7 Proposal 3 Phase 2.)
 *
 * Coverage:
 *   - `addCell` with each of the three variants round-trips through
 *     the corresponding query method (`getLaws`, `findBridges`,
 *     `getEmergence`).
 *   - The dispatcher's exhaustiveness guard correctly throws on a
 *     synthetic unknown-kind input.
 *   - `compose(L, B, E, config)` produces a tensor whose `getStats()`
 *     counts match the input array lengths.
 *
 * @module tests/core/addCell
 */

import { describe, it, expect } from 'vitest';
import { UniversalTensor } from '../../src/core/tensor.js';
import { compose } from '../../src/core/tensor.js';
import type {
  Cell,
  LawCell,
  BridgeCell,
  EmergenceCell,
} from '../../src/core/cell.js';
import type { TensorConfig } from '../../src/core/types.js';
import { FluxViolationError } from '../../src/core/flux-rules.js';

const baseConfig: TensorConfig = {
  rank: 3,
  scales: ['quantum', 'classical', 'mesoscopic'],
  forces: ['gravitational', 'electromagnetic', 'weak', 'strong'],
};

const sampleLaw: LawCell = {
  kind: 'law',
  id: 'law-newton-2',
  name: "Newton's Second Law",
  equation: 'F = ma',
  confidence: 'established',
  scales: ['classical'],
  forces: ['gravitational'],
  symmetries: ['poincare'],
};

const sampleBridge: BridgeCell = {
  kind: 'bridge',
  id: 'bridge-decoherence',
  name: 'Quantum→Classical Decoherence',
  equation: 'd\\rho/dt = -i/\\hbar [H,\\rho] + \\mathcal{L}[\\rho]',
  confidence: 'speculative',
  source: { scale: 'quantum' },
  target: { scale: 'classical' },
  validated: false,
  description: 'Lindblad master equation.',
};

const sampleEmergence: EmergenceCell = {
  kind: 'emergence',
  id: 'emergence-bcs',
  name: 'BCS Superconductivity',
  equation: '\\Delta(T) \\sim 1.764 \\, k_B T_c',
  confidence: 'established',
  order: 3,
  // Two indices — v0.7-p2 Rule 2 (lbe-coordinate) requires
  // indices.length >= 2 for emergence cells (higher-order
  // correlations span multiple coordinates by definition).
  indices: [
    { scale: 'mesoscopic', force: 'electromagnetic' },
    { scale: 'classical', force: 'electromagnetic' },
  ],
};

describe('UniversalTensor.addCell', () => {
  it('round-trips a LawCell through getLaws', () => {
    const tensor = new UniversalTensor(baseConfig);
    const newlyAdded = tensor.addCell(sampleLaw);
    expect(newlyAdded).toBe(true);

    const laws = tensor.getLaws();
    expect(laws).toHaveLength(1);
    expect(laws[0].id).toBe('law-newton-2');
    expect(laws[0].name).toBe("Newton's Second Law");
    // Numeric confidence is the legacy storage shape; CellConfidence
    // 'established' maps to 0.95 internally (private detail).
    expect(laws[0].confidence).toBeCloseTo(0.95, 2);
  });

  it('round-trips a BridgeCell through findBridges', () => {
    const tensor = new UniversalTensor(baseConfig);
    tensor.addCell(sampleBridge);

    const bridges = tensor.findBridges({ scale: 'quantum' }, { scale: 'classical' });
    expect(bridges).toHaveLength(1);
    expect(bridges[0].id).toBe('bridge-decoherence');
    expect(bridges[0].validated).toBe(false);
    expect(bridges[0].confidence).toBeCloseTo(0.6, 2); // 'speculative'
  });

  it('round-trips an EmergenceCell through getEmergence', () => {
    const tensor = new UniversalTensor(baseConfig);
    tensor.addCell(sampleEmergence);

    const emergences = tensor.getEmergence();
    expect(emergences).toHaveLength(1);
    expect(emergences[0].id).toBe('emergence-bcs');
    expect(emergences[0].order).toBe(3);
    expect(emergences[0].confidence).toBeCloseTo(0.95, 2); // 'established'
  });

  it('returns false on replacement (same id)', () => {
    const tensor = new UniversalTensor(baseConfig);
    expect(tensor.addCell(sampleLaw)).toBe(true);
    expect(tensor.addCell(sampleLaw)).toBe(false);

    // After replacement, only one law remains.
    expect(tensor.getLaws()).toHaveLength(1);
  });

  it('throws on a synthetic unknown-kind input (defensive guard)', () => {
    const tensor = new UniversalTensor(baseConfig);
    const bogus = { kind: 'spurious', id: 'x', equation: '', confidence: 'established' } as unknown as Cell;
    expect(() => tensor.addCell(bogus)).toThrow(/unknown cell kind/i);
  });

  it('preserves the EmergenceCell.description prose when present', () => {
    const tensor = new UniversalTensor(baseConfig);
    const withProse: EmergenceCell = {
      ...sampleEmergence,
      description: 'Macroscopic ground state from electron-phonon coupling.',
    };
    tensor.addCell(withProse);
    const result = tensor.getEmergence();
    // Legacy interface stores math+prose merged in `description`.
    expect(result[0].description).toContain(withProse.equation);
    expect(result[0].description).toContain('electron-phonon coupling');
  });
});

describe('compose(L, B, E, config) factory', () => {
  it('builds a tensor whose counts match the input array lengths', () => {
    const tensor = compose([sampleLaw], [sampleBridge], [sampleEmergence], baseConfig);

    expect(tensor.getLaws()).toHaveLength(1);
    expect(tensor.getBridges()).toHaveLength(1);
    expect(tensor.getEmergence()).toHaveLength(1);

    const stats = tensor.getStats();
    expect(stats).toBeDefined();
  });

  it('accepts empty arrays', () => {
    const tensor = compose([], [], [], baseConfig);
    expect(tensor.getLaws()).toHaveLength(0);
    expect(tensor.getBridges()).toHaveLength(0);
    expect(tensor.getEmergence()).toHaveLength(0);
  });

  it('inserts cells in the documented order (L, B, E)', () => {
    // The order matters for the insertion-order guarantee on Map.
    const laws: LawCell[] = [sampleLaw];
    const bridges: BridgeCell[] = [sampleBridge];
    const emergences: EmergenceCell[] = [sampleEmergence];

    const tensor = compose(laws, bridges, emergences, baseConfig);
    expect(tensor.getLaws()[0].id).toBe(laws[0].id);
    expect(tensor.getBridges()[0].id).toBe(bridges[0].id);
    expect(tensor.getEmergence()[0].id).toBe(emergences[0].id);
  });
});

// ---------------------------------------------------------------------------
// Fail-atomic on a REPLACEMENT (9.0.0 audit §2 N4). `addCell` replaces an
// existing id first and runs the flux rules second; when a rule then fails,
// the rollback used to delete the id instead of restoring the entry that was
// there, so one bad replacement erased a good record.
// ---------------------------------------------------------------------------

describe('UniversalTensor.addCell is fail-atomic on a replacement (N4)', () => {
  it('a law replacement that fails a flux rule leaves the previous law in place', () => {
    const tensor = new UniversalTensor(baseConfig);
    expect(tensor.addCell(sampleLaw)).toBe(true);
    const before = tensor.getStats();

    const bad: LawCell = { ...sampleLaw, name: 'broken replacement', forces: [] };
    expect(() => tensor.addCell(bad)).toThrow(FluxViolationError);

    const laws = tensor.getLaws();
    expect(laws).toHaveLength(1);
    expect(laws[0]!.name).toBe("Newton's Second Law");
    expect(tensor.getStats()).toEqual(before);
  });

  it('a bridge replacement that fails the causality rule leaves the previous bridge in place', () => {
    const tensor = new UniversalTensor(baseConfig);
    expect(tensor.addCell(sampleBridge)).toBe(true);
    const before = tensor.getStats();

    // Coarser → finer scale is a reverse-causality arrow: Rule 3, ERROR tier.
    const reversed: BridgeCell = { ...sampleBridge, source: { scale: 'classical' }, target: { scale: 'quantum' } };
    expect(() => tensor.addCell(reversed)).toThrow(FluxViolationError);

    const bridges = tensor.findBridges({ scale: 'quantum' }, { scale: 'classical' });
    expect(bridges).toHaveLength(1);
    expect(bridges[0]!.id).toBe('bridge-decoherence');
    expect(tensor.findBridges({ scale: 'classical' }, { scale: 'quantum' })).toHaveLength(0);
    expect(tensor.getStats()).toEqual(before);
  });

  it('an emergence replacement that fails a flux rule leaves the previous phenomenon in place', () => {
    const tensor = new UniversalTensor(baseConfig);
    expect(tensor.addCell(sampleEmergence)).toBe(true);
    const before = tensor.getStats();

    // Rule 2 wants at least two coordinates on an emergence cell.
    const bad: EmergenceCell = { ...sampleEmergence, indices: [{ scale: 'mesoscopic', force: 'electromagnetic' }] };
    expect(() => tensor.addCell(bad)).toThrow(FluxViolationError);

    const emergences = tensor.getEmergence();
    expect(emergences).toHaveLength(1);
    expect(emergences[0]!.indices).toHaveLength(2);
    expect(tensor.getStats()).toEqual(before);
  });

  it('a fresh id that fails a flux rule is still rolled back to nothing (control)', () => {
    const tensor = new UniversalTensor(baseConfig);
    const bad: LawCell = { ...sampleLaw, forces: [] };
    expect(() => tensor.addCell(bad)).toThrow(FluxViolationError);
    expect(tensor.getLaws()).toHaveLength(0);
    expect(tensor.getStats().occupiedCells).toBe(0);
  });
});

describe('getStats has one cell count', () => {
  it('does not carry the deprecated duplicate totalElements', () => {
    const tensor = new UniversalTensor(baseConfig);
    tensor.addCell(sampleLaw);
    const stats = tensor.getStats();
    expect(stats.occupiedCells).toBe(1);
    expect('totalElements' in stats).toBe(false);
  });
});
