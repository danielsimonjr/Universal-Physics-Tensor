/**
 * Atlas Phase 6, S6.3 — link prediction: the one result, and the note that reports it.
 *
 * This file is the reproducer the note names: it recomputes every figure from
 * the live atlas and fails if `docs/research/atlas-link-prediction.md` disagrees.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLinkPrediction } from '../../src/atlas/link-prediction.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { mcnemar, pairedDifferenceInterval, wilsonInterval } from '../../src/atlas/benchmark/stats.js';
import type { AtlasFamily } from '../../src/atlas/family.js';
import type { AtlasBridge } from '../../src/atlas/types.js';
import type { AtlasModel } from '../../src/atlas/model.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const note = readFileSync(resolve(root, 'docs/research/atlas-link-prediction.md'), 'utf-8');
const result = runLinkPrediction(ATLAS_FAMILIES);

describe('the one result — recomputed and bound to the note', () => {
  it('20 trials, 2 excluded as still connected', () => {
    expect(result.trials).toHaveLength(20);
    expect(result.stillConnected).toBe(2);
    expect(note).toContain('**20 trials**');
    expect(note).toContain('**2 pairs were excluded**');
  });

  it('recall@10, Wilson intervals, MRR and chance match the note', () => {
    const s = wilsonInterval(result.structuralHits, 20);
    const t = wilsonInterval(result.textHits, 20);
    expect(note).toContain(`${result.structuralHits}/20 = ${(result.structuralHits / 20).toFixed(2)}`);
    expect(note).toContain(`${result.textHits}/20 = ${(result.textHits / 20).toFixed(2)}`);
    expect(note).toContain(`[${s.lower.toFixed(3)}, ${s.upper.toFixed(3)}]`);
    expect(note).toContain(`[${t.lower.toFixed(3)}, ${t.upper.toFixed(3)}]`);
    expect(note).toContain(result.structuralMrr.toFixed(3));
    expect(note).toContain(result.textMrr.toFixed(3));
    expect(note).toContain(result.chanceRecall.toFixed(3));
  });

  it('the paired comparison matches the note, and the stated verdict follows from it', () => {
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    for (const x of result.trials) {
      const s = x.structuralRank <= 10;
      const t = x.textRank <= 10;
      if (s && t) a++;
      else if (s) b++;
      else if (t) c++;
      else d++;
    }
    const diff = pairedDifferenceInterval({ a, b, c, d });
    // The note is typeset with a true minus sign (U+2212), as prose should be.
    const fmt = (x: number): string => x.toFixed(3).replace('-', '−');
    expect(note).toContain(`[${fmt(diff.lower)}, ${fmt(diff.upper)}]`);
    expect(note).toContain(mcnemar({ a, b, c, d }).exactP.toFixed(3));
    // The note says NOT supported; that is only honest while the interval spans zero.
    expect(diff.lower).toBeLessThan(0);
    expect(note).toContain('**The hypothesis is NOT supported.**');
  });
});

describe('the predictor itself', () => {
  const model = (id: string): AtlasModel => ({
    id,
    family: 'toy',
    stateSpace: '',
    dynamics: id,
    observables: [],
    parameters: [],
    dimensionlessInputs: [],
    canonicalRefs: [],
    regime: { family: 'toy', inequalities: [], groupDefinitions: {} },
  });
  const bridge = (id: string, p: string, c: string): AtlasBridge => ({
    id,
    relation: 'derivation',
    premises: [p],
    conclusion: c,
    transformation: '',
    preserves: [],
    doesNotPreserve: [],
    sideConditions: [],
    regime: { family: 'toy', inequalities: [], groupDefinitions: {} },
    counterexamples: [],
    witnesses: [],
    citations: [],
    reviewStatus: 'proposed',
  });

  it('POSITIVE CONTROL: on a toy triangle the structural predictor ranks the closing edge first', () => {
    // a–b, b–c, a–c plus isolated d, e. Holding out a–c, c shares neighbour b with a.
    const toy: AtlasFamily = {
      family: 'toy',
      models: ['a', 'b', 'c', 'd', 'e'].map(model),
      bridges: [bridge('ab', 'a', 'b'), bridge('bc', 'b', 'c'), bridge('ac', 'a', 'c')],
      rejections: [],
    };
    const ac = runLinkPrediction([toy], 1).trials.find((t) => t.bridgeId === 'ac');
    expect(ac?.structuralRank).toBe(1);
  });

  it('is deterministic: two runs give identical results', () => {
    expect(runLinkPrediction(ATLAS_FAMILIES)).toEqual(result);
  });
});

describe('Product A is untouched', () => {
  const importsDiscovery = (text: string): boolean =>
    /^\s*import[^;]*from\s+['"][^'"]*composition\/discovery(\.js)?['"]/m.test(text);

  it('POSITIVE CONTROL: the matcher fires on a real import line and not on a comment', () => {
    expect(importsDiscovery("import { x } from '../composition/discovery.js';")).toBe(true);
    expect(importsDiscovery(' * an atlas to composition/discovery import risks a cycle')).toBe(false);
  });

  it('nothing under src/atlas/ imports discovery.ts', () => {
    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) walk(full, acc);
        else if (e.endsWith('.ts')) acc.push(full);
      }
      return acc;
    };
    const hits = walk(resolve(root, 'src/atlas')).filter((f) => importsDiscovery(readFileSync(f, 'utf-8')));
    expect(hits).toEqual([]);
  });
});
