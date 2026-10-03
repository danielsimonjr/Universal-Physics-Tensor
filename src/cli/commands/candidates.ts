/**
 * `upt candidates` — propose candidate cross-cluster links (quantities of the
 * same dimension in different clusters) for physicist review. Transposed
 * verbatim from bin/upt.mjs's `candidatesCmd()` (lines 548-564), which
 * already resolved `--source`; adds `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph, coreAnchor, coreLine } from '../graphs.js';
import { emitJson } from '../output.js';
import { publishedUrl } from '../published-url.js';

const FLAGS: FlagSpec[] = [
  sourceFlag('catalog', 'Which graph to read: catalog, canonical, or both.'),
  JSON_FLAG,
];

const HELP = `upt candidates [--source=catalog|canonical|both]
        Propose candidate cross-cluster links (quantities of the same
        dimension in different clusters) for PHYSICIST REVIEW — a
        coincidence-heavy surface, not discovered bridges.`;

const EPISTEMICS =
  '⚠ a coincidence-heavy REVIEW SURFACE, NOT discovered bridges. Same dimension is a\n' +
  '  weak signal; each needs a physicist to accept or (far more often) reject.';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, label, source } = resolveGraph(api, args.flags);
  const cands = api.proposeLinkCandidates(graph);

  if (args.flags.has('json')) {
    emitJson({ command: 'candidates', source, anchor: { core: coreAnchor(graph) }, epistemics: EPISTEMICS, result: cands }, ctx.write);
    return 0;
  }

  const core = cands.filter((c) => c.touchesCore);
  const ck = cands.filter((c) => c.touchesCore && c.sameKind);
  out(`\nLink candidates — cross-cluster quantities sharing a dimension  [source: ${label}]`);
  out(`  ${coreLine(coreAnchor(graph))}`);
  out('⚠ a coincidence-heavy REVIEW SURFACE, NOT discovered bridges. Same dimension is a');
  out('  weak signal; each needs a physicist to accept or (far more often) reject.\n');
  out(`  funnel:  ${cands.length} total  →  ${core.length} touch the anchored core  →  ${ck.length} also same-kind\n`);
  out('  same-kind + core-touching (the least-implausible set):');
  for (const c of ck) out(`    ${(c.a + ' ≟ ' + c.b).padEnd(56)} [${c.sharedToken}]`);
  out('\n  Most are still coincidences (decoherence-rate ≟ hubble-rate) or pairs the catalog');
  out('  deliberately keeps distinct (effective-mass ≠ mass). The genuinely motivated few —');
  out('  e.g. coarsening-length ≟ quantum-correlation-length (links the isolated Model-A');
  out('  coarsening bridge to the Kibble-Zurek criticality cluster) — are written up in');
  out(`  ${publishedUrl('docs/research/Linkage-Candidate-Proposals.md')}`);
  return 0;
}

export const command: Command = {
  name: 'candidates',
  aliases: ['propose'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Propose same-dimension links between clusters for physicist review.',
  example: 'upt candidates',
  group: 'discovery',
  run,
};

registerCommand(command);
