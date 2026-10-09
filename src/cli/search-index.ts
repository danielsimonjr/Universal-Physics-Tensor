/**
 * The word index behind `upt search`, shared with `upt explain`'s NOT COVERED answer (audit I5).
 *
 * It indexes every registry the CLI exposes by WORD: names, ids, symbols, genuine aliases
 * (`resolveQuantityName`) and catalog-bridge descriptions. An equal dimension is never a match: a
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
  | 'applied-case'
  | 'regime';

export const SEARCH_SECTIONS: readonly (readonly [SearchKind, string])[] = [
  ['catalog-bridge', 'catalog bridges'],
  ['canonical-equation', 'canonical equations'],
  ['atlas-model', 'atlas models'],
  ['atlas-bridge', 'atlas bridges'],
  ['quantity', 'quantities'],
  ['applied-case', 'applied cases'],
  ['regime', 'regimes'],
];

/** A searchable field: its label, its words, and the exact strings a short word may equal. */
interface Field {
  readonly label: string;
  readonly text: string;
  readonly exact?: readonly string[];
}

/**
 * A trailing parenthetical is a gloss, not part of the title.
 * `Reynolds analogy (Prandtl number 1)` is the title plus the gloss
 * `Prandtl number 1`. A parenthesis with no preceding space, such as `ν(z)`,
 * stays in the title.
 */
function titleAndGloss(label: string, text: string, exact?: readonly string[]): Field[] {
  const match = /^(.*?)\s+\(([^()]*)\)\s*$/.exec(text);
  const gloss = match?.[2]?.trim() ?? '';
  if (match === null || gloss.length === 0) {
    return [{ label, text, ...(exact === undefined ? {} : { exact }) }];
  }
  return [
    { label, text: match[1]!.trim(), ...(exact === undefined ? {} : { exact }) },
    { label: 'gloss', text: gloss },
  ];
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

/** A query word that matched only as a proper prefix of a longer indexed word. */
export interface PrefixMatch {
  readonly query: string;
  readonly word: string;
}

/** An entry that matched every query word, the fields it matched in, and the alias that resolved it, if one did. */
export interface SearchMatch {
  readonly entry: SearchEntry;
  readonly matchedIn: readonly string[];
  readonly alias?: string;
  /** Present when a query word is a proper prefix of the indexed word, not that word. */
  readonly prefixes?: readonly PrefixMatch[];
}

/**
 * Words `upt search` and the phrase matcher do not require of a field. A single letter is
 * not one: `a` and `b` are symbols (`truncation-coefficient-a`, the impact parameter), and
 * a word the query gave is either matched or reported, never dropped (Tom's review of #502).
 */
export const STOP_WORDS: ReadonlySet<string> = new Set(['of', 'the', 'and', 'for', 'in', 'an']);

/**
 * The wider list the NOT-COVERED suggestion drops from a failed `explain` name before it
 * searches: a name's function words (`not-a-quantity`, `rate-of-change`) are not what the
 * reader asked for. Only {@link searchNameWords} reads it.
 */
const SUGGESTION_STOP_WORDS: ReadonlySet<string> = new Set([...STOP_WORDS, 'a', 'not', 'is', 'to', 'by', 'on', 'at', 'with', 'from', 'or', 'as', 'no']);

/**
 * The kind of thing a name asks for. A suggestion may not drop one of these,
 * and it may not keep only these when the name also named a subject
 * (`debye-length` is not the word `length`, and it is not the word `debye`).
 * `equation` is not one of these: `schrodinger-equation` still searches `schrodinger`.
 */
const KIND_WORDS: ReadonlySet<string> = new Set([
  'length',
  'radius',
  'frequency',
  'speed',
  'energy',
  'number',
  'heat',
  'capacity',
]);

/**
 * A suggestion query is not an explicit search. One- and two-letter hyphen
 * fragments are symbols (`a`, `T`), and the fewest-match rule would pick
 * them over the real word. Explicit `queryWords` still accepts them.
 */
const MIN_SUGGESTION_TOKEN = 3;

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

/**
 * Drop a sentence that denies an identity. "Not the classical skin depth"
 * is not a claim about skin depth. "is a different equation" is not that
 * equation. A sentence that states the claim and also says "not an axiom"
 * stays, because it does not open with Not and it is not "a different" identity.
 */
function affirmativeSentences(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/^\s*not\b/i.test(sentence) && !/\bis a different\b/i.test(sentence))
    .join(' ');
}

/** The fields of `e` that `q` matches, or `null` when it matches none.
 *  `prefixOf` is set only when no field contains `q` as a whole word. */
function matchWord(q: string, e: SearchEntry): { labels: string[]; prefixOf?: string } | null {
  const short = q.length <= 2;
  const fq = fold(q);
  if (short) {
    const hit = e.fields.filter(
      (f) => (f.exact ?? []).includes(q) || (f.label === 'id' && words(f.text).includes(fq)),
    );
    return hit.length === 0 ? null : { labels: hit.map((f) => f.label) };
  }
  const labels: string[] = [];
  let exact = false;
  let prefixOf: string | undefined;
  for (const f of e.fields) {
    const ws = words(f.text);
    const exactHere = ws.includes(fq) || (f.exact ?? []).some((x) => fold(x) === fq);
    if (exactHere) {
      labels.push(f.label);
      exact = true;
      continue;
    }
    const pref = ws.find((w) => w.startsWith(fq) && w.length > fq.length);
    if (pref !== undefined) {
      labels.push(f.label);
      prefixOf ??= pref;
    }
  }
  if (labels.length === 0) return null;
  return exact ? { labels } : { labels, ...(prefixOf === undefined ? {} : { prefixOf }) };
}

/** Index every registry the CLI exposes, including applied cases. */
export function buildSearchIndex(api: CommandCtx['api']): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const fmt = api.format;

  for (const b of api.BRIDGE_EQUATIONS) {
    const ev = api.BRIDGE_EVALUATORS.get(b.id);
    const ref = ev === undefined ? api.catalogFormalRef(b.id) : undefined;
    const formulaRoute = ev === undefined && ref !== undefined;
    entries.push({
      kind: 'catalog-bridge',
      id: `be-${b.id}`,
      line: `be-${b.id} ${b.name} [${b.status}]`,
      command: ev !== undefined
        ? `upt evaluate be-${b.id} ${ev.inputKeys.map((k) => `${k}=…`).join(' ')}`
        : formulaRoute
          ? `upt atlas be-${b.id}`
          : `upt explain be-${b.id}`,
      commandLabel: ev !== undefined ? 'evaluate' : formulaRoute ? 'formula' : 'no evaluator; route',
      ...(ev !== undefined
        ? { note: `units: ${ev.parameters.map((p) => `${p.key} in ${p.unit || 'dimensionless'}`).join(', ')}; a value may carry its own unit` }
        : formulaRoute
          ? { note: ref!.covers }
          : {}),
      fields: [
        { label: 'id', text: `be ${b.id}`, exact: [`be-${b.id}`] },
        ...titleAndGloss('name', b.name),
        { label: 'description', text: affirmativeSentences(b.context ?? '') },
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
        ...titleAndGloss('name', c.name),
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
  for (const registration of api.domainRegimeRegistrations()) {
    const vacuous = registration.records.every((record) => record.regime.inequalities.length === 0);
    entries.push({
      kind: 'regime',
      id: registration.name,
      line: vacuous ? `${registration.name} — vacuous registration (no inequality)` : registration.name,
      command: `upt regime ${registration.name}`,
      commandLabel: 'inspect',
      fields: [{ label: 'name', text: registration.name, exact: [registration.name] }],
    });
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

/** True when `window` and `query` are the same words, order aside. */
function sameWords(window: readonly string[], query: readonly string[]): boolean {
  if (window.length !== query.length) return false;
  const a = [...window].sort();
  const b = [...query].sort();
  return a.every((w, i) => w === b[i]);
}

/**
 * A phrase is a contiguous run of a field's content words. Stop words in the
 * field are not part of the run, so "speed of sound" is the words speed, sound.
 * The query's order does not have to be the field's order.
 */
function phraseInField(text: string, query: readonly string[]): boolean {
  const field = words(text).filter((w) => !STOP_WORDS.has(w));
  const q = query.map(fold).filter((w) => !STOP_WORDS.has(w));
  if (q.length === 0 || field.length < q.length) return false;
  for (let i = 0; i + q.length <= field.length; i++) {
    if (sameWords(field.slice(i, i + q.length), q)) return true;
  }
  return false;
}

/** Every entry of `index` that EVERY word of `significant` matches, name and id matches first.
 *  One word matches as before, including a proper prefix. Two or more words match only as whole
 *  words. When one field contains two or more of them, those words have to sit together in that
 *  field; a field that scatters them does not count. Words that never share a non-gloss field
 *  still match, so "thermal" in a description and "noise" in a name still find Johnson–Nyquist.
 *  A gloss does not combine with another field. A query whose words are the gloss is labeled
 *  gloss. A query split across the title and the gloss matches nothing. */
export function matchEveryWord(
  api: CommandCtx['api'],
  index: readonly SearchEntry[],
  significant: readonly string[],
): SearchMatch[] {
  const quantityNames = new Set(index.filter((e) => e.kind === 'quantity').map((e) => e.id));
  const aliasTargets = new Map<string, string>();
  for (const q of significant) {
    const resolved = api.resolveQuantityName(q, quantityNames);
    if (resolved !== null && resolved !== q) aliasTargets.set(resolved, q);
  }

  const glued = significant.join('_');
  const matches: SearchMatch[] = [];
  for (const e of index) {
    if (glued.includes('_') && e.fields.some((f) => (f.exact ?? []).includes(glued))) {
      matches.push({ entry: e, matchedIn: ['alias'], alias: glued });
      continue;
    }
    if (significant.length > 1) {
      const folded = significant.map(fold).filter((w) => !STOP_WORDS.has(w));
      const gloss = e.fields.find((f) => f.label === 'gloss' && phraseInField(f.text, folded));
      if (gloss !== undefined) {
        matches.push({ entry: e, matchedIn: ['gloss'] });
        continue;
      }
      const labels: string[] = [];
      const covered = new Set<string>();
      for (const f of e.fields) {
        if (f.label === 'gloss') continue;
        const fieldWords = words(f.text).filter((w) => !STOP_WORDS.has(w));
        const present = folded.filter((q) => fieldWords.includes(q));
        if (present.length === 0) continue;
        // Scattered co-occurrence is not the phrase. "Reynolds" and "number"
        // both sit in "Reynolds analogy (Prandtl number 1)" and are not it.
        if (present.length >= 2 && !phraseInField(f.text, present)) continue;
        labels.push(f.label);
        for (const q of present) covered.add(q);
      }
      if (folded.some((q) => !covered.has(q))) continue;
      matches.push({ entry: e, matchedIn: labels });
      continue;
    }
    const alias = e.kind === 'quantity' ? aliasTargets.get(e.id) : undefined;
    const labels = new Set<string>();
    const prefixes: PrefixMatch[] = [];
    let all = true;
    for (const q of significant) {
      const hit = alias === q ? { labels: ['alias'] } : matchWord(q, e);
      if (hit === null) {
        all = false;
        break;
      }
      for (const l of hit.labels) labels.add(l);
      if (hit.prefixOf !== undefined) prefixes.push({ query: q, word: hit.prefixOf });
    }
    if (!all) continue;
    const order = e.fields.map((f) => f.label).concat('alias');
    matches.push({
      entry: e,
      matchedIn: order.filter((l) => labels.has(l)),
      ...(alias === undefined ? {} : { alias }),
      ...(prefixes.length === 0 ? {} : { prefixes }),
    });
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
 * common word `equation`). A set that drops a kind word (`length`, `number`, and the others in
 * `KIND_WORDS`) is not used, and neither is a set of only those words when the name also named a
 * subject. A token shorter than three letters is dropped: it is a symbol, and
 * `not-a-quantity-xyz` must not search `a`. Returns `null` when no word matches anything. At most
 * six words are tried.
 */
export function searchNameWords(
  api: CommandCtx['api'],
  name: string,
): { readonly words: readonly string[]; readonly matches: readonly SearchMatch[] } | null {
  const all = name
    .split(/[-_\s]+/)
    .filter((w) => w.length >= MIN_SUGGESTION_TOKEN && !SUGGESTION_STOP_WORDS.has(fold(w)))
    .slice(0, 6);
  if (all.length === 0) return null;
  const index = buildSearchIndex(api);
  let best: { words: string[]; matches: SearchMatch[] } | null = null;
  for (let mask = (1 << all.length) - 1; mask > 0; mask--) {
    const subset = all.filter((_, i) => (mask & (1 << i)) !== 0);
    if (best !== null && subset.length < best.words.length) continue;
    const dropped = all.filter((w) => !subset.includes(w));
    if (dropped.some((w) => KIND_WORDS.has(fold(w)))) continue;
    const askedForASubject = all.some((w) => !KIND_WORDS.has(fold(w)));
    if (askedForASubject && subset.every((w) => KIND_WORDS.has(fold(w)))) continue;
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
