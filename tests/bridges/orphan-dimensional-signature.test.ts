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
  74, // BE-74 magnetic pressure: closed-form evaluator, no AST.
  75, // BE-75 London penetration depth: closed-form evaluator, no AST.
  76, // BE-76 plasma beta: closed-form evaluator, no AST.
  77, // BE-77 Hagen–Poiseuille: closed-form evaluator, no AST.
  78, // BE-78 Euler buckling: closed-form evaluator, no AST.
  79, // BE-79 pull-in: closed-form evaluator, no AST.
  80, // BE-80 Mott–Gurney: closed-form evaluator, no AST.
  81, // BE-81 Child–Langmuir: closed-form evaluator, no AST.
  82, // BE-82 Shockley diode: closed-form evaluator, no AST.
  83, // BE-83 Thomson coefficient: closed-form evaluator, no AST.
  84, // BE-84 four-point sheet: closed-form evaluator, no AST.
  85, // BE-85 shot noise: closed-form evaluator, no AST.
  86, // BE-86 Reynolds analogy: closed-form evaluator, no AST.
  87, // BE-87 capacitor noise: closed-form evaluator, no AST.
  88, // BE-88 Fermi wavevector: closed-form evaluator, no AST.
  89, // BE-89 Debye cutoff: closed-form evaluator, no AST.
  90, // BE-90 Debye heat: closed-form evaluator, no AST.
  91, // BE-91 Einstein solid: closed-form evaluator, no AST.
  92, // BE-92 Sommerfeld heat: closed-form evaluator, no AST.
  93, // BE-93 Curie–Weiss: closed-form evaluator, no AST.
  94, // BE-94 Pauli paramagnetism: closed-form evaluator, no AST.
  95, // BE-95 GL trial wall: closed-form evaluator, no AST.
  96, // BE-96 upper critical field: closed-form evaluator, no AST.
  97, // BE-97 Ambegaokar–Baratoff: closed-form evaluator, no AST.
  98, // BE-98 BCS heat jump: closed-form evaluator, no AST.
  99, // BE-99 mass action: closed-form evaluator, no AST.
  100, // BE-100 Lyddane–Sachs–Teller: closed-form evaluator, no AST.
  101, // BE-101 BKT jump: closed-form evaluator, no AST.
  102, // BE-102 Landauer conductance: closed-form evaluator, no AST.
  103, // BE-103 Bohm sheath: closed-form evaluator, no AST.
  104, // BE-104 ion acoustic: closed-form evaluator, no AST.
  105, // BE-105 upper hybrid: closed-form evaluator, no AST.
  106, // BE-106 R cutoff: closed-form evaluator, no AST.
  107, // BE-107 lower hybrid: closed-form evaluator, no AST.
  108, // BE-108 oblique fast mode: closed-form evaluator, no AST.
  109, // BE-109 Bennett current: closed-form evaluator, no AST.
  110, // BE-110 loss cone: closed-form evaluator, no AST.
  111, // BE-111 grad-B drift: closed-form evaluator, no AST.
  112, // BE-112 E×B drift: closed-form evaluator, no AST.
  113, // BE-113 Landau damping: closed-form evaluator, no AST.
  114, // BE-114 Debye sphere: closed-form evaluator, no AST.
  115, // BE-115 two-species Debye: closed-form evaluator, no AST.
  116, // BE-116 kinetic resistivity: closed-form evaluator, no AST.
  117, // BE-117 resistive slab: closed-form evaluator, no AST.
  118, // BE-118 Parker radius: closed-form evaluator, no AST.
  119, // BE-119 Parker spiral: closed-form evaluator, no AST.
  120, // BE-120 Chapman–Ferraro: closed-form evaluator, no AST.
  121, // BE-121 Lawson product: closed-form evaluator, no AST.
  122, // BE-122 floating potential: closed-form evaluator, no AST.
  123, // BE-123 cross-field ratio: closed-form evaluator, no AST.
  124, // BE-124 firehose margin: closed-form evaluator, no AST.
  125, // BE-125 mirror margin: closed-form evaluator, no AST.
  126, // BE-126 comb drive: closed-form evaluator, no AST.
  127, // BE-127 subthreshold swing: closed-form evaluator, no AST.
  128, // BE-128 boost ratio: closed-form evaluator, no AST.
  129, // BE-129 fin efficiency: closed-form evaluator, no AST.
  130, // BE-130 thermoelectric generator: closed-form evaluator, no AST.
  131, // BE-131 Joukowsky pressure: closed-form evaluator, no AST.
  132, // BE-132 coaxial capacitance: closed-form evaluator, no AST.
  133, // BE-133 damping ratio: closed-form evaluator, no AST.
  134, // BE-134 Bloch deficit: closed-form evaluator, no AST.
  135, // BE-135 three-dimensional density of states: closed-form evaluator, no AST.
  136, // BE-136 two-dimensional density of states: closed-form evaluator, no AST.
  137, // BE-137 Thomas–Fermi wavevector squared: closed-form evaluator, no AST.
  138, // BE-138 built-in voltage: closed-form evaluator, no AST.
  139, // BE-139 semiconductor Fermi offset: closed-form evaluator, no AST.
  140, // BE-140 Onsager frequency: closed-form evaluator, no AST.
  141, // BE-141 Josephson inductance: closed-form evaluator, no AST.
  142, // BE-142 lower critical field: closed-form evaluator, no AST.
  143, // BE-143 AC Drude conductivity: closed-form evaluator, no AST.
  144, // BE-144 Matthiessen lifetime: closed-form evaluator, no AST.
  145, // BE-145 Stoner susceptibility: closed-form evaluator, no AST.
  146, // BE-146 Gorter–Casimir fraction: closed-form evaluator, no AST.
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
    it('orphan allowlist has ninety-four entries (BE-51/52 + BE-55..146 closed-form)', () => {
      // BE-51/52 and the four PI-instrument bridges (BE-55 quantum Hall, BE-56
      // Casimir, BE-57 Unruh, BE-58 Johnson-Nyquist) have dimensional_signatures
      // but closed-form evaluators, not AST modules.
      expect(ORPHAN_DIMENSIONAL_SIGNATURES.size).toBe(94);
      // 81 is the record from before be-134..146.
      // 73 is the record from before be-126..133.
      // 50 is the record from before be-103..125. 35 is the record from before be-88..102.
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

    it('orphan allowlist is BE-51/52 + BE-55..125 (closed-form evaluators)', () => {
      expect([...ORPHAN_DIMENSIONAL_SIGNATURES].sort((a, b) => a - b)).toEqual([
        51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
        77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
        101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
        120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
        134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146,
      ]);
      // 50 ids ending at 102 is the record from before be-103..125.
    });
  });
});
