/**
 * PhysJS #57 proves five catalog equations, keys be-69 through be-73.
 *
 * Passing the reference to `deriveEvidence` lights `formally-proved`.
 * The catalog path passes a kind-`bridge` reference, so `deriveEdgeEvidence`
 * does too. Nested theorems are not the reference. BE-72 does not compose
 * into BE-68: the quantities are disjoint, and the frequency ratio is not
 * the Tolman invariant.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import {
  bridgeSeedKeys,
  physjsFileUrl,
  physjsFormalRef,
  physjsManifestProblems,
  PHYSJS_COMMIT,
  type PhysjsManifestFile,
} from '../../src/atlas/physjs-ref.js';
import { evaluateAlfvenSpeed } from '../../src/bridges/be67-alfven-speed.js';
import { evaluateFastMagnetosonic } from '../../src/bridges/be69-fast-magnetosonic.js';
import { evaluateEinsteinRelation } from '../../src/bridges/be70-einstein-relation.js';
import { evaluateClapeyron } from '../../src/bridges/be71-clapeyron.js';
import { evaluateGravitationalRedshift } from '../../src/bridges/be72-gravitational-redshift.js';
import { evaluateKelvinPeltier } from '../../src/bridges/be73-kelvin-peltier.js';
import { evaluateTolmanEhrenfest } from '../../src/bridges/be68-tolman-ehrenfest.js';
import { K_B_SI } from '../../src/core/constants.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';
import { aliasesForTarget } from '../../src/composition/aliases.js';
import { resolveQuantityName } from '../../src/dimensional/formula-names.js';
import { matchingCatalogEdges } from '../../src/composition/canonical-compare.js';
import { composeEdges } from '../../src/composition/compose.js';
import { CompositionJunctionError } from '../../src/composition/edge.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import {
  be67Edge,
  be68Edge,
  be69Edge,
  be70Edge,
  be71Edge,
  be72Edge,
  be73Edge,
} from '../../src/composition/edges/applied-physicist.js';

const AXIOMS = ['propext', 'Classical.choice', 'Quot.sound'] as const;

const ROWS = [
  { id: 69, theorem: 'PhysJS.FastMagnetosonic.speed_eq', file: 'FastMagnetosonic.lean', edge: be69Edge },
  { id: 70, theorem: 'PhysJS.EinsteinRelation.diffusion_eq', file: 'EinsteinRelation.lean', edge: be70Edge },
  { id: 71, theorem: 'PhysJS.Clapeyron.slope_eq', file: 'Clapeyron.lean', edge: be71Edge },
  { id: 72, theorem: 'PhysJS.GravitationalRedshift.frequency_ratio', file: 'GravitationalRedshift.lean', edge: be72Edge },
  { id: 73, theorem: 'PhysJS.KelvinRelation.peltier_eq', file: 'KelvinRelation.lean', edge: be73Edge },
] as const;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
const SHA = manifest.commit;
const VERSION = `physjs@${SHA} leanprover/lean4:v4.34.1 mathlib:v4.34.1 physlib@af484f78ee0701290595f8bf892b157b10d64940`;

describe('PhysJS proofs for be-69 through be-73', () => {
  it('the vendored manifest is PhysJS #57 and names the five theorems', () => {
    expect(PHYSJS_COMMIT).toBe(manifest.commit);
    expect(manifest.entries).toHaveLength(127);
    // 114 is the record from before be-134..146.
    // 106 is the record from before be-126..133.
    // 83 is the record from before be-103..125. 68 is the record from before be-88..102.
    for (const row of ROWS) {
      const entry = manifest.entries.find((candidate) => candidate.key === `be-${row.id}`);
      expect(entry?.theorem, `be-${row.id}`).toBe(row.theorem);
      expect(entry?.leanProof).toBe('complete');
      expect(entry?.axioms).toEqual([...AXIOMS]);
      expect(entry?.covers.startsWith('derivation-step: ')).toBe(true);
    }
    const fast = manifest.entries.find((entry) => entry.key === 'be-69');
    const redshift = manifest.entries.find((entry) => entry.key === 'be-72');
    expect(fast?.perpendicularQuartic?.theorem).toBe('PhysJS.FastMagnetosonic.perpendicular_of_dispersion');
    expect(redshift?.tolmanRatio?.theorem).toBe('PhysJS.GravitationalRedshift.tolman_same_ratio');
    expect(manifest.entries.find((entry) => entry.key === 'be-71')?.covers).toContain('L/(T Δv)');
    expect(manifest.entries.some((entry) => entry.theorem.includes('entropy_slope'))).toBe(false);
  });

  it('each formalRef is the top-level theorem, kind bridge, and both paths light formally-proved', () => {
    for (const row of ROWS) {
      const entry = manifest.entries.find((candidate) => candidate.key === `be-${row.id}`);
      const ref = catalogFormalRef(row.id);
      expect(ref).toEqual(physjsFormalRef(`be-${row.id}`));
      expect(ref?.statement).toBe(row.theorem);
      expect(ref?.kind).toBe('bridge');
      expect(ref?.version).toBe(VERSION);
      expect(ref?.url).toBe(physjsFileUrl(row.file));
      expect(ref?.url).toBe(`https://github.com/danielsimonjr/PhysJS/blob/${SHA}/lean/${row.file}`);
      expect(ref?.covers).toBe(`${entry?.covers} — covers its statement only`);
      expect(deriveEvidence({ formalRef: ref }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
      expect(deriveEdgeEvidence(row.id).has('formally-proved')).toBe(true);
      expect(deriveEdgeEvidence(row.id).has('proposed')).toBe(false);
      expect(row.edge.confidence).toBe('established');
      expect(row.edge.kind).toBe('law');
      expect(bridgeSeedKeys()).toContain(`be-${row.id}`);
    }
    expect(physjsFormalRef('be-72').statement).toBe('PhysJS.GravitationalRedshift.frequency_ratio');
    expect(physjsFormalRef('be-72').statement).not.toBe('PhysJS.GravitationalRedshift.tolman_same_ratio');
    expect(physjsFormalRef('be-69').statement).not.toBe('PhysJS.FastMagnetosonic.perpendicular_of_dispersion');
  });

  it('CONTROL: naming a nested theorem as the formalRef is a manifest problem', () => {
    const promoted = manifest.entries.map((entry) => ({
      id: entry.key,
      formalRef:
        entry.key === 'be-72'
          ? { ...physjsFormalRef(entry.key), statement: 'PhysJS.GravitationalRedshift.tolman_same_ratio' }
          : physjsFormalRef(entry.key),
    }));
    expect(physjsManifestProblems({ manifest, bridges: promoted }).join('\n')).toMatch(
      /formalRef names the nested tolmanRatio theorem/,
    );
  });

  it('c_s = 0 recovers the Alfvén number and does not compose into be-67', () => {
    const B_T = 1e-4;
    const rho_kg_per_m3 = 1e-6;
    expect(evaluateFastMagnetosonic({ cs_m_per_s: 0, B_T, rho_kg_per_m3 }).v_m_per_s).toBe(
      evaluateAlfvenSpeed({ B_T, rho_kg_per_m3 }).v_m_per_s,
    );
    expect(be69Edge.target.name).not.toBe(be67Edge.target.name);
    expect(() => composeEdges(be69Edge, be67Edge)).toThrow(CompositionJunctionError);
    expect(() => composeEdges(be67Edge, be69Edge)).toThrow(CompositionJunctionError);
  });

  it('be-72 is not be-68: equal temperatures are not that frequency ratio, and the edges do not compose', () => {
    expect(evaluateGravitationalRedshift({ g1: -1, g2: -4 }).frequency_ratio).toBe(2);
    const cold = evaluateTolmanEhrenfest({ T_K: 1, g_00: -1 }).invariant_K;
    const hot = evaluateTolmanEhrenfest({ T_K: 1, g_00: -4 }).invariant_K;
    expect(hot / cold).toBe(2);
    expect(cold).not.toBe(hot);
    expect(be72Edge.target.name).not.toBe(be68Edge.target.name);
    expect(be72Edge.sources.map((source) => source.name)).not.toContain('metric-g00');
    expect(be72Edge.sources.map((source) => source.name)).not.toContain('proper-temperature');
    expect(() => composeEdges(be72Edge, be68Edge)).toThrow(CompositionJunctionError);
    expect(() => composeEdges(be68Edge, be72Edge)).toThrow(CompositionJunctionError);
    const named = matchingCatalogEdges(
      'gravitational-frequency-ratio',
      ['redshift-metric-g00-1', 'redshift-metric-g00-2'],
    );
    expect(named.map((edge) => edge.id)).toEqual(['be-72']);
    expect(matchingCatalogEdges('tolman-invariant', ['proper-temperature', 'metric-g00']).map((edge) => edge.id)).toEqual([
      'be-68',
    ]);
  });

  it('the closed forms are the theorems, and explain aliases are the edge aliases', () => {
    const D = evaluateEinsteinRelation({ mu_m2_per_Vs: 1e-8, T_K: 300, q_C: 1.602176634e-19 }).D_m2_per_s;
    expect(D).toBeCloseTo((1e-8 * K_B_SI * 300) / 1.602176634e-19, 8);
    expect(evaluateEinsteinRelation({ mu_m2_per_Vs: 1e-8, T_K: 300, q_C: 1 }).D_m2_per_s).not.toBe(D);
    expect(evaluateClapeyron({ L_J_per_kg: 2.26e6, T_K: 373.15, delta_v_m3_per_kg: 1 }).slope_Pa_per_K).toBe(
      2.26e6 / 373.15,
    );
    expect(evaluateKelvinPeltier({ S_V_per_K: 2e-4, T_K: 300 }).Pi_V).toBeCloseTo(0.06, 12);
    const names = new Set(CATALOG_GRAPH.flatMap((edge) => [edge.target.name, ...edge.sources.map((source) => source.name)]));
    const fast = aliasesForTarget(CATALOG_GRAPH, 'fast-magnetosonic-speed');
    expect(resolveQuantityName('cs_m_per_s', names, fast)).toBe('sound-speed');
    expect(resolveQuantityName('B_T', names, fast)).toBe('magnetic-flux-density');
    const ratio = aliasesForTarget(CATALOG_GRAPH, 'gravitational-frequency-ratio');
    expect(resolveQuantityName('g1', names, ratio)).toBe('redshift-metric-g00-1');
    expect(resolveQuantityName('g_00', names, ratio)).toBeNull();
    const tolman = aliasesForTarget(CATALOG_GRAPH, 'tolman-invariant');
    expect(resolveQuantityName('g_00', names, tolman)).toBe('metric-g00');
    expect(
      matchingCatalogEdges('fast-magnetosonic-speed', ['sound-speed', 'magnetic-flux-density', 'plasma-mass-density']).map(
        (edge) => edge.id,
      ),
    ).toEqual(['be-69']);
    expect(
      matchingCatalogEdges('alfven-speed', ['sound-speed', 'magnetic-flux-density', 'plasma-mass-density']),
    ).toEqual([]);
    expect(matchingCatalogEdges('diffusivity', ['electrical-mobility', 'einstein-temperature', 'carrier-charge']).map((e) => e.id)).toEqual([
      'be-70',
    ]);
    expect(matchingCatalogEdges('clapeyron-slope', ['specific-latent-heat', 'clapeyron-temperature', 'specific-volume-change']).map((e) => e.id)).toEqual([
      'be-71',
    ]);
    expect(matchingCatalogEdges('peltier-coefficient', ['seebeck-coefficient', 'peltier-temperature']).map((e) => e.id)).toEqual([
      'be-73',
    ]);
  });
});
