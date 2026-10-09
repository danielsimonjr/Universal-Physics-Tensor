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
import { adjudicationSourceUrls } from '../published-url.js';

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
  // A pair the adjudication ledger has ruled on carries that verdict on its row; the
  // rest are unadjudicated. No pair is called motivated by this command: the ledger is
  // the only record of what a physicist concluded, and its grounds are quoted from it.
  let adjudicated = 0;
  for (const c of ck) {
    const record = api.candidateIdIfSlug(c.a, c.b) === undefined ? undefined : api.adjudicationFor(c.a, c.b);
    if (record !== undefined) adjudicated++;
    const trailer = record === undefined ? '' : `  [adjudicated: ${record.verdict} — ${record.grounds}]`;
    out(`    ${(c.a + ' ≟ ' + c.b).padEnd(56)} [${c.sharedToken}]${trailer}`);
  }
  out(`\n  adjudicated: ${adjudicated} of ${ck.length} carry a recorded verdict; the rest are unadjudicated.`);
  out('  A shared dimension is a coincidence until a physicist records otherwise. The ledger\'s sources:');
  for (const url of adjudicationSourceUrls()) out(`    ${url}`);
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
