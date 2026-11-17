/**
 * The exponent tuples that the Lean manifest records agree with the tuples the derivation engine finds,
 * and with the tuples the Lean theorems state.
 *
 * A hand-typed list of ids and tuples would pin only itself. This test reads three things for each edge
 * and compares them: the tuple from `attemptDerivation` (by input name), the tuple in the covers line of
 * the manifest, and the tuple the Lean theorem fixes (the `def <name>Exponent : Fin n → ℚ` arms of the
 * definition the theorem's `e = <name>Exponent` names). An edge with no recorded exponent statement
 * fails, a recorded tuple that the engine does not give fails, and a covers tuple that the Lean file does
 * not state fails.
 *
 * The Lean file is read as text, as `scripts/lean-index.ts` reads it. This does not prove the theorem
 * compiles; the CI job `lake build and axiom audit` does.
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
import { physjsLeanFile, physjsNestedStatements, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/lean/manifest.json'), 'utf-8')) as PhysjsManifestFile;

/** The catalog edges whose exponent tuple the manifest records. */
const EXPONENT_EDGES = ['be-16', 'be-21', 'be-42-via-rs', 'be-20', 'be-12', 'be-48'] as const;

/** The covers lines spell `hbar`; the engine spells `ℏ`. */
const ENGINE_NAME: Readonly<Record<string, string>> = { hbar: 'ℏ' };

/** `1`, `-1/2`, `-1 / 2`: a rational literal of a covers line or of a Lean arm. Anything else is undefined. */
function rational(text: string): number | undefined {
  const m = /^(-?\d+)(?:\s*\/\s*(\d+))?$/.exec(text.trim());
  if (m === null) return undefined;
  const value = Number(m[1]) / (m[2] === undefined ? 1 : Number(m[2]));
  return Number.isFinite(value) ? value : undefined;
}

/** `(1, -1/2) on (a, b)` as names in the theorem's order and values, or undefined when absent or malformed. */
function recordedTuple(covers: string): { readonly names: readonly string[]; readonly values: readonly number[] } | undefined {
  const m = /\(([-\d/, ]+)\) on \(([^)]+)\)/.exec(covers);
  if (m === null) return undefined;
  const values = m[1]!.split(',').map(rational);
  const names = m[2]!.split(',').map((name) => ENGINE_NAME[name.trim()] ?? name.trim());
  if (values.length !== names.length || values.some((value) => value === undefined)) return undefined;
  return { names, values: values as number[] };
}

/** The recorded tuple as a map from engine input name to exponent. */
function byName(recorded: { readonly names: readonly string[]; readonly values: readonly number[] }): Map<string, number> {
  return new Map(recorded.names.map((name, i) => [name, recorded.values[i]!] as const));
}

/**
 * The tuple a Lean `_exponent_unique` theorem fixes, read from the file's text: the theorem's statement
 * `↔ e = <def>` names a `def <def> : Fin n → ℚ` whose arms `| i => v` are the tuple. Undefined when the
 * text has no such theorem, no such def, or an arm that is not a rational literal.
 */
function leanTuple(text: string, theorem: string): readonly number[] | undefined {
  const short = theorem.slice(theorem.lastIndexOf('.') + 1);
  const statement = new RegExp(`theorem ${short}\\b[\\s\\S]*?↔ e = (\\w+) := by`).exec(text);
  if (statement === null) return undefined;
  const def = new RegExp(`def ${statement[1]!} : Fin (\\d+) → ℚ\\n((?:\\s*\\| \\d+ => .+\\n)+)`).exec(text);
  if (def === null) return undefined;
  const arms = def[2]!.trim().split('\n').map((line) => /\|\s*(\d+)\s*=>\s*(.+)$/.exec(line.trim()));
  if (arms.some((arm) => arm === null) || arms.length !== Number(def[1])) return undefined;
  const values = arms.map((arm) => rational(arm![2]!));
  if (values.some((value) => value === undefined)) return undefined;
  return values as number[];
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

/** The source text of the Lean file that declares a theorem (`physjsLeanFile` gives the name under `lean/`). */
const leanText = (theorem: string): string => readFileSync(resolve(root, 'lean', physjsLeanFile(theorem)), 'utf-8');

describe('the recorded exponent tuples are the engine tuples and the Lean tuples', () => {
  for (const edgeId of EXPONENT_EDGES) {
    it(`${edgeId}: one recorded statement, same tuple by input name, same tuple in the Lean def`, () => {
      const edge = catalogEdge(edgeId);
      const derived = attemptDerivation(edge);
      expect(derived.status, edgeId).toBe('derived');
      const key = `be-${edge.beId}`;
      const statements = exponentStatements(key);
      expect(statements.map((s) => s.name), `${key} exponent statements`).toHaveLength(1);
      const statement = statements[0]!;
      const recorded = recordedTuple(statement.covers);
      expect(recorded, statement.name).toBeDefined();
      expect(mismatch(byName(recorded!), derived.monomial!), statement.name).toBeUndefined();
      const lean = leanTuple(leanText(statement.theorem), statement.theorem);
      expect(lean, `${statement.theorem} def arms`).toBeDefined();
      expect(lean, `${statement.name}: covers tuple against the Lean def`).toEqual(recorded!.values);
    });
  }

  it('control: a tuple with one exponent changed is reported', () => {
    const derived = attemptDerivation(catalogEdge('be-21'));
    const right = recordedTuple('the exponent tuple (1, -1) on (hbar, k_B) is unique');
    expect(right).toBeDefined();
    expect(mismatch(byName(right!), derived.monomial!)).toBeUndefined();
    expect(mismatch(new Map([['ℏ', 1], ['k_B', -2]]), derived.monomial!)).toMatch(/k_B/);
    expect(mismatch(new Map([['ℏ', 1]]), derived.monomial!)).toMatch(/not recorded/);
  });

  it('control: a malformed covers tuple is undefined, not a number', () => {
    expect(recordedTuple('(1, - 1) on (a, b)')).toBeUndefined();
    expect(recordedTuple('(1, 1) on (a)')).toBeUndefined();
    expect(recordedTuple('(1, x) on (a, b)')).toBeUndefined();
    expect(recordedTuple('(1/0, 1) on (a, b)')).toBeUndefined();
    expect(recordedTuple('no tuple here')).toBeUndefined();
    expect(recordedTuple('(1, -1/2) on (hbar, b)')).toEqual({ names: ['ℏ', 'b'], values: [1, -0.5] });
  });

  it('control: a Lean def arm that differs from the covers tuple is reported', () => {
    const theorem = 'PhysJS.BuckinghamClassics.kss_exponent_unique';
    const text = leanText(theorem);
    expect(leanTuple(text, theorem)).toEqual([1, -1]);
    const mutated = text.replace(/(def kssExponent : Fin 2 → ℚ\n\s*\| 0 => 1\n\s*\| 1 => )-1/, '$1-2');
    expect(mutated).not.toBe(text);
    expect(leanTuple(mutated, theorem)).toEqual([1, -2]);
    expect(leanTuple(text, 'PhysJS.BuckinghamClassics.no_such_theorem')).toBeUndefined();
    const nonLiteral = text.replace(/(def kssExponent : Fin 2 → ℚ\n\s*\| 0 => 1\n\s*\| 1 => )-1/, '$1x');
    expect(nonLiteral).not.toBe(text);
    expect(leanTuple(nonLiteral, theorem)).toBeUndefined();
  });
});
