/**
 * Whole-atlas invariants over EVERY registered family (Phase 4, S4.4–S4.5),
 * and ROADMAP Phase 4's two exit counts.
 *
 * Families may reference each other's models (the wave family ends two bridges
 * at the oscillator family's `model-wave-1d`), so resolution is checked against
 * the union, and ids must be unique across it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATLAS_FAMILIES, admitFamilies } from '../../src/atlas/families.js';
import { OSCILLATOR_FAMILY } from '../../src/atlas/oscillators/index.js';
import { AB_PENDULUM_LINEAR } from '../../src/atlas/oscillators/bridges-limits.js';
import { MissingDeltaAtError, MissingHorizonError } from '../../src/atlas/types.js';
import type { AtlasBridge } from '../../src/atlas/types.js';

const models = ATLAS_FAMILIES.flatMap((f) => f.models);
const bridges = ATLAS_FAMILIES.flatMap((f) => f.bridges);

describe('ATLAS_FAMILIES — cross-family integrity', () => {
  it('registers the oscillator, diffusion and wave families', () => {
    expect(ATLAS_FAMILIES.map((f) => f.family)).toEqual(['oscillators', 'diffusion', 'waves']);
  });

  it('model ids are unique across the whole atlas', () => {
    const ids = models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bridge ids are unique across the whole atlas', () => {
    const ids = bridges.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every bridge premise and conclusion resolves to a model in SOME family', () => {
    const known = new Set(models.map((m) => m.id));
    const dangling: string[] = [];
    for (const b of bridges) {
      for (const id of [...b.premises, b.conclusion]) {
        if (!known.has(id)) dangling.push(`${b.id} → ${id}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('every model carries the family it is registered under', () => {
    for (const f of ATLAS_FAMILIES) {
      for (const m of f.models) expect(m.family).toBe(f.family);
    }
  });
});

describe('ATLAS_FAMILIES — registration is admission', () => {
  const { deltaAt: _deltaAt, ...boundWithoutDeltaAt } = AB_PENDULUM_LINEAR.bound!;
  const noDeltaAt: AtlasBridge = { ...AB_PENDULUM_LINEAR, id: 'ab-no-delta-at', bound: boundWithoutDeltaAt };
  const noHorizon: AtlasBridge = { ...AB_PENDULUM_LINEAR, id: 'ab-no-horizon', bound: { ...AB_PENDULUM_LINEAR.bound!, horizon: '' } };

  it('admitFamilies refuses an approximation with no deltaAt, and one with no horizon, naming the bridge', () => {
    expect(() => admitFamilies([{ ...OSCILLATOR_FAMILY, bridges: [noDeltaAt] }])).toThrow(MissingDeltaAtError);
    expect(() => admitFamilies([{ ...OSCILLATOR_FAMILY, bridges: [noDeltaAt] }])).toThrow(/ab-no-delta-at/);
    expect(() => admitFamilies([OSCILLATOR_FAMILY, { ...OSCILLATOR_FAMILY, family: 'x', bridges: [noHorizon] }])).toThrow(MissingHorizonError);
  });

  it('admitFamilies returns the same family objects, so identity is preserved', () => {
    expect(admitFamilies([OSCILLATOR_FAMILY])[0]).toBe(OSCILLATOR_FAMILY);
    expect(ATLAS_FAMILIES[0]).toBe(OSCILLATOR_FAMILY);
  });

  it('the registry is built THROUGH admitFamilies (source), so no unadmitted bridge reaches it', () => {
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/atlas/families.ts'), 'utf8');
    expect(source).toMatch(/export const ATLAS_FAMILIES: readonly AtlasFamily\[\] = admitFamilies\(\[/);
  });
});

describe('ROADMAP Phase 4 exit counts', () => {
  it('"≥ 5 relation types" — NOT cut by the scope rule — holds across admitted bridges', () => {
    const types = new Set(bridges.map((b) => b.relation));
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  it('"≥ 20 bridges" — MET at 20 by the Sprint 4 closure, never cut', () => {
    // Atlas-Phase-4-Design.md §4 records the 12 the plan's briefs named and the
    // eight added to close the criterion. Pinned so the note cannot drift from
    // the atlas; raise both together.
    expect(bridges).toHaveLength(20);
  });
});
