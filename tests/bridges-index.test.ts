import { describe, it, expect } from 'vitest';
import {
  BRIDGE_EQUATIONS,
  isActiveStatus,
  type BridgeEquationEntry,
  type BridgeEquationStatus,
  type BridgeIssueSeverity,
} from '../src/bridges/index.js';

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
  it('contains exactly 77 entries (+BE-59..62, +BE-63..87)', () => {
    // Updated 2026-05-24: 42 → 44 (BE-53 Yang-Mills β, BE-54 Randall-Sundrum).
    // Updated 2026-07-05: 44 → 48 (PI-instrument expansion: BE-55 quantum Hall,
    // BE-56 Casimir, BE-57 Unruh, BE-58 Johnson-Nyquist).
    expect(BRIDGE_EQUATIONS.length).toBe(77);
  });

  it('has no duplicate IDs; IDs 11 through 76 with no gaps', () => {
    const ids = BRIDGE_EQUATIONS.map((e) => e.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 77 }, (_, i) => i + 11));
    expect(new Set(ids).size).toBe(77);
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

  it('expected categories A-O are all present (15 categories)', () => {
    const letters = new Set(BRIDGE_EQUATIONS.map((e) => e.category));
    const expected = 'ABCDEFGHIJKLMNO'.split('');
    for (const L of expected) {
      expect(letters.has(L), `category ${L} is missing`).toBe(true);
    }
    expect(letters.size).toBe(15);
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

  // --- THEME D: 'invalid' arm visibility (type-design Critical-Hole) ---

  describe('isActiveStatus predicate', () => {
    it('returns true for active statuses', () => {
      expect(isActiveStatus('established')).toBe(true);
      expect(isActiveStatus('speculative')).toBe(true);
      expect(isActiveStatus('highly-speculative')).toBe(true);
    });

    it("returns false for 'invalid'", () => {
      expect(isActiveStatus('invalid')).toBe(false);
    });

    it('a catalog summary built via filter(isActiveStatus) INCLUDES BE-16 under Wave Z-E reformulation', () => {
      // BE-16 was reformulated 2026-05-11 (Wave Z-E) from 'invalid' to
      // 'speculative' (Landauer's principle). 'speculative' is an
      // active status, so the filter now INCLUDES it.
      const active = BRIDGE_EQUATIONS.filter((e) => isActiveStatus(e.status));
      const ids = new Set(active.map((e) => e.id));
      expect(ids.has(16)).toBe(true);
      // BE-11 (established) is still active.
      expect(ids.has(11)).toBe(true);
    });
  });

  // --- THEME D / D2 + F5 R2 catalog invariant (test-analyzer) ---

  it('any entry with a "What would unblock a real fix" note has only reformulation issues', () => {
    for (const e of BRIDGE_EQUATIONS) {
      if (!/What would unblock a real fix/.test(e.notes)) continue;
      for (const iss of e.known_issues) {
        expect(
          iss.fixable,
          `${e.id} has unblock note + ${iss.fixable} issue`,
        ).toBe('reformulation');
      }
      // R2 entries are deliberately not 'established' — they preserve a
      // gap rather than asserting a fix.
      expect(e.status).not.toBe('established');
    }
  });

  // --- Cross-field invariant: 'invalid' status ↔ at least one
  //     unfixable-must-mark-invalid known issue (type-design F-02). ---

  it("status 'invalid' implies ≥1 known_issue with fixable 'unfixable-must-mark-invalid'", () => {
    for (const e of BRIDGE_EQUATIONS) {
      if (e.status !== 'invalid') continue;
      const hasUnfixable = e.known_issues.some(
        (iss) => iss.fixable === 'unfixable-must-mark-invalid',
      );
      expect(
        hasUnfixable,
        `BE-${e.id} is 'invalid' but has no unfixable-must-mark-invalid issue`,
      ).toBe(true);
    }
  });

  it("a known_issue with fixable 'unfixable-must-mark-invalid' implies status 'invalid'", () => {
    for (const e of BRIDGE_EQUATIONS) {
      const hasUnfixable = e.known_issues.some(
        (iss) => iss.fixable === 'unfixable-must-mark-invalid',
      );
      if (!hasUnfixable) continue;
      expect(
        e.status,
        `BE-${e.id} has unfixable-must-mark-invalid issue but status is ${e.status}`,
      ).toBe('invalid');
    }
  });

  // -------------------------------------------------------------------
  // Wave I.B D10 — tractability_class field per CS reviewer I5.
  // -------------------------------------------------------------------
  describe('tractability_class field (Wave I.B D10)', () => {
    const VALID_TRACTABILITY = new Set([
      'closed-form',
      'numerical-tractable',
      'numerical-asymptotic',
      'formally-divergent',
      'undefined',
    ]);

    // The 9 AST-encoded bridges — per the BE-X-encoding test files in
    // tests/bridges/, these are the bridges with src/bridges/equations/
    // modules and validate*Dimensions / evaluate* helpers.
    const ENCODED_BRIDGE_IDS = new Set([11, 14, 19, 22, 25, 26, 34, 41, 47]);

    it('every entry has a tractability_class field', () => {
      for (const e of BRIDGE_EQUATIONS) {
        expect(
          e.tractability_class,
          `BE-${e.id} missing tractability_class field`,
        ).toBeDefined();
      }
    });

    it('tractability_class is one of the valid enum values', () => {
      for (const e of BRIDGE_EQUATIONS) {
        expect(
          VALID_TRACTABILITY.has(e.tractability_class),
          `BE-${e.id} has invalid tractability_class: ${e.tractability_class}`,
        ).toBe(true);
      }
    });

    it('the 9 AST-encoded bridges have a non-undefined tractability_class', () => {
      for (const e of BRIDGE_EQUATIONS) {
        if (!ENCODED_BRIDGE_IDS.has(e.id)) continue;
        expect(
          e.tractability_class,
          `BE-${e.id} is AST-encoded but tractability_class is 'undefined'`,
        ).not.toBe('undefined');
      }
    });

    it('all bridges have a populated tractability_class (no more "undefined" defaults as of Wave Z-F)', () => {
      // The 'undefined' default was the placeholder Wave I.B D10
      // introduced. As of Wave Z-F (2026-05-11), all 40 bridges have
      // an explicit tractability_class — the last two 'undefined'
      // entries (BE-16, BE-37) were reformulated to 'closed-form'
      // under Wave Z-E (Landauer) and Wave Z-F (Shapiro). The
      // enum value 'undefined' remains valid in the schema for any
      // future entries that need it.
      const undefinedCount = BRIDGE_EQUATIONS.filter(
        (e) => e.tractability_class === 'undefined',
      ).length;
      expect(undefinedCount).toBe(0);
    });

    it('specific encoded bridges have the expected tractability_class', () => {
      // Per Wave I.B D10 mapping based on what evaluate*() does:
      const expected: Record<number, string> = {
        11: 'closed-form',         // Caldeira-Leggett rate
        14: 'closed-form',         // RT entropy
        19: 'closed-form',         // Friedmann bounce
        22: 'closed-form',         // TEE
        // BE-25 (IIT Φ_max) is 'numerical-asymptotic' under Wave Q B1
        // (CS iter-6 C1 fix): Φ_max computation is exponential in system
        // size (EXPTIME; intractable beyond ~10 elements but computable /
        // Turing-decidable, NOT non-computable). Wave P-D R-D2 originally
        // labeled it 'formally-divergent'; that label miscategorized
        // EXPTIME problems as non-Turing-computable. Was 'closed-form'
        // under the dropped Penrose-Hameroff Orch-OR algebraic form.
        25: 'numerical-asymptotic',
        26: 'numerical-tractable', // DNA WKB (1D integral)
        34: 'closed-form',         // Kibble-Zurek
        41: 'closed-form',         // Swampland
        47: 'numerical-tractable', // BBN ODE
      };
      for (const [idStr, klass] of Object.entries(expected)) {
        const id = Number(idStr);
        const e = BRIDGE_EQUATIONS.find((x) => x.id === id)!;
        expect(
          e.tractability_class,
          `BE-${id} expected tractability_class '${klass}', got '${e.tractability_class}'`,
        ).toBe(klass);
      }
    });
  });
});

// Type-level smoke test: the exported type must be assignable.
const _typeCheck: BridgeEquationEntry | undefined = BRIDGE_EQUATIONS[0];
void _typeCheck;
