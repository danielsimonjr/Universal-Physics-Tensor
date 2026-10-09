/**
 * Catalog-wide invariant: every entry whose `dimensional_signature` is
 * non-null and whose AST is encoded in `src/bridges/rhs-registry.ts` must
 * round-trip through the dimensional analyzer back to the registered
 * string.
 *
 * Bridges without an AST carry a hand-written `dimensional_signature` and
 * are not covered here. The test iterates every entry of
 * `BRIDGE_RHS_BY_ID` and asserts the round-trip invariant; adding a new
 * AST module to that registry is the only thing required to bring it
 * under test.
 *
 * Source: test-analyzer F12.
 */
import { describe, it, expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { validate } from '../../src/dimensional/validator.js';
import { format } from '../../src/dimensional/algebra.js';

// Single source of truth for id → RHS-AST: the registry in src/bridges. This
// round-trip both validates each encoding AND guards the registry against drift.
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';

// Derived from the registry (single source of truth) — every encoded bridge,
// in id order. Adding a bridge to src/bridges/rhs-registry.ts automatically
// brings it under this round-trip.
const ENCODED_RHS = [...BRIDGE_RHS_BY_ID.entries()].map(([id, rhs]) => ({ id, rhs }));

describe('Bridge index: dimensional_signature ↔ AST round-trip', () => {
  for (const { id, rhs } of ENCODED_RHS) {
    it(`BE-${id}: format(infer(rhs)) equals registered dimensional_signature`, () => {
      const entry = BRIDGE_EQUATIONS.find((e) => e.id === id);
      expect(entry, `BE-${id} must exist in BRIDGE_EQUATIONS`).toBeDefined();
      expect(
        entry!.dimensional_signature,
        `BE-${id}: an AST encoding exists, so dimensional_signature must be non-null`,
      ).not.toBeNull();
      const r = validate(rhs);
      expect(r.ok, `BE-${id}: RHS AST must validate cleanly`).toBe(true);
      expect(r.inferredDimension).not.toBeNull();
      expect(format(r.inferredDimension!)).toBe(entry!.dimensional_signature);
    });
  }

  it('every encoded RHS module is registered in this catalog test', () => {
    // Sanity floor: if a future contributor adds a new BE-N encoded module
    // without adding it to ENCODED_RHS above, this test won't fail — but
    // the catalog will be silently incomplete. We can at least pin that
    // the two known encodings are present so a copy-paste deletion is
    // caught.
    const ids = new Set(ENCODED_RHS.map((e) => e.id));
    expect(ids.has(11)).toBe(true);
    expect(ids.has(14)).toBe(true);
  });
});
