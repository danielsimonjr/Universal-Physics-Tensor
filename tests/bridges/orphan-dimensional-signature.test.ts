/**
 * Catalog invariant: every entry whose `dimensional_signature` is non-null
 * must EITHER have a registered AST module (covered by the round-trip
 * test in `dimensional-signature-catalog.test.ts`) OR appear in the
 * `ORPHAN_DIMENSIONAL_SIGNATURES` allowlist below — and orphans must
 * actually have NO AST module.
 *
 * Why this exists (Wave G TA-F1, confidence 95): the round-trip catalog
 * test only iterates entries that *have* an AST module, so a typo or
 * accidental revert of an orphan signature string (BE-18, BE-29, BE-48
 * today) was silently uncovered. The `be-{18,29,48}-fix.test.ts` files
 * pin formula_latex / status but never read `dimensional_signature`.
 *
 * The test enforces the invariant in BOTH directions:
 *   1. Every id in the orphan allowlist has `dimensional_signature !== null`
 *      AND no AST module exists in `ENCODED_RHS_IDS`. ("Orphans really are
 *      orphans.")
 *   2. Every entry NOT in the allowlist that has `dimensional_signature !== null`
 *      MUST have an AST module. ("New encodings can't bypass round-trip
 *      coverage by accident.")
 *
 * As Tier-5 lands AST modules for BE-18 / BE-29 / BE-48, remove them
 * from `ORPHAN_DIMENSIONAL_SIGNATURES` and add them to `ENCODED_RHS_IDS`.
 *
 * Source: test-analyzer F1.
 *
 * @module tests/bridges/orphan-dimensional-signature
 */
import { describe, it, expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

/**
 * Bridge ids that pin a `dimensional_signature` string but do NOT yet
 * have an AST module under `src/bridges/equations/`. Each pin guards
 * against typo / revert until the encoding lands.
 *
 * Update protocol when a new encoding lands:
 *   1. Remove the id from this set.
 *   2. Add `import { <BE_N>_RHS } from '...'` plus the `{ id, rhs }` row
 *      to `ENCODED_RHS` in `dimensional-signature-catalog.test.ts`.
 *   3. Add the row to `ENCODED_RHS_IDS` below.
 *   4. Add the per-bridge expected dim to `EXPECTED_DIMENSION_BY_BRIDGE`
 *      in `src/dimensional/bridge-check.ts`.
 */
const ORPHAN_DIMENSIONAL_SIGNATURES: ReadonlySet<number> = new Set([
  51, // BE-51 Gravitational Lensing (v0.4.0 Task 15): α is dimensionless [1];
      // no AST encoding yet — scalar formula is the canonical form for now.
  52, // BE-52 Mercury Perihelion Precession (v0.4.0 Task 16): Δφ is dimensionless [1];
      // no AST encoding yet — closed-form scalar; AST encoding deferred.
  55, // BE-55 quantum Hall σ_xy = C·e²/h (2026-07-05): closed-form evaluator, no AST.
  56, // BE-56 Casimir F/A = −π²ℏc/(240 d⁴) (2026-07-05): closed-form evaluator, no AST.
  57, // BE-57 Unruh T = ℏa/(2π c k_B) (2026-07-05): closed-form evaluator, no AST.
  58, // BE-58 Johnson-Nyquist S_V = 4 k_B T R (2026-07-05): closed-form evaluator, no AST.
  59, // BE-59 AC Josephson f = 2eV/h (2026-07-05): closed-form evaluator, no AST.
  60, // BE-60 fractional QH σ_xy = ν·e²/h (2026-07-05): closed-form evaluator, no AST.
  61, // BE-61 Wiedemann-Franz L₀ = (π²/3)(k_B/e)² (2026-07-05): closed-form evaluator, no AST.
  62, // BE-62 BCS gap Δ(0) = 1.764 k_B T_c (2026-07-05): closed-form evaluator, no AST.
  63, // BE-63 Chandrasekhar mass M_Ch ≈ 1.44 M_⊙ (2026-07-05): closed-form evaluator, no AST.
  64, // BE-64 Eddington luminosity L_Edd = 4πGMm_p c/σ_T (2026-07-05): closed-form evaluator, no AST.
  65, // BE-65 Jeans mass M_J (2026-07-05): closed-form evaluator, no AST.
  66, // BE-66 radiation pressure: closed-form evaluator, no AST.
  67, // BE-67 Alfvén speed: closed-form evaluator, no AST.
  68, // BE-68 Tolman–Ehrenfest: closed-form evaluator, no AST.
  69, // BE-69 fast magnetosonic speed: closed-form evaluator, no AST.
  70, // BE-70 Einstein relation: closed-form evaluator, no AST.
  71, // BE-71 Clapeyron slope: closed-form evaluator, no AST.
  72, // BE-72 gravitational redshift: closed-form evaluator, no AST.
  73, // BE-73 Kelvin relation: closed-form evaluator, no AST.
]);

/**
 * Bridge ids whose AST RHS is already registered in
 * `tests/bridges/dimensional-signature-catalog.test.ts` (via `ENCODED_RHS`).
 * Kept in sync manually; the disjoint-union guard below catches drift.
 */
const ENCODED_RHS_IDS: ReadonlySet<number> = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 53, 54]);

describe('Bridge index: orphan dimensional_signature invariants', () => {
  describe('Direction 1 — every orphan really is an orphan', () => {
    // Orphan allowlist is empty as of Wave Y (2026-05-07); all
    // dimensional_signatures are now AST-backed. This sentinel
    // assertion ensures the suite has at least one assertion when
    // ORPHAN_DIMENSIONAL_SIGNATURES is empty.
    it('orphan allowlist has twenty-one entries (BE-51/52 + BE-55..73 closed-form)', () => {
      // BE-51/52 and the four PI-instrument bridges (BE-55 quantum Hall, BE-56
      // Casimir, BE-57 Unruh, BE-58 Johnson-Nyquist) have dimensional_signatures
      // but closed-form evaluators, not AST modules.
      expect(ORPHAN_DIMENSIONAL_SIGNATURES.size).toBe(21);
    });

    for (const id of ORPHAN_DIMENSIONAL_SIGNATURES) {
      it(`BE-${id}: has non-null dimensional_signature and no AST module`, () => {
        const entry = BRIDGE_EQUATIONS.find((e) => e.id === id);
        expect(entry, `BE-${id} must exist in BRIDGE_EQUATIONS`).toBeDefined();
        expect(
          entry!.dimensional_signature,
          `BE-${id}: orphan must keep its pinned dimensional_signature`,
        ).not.toBeNull();
        expect(
          ENCODED_RHS_IDS.has(id),
          `BE-${id}: orphan must NOT also be registered as encoded — ` +
            `if a new AST module landed, remove from ORPHAN_DIMENSIONAL_SIGNATURES.`,
        ).toBe(false);
      });
    }

    // BE-18 was removed from orphans 2026-05-07 (Wave Y) — encoded as
    // canonical Higgs-like Yukawa-VEV mass-generation relation
    // m_dark = g_dark · v_dark; dimensional_signature changed
    // [L^8 M^4 T^-8] (Lagrangian density, energy^4) → [energy] (mass
    // in natural units). AST module: be-18-higgs-mass.ts.

    // BE-29 was removed from orphans 2026-05-07 (Wave Y) — encoded as
    // canonical Jarzynski equality ΔF = -k_B T ln⟨exp(-βW)⟩ replacing
    // the gravity-extension form; dimensional_signature [energy] now
    // backed by an AST module (be-29-jarzynski.ts).

    // BE-48 was removed from orphans 2026-05-07 (Wave Y) — encoded as
    // canonical mass-amplified GRW localization rate λ_GRW(m) =
    // λ_0(m/m_0); dimensional_signature [frequency] now backed by an
    // AST module (be-48-grw-localization.ts).
  });

  describe('Direction 2 — every signature is in exactly one of (encoded, orphan)', () => {
    it('disjoint union covers every entry with non-null dimensional_signature', () => {
      // Build the universe: ids whose entry has dimensional_signature !== null.
      const populatedIds = BRIDGE_EQUATIONS
        .filter((e) => e.dimensional_signature !== null)
        .map((e) => e.id);

      const uncovered: number[] = [];
      const doubleCovered: number[] = [];
      for (const id of populatedIds) {
        const inEncoded = ENCODED_RHS_IDS.has(id);
        const inOrphan = ORPHAN_DIMENSIONAL_SIGNATURES.has(id);
        if (!inEncoded && !inOrphan) uncovered.push(id);
        if (inEncoded && inOrphan) doubleCovered.push(id);
      }
      expect(
        uncovered,
        `BE-${uncovered.join(',')}: dimensional_signature is set but the id ` +
          `is in neither ENCODED_RHS_IDS nor ORPHAN_DIMENSIONAL_SIGNATURES. ` +
          `Either add the AST encoding to dimensional-signature-catalog.test.ts ` +
          `(and ENCODED_RHS_IDS here), or pin it as an orphan.`,
      ).toEqual([]);
      expect(
        doubleCovered,
        `BE-${doubleCovered.join(',')}: id is BOTH encoded and orphan-listed. ` +
          `Remove from ORPHAN_DIMENSIONAL_SIGNATURES once the encoding lands.`,
      ).toEqual([]);
    });

    it('orphan allowlist is BE-51/52 + BE-55..73 (closed-form evaluators)', () => {
      expect([...ORPHAN_DIMENSIONAL_SIGNATURES].sort((a, b) => a - b)).toEqual([
        51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
      ]);
    });
  });
});
