/**
 * The vendored PhysJS manifest is the pin for every `lean4-physjs` formalRef.
 *
 * A wrong commit, theorem, key, or coverage phrase fails here. So does a
 * manifest entry that does not resolve to a bridge, and a `lean4-physjs`
 * reference the manifest does not name. The mutations are the control: a
 * checker that ignored those fields would stay green.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { deriveEdgeEvidence } from '../../src/composition/graph-viz.js';
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
  ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: entry.formalRef })),
];

/** The manifest at PhysJS `main` `57a9ecbc851952d539882400a7176926d2990d34`, in file order. A swapped theorem or key fails this list. */
const EXPECTED: readonly (readonly [string, string, string])[] = [
  ['ab-kg-schrodinger', 'PhysJS.KgSchrodinger.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-klein-gordon-wave', 'PhysJS.KleinGordonWave.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-stiff-string', 'PhysJS.StiffString.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-telegraph-diffusion', 'PhysJS.TelegraphDiffusion.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-telegraph-wave', 'PhysJS.TelegraphWave.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-pendulum-linear', 'PhysJS.Pendulum.linearizedEquationOfMotion_iff', 'the transformation, not bound.delta'],
  ['ab-kg-oscillator', 'PhysJS.KgOscillator.uniform_solves_equationOfMotion', "the restriction, in Physlib's own terms"],
  ['ab-spring-lc', 'PhysJS.SpringLc.time_rescale_equationOfMotion', 'the oscillator dictionary'],
  ['ab-damped-rlc', 'PhysJS.DampedRlc.time_rescale_equationOfMotion', 'the oscillator dictionary'],
  ['ab-wave-dalembert', 'PhysJS.WaveDalembert.solution_eq_profiles', "the missing direction of d'Alembert's formula"],
  ['be-64', 'PhysJS.Eddington.balance_iff', 'derivation-step: the r² cancellation in the Eddington force balance, not a hard cap'],
  ['be-53', 'PhysJS.YangMills.b0_pos_iff_nf_le', 'derivation-step: b₀ > 0 iff N_f ≤ 16 for SU(3), not a running procedure past one loop'],
  [
    'be-58',
    'PhysJS.JohnsonNyquist.tendsto_classical',
    'limit: the classical Johnson–Nyquist spectrum is the ω → 0⁺ limit of the quantum parent, not the fluctuation–dissipation theorem',
  ],
  [
    'be-38',
    'PhysJS.Mond.tendsto_nu_limits',
    'limit: ν → 1 as z → ∞, ν √z → 1 as z → 0⁺, and F_N ν(z) / √(m F_N a₀) → 1 as F_N → 0⁺; not ν → √(2/z), and not the SPARC confrontation',
  ],
  [
    'be-13',
    'PhysJS.Einstein.trace_eq',
    'reduction: contracting G_μν + Λ g_μν = κ T_μν in four dimensions gives R = 4Λ − κ T, not Jacobson\'s thermodynamic derivation',
  ],
  [
    'be-34',
    'PhysJS.KibbleZurek.exponent',
    'derivation-step: the freeze-out power ε̂ = (τ₀/τ_Q)^(1/(1+zν)) and the defect density without the Boltzmann factor; omitting the 1 in the exponent fails. Not the reheating factor, and not a repair of the missing 1/a^d prefactor',
  ],
  [
    'be-42',
    'PhysJS.HawkingUnruh.dictionary',
    'cross-check: T_H(2GM/c²) = T_H(M) and T_U(c⁴/(4GM)) = T_H(M), naming BE-57 and be-42-via-rs. T_U(c⁴/(2GM)) is not T_H(M). Not the Hawking effect',
  ],
  [
    'be-24',
    'PhysJS.Fret.dictionary',
    'cross-check: η = R₀⁶/(R₀⁶+R⁶) = 1/(1+(R/R₀)⁶) = k_FRET/(k_FRET+1/τ_D), and η decreases on (0, ∞). At R = 2 R₀ the exponent 4 is not the exponent 6. Not the dipole–dipole law',
  ],
  [
    'be-19',
    'PhysJS.QuantumBounce.dictionary',
    'cross-check: H²_LQC equals H²_RS at σ = −ρ_c/2, both tend to (8πG/3)ρ + Λ/3 at infinity, and H²_LQC = 0 at ρ = ρ_c and Λ = 0, naming BE-54. σ = +ρ_c/2 is not that polynomial. σ < 0 is not a physical Randall–Sundrum brane',
  ],
  [
    'be-16',
    'PhysJS.Landauer.equal_levels',
    'property: equal two-state levels have thermodynamic entropy k_B log 2. At T ≠ 0, levels E and E+δ are not that value. At T = 0 the closed form does not separate the levels. Not E ≥ T ΔS, and not the Bérut confrontation',
  ],
  [
    'be-29',
    'PhysJS.Jarzynski.jensen_work',
    'property: for a finite probability and β > 0, ∑ p_i W_i ≥ −(1/β) log(∑ p_i exp(−β W_i)). The reversed inequality fails on two unequal work values. Not Jarzynski\'s theorem, and not the Gaussian identity',
  ],
  [
    'be-11',
    'PhysJS.Lindblad.preserve',
    'property: one channel of the displayed GKSL generator has trace zero, and it is Hermitian when H and ρ are. L need not be Hermitian. Dropping the anticommutator makes the trace nonzero. Not Born–Markov coarse-graining',
  ],
  [
    'be-65',
    'PhysJS.Jeans.mass_eq',
    'derivation-step: the encoded Jeans mass (5 k T / (G μ m_u))^(3/2) (3 / (4 π ρ))^(1/2) follows from the virial convention with factor 5 and M = 4 π R³ ρ / 3. Replacing 5 by 3 fails. Not the virial theorem',
  ],
  [
    'be-51',
    'PhysJS.Deflection.line_integral',
    'derivation-step: (1+γ)/c² ∫_ℝ G M b / (b² + z²)^{3/2} dz = 2(1+γ) G M / (b c²), and at γ = 1 this is the encoded angle 4 G M / (b c²). γ = 0 is half. Not a geodesic',
  ],
  [
    'be-61',
    'PhysJS.Sommerfeld.integral_eq',
    'derivation-step: ∫_ℝ x² e^x / (1+e^x)² dx = π²/3, the factor in the encoded Lorenz number. The integrand is even, so the half-line is half of π²/3. Claiming the half-line equals π²/3 fails. Not the transport law',
  ],
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
  it('records commit 57a9ecbc851952d539882400a7176926d2990d34, and every coverage phrase says the reference covers its statement only', () => {
    expect(manifest.commit).toBe('57a9ecbc851952d539882400a7176926d2990d34');
    expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.commit).toBe(PHYSJS_COMMIT);
    expect(manifest.toolchain).toBe('leanprover/lean4:v4.34.1');
    expect(manifest.entries).toHaveLength(EXPECTED.length);
    expect(manifest.entries.every((entry) => entry.coverage === COVERAGE)).toBe(true);
  });

  it('names the twenty-five theorems and keys, in manifest order', () => {
    expect(manifest.entries.map((entry) => [entry.key, entry.theorem, entry.covers])).toEqual(EXPECTED.map((row) => [...row]));
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
    ];
    for (const [key, field, theorem] of nested) {
      const entry = manifest.entries.find((candidate) => candidate.key === key) as
        | (PhysjsManifestFile['entries'][number] & Record<string, { theorem?: string; covers?: string } | undefined>)
        | undefined;
      expect(entry?.[field]?.theorem).toBe(theorem);
      expect(entry?.[field]?.covers?.split(':')[0]).toMatch(/^(reduction|limit|derivation-step)$/);
      const row = BRIDGE_EQUATIONS.find((candidate) => candidate.id === Number(key.slice(3)));
      expect(row?.formalRef?.statement).toBe(entry?.theorem);
      expect(row?.formalRef?.statement).not.toBe(theorem);
    }
    expect(BRIDGE_EQUATIONS.find((entry) => entry.id === 20)?.formalRef).toBeUndefined();
    expect(manifest.entries.some((entry) => entry.key === 'be-20')).toBe(false);
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
    expect(counted.map((entry) => entry.key)).toEqual(['be-64', 'be-53', 'be-58', 'be-38', 'be-13', 'be-34', 'be-65', 'be-51', 'be-61']);
    expect(crossChecks.map((entry) => entry.key)).toEqual(['be-42', 'be-24', 'be-19']);
    expect(properties.map((entry) => entry.key)).toEqual(['be-16', 'be-29', 'be-11']);
    expect(counted.length + crossChecks.length + properties.length).toBe(15);

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
    const labeledIds = [42, 24, 19, 16, 29, 11];
    for (const id of countedIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      expect(row?.formalRef?.system).toBe('lean4-physjs');
      expect(row?.formalRef?.covers).toMatch(/^(reduction|limit|derivation-step): /);
      expect(deriveEvidence(row!, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    for (const id of labeledIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      expect(row?.formalRef?.system).toBe('lean4-physjs');
      expect(row?.formalRef?.covers).toMatch(/^(property|cross-check): /);
      expect(deriveEvidence(row!, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    const reviewed = atlasBridges.filter(
      (bridge) => bridge.formalRef !== undefined && bridge.formalRef.fidelity !== 'unreviewed',
    );
    expect(reviewed).toHaveLength(10);
    for (const id of [36, 20, 57, 54]) {
      expect(BRIDGE_EQUATIONS.find((entry) => entry.id === id)?.formalRef).toBeUndefined();
      expect(manifest.entries.some((entry) => entry.key === `be-${id}`)).toBe(false);
    }
    const be36 = BRIDGE_EQUATIONS.find((entry) => entry.id === 36);
    expect(be36?.name).toBe('MOND - Dark Matter Interpolation Function (TeVeS relativistic MOND)');
  });
});
