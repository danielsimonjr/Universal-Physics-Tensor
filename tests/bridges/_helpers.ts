/**
 * Shared test helpers for bridge equation encoding tests.
 *
 * v0.4.5 Task 5a: extracted from encoding test files to eliminate the
 * repeated boilerplate (catalog lookup + dimensional validation
 * round-trip). Net savings target: ~150-200 LOC across the full suite
 * (realized across Tasks 5b and 5c).
 *
 * v0.4.5 Task 5b: expanded with `expectHasReformulationIssue` for use
 * in reformulation test files; scope broadened from encoding-only.
 *
 * IMPORTANT — F5 constraint: Call these helpers INSIDE `it()` blocks
 * only. Calling `expect()` at describe/module scope causes Vitest to
 * report an uncaught error and corrupts the per-bridge test count.
 * Each bridge file keeps its own `it()` structure; these helpers replace
 * the BODY of those `it()` blocks, not the `it()` wrappers themselves.
 *
 * Encoding tests: use `expectBridgeInIndex` and `expectDimRoundTrip`.
 * Reformulation tests: use `expectBridgeInIndex` and `expectHasReformulationIssue`.
 * Fix tests (non-standard shapes): these helpers are not applicable.
 *
 * @module tests/bridges/_helpers
 */

import { expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import type { BridgeEquationStatus, BridgeEquationEntry } from '../../src/bridges/index.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { validate } from '../../src/dimensional/validator.js';
import { format } from '../../src/dimensional/algebra.js';

/**
 * Assert that a bridge with the given numeric id exists in
 * BRIDGE_EQUATIONS, and optionally that its `status` matches the
 * expected value. Returns the entry for further assertions.
 *
 * Call INSIDE an `it()` block — not at describe/module scope.
 *
 * @example
 * it('exists in the index', () => {
 *   expectBridgeInIndex(22);
 * });
 * it("status pinned 'speculative'", () => {
 *   expectBridgeInIndex(22, 'speculative');
 * });
 */
export function expectBridgeInIndex(
  id: number,
  status?: BridgeEquationStatus,
): BridgeEquationEntry {
  const entry = BRIDGE_EQUATIONS.find((e) => e.id === id);
  expect(entry, `Bridge BE-${id} not found in BRIDGE_EQUATIONS`).toBeDefined();
  if (status !== undefined) {
    expect(entry!.status, `BE-${id} status mismatch`).toBe(status);
  }
  return entry!;
}

/**
 * Assert that the given BridgeEquationEntry has at least one known_issue
 * and that at least one issue satisfies:
 *   `i.severity === 'phenomenological-ansatz' && i.fixable === 'reformulation'`
 *
 * Used in reformulation test files to replace the recurring 4-line block
 * that verifies the framing-gap issue entry has been preserved. Collapsed
 * to a single declarative call.
 *
 * Call INSIDE an `it()` block — not at describe/module scope.
 *
 * @example
 * it('known_issues retains a phenomenological-ansatz / reformulation entry', () => {
 *   const entry = expectBridgeInIndex(30);
 *   expectHasReformulationIssue(entry);
 * });
 */
export function expectHasReformulationIssue(entry: BridgeEquationEntry): void {
  expect(
    entry.known_issues.length,
    'known_issues must be non-empty',
  ).toBeGreaterThan(0);
  const hasFramingIssue = entry.known_issues.some(
    (i) => i.severity === 'phenomenological-ansatz' && i.fixable === 'reformulation',
  );
  expect(
    hasFramingIssue,
    "no known_issue with severity='phenomenological-ansatz' and fixable='reformulation'",
  ).toBe(true);
}

/**
 * Assert that the given AST node validates cleanly and that
 * `format(validate(rhs).inferredDimension!)` matches `expectedSig`.
 * Covers both "validation ok" and "format round-trip" in one call.
 *
 * Call INSIDE an `it()` block — not at describe/module scope.
 *
 * @example
 * it("RHS infers SI dimension '[1]' (round-trip pin)", () => {
 *   expectDimRoundTrip(topologicalEntanglementRhs, '[1]');
 * });
 */
export function expectDimRoundTrip(rhs: ExprNode, expectedSig: string): void {
  const r = validate(rhs);
  expect(
    r.ok,
    `AST validation failed: ${JSON.stringify(r.violations)}`,
  ).toBe(true);
  expect(
    r.inferredDimension,
    'inferredDimension is null — validation did not infer a dimension',
  ).not.toBeNull();
  const actual = format(r.inferredDimension!);
  expect(
    actual,
    `dimensional_signature mismatch: expected '${expectedSig}', got '${actual}'`,
  ).toBe(expectedSig);
}
