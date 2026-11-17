/**
 * The exponent tuples that the Lean manifest records agree with the tuples the derivation engine finds.
 *
 * A hand-typed list of ids and tuples would pin only itself. This test reads the tuple from
 * `attemptDerivation` and the tuple from the covers line of the manifest, and compares them by input
 * name. An edge with no recorded exponent statement fails, and so does a recorded tuple that the
 * engine does not give.
 *
 * Out of the set, on purpose: be-13 and be-36 (`not-a-monomial`: a dimensional sum, and a
 * dimensionless target), be-15 and be-17 (recorded through `monomial_form`, whose covers lines carry no
 * `(a, b) on (x, y)` phrase), and `CE-schwarzschild-radius` (a canonical key, recorded by an earlier change).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { attemptDerivation } from '../../src/composition/bridge-analysis.js';
import { catalogEdge } from '../../src/composition/catalog-graph.js';
import { physjsNestedStatements, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/lean/manifest.json'), 'utf-8')) as PhysjsManifestFile;

/** The catalog edges whose exponent tuple the manifest records. */
const EXPONENT_EDGES = ['be-16', 'be-21', 'be-42-via-rs', 'be-20', 'be-12', 'be-48'] as const;

/** The covers lines spell `hbar`; the engine spells `ℏ`. */
const ENGINE_NAME: Readonly<Record<string, string>> = { hbar: 'ℏ' };

/** `(1, -1/2) on (a, b)` as a map from engine input name to exponent, or undefined when absent. */
function recordedTuple(covers: string): Map<string, number> | undefined {
  const m = /\(([-\d/, ]+)\) on \(([^)]+)\)/.exec(covers);
  if (m === null) return undefined;
  const values = m[1]!.split(',').map((text) => {
    const [num, den] = text.trim().split('/');
    return Number(num) / (den === undefined ? 1 : Number(den));
  });
  const names = m[2]!.split(',').map((name) => ENGINE_NAME[name.trim()] ?? name.trim());
  if (values.length !== names.length) return undefined;
  return new Map(names.map((name, i) => [name, values[i]!] as const));
}

/** Why the recorded tuple differs from the engine monomial, or undefined when they agree by name. */
function mismatch(recorded: Map<string, number>, monomial: Readonly<Record<string, number>>): string | undefined {
  const engine = new Map(Object.entries(monomial).filter(([, exponent]) => exponent !== 0));
  for (const [name, exponent] of engine) {
    if (!recorded.has(name)) return `engine input ${name} is not recorded`;
    if (Math.abs(recorded.get(name)! - exponent) > 1e-9) return `${name}: recorded ${recorded.get(name)}, engine ${exponent}`;
  }
  for (const name of recorded.keys()) if (!engine.has(name)) return `recorded input ${name} is not in the engine monomial`;
  return undefined;
}

/** The one exponent statement of a manifest key: its own or a nested one. */
function exponentStatements(key: string): readonly { readonly name: string; readonly theorem: string; readonly covers: string }[] {
  const entry = manifest.entries.find((candidate) => candidate.key === key);
  if (entry === undefined) return [];
  return [{ name: key, theorem: entry.theorem, covers: entry.covers }, ...physjsNestedStatements(entry).nested.map((s) => ({ name: `${key}.${s.name}`, theorem: s.theorem, covers: s.covers }))].filter(
    (statement) => statement.theorem.endsWith('_exponent_unique'),
  );
}

describe('the recorded exponent tuples are the engine tuples', () => {
  for (const edgeId of EXPONENT_EDGES) {
    it(`${edgeId}: one recorded statement, same tuple by input name`, () => {
      const edge = catalogEdge(edgeId);
      const derived = attemptDerivation(edge);
      expect(derived.status, edgeId).toBe('derived');
      const key = `be-${edge.beId}`;
      const statements = exponentStatements(key);
      expect(statements.map((s) => s.name), `${key} exponent statements`).toHaveLength(1);
      const recorded = recordedTuple(statements[0]!.covers);
      expect(recorded, statements[0]!.name).toBeDefined();
      expect(mismatch(recorded!, derived.monomial!), statements[0]!.name).toBeUndefined();
    });
  }

  it('control: a tuple with one exponent changed is reported', () => {
    const derived = attemptDerivation(catalogEdge('be-21'));
    const right = new Map([['ℏ', 1], ['k_B', -1]]);
    expect(mismatch(right, derived.monomial!)).toBeUndefined();
    expect(mismatch(new Map([['ℏ', 1], ['k_B', -2]]), derived.monomial!)).toMatch(/k_B/);
    expect(mismatch(new Map([['ℏ', 1]]), derived.monomial!)).toMatch(/not recorded/);
  });
});
