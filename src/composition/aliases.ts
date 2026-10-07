/**
 * One record of what a typed name means.
 *
 * An evaluator key (`I_W_per_m2`) and the graph source (`poynting-flux`)
 * are the edge's `aliases`. A shared hyphen token is not nearness.
 * Quantity synonyms, comparison targets, and structural-hash renames
 * live in {@link NAME_TABLE}. Spelling resolution is `resolveQuantityName`.
 *
 * @module composition/aliases
 */
import type { BridgeEdge } from './edge.js';
import {
  DIMENSION_RENAMES,
  SYNONYM_GROUPS,
  synonymDisagreement,
  type DimensionRename,
} from '../dimensional/formula-names.js';
import { foldName } from '../dimensional/quantity-registry.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';

/**
 * The one name table.
 *
 * Synonym groups are {@link SYNONYM_GROUPS}: the same array, not a copy.
 * A comparison target is a name an entry answers to besides its frozen
 * target word, projected from each entry's `targetAliases`. `speed` answers for the sound-speed equation in a comparison
 * and is not a synonym of `sound-speed`. A dimension rename applies only
 * for that dimension, so a time coordinate named `T` stays `T`.
 * Spelling resolution is `resolveQuantityName`, not a second table.
 */
export const NAME_TABLE: {
  readonly synonyms: readonly (readonly string[])[];
  readonly canonicalTargets: Readonly<Record<string, readonly string[]>>;
  readonly dimensionRenames: readonly DimensionRename[];
} = {
  synonyms: SYNONYM_GROUPS,
  canonicalTargets: Object.fromEntries(
    CANONICAL_EQUATIONS.flatMap((e) => (e.targetAliases === undefined ? [] : [[e.id, e.targetAliases]])),
  ),

  dimensionRenames: DIMENSION_RENAMES,
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

const fold = (s: string): string => foldName(s.toLowerCase());

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
    for (const group of NAME_TABLE.synonyms) {
      const hit = group.filter((n) => out.includes(n));
      if (hit.length === 0) continue;
      const extra = group.filter((n) => graphNames.has(n) && !out.includes(n));
      if (extra.length > 0) out = [...out, ...extra];
    }
    return out;
  }
  const out: Record<string, number> = { ...known };
  let added = false;
  for (const group of NAME_TABLE.synonyms) {
    const hit = group.filter((n) => Object.hasOwn(known, n));
    if (hit.length !== 1) continue;
    const source = hit[0]!;
    for (const n of group) {
      if (graphNames.has(n) && !Object.hasOwn(out, n)) {
        out[n] = known[source]!;
        added = true;
      }
    }
  }
  return added ? out : known;
}

/**
 * One name per synonym group in a governing set.
 *
 * Copying the value onto the other name lets either spelling evaluate.
 * Both names are the same quantity, so Buckingham must see one of them.
 * The name that is a source of the target stays. The same number under
 * both spellings is that one input. Two different numbers are
 * {@link SynonymDisagreementError}: the report does not pick one.
 */
export function collapseSynonymGovernors(
  names: readonly string[],
  sourceNames: ReadonlySet<string>,
  values: Readonly<Record<string, number>> | null,
): string[] {
  const drop = new Set<string>();
  for (const group of NAME_TABLE.synonyms) {
    const present = group.filter((n) => names.includes(n));
    if (present.length < 2) continue;
    if (values !== null) {
      if (present.some((n) => values[n] === undefined)) continue;
      const disagreement = synonymDisagreement(present, values);
      if (disagreement !== null) throw disagreement;
    }
    const sources = present.filter((n) => sourceNames.has(n));
    const keep = sources[0] ?? present[0]!;
    for (const n of present) if (n !== keep) drop.add(n);
  }
  return names.filter((n) => !drop.has(n));
}
