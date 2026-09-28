/**
 * The nine oscillator models of design note §3, and the module-local
 * dimension constants S0.1 redefines because the canonical entry files do
 * not export them.
 */
import { describe, it, expect } from 'vitest';
import { ATLAS_MODELS, getAtlasModel } from '../../src/atlas/oscillators/models.js';
import {
  CAPACITANCE,
  CUBIC_STIFFNESS,
  DAMPING,
  INDUCTANCE,
  RESISTANCE,
  SPRING_CONSTANT,
} from '../../src/atlas/oscillators/dimensions.js';
import { dim } from '../../src/dimensional/ast-builders.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Read a MODULE-LOCAL `const NAME = dim(...)` out of a canonical entry file
 * and evaluate it.
 *
 * These constants are not exported, so a redefinition under `src/atlas/`
 * cannot be compared against them by importing. Comparing two locally-built
 * `dim(...)` calls would assert nothing — it would pass no matter what the
 * entry file says. Parsing the source is what makes a future divergence in
 * the entry file fail THIS test.
 */
function dimFromEntryFile(entry: string, name: string): Dimension {
  const path = fileURLToPath(new URL(`../../src/canonical/entries/${entry}`, import.meta.url));
  const source = readFileSync(path, 'utf8');
  const match = new RegExp(`^const ${name} = dim\\(([^)]*)\\);`, 'm').exec(source);
  if (match === null) throw new Error(`no module-local \`const ${name} = dim(...)\` in ${entry}`);
  const args = match[1].split(',').map((a) => {
    const n = Number(a.trim());
    if (!Number.isFinite(n)) throw new Error(`non-numeric dim() arg in ${entry}:${name}: "${a}"`);
    return n;
  });
  return dim(...(args as [number, number, number, number, number]));
}

describe('oscillator dimension constants', () => {
  it('matches the canonical entry files argument-for-argument', () => {
    // electromagnetism.ts:40-43, quoted in design note §10 Q2.
    expect(CAPACITANCE).toEqual(dimFromEntryFile('electromagnetism.ts', 'CAPACITANCE'));
    expect(INDUCTANCE).toEqual(dimFromEntryFile('electromagnetism.ts', 'INDUCTANCE'));
    // RESISTANCE is needed by model-rlc and is module-local for the same reason.
    expect(RESISTANCE).toEqual(dimFromEntryFile('electromagnetism.ts', 'RESISTANCE'));
  });

  it('agrees with BOTH definitions of SPRING_CONSTANT', () => {
    // mechanics.ts:35 AND fluids-waves.ts:48 — two sources of truth for one
    // dimension, identical today. Reading both means a future divergence
    // fails here instead of being silently picked.
    const mechanics = dimFromEntryFile('mechanics.ts', 'SPRING_CONSTANT');
    const fluidsWaves = dimFromEntryFile('fluids-waves.ts', 'SPRING_CONSTANT');
    expect(mechanics).toEqual(fluidsWaves);
    expect(SPRING_CONSTANT).toEqual(mechanics);
    expect(SPRING_CONSTANT).toEqual(fluidsWaves);
  });

  it('detects a divergence between the two SPRING_CONSTANT definitions', () => {
    // Proves the reader above can FAIL: a parser that always returns the same
    // thing is indistinguishable from a passing check.
    expect(dimFromEntryFile('mechanics.ts', 'SPRING_CONSTANT')).not.toEqual(
      dimFromEntryFile('electromagnetism.ts', 'RESISTANCE'),
    );
    expect(() => dimFromEntryFile('mechanics.ts', 'NO_SUCH_CONSTANT')).toThrow();
  });

  it('derives DAMPING as M T^-1 and CUBIC_STIFFNESS as M L^-2 T^-2', () => {
    expect(DAMPING).toEqual(dim(0, 1, -1));
    expect(CUBIC_STIFFNESS).toEqual(dim(-2, 1, -2));
  });
});

describe('ATLAS_MODELS', () => {
  it('registers exactly the nine models of §3', () => {
    expect(ATLAS_MODELS.map((m) => m.id)).toEqual([
      'model-spring',
      'model-lc',
      'model-damped-spring',
      'model-rlc',
      'model-pendulum',
      'model-chain',
      'model-wave-1d',
      'model-cubic-spring',
      'model-first-order',
    ]);
  });

  it('gives every model the oscillators family and a non-empty dynamics', () => {
    for (const m of ATLAS_MODELS) {
      expect(m.family).toBe('oscillators');
      expect(m.dynamics.length).toBeGreaterThan(0);
      expect(m.regime.family).toBe('oscillators');
    }
  });

  it('resolves every canonicalRefs entry in CANONICAL_EQUATIONS', () => {
    const ids = new Set(CANONICAL_EQUATIONS.map((e) => e.id));
    const refs = ATLAS_MODELS.flatMap((m) => m.canonicalRefs);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids.has(ref)).toBe(true);
  });

  it('carries the §3 canonicalRefs for model-spring and model-lc', () => {
    expect(getAtlasModel('model-spring').canonicalRefs).toEqual([
      'CE-simple-harmonic-frequency',
      'CE-spring-potential-energy',
      'CE-oscillator-energy',
    ]);
    expect(getAtlasModel('model-lc').canonicalRefs).toEqual(['CE-lc-resonance', 'CE-capacitor-energy']);
    expect(getAtlasModel('model-wave-1d').canonicalRefs).toEqual(['CE-wave-speed']);
  });

  it('derives model-damped-spring regime groups from {m, b, k}', () => {
    const regime = getAtlasModel('model-damped-spring').regime;
    expect(Object.keys(regime.groupDefinitions)).toEqual(['m · b^-2 · k']);
    expect(regime.groupDefinitions['m · b^-2 · k'].exponents).toEqual({ m: 1, b: -2, k: 1 });
  });

  it('exposes theta0 and qa as groups on the models that declare them', () => {
    expect(getAtlasModel('model-pendulum').dimensionlessInputs).toEqual(['theta0']);
    expect(getAtlasModel('model-pendulum').regime.groupDefinitions['theta0']).toBeDefined();
    expect(getAtlasModel('model-chain').dimensionlessInputs).toEqual(['qa']);
    expect(getAtlasModel('model-chain').regime.groupDefinitions['qa']).toBeDefined();
  });

  it('gives every model unique parameter names', () => {
    for (const m of ATLAS_MODELS) {
      const names = [...m.parameters.map((p) => p.name), ...m.dimensionlessInputs];
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('throws on an unknown model id', () => {
    expect(() => getAtlasModel('model-nope')).toThrow();
  });
});
