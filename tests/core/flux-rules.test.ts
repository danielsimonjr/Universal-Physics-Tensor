/**
 * Tests for `src/core/flux-rules.ts` — v0.7 Proposal 2 Phase 1
 * (Flux-rule scaffolding).
 *
 * Covers:
 *   - Type-shape pinning (FluxRuleKind discriminator, FluxRule shape).
 *   - Rule 2 (L/B/E coordinate matching) on each Cell variant.
 *   - Rule 3 (Causality) — forward, lateral, reverse, undefined-scale
 *     cases with exact diagnostic message pinning.
 *   - Rule registry exhaustiveness via `@ts-expect-error`.
 *   - `FluxViolationError` shape.
 *
 * @module tests/core/flux-rules
 */

import { describe, it, expect } from 'vitest';
import type {
  Cell,
  LawCell,
  BridgeCell,
  EmergenceCell,
} from '../../src/core/cell.js';
import {
  FluxViolationError,
  checkLBECoordinate,
  checkCausality,
  runRules,
  V07_CELL_RULES,
} from '../../src/core/flux-rules.js';
import type {
  FluxRule,
  FluxRuleKind,
  FluxDiagnostic,
} from '../../src/core/flux-rules.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const goodLaw: LawCell = {
  kind: 'law',
  id: 'law-good',
  name: 'Conservation of Energy',
  equation: 'dE/dt = 0',
  confidence: 'established',
  scales: ['classical'],
  forces: ['gravitational'],
  symmetries: ['poincare'],
};

const goodBridge: BridgeCell = {
  kind: 'bridge',
  id: 'bridge-good',
  name: 'Quantum→Classical Decoherence',
  equation: '\\rho \\to \\rho_{cls}',
  confidence: 'speculative',
  source: { scale: 'quantum' },
  target: { scale: 'classical' },
  validated: false,
  description: 'Standard emergent direction.',
};

const goodEmergence: EmergenceCell = {
  kind: 'emergence',
  id: 'emergence-good',
  name: 'BCS Superconductivity',
  equation: '\\Delta \\sim 1.764 \\, k_B T_c',
  confidence: 'established',
  order: 3,
  indices: [
    { scale: 'mesoscopic', force: 'electromagnetic' },
    { scale: 'classical', force: 'electromagnetic' },
  ],
};

// ---------------------------------------------------------------------------
// Rule 2 — L/B/E coordinate matching
// ---------------------------------------------------------------------------

describe('Rule 2 (L/B/E coordinate matching) — checkLBECoordinate', () => {
  describe('LawCell arm', () => {
    it('returns ok=true for a diagonal law with non-empty scales × forces', () => {
      expect(checkLBECoordinate(goodLaw)).toEqual({ ok: true });
    });

    it('returns ok=false with ERROR diagnostic when scales is empty', () => {
      const bad: LawCell = { ...goodLaw, scales: [] };
      const result = checkLBECoordinate(bad);
      expect(result.ok).toBe(false);
      expect(result.diagnostic?.severity).toBe('error');
      expect(result.diagnostic?.ruleName).toBe('lbe-coordinate');
      expect(result.diagnostic?.cellId).toBe('law-good');
      expect(result.diagnostic?.message).toContain('empty scales × forces');
    });

    it('returns ok=false when forces is empty', () => {
      const bad: LawCell = { ...goodLaw, forces: [] };
      const result = checkLBECoordinate(bad);
      expect(result.ok).toBe(false);
      expect(result.diagnostic?.severity).toBe('error');
    });
  });

  describe('BridgeCell arm', () => {
    it('returns ok=true for a bridge with distinct source/target', () => {
      expect(checkLBECoordinate(goodBridge)).toEqual({ ok: true });
    });

    it('returns ok=false with ERROR diagnostic when source === target on all populated axes', () => {
      const bad: BridgeCell = {
        ...goodBridge,
        source: { scale: 'quantum' },
        target: { scale: 'quantum' },
      };
      const result = checkLBECoordinate(bad);
      expect(result.ok).toBe(false);
      expect(result.diagnostic?.severity).toBe('error');
      expect(result.diagnostic?.message).toContain('identical source and target');
    });

    it('returns ok=true when source/target differ on a non-scale axis', () => {
      const bridgeOnForce: BridgeCell = {
        ...goodBridge,
        source: { scale: 'quantum', force: 'weak' },
        target: { scale: 'quantum', force: 'strong' },
      };
      expect(checkLBECoordinate(bridgeOnForce)).toEqual({ ok: true });
    });
  });

  describe('EmergenceCell arm', () => {
    it('returns ok=true for an emergence with indices.length >= 2', () => {
      expect(checkLBECoordinate(goodEmergence)).toEqual({ ok: true });
    });

    it('returns ok=false with ERROR diagnostic when indices.length === 1', () => {
      const bad: EmergenceCell = {
        ...goodEmergence,
        indices: [{ scale: 'mesoscopic' }],
      };
      const result = checkLBECoordinate(bad);
      expect(result.ok).toBe(false);
      expect(result.diagnostic?.severity).toBe('error');
      expect(result.diagnostic?.message).toContain('only 1 index group');
    });

    it('returns ok=false when indices is empty', () => {
      const bad: EmergenceCell = { ...goodEmergence, indices: [] };
      const result = checkLBECoordinate(bad);
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Rule 3 — Causality
// ---------------------------------------------------------------------------

describe('Rule 3 (Causality) — checkCausality', () => {
  it('returns ok=true with NO diagnostic on a forward bridge (quantum→classical)', () => {
    const result = checkCausality(goodBridge);
    expect(result.ok).toBe(true);
    expect(result.diagnostic).toBeUndefined();
  });

  it('FAILS with an ERROR diagnostic on a reverse bridge (cosmological→quantum)', () => {
    const reverse: BridgeCell = {
      ...goodBridge,
      source: { scale: 'cosmological' },
      target: { scale: 'quantum' },
    };
    const result = checkCausality(reverse);
    // Rule 3 promoted to ERROR tier in v0.10.0 (user decision
    // 2026-06-11; was WARNING in v0.7, promotion 'deferred to v0.8').
    // Live catalog verified clean before promotion (0 reverse arrows).
    expect(result.ok).toBe(false);
    expect(result.diagnostic?.severity).toBe('error');
    expect(result.diagnostic?.ruleName).toBe('causality');
    expect(result.diagnostic?.cellId).toBe('bridge-good');
    expect(result.diagnostic?.message).toContain('cosmological→quantum');
    expect(result.diagnostic?.message).toContain('coarser→finer');
  });

  it('returns ok=true with NO diagnostic on a lateral bridge (same scale)', () => {
    const lateral: BridgeCell = {
      ...goodBridge,
      source: { scale: 'classical', force: 'weak' },
      target: { scale: 'classical', force: 'strong' },
    };
    const result = checkCausality(lateral);
    expect(result.ok).toBe(true);
    expect(result.diagnostic).toBeUndefined();
  });

  it('emits an INFO diagnostic when source.scale is undefined (scale-unspecified skip)', () => {
    const noScale: BridgeCell = {
      ...goodBridge,
      source: { force: 'gravitational' },
      target: { force: 'electromagnetic' },
    };
    const result = checkCausality(noScale);
    expect(result.ok).toBe(true);
    expect(result.diagnostic?.severity).toBe('info');
    expect(result.diagnostic?.message).toContain('scale axis unspecified');
  });

  it('emits an INFO diagnostic when target.scale is undefined', () => {
    const noTargetScale: BridgeCell = {
      ...goodBridge,
      source: { scale: 'quantum' },
      target: { force: 'electromagnetic' },
    };
    const result = checkCausality(noTargetScale);
    expect(result.diagnostic?.severity).toBe('info');
  });

  it('returns ok=true with NO diagnostic on a LawCell (rule only fires on bridges)', () => {
    const result = checkCausality(goodLaw);
    expect(result.ok).toBe(true);
    expect(result.diagnostic).toBeUndefined();
  });

  it('returns ok=true with NO diagnostic on an EmergenceCell', () => {
    const result = checkCausality(goodEmergence);
    expect(result.ok).toBe(true);
    expect(result.diagnostic).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// runRules dispatcher
// ---------------------------------------------------------------------------

describe('runRules — registry dispatcher', () => {
  it('aggregates diagnostics across multiple rules', () => {
    // Reverse bridge → causality ERROR (v0.10.0 promotion) +
    // lbe-coordinate pass = 1 diagnostic.
    const reverse: BridgeCell = {
      ...goodBridge,
      source: { scale: 'cosmological' },
      target: { scale: 'quantum' },
    };
    const report = runRules(reverse, V07_CELL_RULES);
    expect(report.diagnostics).toHaveLength(1);
    expect(report.warningCount).toBe(0);
    expect(report.errorCount).toBe(1);
    expect(report.infoCount).toBe(0);
  });

  it('counts each tier independently', () => {
    const undefinedScale: BridgeCell = {
      ...goodBridge,
      source: { force: 'gravitational' },
      target: { force: 'electromagnetic' },
    };
    const report = runRules(undefinedScale, V07_CELL_RULES);
    expect(report.diagnostics).toHaveLength(1);
    expect(report.infoCount).toBe(1);
  });

  it('returns zero diagnostics for a fully-clean cell', () => {
    const report = runRules(goodBridge, V07_CELL_RULES);
    expect(report.diagnostics).toHaveLength(0);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
    expect(report.infoCount).toBe(0);
  });

  it('errors flow through error count', () => {
    const bad: LawCell = { ...goodLaw, scales: [] };
    const report = runRules(bad, V07_CELL_RULES);
    expect(report.errorCount).toBe(1);
    expect(report.diagnostics[0].severity).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// FluxViolationError
// ---------------------------------------------------------------------------

describe('FluxViolationError', () => {
  it('carries ruleName and cellId for inspection', () => {
    const err = new FluxViolationError('lbe-coordinate', 'law-bad', 'reason');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FluxViolationError);
    expect(err.ruleName).toBe('lbe-coordinate');
    expect(err.cellId).toBe('law-bad');
    expect(err.name).toBe('FluxViolationError');
    expect(err.message).toContain('lbe-coordinate');
    expect(err.message).toContain('law-bad');
    expect(err.message).toContain('reason');
  });
});

// ---------------------------------------------------------------------------
// Type-shape exhaustiveness (compile-time)
// ---------------------------------------------------------------------------

describe('Type-shape exhaustiveness (compile-time)', () => {
  it('FluxRuleKind union accepts the three v0.7 kinds and nothing else', () => {
    const a: FluxRuleKind = 'dimensional-consistency';
    const b: FluxRuleKind = 'lbe-coordinate';
    const c: FluxRuleKind = 'causality';
    expect([a, b, c]).toEqual(['dimensional-consistency', 'lbe-coordinate', 'causality']);

    // @ts-expect-error — 'unknown-rule' is not a member of the FluxRuleKind union.
    const wrong: FluxRuleKind = 'unknown-rule';
    void wrong;
  });

  it('FluxRule.kind branding rejects unknown discriminators', () => {
    // @ts-expect-error — 'unknown-rule' is not assignable to FluxRuleKind.
    const wrong: FluxRule = { kind: 'unknown-rule', check: () => ({ ok: true }) };
    void wrong;
    // The check is the @ts-expect-error above (`typecheck:tests`); no runtime stand-in (law 3).
  });

  it('FluxDiagnostic.severity union rejects unknown tiers', () => {
    const d: FluxDiagnostic = {
      severity: 'warning',
      ruleName: 'causality',
      cellId: 'x',
      message: 'msg',
    };
    expect(d.severity).toBe('warning');

    // @ts-expect-error — 'critical' is not a valid severity tier.
    const wrong: FluxDiagnostic = { ...d, severity: 'critical' };
    void wrong;
  });
});
