/**
 * `upt ground <quantityA> <quantityB>` — the epistemic-grounding ledger for a
 * single discovery candidate a≡b: which falsifiers passed, which abstained (gaps),
 * and the honest permanent ceiling (no mechanism test, no data test). Lets you
 * interrogate one candidate directly instead of scanning all of `upt discover`.
 *
 * It runs the same funnel as `upt discover` over the same `--source` graph and
 * `--anchor`/`--max-orders` options, so a pair `discover` printed can be
 * grounded by repeating those flags. A pair missing from the selected graph is
 * looked up in the others, and a hit is named: a candidate of another scope
 * must not be reported as though it never existed.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph, groundTruthAnchor, groundTruthLine, type SourceName } from '../graphs.js';
import { emitJson } from '../output.js';
import { UsageError, CliError } from '../errors.js';
import { parseDiscoveryOpts } from './_discovery-opts.js';

const FLAGS: FlagSpec[] = [
  sourceFlag('catalog', 'Which graph to read: catalog, canonical, or both. Use the same value as the discover run.'),
  {
    name: '--anchor',
    valueStyle: 'attached',
    repeatable: true,
    description: 'Override a numeric anchor as k=v or k=v,k2=v2.',
    defaultValue: 'mass=M_sun',
  },
  {
    name: '--max-orders',
    valueStyle: 'attached',
    description: 'Magnitude-clash threshold. A larger value keeps more pairs promising.',
    defaultValue: '3',
  },
  JSON_FLAG,
];

const HELP = `upt ground <quantityA> <quantityB> [--source=catalog|canonical|both]
                 [--anchor=k=v,...] [--max-orders=N] [--json]
        The epistemic-grounding ledger for one discovery candidate a≡b: which
        falsifiers PASSED, which ABSTAINED (gaps), and the honest ceiling — no
        mechanism test, no data test (permanent for a dimensional candidate;
        real mechanism/data live in \`upt confront\`).
        Pass the same --source (default catalog), --anchor and --max-orders
        as the \`upt discover\` run that listed the pair.`;

const EPISTEMICS =
  '(candidate grounding is a review surface; mechanism/data live in `upt confront`, not candidate space)';

const ALL_SOURCES: readonly SourceName[] = ['catalog', 'canonical', 'both'];

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, label, source } = resolveGraph(api, args.flags);
  const opts = parseDiscoveryOpts(api, args.flags);
  const [a, b] = args.positionals;
  if (!a || !b) {
    throw new UsageError('upt ground needs two quantity names (a b). See `upt help`.');
  }

  const pairs = (c: { a: string; b: string }) => (c.a === a && c.b === b) || (c.a === b && c.b === a);
  const cand = api.rankDiscoveries(graph, opts).find(pairs);
  if (!cand) {
    const elsewhere = ALL_SOURCES.filter((s) => s !== source).filter((s) => {
      const other = resolveGraph(api, new Map([['source', [s]]]));
      return api.rankDiscoveries(other.graph, opts).some(pairs);
    });
    const anchorFlags = (args.flags.get('anchor') ?? []).map((v) => ` --anchor=${v}`).join('');
    const ordersFlag = args.flags.has('max-orders') ? ` --max-orders=${args.flags.get('max-orders')!.at(-1)}` : '';
    throw new CliError(
      elsewhere.length > 0
        ? `upt ground: '${a}' ≟ '${b}' is not a candidate in the ${source} graph, but it is in ` +
            `${elsewhere.join(' and ')}: upt ground --source=${elsewhere[0]}${anchorFlags}${ordersFlag} ${a} ${b}`
        : `upt ground: no discovery candidate pairs '${a}' with '${b}' in any of ${ALL_SOURCES.join(', ')} — ` +
            'they may not share a dimension, or are already connected (not a cross-cluster coincidence).',
    );
  }

  const g = api.describeGrounding(cand);
  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'ground',
        source,
        anchor: { groundTruth: groundTruthAnchor(api, opts) },
        options: opts as Record<string, unknown>,
        result: { a: cand.a, b: cand.b, verdict: cand.verdict, grounding: g },
      },
      ctx.write,
    );
    return 0;
  }

  out(`\n● ${cand.a} ≟ ${cand.b}  [${cand.verdict}]  [source: ${label}]`);
  out(`  ${groundTruthLine(groundTruthAnchor(api, opts))}`);
  out(EPISTEMICS + '\n');
  out(`  passed:  ${g.passed.join(', ') || '—'}`);
  out(`  gaps:    ${g.gaps.join(', ') || '—'}`);
  out(
    `  ceiling: mechanism-tested ${g.mechanismTested} · data-tested ${g.dataTested} ` +
      '(permanent for a dimensional candidate — see `upt confront`)',
  );
  return 0;
}

export const command: Command = {
  name: 'ground',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Show which falsifiers ran on one discovery candidate, and which abstained.',
  example: 'upt ground temperature mass',
  group: 'discovery',
  run,
};

registerCommand(command);
