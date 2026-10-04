/**
 * One record of what a typed name means on a graph edge.
 *
 * An evaluator key (`I_W_per_m2`) and the graph source (`poynting-flux`)
 * are the edge's `aliases`. A shared hyphen token is not nearness.
 *
 * @module composition/aliases
 */
import type { BridgeEdge } from './edge.js';

/** Names that are one quantity. A value under either is available under the other. */
const QUANTITY_SYNONYMS: readonly (readonly [string, string])[] = [
  ['magnetic-field', 'magnetic-flux-density'],
];

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

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length]!;
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
    for (const pair of QUANTITY_SYNONYMS) {
      const hit = pair.filter((n) => out.includes(n));
      if (hit.length === 0) continue;
      const extra = pair.filter((n) => graphNames.has(n) && !out.includes(n));
      if (extra.length > 0) out = [...out, ...extra];
    }
    return out;
  }
  const out: Record<string, number> = { ...known };
  let added = false;
  for (const pair of QUANTITY_SYNONYMS) {
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
  for (const pair of QUANTITY_SYNONYMS) {
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
