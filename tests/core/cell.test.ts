/**
 * Tests for the typed `Cell` discriminated union (v0.7 Proposal 3
 * Phase 1).
 *
 * Coverage:
 *   - Each variant constructs cleanly with its required + optional fields.
 *   - The `kind` discriminator narrows `Cell` correctly in a `switch`.
 *   - An exhaustive switch + `_exhaustive: never` arm compiles without
 *     error (the pattern from `src/dimensional/validator.ts:636`).
 *   - Wrong-`kind` literals fail compile-time type-checking (verified
 *     via `@ts-expect-error`).
 *   - `CellConfidence` accepts the three expected strings and rejects
 *     anything else.
 *
 * @module tests/core/cell
 */

import { describe, it, expect } from 'vitest';
import type {
  Cell,
  CellBase,
  CellConfidence,
  LawCell,
  BridgeCell,
  EmergenceCell,
} from '../../src/core/cell.js';

// ---------------------------------------------------------------------------
// Fixtures — fresh literals (per Eve-R7 / Goal #5 rewording: existing
// `confidence: number` literals are not structurally assignable to the
// new `Cell` variants).
// ---------------------------------------------------------------------------

const sampleLaw: LawCell = {
  kind: 'law',
  id: 'law-newton-3',
  name: "Newton's Third Law",
  equation: 'F_{12} = -F_{21}',
  confidence: 'established',
  scales: ['classical'],
  forces: ['gravitational', 'electromagnetic'],
  symmetries: ['poincare'],
};

const sampleBridge: BridgeCell = {
  kind: 'bridge',
  id: 'bridge-decoherence',
  name: 'Quantum-Classical Decoherence',
  equation: 'd\\rho/dt = -i/\\hbar [H, \\rho] + \\mathcal{L}[\\rho]',
  confidence: 'speculative',
  source: { scale: 'quantum' },
  target: { scale: 'classical' },
  validated: false,
  description: 'Lindblad master equation governing the loss of quantum coherence.',
};

const sampleEmergence: EmergenceCell = {
  kind: 'emergence',
  id: 'emergence-superconductivity',
  name: 'BCS Superconductivity',
  equation: '\\Delta(T) \\sim k_B T_c \\cdot 1.764',
  confidence: 'established',
  order: 3,
  indices: [{ scale: 'mesoscopic', force: 'electromagnetic' }],
  description: 'Cooper pairs condense into a macroscopic ground state below T_c.',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cell discriminated union', () => {
  describe('CellConfidence', () => {
    it('accepts the three expected string-literal values', () => {
      const a: CellConfidence = 'established';
      const b: CellConfidence = 'speculative';
      const c: CellConfidence = 'highly-speculative';
      expect([a, b, c]).toEqual(['established', 'speculative', 'highly-speculative']);
    });

    it('rejects unknown confidence values at compile time', () => {
      // @ts-expect-error — 'invalid' is excluded from CellConfidence per
      // Decision #3 (active cells in the tensor are by definition not
      // catalog-`invalid`).
      const wrong: CellConfidence = 'invalid';
      void wrong;

      // @ts-expect-error — numeric confidence is the old vocabulary.
      const numeric: CellConfidence = 0.8;
      void numeric;
    });
  });

  describe('Variant construction', () => {
    it('builds a LawCell with required fields', () => {
      expect(sampleLaw.kind).toBe('law');
      expect(sampleLaw.scales).toContain('classical');
      expect(sampleLaw.confidence).toBe('established');
    });

    it('builds a BridgeCell with required fields', () => {
      expect(sampleBridge.kind).toBe('bridge');
      expect(sampleBridge.source.scale).toBe('quantum');
      expect(sampleBridge.target.scale).toBe('classical');
      expect(sampleBridge.validated).toBe(false);
    });

    it('builds an EmergenceCell with required fields', () => {
      expect(sampleEmergence.kind).toBe('emergence');
      expect(sampleEmergence.order).toBeGreaterThanOrEqual(3);
      expect(sampleEmergence.indices).toHaveLength(1);
    });

    it('CellBase fields appear on every variant', () => {
      const cells: Cell[] = [sampleLaw, sampleBridge, sampleEmergence];
      for (const cell of cells) {
        const base: CellBase = cell;
        expect(base.id).toBeTypeOf('string');
        expect(base.equation).toBeTypeOf('string');
        expect(base.confidence).toBeTypeOf('string');
      }
    });
  });

  describe('Wrong-kind literals fail compile-time type-checking', () => {
    it('rejects kind:bridge on a LawCell shape', () => {
      // @ts-expect-error — LawCell.kind is the literal 'law'; 'bridge'
      // is not assignable.
      const wrong: LawCell = { ...sampleLaw, kind: 'bridge' };
      void wrong;
      // The check is the @ts-expect-error above (`typecheck:tests`); no runtime stand-in (law 3).
    });

    it("rejects extra discriminator values not in the union", () => {
      // @ts-expect-error — there is no 'spurious' kind, so the literal is not assignable to
      // Cell (TS2322). Until 2026-10-15 the literal was cast `as Cell`, so the error the
      // directive consumed was the conversion's (TS2352), not the assignment this title names.
      const wrong: Cell = { kind: 'spurious', id: 'x', equation: '', confidence: 'established' };
      void wrong;
    });
  });

  describe('Exhaustive switch narrowing', () => {
    function describeCell(cell: Cell): string {
      switch (cell.kind) {
        case 'law':
          // Narrowed to LawCell; LawCell-specific fields accessible.
          return `Law: ${cell.name} on scales ${cell.scales.join(',')}`;
        case 'bridge':
          // Narrowed to BridgeCell.
          return `Bridge: ${cell.name} (validated=${cell.validated})`;
        case 'emergence':
          // Narrowed to EmergenceCell.
          return `Emergence: ${cell.name} at order ${cell.order}`;
        default: {
          // Exhaustiveness guard — same pattern as
          // src/dimensional/validator.ts:636.
          const _exhaustive: never = cell;
          void _exhaustive;
          throw new Error(`Unknown cell kind: ${(_exhaustive as Cell).kind}`);
        }
      }
    }

    it('narrows LawCell to its variant', () => {
      expect(describeCell(sampleLaw)).toBe(
        "Law: Newton's Third Law on scales classical",
      );
    });

    it('narrows BridgeCell to its variant', () => {
      expect(describeCell(sampleBridge)).toBe(
        'Bridge: Quantum-Classical Decoherence (validated=false)',
      );
    });

    it('narrows EmergenceCell to its variant', () => {
      expect(describeCell(sampleEmergence)).toBe(
        'Emergence: BCS Superconductivity at order 3',
      );
    });
  });

  describe('Type-guard helpers (via discriminator)', () => {
    function isLawCell(cell: Cell): cell is LawCell {
      return cell.kind === 'law';
    }
    function isBridgeCell(cell: Cell): cell is BridgeCell {
      return cell.kind === 'bridge';
    }
    function isEmergenceCell(cell: Cell): cell is EmergenceCell {
      return cell.kind === 'emergence';
    }

    it('routes each cell through exactly one type-guard', () => {
      const cells: Cell[] = [sampleLaw, sampleBridge, sampleEmergence];
      const matches = cells.map((c) => ({
        law: isLawCell(c),
        bridge: isBridgeCell(c),
        emergence: isEmergenceCell(c),
      }));

      expect(matches[0]).toEqual({ law: true, bridge: false, emergence: false });
      expect(matches[1]).toEqual({ law: false, bridge: true, emergence: false });
      expect(matches[2]).toEqual({ law: false, bridge: false, emergence: true });
    });

    it('narrowing inside type-guard exposes variant-specific fields', () => {
      const cells: Cell[] = [sampleLaw, sampleBridge, sampleEmergence];
      for (const cell of cells) {
        if (isLawCell(cell)) {
          expect(cell.scales).toBeDefined();
        } else if (isBridgeCell(cell)) {
          expect(cell.source).toBeDefined();
        } else if (isEmergenceCell(cell)) {
          expect(cell.order).toBeDefined();
        }
      }
    });
  });
});
