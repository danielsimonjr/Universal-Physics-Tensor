/**
 * Each concept the integration design assigned once has one owner.
 * A second name in `src/` fails this scan. The same scan is what
 * `docs:deps` writes to `docs/architecture/duplicate-owners.md`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  bridgeEquationLiteral,
  bridgeRegistryHits,
  classicalRk4Hits,
  classicalRk4Literal,
  jsonDefinition,
  jsonOwnerHits,
  massDensityAssignment,
  massDensityHits,
  nameTableOwnerHits,
  prefactorOwnerHits,
  renderDuplicateOwners,
  signOwnerHits,
  temperatureOwnerHits,
} from '../../tools/duplicate-owner-scans.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('single owner', () => {
  it('applies the temperature reading only from readNamedBinding', () => {
    expect(temperatureOwnerHits(root)).toEqual([]);
  });

  it('calls assertSameCarrierSign only from the sign policy', () => {
    expect(signOwnerHits(root)).toEqual([]);
  });

  it('writes that list to duplicate-owners.md', () => {
    expect(readFileSync(resolve(root, 'docs/architecture/duplicate-owners.md'), 'utf8')).toBe(
      renderDuplicateOwners(root),
    );
  });

  it('keeps one edit distance and one name table', () => {
    expect(nameTableOwnerHits(root)).toEqual([]);
  });

  it('does not invent a sourced 1 for a missing prefactor', () => {
    expect(prefactorOwnerHits(root)).toEqual([]);
  });

  it('builds a catalog id only through registerBridge', () => {
    expect(bridgeRegistryHits(root)).toEqual([]);
  });

  it('defines canonicalJson and captureEnvironment in one module', () => {
    expect(jsonOwnerHits(root)).toEqual([]);
  });

  it('a third canonicalJson definition is a hit, and a re-export is not', () => {
    // The marker was chosen to match `export function canonicalJson` on the parent tree.
    // This proves the matcher fires. The parent failure was the two live definitions.
    expect(jsonDefinition('export function canonicalJson(value: unknown): string {\n', 'canonicalJson')).toBe(true);
    expect(jsonDefinition("export { canonicalJson } from './serialize.js';\n", 'canonicalJson')).toBe(false);
    expect(jsonDefinition('export async function captureEnvironment(api: Api) {\n', 'captureEnvironment')).toBe(true);
    expect(jsonDefinition("export { captureEnvironment } from './run-manifest.js';\n", 'captureEnvironment')).toBe(false);
  });

  it('has no second classical RK4 step', () => {
    expect(classicalRk4Hits(root)).toEqual([]);
  });

  it('has one MASS_DENSITY assignment', () => {
    expect(massDensityHits(root)).toEqual([]);
  });

  it('a const MASS_DENSITY assignment is a hit, and a re-export is not', () => {
    // The marker matches `export const MASS_DENSITY` and `const MASS_DENSITY` on the parent tree.
    expect(massDensityAssignment('export const MASS_DENSITY: Dimension = { L: -3, M: 1 };\n')).toBe(true);
    expect(massDensityAssignment('const MASS_DENSITY: Dimension = { L: -3, M: 1 };\n')).toBe(true);
    expect(massDensityAssignment("export { MASS_DENSITY } from '../../dimensional/types.js';\n")).toBe(false);
  });

  it('a classical RK4 weight is a hit', () => {
    // The marker matches the update the parent tree had. This proves the matcher fires.
    expect(classicalRk4Literal('y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);')).toBe(true);
    expect(classicalRk4Literal('solveODESystem(f, y0, [0, h], { dt: h });')).toBe(false);
  });

  it('a second BRIDGE_EQUATIONS literal is a hit', () => {
    // The marker was chosen to match the assignment the parent tree had.
    // This proves the matcher fires. The parent failure was the real literal.
    const fixture = 'export const BRIDGE_EQUATIONS: BridgeEquationEntry[] = [\n';
    expect(bridgeEquationLiteral(fixture)).toBe(true);
    expect(bridgeEquationLiteral('export const BRIDGE_EQUATIONS = production.equations();\n')).toBe(false);
  });
});
