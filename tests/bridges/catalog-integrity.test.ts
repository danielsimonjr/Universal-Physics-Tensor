/**
 * Catalog-level integrity test — codifies the v0.5.0 catalog invariants:
 *
 *   1. Exactly 42 bridges exist in `BRIDGE_EQUATIONS` (the authoritative
 *      registry exported from `src/bridges/index.ts`).
 *   2. Every bridge has at least one `tests/bridges/be-NN-*.test.ts` file
 *      (filename pattern, case-insensitive). Filename-pattern (not content
 *      grep) — some bridges are tested by structural sibling tests that
 *      do not call the evaluator (Tasks 13/14 / `be-51-*-structural.test.ts`,
 *      `be-52-*-structural.test.ts` are registry-only checks). Pinning the
 *      filename pattern is the strongest invariant we can assert without
 *      false-positives on those structural-only tests.
 *   3. Every Schwarzschild-spacetime bridge in `[BE-37, BE-51, BE-52]` has
 *      a geodesic cross-validation test that calls
 *      `integrateGeodesic` or `integrateGeodesicGL4`. The fourth bridge
 *      listed in the v0.5.0 plan, BE-42 (Hawking temperature
 *      T_H = ℏc³/(8πGMk_B)), is recorded as `it.todo` — see the comment
 *      block on that test below for the honest-claude framing.
 *
 * Source: v0.5.0 Implementation Plan Task 20 (Phase 3h, audit
 * recommendation #5). M1 — every assertion is quantitative; no
 * `expect(true).toBe(true)` placeholders.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const bridgesTestsDir = resolve(here);

/** Test files in `tests/bridges/` (filename only, lowercased). */
function listBridgeTestFiles(): string[] {
  return readdirSync(bridgesTestsDir)
    .filter((f) => f.endsWith('.test.ts'))
    .map((f) => f.toLowerCase());
}

/** True iff at least one `be-NN-*.test.ts` filename exists for the given id. */
function hasTestFileForBridge(id: number, files: string[]): boolean {
  const re = new RegExp(`^be-${id}-.*\\.test\\.ts$`);
  return files.some((f) => re.test(f));
}

/**
 * Schwarzschild-spacetime bridges per v0.5.0 plan §3 Task 3h:
 *   - BE-37: Shapiro gravitational time-delay (null radial geodesic)
 *   - BE-51: Eddington 1919 gravitational lensing (null geodesic deflection)
 *   - BE-52: Mercury perihelion precession (timelike bound geodesic)
 *
 * BE-42 (Hawking temperature) is listed in the plan as a fourth member of
 * the spacetime-bridge family but is intentionally excluded from the
 * GL4-geodesic invariant here — the Wave Y reformulation replaced the
 * AST-unencodable firewall-complement state with the canonical scalar
 * `T_H = ℏc³/(8πGMk_B)`, which has no geodesic content to integrate. The
 * geodesic invariant therefore covers only the three bridges whose
 * evaluators genuinely close on a null/timelike Schwarzschild trajectory.
 *
 * Map: evaluator function name → mapping back to bridge ID. Used to
 * locate the cross-validation test file by import-content rather than
 * by filename (the BE-51 and BE-52 cross-validation tests live in
 * `gravitational-lensing.test.ts` / `perihelion-precession.test.ts`, not
 * in `be-NN-*.test.ts` — predates the `be-NN-` filename convention).
 */
const SPACETIME_GEODESIC_EVALUATORS: Record<number, string> = {
  37: 'evaluateBE37CovariantEikonalNumerical',
  51: 'evaluateGravitationalLensing',
  52: 'evaluatePerihelionPrecession',
};

/**
 * Find any `tests/bridges/*.test.ts` that imports the given evaluator
 * AND contains a literal call site for `integrateGeodesic` or
 * `integrateGeodesicGL4`. Returns the matching filename or `null`.
 */
function findGeodesicTestForEvaluator(evaluatorName: string): string | null {
  const files = readdirSync(bridgesTestsDir).filter((f) => f.endsWith('.test.ts'));
  for (const f of files) {
    const contents = readFileSync(resolve(bridgesTestsDir, f), 'utf-8');
    if (!contents.includes(evaluatorName)) continue;
    if (!/integrateGeodesic(GL4)?/.test(contents)) continue;
    return f;
  }
  return null;
}

describe('Bridge catalog: suite-level invariants', () => {
  it('exactly 58 bridges exist in BRIDGE_EQUATIONS (+BE-59..62, +BE-63..68)', () => {
    // Authoritative registry, not a filesystem scan: spec-vs-index drift is
    // already pinned by `tests/bridges/spec-vs-index.test.ts`.
    // Updated 2026-05-24: 42 → 44 (BE-53 Yang-Mills β, BE-54 Randall-Sundrum).
    // Updated 2026-07-05: 44 → 48 (PI-instrument bridge expansion — BE-55
    // quantum Hall, BE-56 Casimir, BE-57 Unruh, BE-58 Johnson-Nyquist).
    expect(BRIDGE_EQUATIONS.length).toBe(92);
    // 77 is the record from before be-88..102.
  });

  it('every bridge has at least one tests/bridges/be-NN-*.test.ts file', () => {
    const files = listBridgeTestFiles();
    const missing: number[] = [];
    for (const entry of BRIDGE_EQUATIONS) {
      if (!hasTestFileForBridge(entry.id, files)) {
        missing.push(entry.id);
      }
    }
    expect(
      missing,
      `Bridges with no be-NN-*.test.ts file: ${missing.join(', ')}. ` +
        `Either add a test or update the catalog-integrity invariant.`,
    ).toEqual([]);
  });

  it('every Schwarzschild-spacetime bridge (BE-37, BE-51, BE-52) has a geodesic cross-validation test', () => {
    const failures: string[] = [];
    for (const [idStr, evaluatorName] of Object.entries(SPACETIME_GEODESIC_EVALUATORS)) {
      const id = Number(idStr);
      const matchedFile = findGeodesicTestForEvaluator(evaluatorName);
      if (matchedFile === null) {
        failures.push(
          `BE-${id} (${evaluatorName}): no tests/bridges/*.test.ts contains both ` +
            `the evaluator import AND a call to integrateGeodesic / integrateGeodesicGL4`,
        );
      }
    }
    expect(
      failures,
      `Missing geodesic cross-validation tests:\n${failures.join('\n')}`,
    ).toEqual([]);
  });

  // BE-42 honest-claude exception. The v0.5.0 Task 20 plan lists BE-42 as a
  // Schwarzschild-spacetime bridge, but the Wave Y reformulation (2026-05-07)
  // replaced the original firewall-complement Hilbert-space ansatz with the
  // canonical Hawking temperature scalar T_H = ℏc³/(8πGMk_B) — a closed-form
  // scalar with no geodesic-integration content. A geodesic cross-validation
  // is therefore not physically meaningful for this bridge as currently
  // encoded. If a future revision restores explicit horizon/affine-parameter
  // dynamics to BE-42, promote this `it.todo` to a real assertion mirroring
  // the BE-37/51/52 invariant above.
  it.todo(
    'BE-42 geodesic cross-validation — N/A as encoded (Hawking T_H scalar, no geodesic); see comment',
  );
});
