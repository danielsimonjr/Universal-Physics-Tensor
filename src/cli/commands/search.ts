/**
 * `upt search <word> ...` — find a law, model, bridge or quantity by the words
 * a physicist would use, and name the command that inspects it.
 *
 * Audit §14 I5. `explain schrodinger-equation` failed because the name was a
 * model, not a quantity, and its suggestions were edit-distance neighbours.
 * This command searches every registry the CLI exposes by WORD: names, ids,
 * symbols, genuine aliases (`resolveToCatalogName`) and catalog-bridge
 * descriptions. An equal dimension is never a match: a radius is not a
 * wavelength, and angular frequency is not frequency, even where the two share
 * a dimension.
 *
 * A word of one or two letters is a symbol, not an English word: it matches a
 * quantity symbol, an alias or a whole id segment exactly, and never a stray
 * letter inside a description.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { CliError, UsageError } from '../errors.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [{ name: '--json', valueStyle: 'none' }];

const HELP = `upt search <word> ...
        Find a catalog bridge, canonical equation, atlas model, atlas bridge
        or quantity by the words in its name, id, symbol, alias or bridge
        description, and print the command that inspects each match. Every
        word must match. An equal dimension is never a match (a radius is not
        a wavelength). A word of one or two letters matches a symbol or alias
        exactly. No match exits 1 and names the registries searched.
        e.g.  upt search Schrödinger
              upt search thermal noise`;

type Kind = 'catalog-bridge' | 'canonical-equation' | 'atlas-model' | 'atlas-bridge' | 'quantity';

const SECTIONS: readonly (readonly [Kind, string])[] = [
  ['catalog-bridge', 'catalog bridges'],
  ['canonical-equation', 'canonical equations'],
  ['atlas-model', 'atlas models'],
  ['atlas-bridge', 'atlas bridges'],
  ['quantity', 'quantities'],
];

/** A searchable field: its label, its words, and the exact strings a short word may equal. */
interface Field {
  readonly label: string;
  readonly text: string;
  readonly exact?: readonly string[];
}

interface Entry {
  readonly kind: Kind;
  readonly id: string;
  readonly line: string;
  readonly command: string;
  readonly commandLabel: string;
  readonly note?: string;
  readonly fields: readonly Field[];
  readonly aliasOf?: string;
}

const STOP_WORDS = new Set(['of', 'the', 'and', 'for', 'in', 'an']);
const PER_SECTION = 10;

const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const words = (s: string): string[] => fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 0);

/** The fields of `e` that `q` matches, or `null` when it matches none. */
function matchWord(q: string, e: Entry): string[] | null {
  const short = q.length <= 2;
  const fq = fold(q);
  const hit = e.fields.filter((f) =>
    short
      ? (f.exact ?? []).includes(q) || (f.label === 'id' && words(f.text).includes(fq))
      : words(f.text).some((w) => w.startsWith(fq)),
  );
  return hit.length === 0 ? null : hit.map((f) => f.label);
}

function buildIndex(api: CommandCtx['api']): Entry[] {
  const entries: Entry[] = [];
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
  const quantities = new Map<string, { symbols: Set<string>; dims: Set<string>; graphs: Set<string> }>();
  const addQ = (q: { name: string; symbol: string; dim: Parameters<typeof fmt>[0] }, graph: string): void => {
    const cur = quantities.get(q.name) ?? { symbols: new Set(), dims: new Set(), graphs: new Set() };
    cur.symbols.add(q.symbol);
    cur.dims.add(fmt(q.dim));
    cur.graphs.add(graph);
    quantities.set(q.name, cur);
  };
  for (const [graph, edges] of [['catalog', api.CATALOG_GRAPH], ['canonical', api.CANONICAL_GRAPH]] as const) {
    for (const e of edges) {
      for (const s of e.sources) addQ(s, graph);
      addQ(e.target, graph);
    }
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
        { label: 'name', text: name, exact: [name] },
        { label: 'symbol', text: [...q.symbols].join(' '), exact: [...q.symbols] },
      ],
    });
  }
  return entries;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const query = [...args.positionals];
  if (query.length === 0) throw new UsageError('upt search: give at least one word, e.g. `upt search thermal noise`');
  const index = buildIndex(api);
  const significant = query.length > 1 ? query.filter((q) => !STOP_WORDS.has(fold(q))) : query;
  if (significant.length === 0) throw new UsageError(`upt search: '${query.join(' ')}' has only stop words`);

  const quantityNames = new Set(index.filter((e) => e.kind === 'quantity').map((e) => e.id));
  const aliasTargets = new Map<string, string>();
  for (const q of significant) {
    const resolved = api.resolveToCatalogName(q, quantityNames);
    if (resolved !== null && resolved !== q) aliasTargets.set(resolved, q);
  }

  const matches: { entry: Entry; matchedIn: string[]; alias?: string }[] = [];
  for (const e of index) {
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
  const rank = (m: (typeof matches)[number]): number =>
    m.matchedIn.includes('id') || (m.matchedIn.includes('name') && !m.matchedIn.includes('description')) ? 0 : 1;
  matches.sort((a, b) => rank(a) - rank(b));

  const counts = SECTIONS.map(([k, title]) => `${index.filter((e) => e.kind === k).length} ${title}`).join(', ');
  const scope = `searched ${counts}; this registry only`;

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'search',
        epistemics:
          'Matched by the words of names, ids, symbols, genuine aliases and catalog-bridge descriptions. ' +
          'An equal dimension is never a match. No match means none in these registries, not none in physics.',
        options: { query },
        result: {
          scope,
          matches: matches.map((m) => ({
            kind: m.entry.kind,
            id: m.entry.id,
            summary: m.entry.line,
            matchedIn: m.matchedIn,
            ...(m.alias === undefined ? {} : { alias: m.alias }),
            command: m.entry.command,
          })),
        },
      },
      ctx.write,
    );
    return matches.length === 0 ? 1 : 0;
  }

  if (matches.length === 0) {
    throw new CliError(`upt search: no entry matches every word of '${query.join(' ')}' — ${scope}`);
  }
  out(`\nupt search ${query.join(' ')} — ${matches.length} match(es); every word matched`);
  out('  matched by words, symbols and genuine aliases; an equal dimension is never a match (a radius is not a wavelength)');
  for (const [kind, title] of SECTIONS) {
    const inKind = matches.filter((m) => m.entry.kind === kind);
    if (inKind.length === 0) continue;
    out(`\n${title}:`);
    for (const m of inKind.slice(0, PER_SECTION)) {
      out(`  ${m.entry.line}${m.alias === undefined ? '' : ` (alias ${m.alias})`}  [words in: ${m.matchedIn.join(', ')}]`);
      out(`      ${m.entry.commandLabel}: ${m.entry.command}${m.entry.note === undefined ? '' : ` (${m.entry.note})`}`);
    }
    if (inKind.length > PER_SECTION) out(`  … and ${inKind.length - PER_SECTION} more (--json lists every match)`);
  }
  out(`\n${scope}.`);
  return 0;
}

export const command: Command = { name: 'search', aliases: [], flags: FLAGS, help: HELP, run };
registerCommand(command);
