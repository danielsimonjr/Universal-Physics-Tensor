/**
 * The vendored PhysJS manifest is the pin for every `lean4-physjs` formalRef.
 *
 * A wrong commit, theorem, key, or coverage phrase fails here. So does a
 * manifest entry that does not resolve to a bridge, and a `lean4-physjs`
 * reference the manifest does not name. The mutations are the control: a
 * checker that ignored those fields would stay green.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import {
  PHYSJS_COMMIT,
  physjsFormalRef,
  physjsManifestProblems,
  type PhysjsManifestFile,
} from '../../src/atlas/physjs-ref.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
const atlasBridges = ATLAS_FAMILIES.flatMap((family) => family.bridges);
const carriers = [
  ...atlasBridges,
  ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: catalogFormalRef(entry.id) })),
];

/**
 * The reviewed manifest, pinned as one hash of its `[key, theorem, covers]`
 * rows in file order. A swapped theorem or key, a reworded covers line, or an
 * added or dropped entry changes it. The failure message prints the current
 * hash: update the pin only after reading the manifest diff. The sentence
 * that this file held every row as a literal is the record from before this
 * pin.
 */
const REVIEWED_ROWS_SHA256 = '047029aef67cc1b92a805c4f7643d98d98e0d99755910b071db1f3c5b2be1d91';

const rowsOf = (entries: readonly { key: string; theorem: string; covers: string }[]): string[][] =>
  entries.map((entry) => [entry.key, entry.theorem, entry.covers]);
const sha256 = (rows: readonly (readonly string[])[]): string =>
  createHash('sha256').update(JSON.stringify(rows)).digest('hex');

/** Rows whose covers text carries a reviewed caveat: what the theorem is NOT. Each is a sentinel the hash alone would not name. */
const SENTINELS: readonly (readonly [string, string, RegExp])[] = [
  ['ab-pendulum-linear', 'PhysJS.Pendulum.linearizedEquationOfMotion_iff', /^the transformation, not bound\.delta$/],
  ['ab-kg-oscillator', 'PhysJS.KgOscillator.uniform_solves_equationOfMotion', /^the restriction, in Physlib's own terms$/],
  ['ab-spring-lc', 'PhysJS.SpringLc.time_rescale_equationOfMotion', /^the oscillator dictionary$/],
  ['ab-damped-rlc', 'PhysJS.DampedRlc.time_rescale_equationOfMotion', /^the oscillator dictionary$/],
  ['ab-wave-dalembert', 'PhysJS.WaveDalembert.solution_eq_profiles', /^the missing direction of d'Alembert's formula$/],
  ['be-16', 'PhysJS.Landauer.erasure_eq', /^derivation-step: .*Not E ≥ T ΔS for an arbitrary protocol, and not the Bérut confrontation$/],
  ['be-28', 'PhysJS.EntropyProduction.nonneg', /^derivation-step: .*Not the variational maximum-entropy-production principle\./],
  ['be-29', 'PhysJS.Jarzynski.jensen_work', /^property: .*Not Jarzynski's theorem/],
  ['be-33', 'PhysJS.QuantumCritical.thermal_scaling', /^derivation-step: .*Not Hertz–Millis theory/],
  ['be-42', 'PhysJS.HawkingUnruh.dictionary', /^cross-check: .*Not the Hawking effect$/],
  ['be-50', 'PhysJS.TimeSymmetric.wheeler_feynman', /^derivation-step: .*The id is contested\./],
  ['be-54', 'PhysJS.RandallSundrum.brane_friedmann', /^derivation-step: .*Not a derivation from the five-dimensional Einstein equation$/],
  ['be-60', 'PhysJS.Laughlin.filling_fraction', /^derivation-step: .*Not the Laughlin wavefunction, and not the anyon charge e\/3$/],
];

const RANK1_PLANE_WAVE: readonly (readonly [string, string])[] = [
  ['ab-kg-schrodinger', 'PhysJS.KgSchrodinger.planeWave_iff_dispersion'],
  ['ab-klein-gordon-wave', 'PhysJS.KleinGordonWave.planeWave_iff_dispersion'],
  ['ab-stiff-string', 'PhysJS.StiffString.planeWave_iff_dispersion'],
  ['ab-telegraph-diffusion', 'PhysJS.TelegraphDiffusion.planeWave_iff_dispersion'],
  ['ab-telegraph-wave', 'PhysJS.TelegraphWave.planeWave_iff_dispersion'],
];

const PLANE_WAVE_COVERS = 'a plane wave solves the PDE iff ω(k) obeys the dispersion relation';

const COVERAGE = 'covers its statement only';

describe('vendored PhysJS manifest', () => {
  it('records the manifest commit, and every coverage phrase says the reference covers its statement only', () => {
    expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(PHYSJS_COMMIT).toBe(manifest.commit);
    expect(manifest.toolchain).toBe('leanprover/lean4:v4.34.1');
    expect(manifest.entries.length).toBeGreaterThanOrEqual(SENTINELS.length);
    expect(manifest.entries.every((entry) => entry.coverage === COVERAGE)).toBe(true);
  });

  it('the reviewed rows are the pinned hash; a swapped theorem is not', () => {
    const rows = rowsOf(manifest.entries);
    const current = sha256(rows);
    expect(current, `manifest rows changed; after reading the diff, set REVIEWED_ROWS_SHA256 = '${current}'`).toBe(REVIEWED_ROWS_SHA256);
    const swapped = rows.map((row, index) => (index === 0 ? [row[0]!, rows[1]![1]!, row[2]!] : row));
    expect(sha256(swapped)).not.toBe(REVIEWED_ROWS_SHA256);
    expect(sha256(rows.slice(0, -1))).not.toBe(REVIEWED_ROWS_SHA256);
  });

  it('each reviewed sentinel row names its theorem and keeps its caveat', () => {
    for (const [key, theorem, covers] of SENTINELS) {
      const entry = manifest.entries.find((candidate) => candidate.key === key);
      expect(entry, key).toBeDefined();
      expect(entry!.theorem, key).toBe(theorem);
      expect(entry!.covers, key).toMatch(covers);
    }
  });

  it('every manifest entry resolves to a bridge whose formalRef is that entry', () => {
    expect(physjsManifestProblems({ manifest, bridges: carriers })).toEqual([]);
    for (const entry of manifest.entries) {
      const bridge = carriers.find((candidate) => candidate.id === entry.key);
      expect(bridge, entry.key).toBeDefined();
      expect(entry.bridgeId).toBe(entry.key);
      expect(bridge!.formalRef?.system).toBe('lean4-physjs');
      expect(bridge!.formalRef?.statement).toBe(entry.theorem);
      expect(bridge!.formalRef?.covers).toContain(entry.covers);
      expect(bridge!.formalRef?.covers).toContain(COVERAGE);
      expect(bridge!.formalRef?.version).toContain(`physjs@${manifest.commit}`);
      expect(bridge!.formalRef?.fidelity).not.toBe('unreviewed');
      const kind = entry.covers.split(':')[0];
      if (entry.key.startsWith('be-')) {
        expect(['reduction', 'limit', 'derivation-step', 'property', 'cross-check']).toContain(kind);
      }
    }
  });

  it('the pendulum theorem imports the Physlib statement and does not claim bound.delta', () => {
    const pendulum = manifest.entries.find((entry) => entry.key === 'ab-pendulum-linear');
    expect(pendulum?.imports).toBe('ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff');
    expect(pendulum?.covers).toBe('the transformation, not bound.delta');
  });

  it('ten reviewed formalRefs derive formally-proved, and none of them stores the tag', () => {
    const reviewed = atlasBridges.filter((bridge) => bridge.formalRef !== undefined && bridge.formalRef.fidelity !== 'unreviewed');
    expect(reviewed.map((bridge) => bridge.id)).toEqual([
      'ab-spring-lc',
      'ab-damped-rlc',
      'ab-pendulum-linear',
      'ab-telegraph-diffusion',
      'ab-telegraph-wave',
      'ab-wave-dalembert',
      'ab-klein-gordon-wave',
      'ab-kg-schrodinger',
      'ab-kg-oscillator',
      'ab-stiff-string',
    ]);
    for (const bridge of reviewed) {
      expect(deriveEvidence(bridge, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
      expect(bridge.evidence.has('formally-proved')).toBe(false);
    }
  });

  it('fails on a wrong commit, theorem, key, or coverage phrase', () => {
    const wrongCommit = { ...manifest, commit: '0000000' };
    expect(physjsManifestProblems({ manifest: wrongCommit, bridges: carriers }).join('\n')).toMatch(/commit is '0000000'/);

    const wrongTheorem = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, theorem: 'PhysJS.Wrong.theorem' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: wrongTheorem, bridges: carriers }).join('\n')).toMatch(/PhysJS\.Wrong\.theorem/);

    const wrongKey = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, key: 'ab-no-such-bridge', bridgeId: 'ab-no-such-bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: wrongKey, bridges: carriers }).join('\n')).toMatch(
      /'ab-no-such-bridge' does not resolve to a bridge/,
    );

    const wrongCoverage = {
      ...manifest,
      entries: manifest.entries.map((entry) => ({ ...entry, coverage: 'covers the whole bridge' })),
    };
    expect(physjsManifestProblems({ manifest: wrongCoverage, bridges: carriers }).join('\n')).toMatch(/coverage phrase/);
  });

  it('carries nested planeWave objects on the five rank-1 entries and does not promote them', () => {
    expect(manifest.entries.filter((entry) => entry.planeWave !== undefined)).toHaveLength(RANK1_PLANE_WAVE.length);
    for (const [key, theorem] of RANK1_PLANE_WAVE) {
      const entry = manifest.entries.find((candidate) => candidate.key === key);
      expect(entry?.planeWave?.theorem).toBe(theorem);
      expect(entry?.planeWave?.covers).toBe(PLANE_WAVE_COVERS);
      expect(entry?.planeWave?.coverage).toBe(COVERAGE);
      expect(entry?.theorem.endsWith('covers_bound_delta')).toBe(true);
      const bridge = atlasBridges.find((candidate) => candidate.id === key);
      expect(bridge?.formalRef?.statement).toBe(entry?.theorem);
      expect(bridge?.formalRef?.statement).not.toBe(theorem);
      expect(bridge?.formalRef?.covers).toContain('bound.delta exactly, at the dispersion relation');
    }
    for (const key of ['ab-pendulum-linear', 'ab-kg-oscillator', 'ab-spring-lc', 'ab-damped-rlc', 'ab-wave-dalembert']) {
      expect(manifest.entries.find((entry) => entry.key === key)?.planeWave).toBeUndefined();
    }
  });

  it('fails when a nested planeWave object is dropped or named as the formalRef', () => {
    const stripped = {
      ...manifest,
      entries: manifest.entries.map((entry) => {
        const { planeWave: _planeWave, ...rest } = entry;
        return rest;
      }),
    };
    expect(physjsManifestProblems({ manifest: stripped, bridges: carriers }).join('\n')).toMatch(
      /compiled entry for 'ab-kg-schrodinger' disagrees with the vendored manifest/,
    );

    const promoted = carriers.map((bridge) =>
      bridge.id === 'ab-kg-schrodinger'
        ? {
            ...bridge,
            formalRef: {
              ...bridge.formalRef!,
              statement: 'PhysJS.KgSchrodinger.planeWave_iff_dispersion',
            },
          }
        : bridge,
    );
    expect(physjsManifestProblems({ manifest, bridges: promoted }).join('\n')).toMatch(
      /formalRef names the nested planeWave theorem/,
    );
  });

  it('does not skip a lean4-physjs reference the manifest does not name', () => {
    const extra = [...carriers, { id: 'ab-not-in-manifest', formalRef: physjsFormalRef('ab-pendulum-linear') }];
    expect(physjsManifestProblems({ manifest, bridges: extra }).join('\n')).toMatch(
      /lean4-physjs formalRef on 'ab-not-in-manifest' has no manifest entry/,
    );
  });

  it('records the milestone 2b nested statements and does not promote them', () => {
    const nested: readonly (readonly [string, string, string])[] = [
      ['be-53', 'oneLoop', 'PhysJS.YangMills.alphaRun_hasDerivAt'],
      ['be-38', 'inversion', 'PhysJS.Mond.mu_inversion'],
      ['be-13', 'vacuum', 'PhysJS.Einstein.vacuum_density'],
      ['be-13', 'corollary', 'PhysJS.Einstein.friedmann_corollary'],
      ['be-54', 'friedmann', 'PhysJS.RandallSundrum.flat_friedmann'],
      ['be-15', 'lengthMonomial', 'PhysJS.Coarsening.length_monomial_at'],
      ['be-17', 'torsionMonomial', 'PhysJS.EinsteinCartan.torsion_monomial'],
      ['be-17', 'coefficientNotFixed', 'PhysJS.EinsteinCartan.coefficient_not_fixed'],
      ['be-17', 'unitCoefficient', 'PhysJS.EinsteinCartan.inversion_of_unit_coefficient'],
      ['be-33', 'scalingShape', 'PhysJS.QuantumCritical.scaling_shape'],
      ['be-33', 'everyPower', 'PhysJS.QuantumCritical.every_power_homogeneous'],
    ];
    for (const [key, field, theorem] of nested) {
      const entry = manifest.entries.find((candidate) => candidate.key === key) as
        | (PhysjsManifestFile['entries'][number] & Record<string, { theorem?: string; covers?: string } | undefined>)
        | undefined;
      expect(entry?.[field]?.theorem).toBe(theorem);
      expect(entry?.[field]?.covers?.split(':')[0]).toMatch(/^(reduction|limit|derivation-step)$/);
      const formalRef = catalogFormalRef(Number(key.slice(3)));
      expect(formalRef?.statement).toBe(entry?.theorem);
      expect(formalRef?.statement).not.toBe(theorem);
    }
    expect(catalogFormalRef(20)).toBeUndefined();
    expect(manifest.entries.some((entry) => entry.key === 'be-20')).toBe(false);
  });

  it('the Buckingham nested covers name the assumed hypothesis', () => {
    const named: readonly (readonly [string, string, readonly string[]])[] = [
      ['be-15', 'lengthMonomial', ['dimensionally homogeneous', '[Γ] = L^z T⁻¹', 'C is not fixed', 'z = 2 is not derived']],
      ['be-17', 'torsionMonomial', ['dimensionally homogeneous', 'C is not fixed']],
      ['be-17', 'coefficientNotFixed', ['A factor other than 1 is not the catalog coefficient']],
      ['be-17', 'unitCoefficient', ['C = 1 is a hypothesis']],
      ['be-33', 'scalingShape', ['dimensionally homogeneous', 'φ is not fixed']],
      ['be-33', 'everyPower', ['The exponent p is not chosen']],
    ];
    for (const [key, field, phrases] of named) {
      const entry = manifest.entries.find((candidate) => candidate.key === key) as
        | (PhysjsManifestFile['entries'][number] & Record<string, { covers?: string } | undefined>)
        | undefined;
      const covers = entry?.[field]?.covers ?? '';
      expect(covers.startsWith('derivation-step: '), `${key} ${field}`).toBe(true);
      for (const phrase of phrases) {
        expect(covers, `${key} ${field}`).toContain(phrase);
      }
      expect(catalogFormalRef(Number(key.slice(3)))?.statement).not.toContain(field);
    }
  });

  it('fails when a nested catalog statement is dropped or named as the formalRef', () => {
    const stripped = {
      ...manifest,
      entries: manifest.entries.map((entry) => {
        if (entry.key !== 'be-53') return entry;
        const { oneLoop: _oneLoop, ...rest } = entry;
        return rest;
      }),
    };
    expect(physjsManifestProblems({ manifest: stripped, bridges: carriers }).join('\n')).toMatch(
      /compiled entry for 'be-53' disagrees with the vendored manifest/,
    );

    const promoted = carriers.map((bridge) =>
      bridge.id === 'be-53'
        ? {
            ...bridge,
            formalRef: {
              ...bridge.formalRef!,
              statement: 'PhysJS.YangMills.alphaRun_hasDerivAt',
            },
          }
        : bridge,
    );
    expect(physjsManifestProblems({ manifest, bridges: promoted }).join('\n')).toMatch(
      /formalRef names the nested oneLoop theorem/,
    );
  });

  it('keeps property and cross-check as their own kinds, and a missing kind word fails', () => {
    const counted = manifest.entries.filter((entry) => /^(reduction|limit|derivation-step): /.test(entry.covers));
    const crossChecks = manifest.entries.filter((entry) => entry.covers.startsWith('cross-check: '));
    const properties = manifest.entries.filter((entry) => entry.covers.startsWith('property: '));
    expect(counted.map((entry) => entry.key)).toEqual(['be-64', 'be-53', 'be-58', 'be-38', 'be-13', 'be-34', 'be-16', 'be-65', 'be-51', 'be-61', 'be-12', 'be-59', 'be-55', 'be-60', 'be-21', 'be-14', 'be-43', 'be-37', 'be-54', 'be-17', 'be-27', 'be-22', 'be-15', 'be-33', 'be-50', 'be-32', 'be-28', 'be-40', 'be-35', 'be-63', 'be-30', 'be-66', 'be-67', 'be-68', 'be-69', 'be-70', 'be-71', 'be-72', 'be-73', 'be-74', 'be-75', 'be-76', 'be-77', 'be-78', 'be-79', 'be-80', 'be-81', 'be-82', 'be-83', 'be-84', 'be-85', 'be-86', 'be-87', 'be-88', 'be-89', 'be-90', 'be-91', 'be-92', 'be-93', 'be-94', 'be-95', 'be-96', 'be-97', 'be-98', 'be-99', 'be-100', 'be-101', 'be-102', 'be-103', 'be-104', 'be-105', 'be-106', 'be-107', 'be-108', 'be-109', 'be-110', 'be-111', 'be-112', 'be-113', 'be-114', 'be-115', 'be-116', 'be-117', 'be-118', 'be-119', 'be-120', 'be-121', 'be-122', 'be-123', 'be-124', 'be-125', 'be-126', 'be-127', 'be-128', 'be-129', 'be-130', 'be-131', 'be-132', 'be-133', 'be-134', 'be-135', 'be-136', 'be-137', 'be-138', 'be-139', 'be-140', 'be-141', 'be-142', 'be-143', 'be-144', 'be-145', 'be-146', 'be-147', 'be-148', 'be-149', 'be-150', 'be-151', 'be-152', 'be-153', 'be-154', 'be-155', 'be-156', 'be-157', 'be-158', 'be-159', 'be-160', 'be-161', 'be-162', 'be-163', 'be-164', 'be-165', 'be-166', 'be-167', 'be-168', 'be-169', 'be-170']);
    expect(crossChecks.map((entry) => entry.key)).toEqual(['be-42', 'be-24', 'be-19']);
    expect(properties.map((entry) => entry.key)).toEqual(['be-29', 'be-11']);
    expect(counted.length + crossChecks.length + properties.length).toBe(141);
    // 117 is the record from before be-147..170.
    // 104 is the record from before be-134..146.
    // 96 is the record from before be-126..133.
    // 73 is the record from before be-103..125. 58 is the record from before be-88..102.

    const unlabeled = {
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.key === 'be-16' ? { ...entry, covers: 'the two-state entropy equals k_B log 2' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: unlabeled, bridges: carriers }).join('\n')).toMatch(/catalog kind/);

    const dropped = carriers.map((bridge) => (bridge.id === 'be-16' ? { ...bridge, formalRef: undefined } : bridge));
    expect(physjsManifestProblems({ manifest, bridges: dropped }).join('\n')).toMatch(
      /bridge 'be-16' has no lean4-physjs formalRef/,
    );
  });

  it('a catalog covers line that is not a catalog kind fails', () => {
    const unkind = {
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.key === 'be-64' ? { ...entry, covers: 'the whole bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: unkind, bridges: carriers }).join('\n')).toMatch(/catalog kind/);
  });

  it('catalog formalRefs do not light formally-proved, and the atlas ten still do', () => {
    const countedIds = [64, 53, 58, 38, 13, 34, 65, 51, 61];
    const labeledIds = [42, 24, 19, 29, 11];
    for (const id of countedIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      const formalRef = catalogFormalRef(id);
      expect(formalRef?.system).toBe('lean4-physjs');
      expect(formalRef?.covers).toMatch(/^(reduction|limit|derivation-step): /);
      expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    for (const id of labeledIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      const formalRef = catalogFormalRef(id);
      expect(formalRef?.system).toBe('lean4-physjs');
      expect(formalRef?.covers).toMatch(/^(property|cross-check): /);
      expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    const landauer = catalogFormalRef(16);
    expect(landauer?.statement).toBe('PhysJS.Landauer.erasure_eq');
    expect(landauer?.kind).toBe('bridge');
    expect(landauer?.axioms).toEqual(['propext', 'Classical.choice', 'Quot.sound']);
    expect(landauer?.covers.startsWith('derivation-step: ')).toBe(true);
    expect(deriveEvidence({ formalRef: landauer }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
    expect(deriveEdgeEvidence(16).has('formally-proved')).toBe(true);
    const reviewed = atlasBridges.filter(
      (bridge) => bridge.formalRef !== undefined && bridge.formalRef.fidelity !== 'unreviewed',
    );
    expect(reviewed).toHaveLength(10);
    for (const id of [36, 20, 57]) {
      expect(catalogFormalRef(id)).toBeUndefined();
      expect(manifest.entries.some((entry) => entry.key === `be-${id}`)).toBe(false);
    }
    const be36 = BRIDGE_EQUATIONS.find((entry) => entry.id === 36);
    expect(be36?.name).toBe('MOND - Dark Matter Interpolation Function (TeVeS relativistic MOND)');
  });
});
