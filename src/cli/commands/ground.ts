/**
 * `upt ground <quantityA> <quantityB>` — the epistemic-grounding ledger for a
 * single discovery candidate a≡b: which falsifiers passed, which abstained (gaps),
 * and the honest permanent ceiling (no mechanism test, no data test). Lets you
 * interrogate one candidate directly instead of scanning all of `upt discover`.
 *
 * It uses the same proposal and vetting rules as `upt discover` for the requested pair,
 * with the same `--source` graph and `--anchor`/`--max-orders` options, so a pair can be
 * grounded by repeating those flags. A pair missing from the selected graph is
 * looked up in the others, and a hit is named: a candidate of another scope
 * must not be reported as though it never existed.
 */
import { shellQuote, type FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph, groundTruthAnchor, groundTruthLine, type SourceName } from '../graphs.js';
import { emitJson } from '../output.js';
import { UsageError, CliError } from '../errors.js';
import { formatSubstitution, parseDiscoveryOpts } from './_discovery-opts.js';
import { DISCOVER_MAX_ORDERS_DEFAULT } from '../library-defaults.js';

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
    defaultValue: DISCOVER_MAX_ORDERS_DEFAULT,
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
        as the \`upt discover\` run that listed the pair.
        Includes downstream substitutions at representative operating points,
        with their inputs, outcomes and any failed conditions. For an encoded
        scoped relation, shows the equality condition and source equations.`;

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

  // The proposer folds registered identifications before publishing endpoint names.
  // Ground accepts both those emitted names and the raw names on the same graph.
  const canonicalize = api.quantityCanonicalizer();
  const scopes = ALL_SOURCES.map((s) => {
    const edges = s === source ? graph : resolveGraph(api, new Map([['source', [s]]])).graph;
    const rawNames = edges.flatMap(({ target, sources }) => [target.name, ...sources.map(({ name }) => name)]);
    return { source: s, graph: edges, rawNames, names: new Set(rawNames.map(canonicalize)) };
  });
  const vocabulary = new Set(scopes.flatMap(({ rawNames, names }) => [...rawNames, ...names]));
  const resolveEndpoint = (name: string): string => {
    const resolved = api.resolveQuantityName(name, vocabulary);
    if (resolved === null) throw new CliError(`upt ground: '${name}' is not a quantity of any graph (${ALL_SOURCES.join(', ')})`);
    return canonicalize(resolved);
  };
  const keyA = resolveEndpoint(a);
  const keyB = resolveEndpoint(b);
  const scopedRelations = api.scopedRelations(graph, [keyA, keyB]);
  if (scopedRelations.length > 0) {
    if (args.flags.has('json')) {
      emitJson({
        command: 'ground',
        source,
        anchor: { groundTruth: groundTruthAnchor(api, opts) },
        options: { ...opts },
        result: { a: keyA, b: keyB, candidate: null, scopedRelations },
      }, ctx.write);
    } else {
      out(`\n● ${keyA} ≟ ${keyB}  [scoped relation]  [source: ${label}]`);
      for (const relation of scopedRelations) {
        out(`  ${relation.a} / ${relation.b} = ${relation.ratio}`);
        out(`  equal when ${relation.equalityWhen} (${relation.sourceEquations.join(', ')})`);
        for (const assumption of relation.assumptions) out(`  ${assumption}`);
      }
    }
    return 0;
  }
  const matches = (c: { a: string; b: string }) =>
    (c.a === keyA && c.b === keyB) || (c.a === keyB && c.b === keyA);
  const proposalIn = (scope: (typeof scopes)[number]) =>
    scope.names.has(keyA) && scope.names.has(keyB) ? api.proposeLinkCandidates(scope.graph).find(matches) : undefined;
  const proposal = proposalIn(scopes.find((s) => s.source === source)!);
  const cand = proposal && api.vetLinkCandidate(graph, proposal, { ...opts, includeSubstitutions: true });
  if (!cand) {
    const elsewhere = scopes.filter((s) => s.source !== source && proposalIn(s)).map((s) => s.source);
    let sentence = `no discovery candidate pairs '${a}' with '${b}' in any of ${ALL_SOURCES.join(', ')} — ` +
      'they may not share a dimension, or are already connected (not a cross-cluster coincidence).';
    const scopedElsewhere = scopes.filter((s) =>
      s.source !== source && api.scopedRelations(s.graph, [keyA, keyB]).length > 0,
    ).map((s) => s.source);
    if (elsewhere.length > 0 || scopedElsewhere.length > 0) {
      const availability = [
        ...(elsewhere.length > 0 ? [`a candidate in ${elsewhere.join(' and ')}`] : []),
        ...(scopedElsewhere.length > 0 ? [`a scoped relation in ${scopedElsewhere.join(' and ')}`] : []),
      ];
      const where = scopedElsewhere.length > 0 ? availability.join(' or ') : `in ${elsewhere.join(' and ')}`;
      sentence = `'${a}' ≟ '${b}' is not a candidate in the ${source} graph, but it is ${where}`;
      const retry = [...elsewhere, ...scopedElsewhere].find((s) => {
        if (opts.groundTruth === undefined) return true;
        try {
          parseDiscoveryOpts(api, new Map([...args.flags, ['source', [s]]]));
          return true;
        } catch (error) {
          if (!(error instanceof CliError)) throw error;
          return false;
        }
      });
      if (retry === undefined) {
        sentence += '. Choose an anchor available in the alternate graph.';
      } else {
        const anchors = (args.flags.get('anchor') ?? []).map((v) => `--anchor=${v}`);
        const maxOrders = args.flags.get('max-orders')?.at(-1);
        const command = ['upt', 'ground', `--source=${retry}`, ...anchors,
          ...(maxOrders === undefined ? [] : [`--max-orders=${maxOrders}`]), a, b];
        sentence += `: ${command.map(shellQuote).join(' ')}`;
      }
    }
    if (args.flags.has('json')) {
      emitJson(
        {
          command: 'ground',
          source,
          anchor: { groundTruth: groundTruthAnchor(api, opts) },
          options: { ...opts },
          result: { a, b, candidate: null, searched: [...ALL_SOURCES], elsewhere,
            ...(scopedElsewhere.length > 0 ? { scopedElsewhere } : {}), note: sentence },
        },
        ctx.write,
      );
      return 0;
    }
    out(`\n● ${a} ≟ ${b}  [no candidate]  [source: ${label}]`);
    out(`  ${sentence}`);
    return 0;
  }

  const consequence = api.annotateConsequences([cand])[0]?.consequence;
  const g = api.describeGrounding(cand, consequence?.signal);
  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'ground',
        source,
        anchor: { groundTruth: groundTruthAnchor(api, opts) },
        options: { ...opts },
        result: {
          a: cand.a, b: cand.b, verdict: cand.verdict, grounding: g,
          ...(consequence === undefined ? {} : { consequence }),
          magnitudeDerived: cand.magnitudeDerived ?? [], substitutions: cand.substitutions ?? [],
        },
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
  for (const check of cand.substitutions ?? []) out(`  ${formatSubstitution(check)}`);
  // A magnitude-clash row's grounding states no magnitude line, so where a magnitude came from its
  // own equation is said here, for every verdict.
  if ((cand.magnitudeDerived ?? []).length > 0) {
    out(`  magnitude: ${cand.magnitudeDerived!.join(', ')} from its own equation (the sourced table and the constants, not the anchor)`);
  }
  out(
    `  ceiling: mechanism-tested ${g.mechanismTested} · data-tested ${g.dataTested} ` +
      '(permanent for a dimensional candidate — see `upt confront`)',
  );
  return 0;
}

export const command: Command = {
  name: 'ground',
  aliases: [],
  positionals: { max: 2 },
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Show which falsifiers ran on one discovery candidate, and which abstained.',
  example: 'upt ground landauer-erasure-energy gap-energy',
  group: 'discovery',
  run,
};

registerCommand(command);
