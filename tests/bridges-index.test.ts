import { describe, it, expect } from 'vitest';
import {
  BRIDGE_EQUATIONS,
  type BridgeEquationEntry,
  type BridgeEquationStatus,
  type BridgeIssueSeverity,
} from '../src/bridges/index.js';
import { CENSUS } from './helpers/census.js';

const VALID_STATUSES: ReadonlySet<BridgeEquationStatus> = new Set([
  'established',
  'speculative',
  'highly-speculative',
  'invalid',
]);

const VALID_SEVERITIES: ReadonlySet<BridgeIssueSeverity> = new Set([
  'self-refuting',
  'dimensional',
  'index-structure',
  'sign',
  'undefined-quantity',
  'phenomenological-ansatz',
  'other',
]);

const VALID_FIXABLE = new Set([
  'spec-edit',
  'reformulation',
  'unfixable-must-mark-invalid',
  'unknown',
]);

const VALID_PARTS = new Set(['I', 'II', 'III', 'IV', 'V', 'VI']);

describe('Bridge Equation Index', () => {
  it('contains every entry, from the first id to the last', () => {
    // 136 is the record from before ids 147 through 170.
    expect(BRIDGE_EQUATIONS.length).toBe(CENSUS.catalog.entries);
  });

  it('has no duplicate IDs and no gaps between the first id and the last', () => {
    const ids = BRIDGE_EQUATIONS.map((e) => e.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: CENSUS.catalog.entries }, (_, i) => CENSUS.catalog.idMin + i));
    expect(ids[ids.length - 1]).toBe(CENSUS.catalog.idMax);
    expect(new Set(ids).size).toBe(CENSUS.catalog.distinctIds);
    // 123 is the record from before be-134..146.
    // 92 is the record from before be-103..125. 77 is the record from before be-88..102.
  });

  it('runtime status values match the TS enum (catches `as` casts)', () => {
    // Type-system check by another name: TypeScript enforces this at
    // compile time, but a runtime cast (`x as BridgeEquationStatus`)
    // could silently insert a bogus value. Pin the runtime invariant
    // explicitly. Source: test-analyzer F10.
    for (const e of BRIDGE_EQUATIONS) {
      expect(VALID_STATUSES.has(e.status)).toBe(true);
    }
  });

  it('all source_part values are I-VI', () => {
    for (const e of BRIDGE_EQUATIONS) {
      expect(VALID_PARTS.has(e.source_part)).toBe(true);
    }
  });

  it('all categories are non-empty single uppercase letters', () => {
    for (const e of BRIDGE_EQUATIONS) {
      expect(e.category).toMatch(/^[A-Z]$/);
    }
  });

  it('category_name is consistent across same category letter', () => {
    const byLetter = new Map<string, Set<string>>();
    for (const e of BRIDGE_EQUATIONS) {
      if (!byLetter.has(e.category)) byLetter.set(e.category, new Set());
      byLetter.get(e.category)!.add(e.category_name);
    }
    for (const [letter, names] of byLetter) {
      expect(names.size, `category ${letter} has multiple names: ${[...names].join(' | ')}`).toBe(1);
    }
  });

  // Pin the canonical category-letter → name mapping to the spec
  // (docs/specification/Part-{I,II}.md `### Category X: <Name>` headers).
  // A future contributor renaming a category across all entries would pass
  // the unique-counts test above but will fail this one. Source:
  // test-analyzer F11.
  it('category letters map to the canonical names from the spec', () => {
    const expected: Record<string, string> = {
      A: 'Quantum-Classical Bridges',
      B: 'Information-Physical Bridges',
      C: 'Emergence and Complexity',
      D: 'Field Unification Bridges',
      E: 'Cosmological-Quantum Bridges',
      F: 'Condensed Matter - High Energy Bridges',
      G: 'Quantum Biology Bridges',
      H: 'Non-Equilibrium Statistical Mechanics',
      I: 'Emergent Spacetime',
      J: 'Phase Transitions and Criticality',
      K: 'Modified Theories and Extensions',
      L: 'Quantum Field Theory Extensions',
      M: 'Information Paradox Resolutions',
      N: 'Cosmological Puzzles',
      O: 'Quantum Foundations',
    };
    for (const e of BRIDGE_EQUATIONS) {
      expect(
        e.category_name,
        `BE-${e.id} category ${e.category} has wrong category_name`,
      ).toBe(expected[e.category]);
    }
  });

  it('all dependencies reference existing equation IDs', () => {
    const ids = new Set(BRIDGE_EQUATIONS.map((e) => e.id));
    for (const e of BRIDGE_EQUATIONS) {
      for (const dep of e.dependencies) {
        expect(ids.has(dep), `Eq ${e.id} depends on missing Eq ${dep}`).toBe(true);
        expect(dep).not.toBe(e.id); // no self-deps
      }
    }
  });

  it('runtime known_issues severity/fixable values match the TS enums (catches `as` casts)', () => {
    // Same reasoning as the status-enum test above. The
    // `description.length > 0` assertion is the only behavioural part.
    // Source: test-analyzer F10.
    for (const e of BRIDGE_EQUATIONS) {
      for (const iss of e.known_issues) {
        expect(VALID_SEVERITIES.has(iss.severity)).toBe(true);
        expect(VALID_FIXABLE.has(iss.fixable)).toBe(true);
        expect(iss.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('bridges tuple has exactly two non-empty endpoint strings', () => {
    for (const e of BRIDGE_EQUATIONS) {
      expect(e.bridges).toHaveLength(2);
      expect(e.bridges[0].length).toBeGreaterThan(0);
      expect(e.bridges[1].length).toBeGreaterThan(0);
    }
  });

  it('expected categories A-O are all present', () => {
    const letters = new Set(BRIDGE_EQUATIONS.map((e) => e.category));
    const expected = 'ABCDEFGHIJKLMNO'.split('');
    for (const L of expected) {
      expect(letters.has(L), `category ${L} is missing`).toBe(true);
    }
    expect(letters.size).toBe(CENSUS.catalog.categories);
  });

  it('every entry has a non-empty name', () => {
    for (const e of BRIDGE_EQUATIONS) {
      expect(e.name.length).toBeGreaterThan(0);
    }
  });

  it('Part-I contributes IDs 11-20 + 52; Part-II contributes IDs 21-50; Part-III contributes 51 and 53', () => {
    // v0.4.0: BE-51 (Gravitational Lensing) tagged source_part='III';
    //         BE-52 (Mercury Perihelion Precession) tagged source_part='I'.
    // v0.7 BE-X re-encoding: BE-53 (Yang-Mills β-function) tagged source_part='III'.
    const partI = BRIDGE_EQUATIONS.filter((e) => e.source_part === 'I').map((e) => e.id).sort((a, b) => a - b);
    const partII = BRIDGE_EQUATIONS.filter((e) => e.source_part === 'II').map((e) => e.id).sort((a, b) => a - b);
    const partIII = BRIDGE_EQUATIONS.filter((e) => e.source_part === 'III').map((e) => e.id).sort((a, b) => a - b);
    expect(partI).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 52]);
    expect(partII).toEqual(Array.from({ length: 30 }, (_, i) => i + 21));
    expect(partIII).toContain(51);
    expect(partIII).toContain(53);
  });

  // BE-16 was marked 'invalid' on 2026-05-01 per the Tier 3 audit (the
  // original C(ρ) ansatz was algebraically self-refuting and the
  // "complexity" quantity was undefined). REFORMULATED 2026-05-11
  // (Wave Z-E, per OpenAI o3 consultation) to Landauer's principle
  // E_min = k_B T ln(2) — the canonical information-↔-thermodynamics
  // bridge. Status now 'speculative' (not 'established') because
  // Landauer is canonical and experimentally tested but the bridge
  // *framing* (Landauer's bound as the UPT microscale-↔-emergent
  // bridge) remains the speculative element. Same precedent as Wave
  // P-D R-D2 BE-25 Penrose-Hameroff → IIT.
  it("BE-16 is REFORMULATED to 'speculative' under Wave Z-E Landauer's principle (per OpenAI o3 consultation)", () => {
    const be16 = BRIDGE_EQUATIONS.find((e) => e.id === 16);
    expect(be16, 'BE-16 must be present in the index').toBeDefined();
    expect(be16!.status).toBe('speculative');
    expect(
      be16!.formula_latex,
      `BE-16 formula_latex must reflect Landauer reformulation, not the legacy C(rho) ansatz`,
    ).toBe('E_{\\min} = k_B T \\ln 2');
  });

});

// Type-level smoke test: the exported type must be assignable.
const _typeCheck: BridgeEquationEntry | undefined = BRIDGE_EQUATIONS[0];
void _typeCheck;
