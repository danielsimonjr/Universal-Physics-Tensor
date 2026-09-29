/**
 * `upt explain` — explain how the graph determines a quantity: the
 * identifiability verdict, recovered value, derivation chains, and whether
 * the inputs are dimensionally sufficient. Transposed verbatim from
 * bin/upt.mjs's `explain()` + `parseKnown()` (lines 183-235), plus
 * `--source` (the old CLI's module-level `GRAPH` was always the catalog
 * graph) and `--json`.
 *
 * `parseKnown`'s two-mode positional contract (bare names XOR name=value,
 * never mixed) and its malformed-input rejections are pinned by
 * `tests/cli/upt-explain-inputs.test.ts` against the old bin — ported here
 * unchanged, with `process.exit(2)` sites converted to `UsageError` (same
 * message text; `main.ts`'s catch maps it to exit 2).
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';
import { UsageError, CliError } from '../errors.js';
import { searchNameWords } from '../search-index.js';
import { readBinding } from '../../numerical/binding-value.js';

/** How many `upt search` hits a NOT COVERED answer lists before "… and N more". */
const SEARCH_HITS_SHOWN = 5;

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt explain <quantity> [name=value | name] ...
            [--source=catalog|canonical|both] [--json]
        Explain how the graph determines a quantity: the identifiability
        verdict, recovered value, derivation chains, and whether the inputs
        are dimensionally sufficient. A name that is not a quantity of the
        graph is reported NOT COVERED, with near names and what \`upt search\`
        finds for its words, and exits 1. --source picks the graph (default
        catalog); the result names the source it used.
        A value is a number, a unit (mass=1Msun) or a constant expression
        (mass=1*M_sun). A bare number is already in the quantity's unit.
        e.g.  upt explain hawking-temperature mass=1.989e30`;

/**
 * Two modes, never mixed: bare names (structural analysis) OR name=value
 * (adds value recovery). Malformed inputs are rejected with a `UsageError`
 * rather than silently coerced — `mass=abc`→dropped, `mass=`→0,
 * `mass=1e500`→∞, and a bare name alongside a valued one were all silent
 * wrong-physics footguns.
 */
function parseKnown(args: readonly string[]): string[] | Record<string, number> {
  const valued = args.filter((a) => a.includes('='));
  if (valued.length === 0) return [...args]; // names mode

  if (valued.length !== args.length) {
    const bare = args.filter((a) => !a.includes('=')).join(', ');
    throw new UsageError(
      `upt: cannot mix bare names (${bare}) with name=value inputs. `
        + 'Use all names (structural) or all name=value (with recovery). See `upt help`.'
    );
  }

  const values: Record<string, number> = {};
  for (const a of args) {
    const eq = a.indexOf('=');
    const name = a.slice(0, eq);
    const raw = a.slice(eq + 1);
    let num: number;
    try {
      num = readBinding(raw).value;
    } catch {
      num = Number.NaN;
    }
    if (raw === '' || !Number.isFinite(num)) {
      throw new UsageError(`upt: '${a}' is not a finite number. Expected ${name}=<number>. See \`upt help\`.`);
    }
    values[name] = num;
  }
  return values;
}

/**
 * A bridge id (`be-NN`) is a graph EDGE, not a quantity NODE — `explain`
 * derives quantities, so it can never resolve a bridge id and would emit a bare
 * "no derivation path". Recognise a catalog bridge id and redirect helpfully,
 * tailored by grounding tier (closed-form evaluator vs graph-computable,
 * data-confronted or not). Returns `null` for non-bridge targets (fall through
 * to the normal graph explain).
 */
function bridgeRedirect(
  api: CommandCtx['api'],
  target: string,
): { id: number; tier: string; hasGraphEdge: boolean; hasDataConfrontation: boolean; hint: string } | null {
  const m = /^be-(\d+)$/i.exec(target);
  if (!m) return null;
  const id = Number(m[1]);
  const b = api.auditCoverage().bridges.find((x) => x.id === id);
  if (!b) return null;

  let hint = `${target} is a bridge equation (a relation between quantities), not a graph quantity — \`explain\` derives quantities from the composition graph.`;
  hint += b.hasGraphEdge
    ? ` Its quantities appear in \`upt map\`; explain one of them to see its derivations.`
    : ` It is a closed-form evaluator bridge (no composition-graph edge), evaluated directly rather than through the graph.`;
  hint += b.hasDataConfrontation
    ? ` See \`upt confront ${target}\` for its real-data confrontation.`
    : ` It has no committed data confrontation (see \`upt coverage\`).`;
  return {
    id,
    tier: b.tier,
    hasGraphEdge: b.hasGraphEdge,
    hasDataConfrontation: b.hasDataConfrontation,
    hint,
  };
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;

  const [target, ...rest] = args.positionals;
  if (!target) {
    throw new UsageError('upt explain needs a quantity name. See `upt help`.');
  }

  // A bridge id is an edge, not a quantity — redirect before touching the graph.
  const redirect = bridgeRedirect(api, target);
  if (redirect) {
    // A bridge id names a CATALOG bridge whatever --source says; say so rather than print a source it did not use.
    if (args.flags.has('json')) {
      emitJson({ command: 'explain', source: 'catalog', result: { kind: 'bridge-redirect', ...redirect } }, ctx.write);
      return 0;
    }
    out(`\n● ${target}  [source: catalog bridge registry; a bridge id names a catalog bridge whatever --source says]`);
    out(`  ${redirect.hint}`);
    return 0;
  }

  const { graph, label, source } = resolveGraph(api, args.flags);
  // A name that is not a quantity of this graph is NOT COVERED (persona finding
  // C4). It used to get the same "no derivation path" answer as a real quantity
  // the inputs cannot reach, and exit 0. Underscores resolve like hyphens.
  const names = new Set(graph.flatMap((e) => [e.target.name, ...e.sources.map((s) => s.name)]));
  const resolvedTarget = api.resolveToCatalogName(target, names);
  if (resolvedTarget === null) {
    const near = api.suggestQuantities(target, names, 5);
    // Audit I5: a law or model name (`schrodinger-equation`) is not a quantity; name what
    // `upt search` finds for its words, beside the near quantity names.
    const found = searchNameWords(api, target);
    const shown = found?.matches.slice(0, SEARCH_HITS_SHOWN) ?? [];
    const searchLine =
      found === null
        ? ''
        : `\n  \`upt search ${found.words.join(' ')}\` finds ${found.matches.length}:` +
          shown.map((m) => `\n    ${m.entry.id} (${m.entry.kind.replace('-', ' ')}) — ${m.entry.command}`).join('') +
          (found.matches.length > shown.length ? `\n    … and ${found.matches.length - shown.length} more` : '');
    throw new CliError(
      `upt explain: '${target}' is not a quantity in the ${source} graph: NOT COVERED.` +
        (near.length > 0
          ? ` did you mean: ${near.join(', ')}?`
          : ' `upt canonical` and `upt map` list the vocabulary.') +
        searchLine,
    );
  }
  const known = parseKnown(rest);
  const x = api.explainQuantity(graph, resolvedTarget, known);

  if (args.flags.has('json')) {
    emitJson({ command: 'explain', source, result: x }, ctx.write);
    return 0;
  }

  out(`\n● ${target}  [source: ${label}]`);
  out(`  ${x.summary}`);
  if (x.derivations.length) {
    out('  derivations:');
    for (const d of x.derivations) {
      const val = d.value !== undefined ? ` = ${d.value.toExponential(4)}` : '';
      const chain =
        d.leafInputs.join(',') !== d.sources.join(',') ? `  [from leaves: ${d.leafInputs.join(', ')}]` : '';
      out(`    - ${d.edge} (${d.label})${val}${chain}`);
      if (d.dimensionalForm) out(`        ${d.dimensionalForm.formula}`);
    }
  }
  if (x.blockingFrontier.length) {
    out(`  to determine it, also supply: ${x.blockingFrontier.join(', ')}`);
  }
  return 0;
}

export const command: Command = {
  name: 'explain',
  aliases: [],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
