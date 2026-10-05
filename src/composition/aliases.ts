/**
 * One record of what a typed name means.
 *
 * An evaluator key (`I_W_per_m2`) and the graph source (`poynting-flux`)
 * are the edge's `aliases`. A shared hyphen token is not nearness.
 * Quantity synonyms, formula spellings, comparison targets, and
 * structural-hash renames live in {@link NAME_TABLE}.
 *
 * @module composition/aliases
 */
import type { BridgeEdge } from './edge.js';
import { MASS, TEMPERATURE, type Dimension } from '../dimensional/types.js';

/** A short symbol is this quantity only when it carries this dimension. */
export interface DimensionRename {
  readonly symbol: string;
  readonly dimension: Dimension;
  readonly name: string;
}

/**
 * The one name table.
 *
 * A synonym pair is one quantity. A formula spelling resolves when the long
 * name is in the catalog. A comparison target is a name an entry answers to
 * besides its frozen target word. `speed` answers for the sound-speed
 * equation in a comparison and is not a synonym of `sound-speed`. A dimension
 * rename applies only for that dimension, so a time coordinate named `T`
 * stays `T`.
 */
export const NAME_TABLE: {
  readonly synonyms: readonly (readonly [string, string])[];
  readonly formulaSpellings: Readonly<Record<string, string>>;
  readonly canonicalTargets: Readonly<Record<string, readonly string[]>>;
  readonly dimensionRenames: readonly DimensionRename[];
} = {
  synonyms: [
    ['magnetic-field', 'magnetic-flux-density'],
    ['landauer-erasure-energy', 'erasure-energy'],
  ],
  formulaSpellings: {
    T: 'temperature',
  },
  canonicalTargets: {
    'CE-schwarzschild-radius': ['schwarzschild-radius'],
    // The equation's quantity is sound-speed. A formula written for speed, with
    // pressure and density, is still this law. speed is not a synonym of sound-speed.
    'CE-sound-speed': ['speed'],
    // The L0 id keeps the catalog name. The reduced name is the same entry.
    // The non-reduced entry also answers to that catalog name when the formula uses h.
    'CE-compton-wavelength': ['reduced-compton-wavelength'],
    'CE-compton-wavelength-full': ['compton-wavelength'],
  },
  dimensionRenames: [
    { symbol: 'T', dimension: TEMPERATURE, name: 'temperature' },
    { symbol: 'M', dimension: MASS, name: 'mass' },
    { symbol: 'm_1', dimension: MASS, name: 'mass' },
    { symbol: 'm_2', dimension: MASS, name: 'secondary-mass' },
  ],
};

/** Alias key → source name, for edges whose target is `target`. Ambiguous keys are omitted. */
export function aliasesForTarget(
  edges: readonly BridgeEdge[],
  target: string,
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const e of edges) {
    if (e.target.name !== target || e.aliases === undefined) continue;
    for (const [quantity, keys] of Object.entries(e.aliases)) {
      for (const key of keys) {
        const prev = map.get(key);
        if (prev !== undefined && prev !== quantity) ambiguous.add(key);
        else map.set(key, quantity);
      }
    }
  }
  for (const key of ambiguous) map.delete(key);
  return map;
}

/**
 * The graph name `key` means, or null when it is neither a graph name nor
 * an alias of one on this target.
 */
export function rewriteInputKey(
  key: string,
  aliases: ReadonlyMap<string, string>,
  graphNames: ReadonlySet<string>,
): string | null {
  if (graphNames.has(key)) return key;
  const hyphen = key.replace(/_/g, '-');
  if (graphNames.has(hyphen)) return hyphen;
  const hit = aliases.get(key) ?? aliases.get(hyphen);
  return hit !== undefined && graphNames.has(hit) ? hit : null;
}

/**
 * Optimal string alignment distance. An adjacent transposition is one edit,
 * so `lenght` and `length` are distance 1. Resolution accepts distance ≤ 1.
 * A longer cutoff, and containment, stay a suggestion rank.
 */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j]!, prev2[j - 2]! + 1);
      }
    }
    [prev2, prev, curr] = [prev, curr, prev2];
  }
  return prev[n]!;
}

/**
 * The catalog member of a synonym pair `name` belongs to, or null when
 * `name` is not one of a pair the catalog holds.
 */
export function synonymInCatalog(name: string, catalogNames: ReadonlySet<string>): string | null {
  const folded = name.replace(/_/g, '-');
  for (const pair of NAME_TABLE.synonyms) {
    if (!pair.includes(name) && !pair.includes(folded)) continue;
    if (catalogNames.has(name)) return name;
    if (catalogNames.has(folded)) return folded;
    const other = pair.find((n) => catalogNames.has(n));
    if (other !== undefined) return other;
  }
  return null;
}

const fold = (s: string): string => s.toLowerCase().replace(/_/g, '-');

/**
 * Catalog names within one edit of `query`. A shared token such as
 * `length` is not an edit. Containment is not nearness.
 */
export function nearQuantityNames(query: string, names: Iterable<string>): string[] {
  const needle = fold(query);
  const hits: string[] = [];
  for (const name of names) {
    if (editDistance(needle, fold(name)) <= 1) hits.push(name);
  }
  hits.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return hits;
}

/**
 * Copy a synonym onto the other name when the graph has it and the user
 * named exactly one of the pair. Two explicit values stay as given.
 */
export function shareSynonyms(
  known: string[] | Record<string, number>,
  graphNames: ReadonlySet<string>,
): string[] | Record<string, number> {
  if (Array.isArray(known)) {
    let out = known;
    for (const pair of NAME_TABLE.synonyms) {
      const hit = pair.filter((n) => out.includes(n));
      if (hit.length === 0) continue;
      const extra = pair.filter((n) => graphNames.has(n) && !out.includes(n));
      if (extra.length > 0) out = [...out, ...extra];
    }
    return out;
  }
  const out: Record<string, number> = { ...known };
  let added = false;
  for (const pair of NAME_TABLE.synonyms) {
    const hit = pair.filter((n) => Object.hasOwn(known, n));
    if (hit.length !== 1) continue;
    const source = hit[0]!;
    for (const n of pair) {
      if (graphNames.has(n) && !Object.hasOwn(out, n)) {
        out[n] = known[source]!;
        added = true;
      }
    }
  }
  return added ? out : known;
}

/**
 * One name per synonym pair in a governing set.
 *
 * Copying the value onto the other name lets either spelling evaluate.
 * Both names are the same quantity, so Buckingham must see one of them.
 * The name that is a source of the target stays. Two different values
 * stay two inputs.
 */
export function collapseSynonymGovernors(
  names: readonly string[],
  sourceNames: ReadonlySet<string>,
  values: Readonly<Record<string, number>> | null,
): string[] {
  const drop = new Set<string>();
  for (const pair of NAME_TABLE.synonyms) {
    const present = pair.filter((n) => names.includes(n));
    if (present.length < 2) continue;
    if (values !== null) {
      const nums = present.map((n) => values[n]);
      if (nums.some((n) => n === undefined)) continue;
      const first = nums[0]!;
      if (nums.some((n) => n !== first)) continue;
    }
    const sources = present.filter((n) => sourceNames.has(n));
    const keep = sources[0] ?? present[0]!;
    for (const n of present) if (n !== keep) drop.add(n);
  }
  return names.filter((n) => !drop.has(n));
}
