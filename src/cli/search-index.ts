/**
 * The word index behind `upt search`, shared with `upt explain`'s NOT COVERED answer (audit I5).
 *
 * It indexes every registry the CLI exposes by WORD: names, ids, symbols, genuine aliases
 * (`resolveToCatalogName`) and catalog-bridge descriptions. An equal dimension is never a match: a
 * radius is not a wavelength, and angular frequency is not frequency, even where the two share a
 * dimension.
 *
 * A word of one or two letters is a symbol, not an English word: it matches a quantity symbol, an
 * alias or a whole id segment exactly, and never a stray letter inside a description.
 */
import type { CommandCtx } from './command.js';

/** The registry a search-index entry comes from. */
export type SearchKind =
  | 'catalog-bridge'
  | 'canonical-equation'
  | 'atlas-model'
  | 'atlas-bridge'
  | 'quantity'
  | 'applied-case';

export const SEARCH_SECTIONS: readonly (readonly [SearchKind, string])[] = [
  ['catalog-bridge', 'catalog bridges'],
  ['canonical-equation', 'canonical equations'],
  ['atlas-model', 'atlas models'],
  ['atlas-bridge', 'atlas bridges'],
  ['quantity', 'quantities'],
  ['applied-case', 'applied cases'],
];

/** A searchable field: its label, its words, and the exact strings a short word may equal. */
interface Field {
  readonly label: string;
  readonly text: string;
  readonly exact?: readonly string[];
}

/** One indexed record: its registry, its id, the line `upt search` prints, the command that shows it, and its searchable fields. */
export interface SearchEntry {
  readonly kind: SearchKind;
  readonly id: string;
  readonly line: string;
  readonly command: string;
  readonly commandLabel: string;
  readonly note?: string;
  readonly fields: readonly Field[];
}

/** An entry that matched every query word, the fields it matched in, and the alias that resolved it, if one did. */
export interface SearchMatch {
  readonly entry: SearchEntry;
  readonly matchedIn: readonly string[];
  readonly alias?: string;
}

export const STOP_WORDS: ReadonlySet<string> = new Set(['of', 'the', 'and', 'for', 'in', 'an']);

export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const WORD_BREAK = /[^\p{L}\p{N}]+/u;
const words = (s: string): string[] => fold(s).split(WORD_BREAK).filter((w) => w.length > 0);

/**
 * Query words from the positionals. A space inside one argument and a hyphen
 * are the same break the index uses, so `"radiation pressure"` and
 * `magnetic-field` are two words each. Case stays, so a one-letter symbol
 * such as `T` still matches that exact alias.
 * @internal
 */
export function queryWords(positionals: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of positionals) {
    for (const w of p.split(WORD_BREAK)) if (w.length > 0) out.push(w);
  }
  return out;
}

/** The fields of `e` that `q` matches, or `null` when it matches none. */
function matchWord(q: string, e: SearchEntry): string[] | null {
  const short = q.length <= 2;
  const fq = fold(q);
  const hit = e.fields.filter((f) =>
    short
      ? (f.exact ?? []).includes(q) || (f.label === 'id' && words(f.text).includes(fq))
      : words(f.text).some((w) => w.startsWith(fq)),
  );
  return hit.length === 0 ? null : hit.map((f) => f.label);
}

/** Index every registry the CLI exposes, including applied cases. */
export function buildSearchIndex(api: CommandCtx['api']): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const fmt = api.format;

  for (const b of api.BRIDGE_EQUATIONS) {
    const ev = api.BRIDGE_EVALUATORS.get(b.id);
    entries.push({
      kind: 'catalog-bridge',
      id: `be-${b.id}`,
      line: `be-${b.id} ${b.name} [${b.status}]`,
      command: ev === undefined ? `upt explain be-${b.id}` : `upt evaluate be-${b.id} ${ev.inputKeys.map((k) => `${k}=…`).join(' ')}`,
      commandLabel: ev === undefined ? 'no evaluator; route' : 'evaluate',
      ...(ev === undefined
        ? {}
        : { note: `units: ${ev.parameters.map((p) => `${p.key} in ${p.unit || 'dimensionless'}`).join(', ')}; a value may carry its own unit` }),
      fields: [
        { label: 'id', text: `be ${b.id}`, exact: [`be-${b.id}`] },
        { label: 'name', text: b.name },
        { label: 'description', text: b.context ?? '' },
      ],
    });
  }

  for (const c of api.CANONICAL_EQUATIONS) {
    const t = c.dimensional.target;
    const inputs = c.dimensional.governing.map((g) => `${g.name} ${fmt(g.dim)}`).join(', ');
    entries.push({
      kind: 'canonical-equation',
      id: c.id,
      line: `${c.id} ${c.name} — target ${t.name} ${fmt(t.dim)}; inputs: ${inputs || 'none'}`,
      command: `upt explain ${t.name} --source=canonical`,
      commandLabel: 'inspect',
      fields: [
        { label: 'id', text: c.id, exact: [c.id] },
        { label: 'name', text: c.name },
        { label: 'variables', text: [t.name, ...c.dimensional.governing.map((g) => g.name)].join(' ') },
      ],
    });
  }

  for (const f of api.ATLAS_FAMILIES) {
    for (const m of f.models) {
      entries.push({
        kind: 'atlas-model',
        id: m.id,
        line: `${m.id} [${f.family}]`,
        command: `upt regime ${f.family} · upt path ${m.id} <to-model>`,
        commandLabel: 'inspect',
        fields: [{ label: 'id', text: m.id, exact: [m.id] }],
      });
    }
    for (const b of f.bridges) {
      entries.push({
        kind: 'atlas-bridge',
        id: b.id,
        line: `${b.id} ${b.relation} [${f.family}]: ${b.premises.join(' + ')} → ${b.conclusion}`,
        command: `upt atlas ${b.id}`,
        commandLabel: 'inspect',
        fields: [
          { label: 'id', text: b.id, exact: [b.id] },
          { label: 'models', text: [...b.premises, b.conclusion].join(' ') },
        ],
      });
    }
  }

  // A quantity keeps every dimension it carries in every graph that names it,
  // so a name used with two dimensions shows both rather than one silently.
  const quantities = new Map<string, { symbols: Set<string>; dims: Set<string>; graphs: Set<string>; aliases: Set<string> }>();
  const addQ = (
    q: { name: string; symbol: string; dim: Parameters<typeof fmt>[0] },
    graph: string,
    aliases: readonly string[] = [],
  ): void => {
    const cur = quantities.get(q.name) ?? { symbols: new Set(), dims: new Set(), graphs: new Set(), aliases: new Set() };
    cur.symbols.add(q.symbol);
    cur.dims.add(fmt(q.dim));
    cur.graphs.add(graph);
    for (const a of aliases) cur.aliases.add(a);
    quantities.set(q.name, cur);
  };
  for (const [graph, edges] of [['catalog', api.CATALOG_GRAPH], ['canonical', api.CANONICAL_GRAPH]] as const) {
    for (const e of edges) {
      for (const s of e.sources) addQ(s, graph, e.aliases?.[s.name] ?? []);
      addQ(e.target, graph);
    }
  }
  for (const c of api.APPLIED_CASES.values()) {
    entries.push({
      kind: 'applied-case',
      id: c.id,
      line: `${c.id} ${c.title}`,
      command: `upt evaluate ${c.id}`,
      commandLabel: 'evaluate',
      fields: [
        { label: 'id', text: c.id, exact: [c.id] },
        { label: 'name', text: c.title },
      ],
    });
  }

  for (const [name, q] of quantities) {
    const graphs = [...q.graphs];
    entries.push({
      kind: 'quantity',
      id: name,
      line: `${name} ${[...q.dims].join(' / ')} — symbol ${[...q.symbols].join(', ')}; in: ${graphs.join(', ')}`,
      command: `upt explain ${name} --source=${graphs.length === 2 ? 'both' : graphs[0]}`,
      commandLabel: 'inspect',
      fields: [
        { label: 'name', text: name, exact: [name, ...q.aliases] },
        { label: 'symbol', text: [...q.symbols, ...q.aliases].join(' '), exact: [...q.symbols, ...q.aliases] },
      ],
    });
  }
  return entries;
}

/** Every entry of `index` that EVERY word of `significant` matches, name and id matches first. */
export function matchEveryWord(
  api: CommandCtx['api'],
  index: readonly SearchEntry[],
  significant: readonly string[],
): SearchMatch[] {
  const quantityNames = new Set(index.filter((e) => e.kind === 'quantity').map((e) => e.id));
  const aliasTargets = new Map<string, string>();
  for (const q of significant) {
    const resolved = api.resolveToCatalogName(q, quantityNames);
    if (resolved !== null && resolved !== q) aliasTargets.set(resolved, q);
  }

  const glued = significant.join('_');
  const matches: SearchMatch[] = [];
  for (const e of index) {
    if (glued.includes('_') && e.fields.some((f) => (f.exact ?? []).includes(glued))) {
      matches.push({ entry: e, matchedIn: ['alias'], alias: glued });
      continue;
    }
    const alias = e.kind === 'quantity' ? aliasTargets.get(e.id) : undefined;
    const labels = new Set<string>();
    let all = true;
    for (const q of significant) {
      const hit = alias === q ? ['alias'] : matchWord(q, e);
      if (hit === null) {
        all = false;
        break;
      }
      for (const l of hit) labels.add(l);
    }
    if (!all) continue;
    const order = e.fields.map((f) => f.label).concat('alias');
    matches.push({ entry: e, matchedIn: order.filter((l) => labels.has(l)), ...(alias === undefined ? {} : { alias }) });
  }
  // A match on a name or id reads before one found only in a description.
  const rank = (m: SearchMatch): number =>
    m.matchedIn.includes('id') || (m.matchedIn.includes('name') && !m.matchedIn.includes('description')) ? 0 : 1;
  return matches.sort((a, b) => rank(a) - rank(b));
}

/**
 * What `upt search` finds for the words of a name that is not a quantity (`schrodinger-equation`):
 * the name splits on `-`, `_` and spaces, stop words drop, and the words are searched together. When
 * no entry matches every word, the largest set of the words that some entry does match is used
 * instead, the one with the fewest matches when sets tie (so the rarer word `schrodinger` beats the
 * common word `equation`). Returns `null` when no word matches anything. At most six words are tried.
 */
export function searchNameWords(
  api: CommandCtx['api'],
  name: string,
): { readonly words: readonly string[]; readonly matches: readonly SearchMatch[] } | null {
  const all = name.split(/[-_\s]+/).filter((w) => w.length > 0 && !STOP_WORDS.has(fold(w))).slice(0, 6);
  if (all.length === 0) return null;
  const index = buildSearchIndex(api);
  let best: { words: string[]; matches: SearchMatch[] } | null = null;
  for (let mask = (1 << all.length) - 1; mask > 0; mask--) {
    const subset = all.filter((_, i) => (mask & (1 << i)) !== 0);
    if (best !== null && subset.length < best.words.length) continue;
    const matches = matchEveryWord(api, index, subset);
    if (matches.length === 0) continue;
    if (
      best === null ||
      subset.length > best.words.length ||
      (subset.length === best.words.length && matches.length < best.matches.length)
    ) {
      best = { words: subset, matches };
    }
  }
  return best;
}
