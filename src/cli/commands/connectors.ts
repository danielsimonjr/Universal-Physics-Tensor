/**
 * `upt connectors` — of the isolated bridges, which could connect to the
 * anchored core via a same-dimension identification. Transposed verbatim
 * from bin/upt.mjs's `connectorsCmd()` (lines 780-798), plus `--source`
 * (module-level `GRAPH` in the old CLI was always the catalog graph) and
 * `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph, coreAnchor, coreLine } from '../graphs.js';
import { emitJson } from '../output.js';
import { publishedUrl } from '../published-url.js';

const FLAGS: FlagSpec[] = [
  sourceFlag('both', 'Which graph to read: catalog, canonical, or both. This command defaults to both.'),
  JSON_FLAG,
];

const HELP = `upt connectors [--source=catalog|canonical|both]
        Of the graph's ISOLATED bridges/laws, which could connect to the
        anchored core via a same-dimension identification? The structural
        frontier. A recorded decoy or entailed pair is printed under that
        verdict, with the ledger's grounds. A pair with no ledger row is
        unadjudicated. A shared name token is a token.
        --source defaults to 'both' (catalog + canonical) for the honest,
        all-known-physics answer; --source=catalog isolates the catalog-only
        tail. The isolated count is printed for the source selected.`;

const EPISTEMICS =
  '⚠ A REVIEW SURFACE: same dimension is a WEAK prior. A shared name token is a token.\n' +
  '  A recorded verdict is the ledger.';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  // connectors asks a pure connectivity question, so it defaults to
  // --source=both (catalog + canonical) rather than graphs.ts's catalog
  // fallback used by the other --source commands (e.g. discover, which
  // keeps catalog).
  const sourceFlags = args.flags.has('source') ? args.flags : new Map(args.flags).set('source', ['both']);
  const { graph, label, source } = resolveGraph(api, sourceFlags);
  const r = api.proposeOrphanConnectors(graph);

  if (args.flags.has('json')) {
    emitJson({ command: 'connectors', source, anchor: { core: coreAnchor(graph) }, epistemics: EPISTEMICS, result: r }, ctx.write);
    return 0;
  }

  out('\nOrphan connectors — same-dimension identifications that would pull an ISOLATED');
  out(`bridge into the anchored core (the graph's structural frontier).  [source: ${label}]`);
  out(`  ${coreLine(coreAnchor(graph))}`);
  out('⚠ A REVIEW SURFACE: same dimension is a WEAK prior. A shared name token is a token.');
  out('  A recorded verdict is the ledger.\n');
  out(
    `  ${r.connectedOrphans.length} of the isolated bridges share a name token with the core; ` +
      `${r.unconnectedOrphans.length} are truly unconnected.\n`
  );
  const rows = r.connectors;
  const verdict = (c: (typeof rows)[number]) => {
    if (api.candidateIdIfSlug(c.orphanQuantity, c.coreQuantity) === undefined) return undefined;
    return api.adjudicationFor(c.orphanQuantity, c.coreQuantity);
  };
  printVerdict(api, out, '  DECOY (recorded verdict):', rows.filter((c) => verdict(c)?.verdict === 'decoy'));
  printVerdict(api, out, '  ENTAILED (recorded verdict):', rows.filter((c) => verdict(c)?.verdict === 'entailed'));
  printVerdict(
    api,
    out,
    '  UNADJUDICATED (a shared token is a token):',
    rows.filter((c) => c.sameKind && verdict(c) === undefined),
  );
  out(`\n  truly unconnected (no same-dimension bridge into them): ${r.unconnectedOrphans.join(', ')}`);
  out(`\n  The isolated-bridge review is written up in ${publishedUrl('docs/research/Orphan-Connector-Analysis.md')}.`);
  return 0;
}

function printVerdict(
  api: CommandCtx['api'],
  out: (line?: string) => void,
  heading: string,
  rows: readonly {
    orphanEdge: string;
    orphanQuantity: string;
    coreQuantity: string;
    coreEdge: string;
    dim: string;
  }[],
): void {
  if (rows.length === 0) return;
  out(heading);
  let lastOrphan = '';
  for (const c of rows) {
    if (c.orphanEdge !== lastOrphan) {
      out(`    ── ${c.orphanEdge} (isolated):`);
      lastOrphan = c.orphanEdge;
    }
    out(`        ${(c.orphanQuantity + ' ≟ ' + c.coreQuantity).padEnd(54)} [${c.dim}]  → ${c.coreEdge}`);
    const row = api.candidateIdIfSlug(c.orphanQuantity, c.coreQuantity) === undefined
      ? undefined
      : api.adjudicationFor(c.orphanQuantity, c.coreQuantity);
    if (row !== undefined) out(`          ${row.grounds}`);
  }
  out('');
}

export const command: Command = {
  name: 'connectors',
  aliases: ['orphans'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Find same-dimension identifications that would pull an isolated bridge into the core.',
  example: 'upt connectors',
  group: 'discovery',
  run,
};

registerCommand(command);
