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
import { FORMAL_REF_KINDS } from '../../src/relations/types.js';
import {
  PHYSJS_COMMIT,
  physjsAheadOfCatalog,
  physjsFormalRef,
  physjsManifestProblems,
  physjsNestedStatements,
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
 * The reviewed manifest, pinned as one hash of its `[key, theorem, kind, covers]`
 * rows in file order. A swapped theorem or key, a changed kind, a reworded
 * covers line, or an added or dropped entry changes it. The failure message prints the current
 * hash: update the pin only after reading the manifest diff. The sentence
 * that this file held every row as a literal is the record from before this
 * pin.
 */
const REVIEWED_ROWS_SHA256 = '2bc29b3bb63f125364186f66d3f430292b2cdb88e78447dc4187287a66731e92';

const rowsOf = (entries: readonly { key: string; theorem: string; kind: string; covers: string }[]): string[][] =>
  entries.map((entry) => [entry.key, entry.theorem, entry.kind, entry.covers]);
const sha256 = (rows: readonly (readonly string[])[]): string =>
  createHash('sha256').update(JSON.stringify(rows)).digest('hex');

/** Rows whose covers text carries a reviewed caveat: what the theorem is NOT. Each is a sentinel the hash alone would not name. */
const SENTINELS: readonly (readonly [string, string, string, RegExp])[] = [
  ['ab-pendulum-linear', 'PhysJS.Pendulum.linearizedEquationOfMotion_iff', 'bridge', /^the transformation, not bound\.delta$/],
  ['ab-kg-oscillator', 'PhysJS.KgOscillator.uniform_solves_equationOfMotion', 'bridge', /^the restriction, in Physlib's own terms$/],
  ['ab-spring-lc', 'PhysJS.SpringLc.time_rescale_equationOfMotion', 'bridge', /^the oscillator dictionary$/],
  ['ab-damped-rlc', 'PhysJS.DampedRlc.time_rescale_equationOfMotion', 'bridge', /^the oscillator dictionary$/],
  ['ab-wave-dalembert', 'PhysJS.WaveDalembert.solution_eq_profiles', 'bridge', /^the missing direction of d'Alembert's formula$/],
  ['be-16', 'PhysJS.Landauer.erasure_eq', 'bridge', /Not E ≥ T ΔS for an arbitrary protocol, and not the Bérut confrontation$/],
  ['be-28', 'PhysJS.EntropyProduction.nonneg', 'property', /Not the variational maximum-entropy-production principle\./],
  ['be-29', 'PhysJS.Jarzynski.jensen_work', 'property', /Not Jarzynski's theorem/],
  ['be-33', 'PhysJS.QuantumCritical.thermal_scaling', 'bridge', /Not Hertz–Millis theory/],
  ['be-42', 'PhysJS.HawkingUnruh.dictionary', 'cross-check', /Not the Hawking effect$/],
  ['be-50', 'PhysJS.TimeSymmetric.wheeler_feynman', 'bridge', /The id is contested\./],
  ['be-54', 'PhysJS.RandallSundrum.brane_friedmann', 'bridge', /Not a derivation from the five-dimensional Einstein equation$/],
  ['be-60', 'PhysJS.Laughlin.filling_fraction', 'bridge', /Not the Laughlin wavefunction, and not the anyon charge e\/3$/],
];

/** A covers line that opens with a kind word, which the v2 manifest does not write. */
const KIND_PREFIX = /^(bridge|reduction|limit|derivation-step|property|cross-check): /;

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
    for (const [key, theorem, kind, covers] of SENTINELS) {
      const entry = manifest.entries.find((candidate) => candidate.key === key);
      expect(entry, key).toBeDefined();
      expect(entry!.theorem, key).toBe(theorem);
      expect(entry!.kind, key).toBe(kind);
      expect(entry!.covers, key).toMatch(covers);
      expect(entry!.covers, key).not.toMatch(KIND_PREFIX);
    }
  });

  it('every manifest entry resolves to a bridge whose formalRef is that entry, or is ahead of the catalog', () => {
    expect(physjsManifestProblems({ manifest, bridges: carriers })).toEqual([]);
    for (const entry of manifest.entries) {
      if (physjsAheadOfCatalog(entry.key)) {
        expect(carriers.find((candidate) => candidate.id === entry.key), entry.key).toBeUndefined();
        continue;
      }
      const bridge = carriers.find((candidate) => candidate.id === entry.key);
      expect(bridge, entry.key).toBeDefined();
      expect(entry.bridgeId).toBe(entry.key);
      expect(bridge!.formalRef?.system).toBe('lean4-physjs');
      expect(bridge!.formalRef?.statement).toBe(entry.theorem);
      expect(bridge!.formalRef?.covers).toContain(entry.covers);
      expect(bridge!.formalRef?.covers).toContain(COVERAGE);
      expect(bridge!.formalRef?.version).toContain(`physjs@${manifest.commit}`);
      expect(bridge!.formalRef?.fidelity).not.toBe('unreviewed');
      expect(FORMAL_REF_KINDS, entry.key).toContain(entry.kind);
      expect(bridge!.formalRef?.kind, entry.key).toBe(entry.kind);
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

    // A catalog id the catalog has is not ahead of it: dropping its bridge is a problem.
    const catalogued = carriers.filter((bridge) => bridge.id !== 'be-16');
    expect(physjsManifestProblems({ manifest, bridges: catalogued }).join('\n')).toMatch(/'be-16' does not resolve to a bridge/);
    // A catalog id the catalog does not have yet is ahead of it, and is not a problem.
    const ahead = { ...manifest, entries: [...manifest.entries, { ...manifest.entries.find((entry) => entry.key === 'be-16')!, key: 'be-99999', bridgeId: 'be-99999' }] };
    expect(physjsAheadOfCatalog('be-99999')).toBe(true);
    expect(physjsManifestProblems({ manifest: ahead, bridges: carriers }).join('\n')).not.toMatch(/be-99999/);

    const wrongCoverage = {
      ...manifest,
      entries: manifest.entries.map((entry) => ({ ...entry, coverage: 'covers the whole bridge' })),
    };
    expect(physjsManifestProblems({ manifest: wrongCoverage, bridges: carriers }).join('\n')).toMatch(/coverage phrase/);
  });

  it('carries nested planeWave objects on the five rank-1 entries and does not promote them', () => {
    const planeWave = (entry: PhysjsManifestFile['entries'][number] | undefined) =>
      entry === undefined ? undefined : physjsNestedStatements(entry).nested.find((statement) => statement.name === 'planeWave');
    expect(manifest.entries.filter((entry) => planeWave(entry) !== undefined)).toHaveLength(RANK1_PLANE_WAVE.length);
    for (const [key, theorem] of RANK1_PLANE_WAVE) {
      const entry = manifest.entries.find((candidate) => candidate.key === key);
      expect(planeWave(entry)?.theorem).toBe(theorem);
      expect(planeWave(entry)?.covers).toBe(PLANE_WAVE_COVERS);
      expect(planeWave(entry)?.coverage).toBe(COVERAGE);
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

  it('reads a nested statement by its shape, not from a list of names', () => {
    const entry = manifest.entries.find((candidate) => candidate.key === 'be-13')!;
    const statement = { theorem: 'PhysJS.Einstein.trace_eq', covers: entry.covers, coverage: COVERAGE, leanProof: 'complete', axioms: entry.axioms };
    expect(physjsNestedStatements({ ...entry, aNameNoListHolds: statement }).problems).toEqual([]);
    expect(physjsNestedStatements({ ...entry, aNameNoListHolds: statement }).nested.map((n) => n.name)).toContain('aNameNoListHolds');
    expect(physjsNestedStatements({ ...entry, notAStatement: { theorem: 'x' } }).problems).toEqual([
      "manifest entry 'be-13' has unexpected field 'notAStatement'",
    ]);
    expect(physjsNestedStatements({ ...entry, notAStatement: 'text' }).problems).toHaveLength(1);
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

  it('keeps property and cross-check as their own kinds, and a missing kind fails', () => {
    const ofKind = (...kinds: string[]) => manifest.entries.filter((entry) => kinds.includes(entry.kind)).map((entry) => entry.key);
    expect(ofKind('reduction', 'limit', 'derivation-step')).toEqual(['be-64', 'be-53', 'be-58', 'be-38', 'be-13', 'be-34', 'be-65', 'be-51', 'be-61', 'be-14', 'be-17', 'be-22', 'be-15', 'be-32', 'be-35', 'be-30']);
    expect(ofKind('cross-check')).toEqual(['be-42', 'be-24', 'be-19']);
    expect(ofKind('property')).toEqual(['be-29', 'be-11', 'be-28']);
    expect(manifest.entries.every((entry) => !KIND_PREFIX.test(entry.covers))).toBe(true);
    // The sentence that a covers line opened with the kind word, and that 141
    // entries were counted that way, is the record from before schema v2.

    const unlabeled = {
      ...manifest,
      entries: manifest.entries.map((entry) => {
        if (entry.key !== 'be-16') return entry;
        const { kind: _kind, ...rest } = entry;
        return rest as typeof entry;
      }),
    };
    expect(physjsManifestProblems({ manifest: unlabeled, bridges: carriers }).join('\n')).toMatch(/'be-16' kind 'undefined' is not one of/);

    const dropped = carriers.map((bridge) => (bridge.id === 'be-16' ? { ...bridge, formalRef: undefined } : bridge));
    expect(physjsManifestProblems({ manifest, bridges: dropped }).join('\n')).toMatch(
      /bridge 'be-16' has no lean4-physjs formalRef/,
    );
  });

  it('a kind outside the formal-reference kinds fails', () => {
    const unkind = {
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.key === 'be-64' ? { ...entry, kind: 'the whole bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: unkind, bridges: carriers }).join('\n')).toMatch(/'be-64' kind 'the whole bridge' is not one of/);
  });

  it('catalog formalRefs do not light formally-proved, and the atlas ten still do', () => {
    const countedIds = [64, 53, 58, 38, 13, 34, 65, 51, 61];
    const labeledIds = [42, 24, 19, 29, 11];
    for (const id of countedIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      const formalRef = catalogFormalRef(id);
      expect(formalRef?.system).toBe('lean4-physjs');
      expect(['reduction', 'limit', 'derivation-step']).toContain(formalRef?.kind);
      expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    for (const id of labeledIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      const formalRef = catalogFormalRef(id);
      expect(formalRef?.system).toBe('lean4-physjs');
      expect(['property', 'cross-check']).toContain(formalRef?.kind);
      expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    const landauer = catalogFormalRef(16);
    expect(landauer?.statement).toBe('PhysJS.Landauer.erasure_eq');
    expect(landauer?.kind).toBe('bridge');
    expect(landauer?.axioms).toEqual(['propext', 'Classical.choice', 'Quot.sound']);
    expect(landauer?.covers).not.toMatch(KIND_PREFIX);
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
