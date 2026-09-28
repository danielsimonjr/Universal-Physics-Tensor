/**
 * `upt priority` — triage the speculative bridges by structural decidability
 * against established physics. Transposed verbatim from bin/upt.mjs's
 * `priority()` (lines 238-261), plus `--source` (module-level `GRAPH` in the
 * old CLI was always the catalog graph) and `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt priority [--source=catalog|canonical|both]
        Triage the speculative bridges by structural DECIDABILITY against
        established physics (Tiers 1-3). NOT a credibility ranking.
        --source picks the graph (default catalog).`;

const EPISTEMICS = '(review/confrontation priority — NOT a credibility ranking)';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, source } = resolveGraph(api, args.flags);
  const board = api.bridgePriority(graph);

  if (args.flags.has('json')) {
    emitJson(
      { command: 'priority', source, epistemics: EPISTEMICS, result: board },
      ctx.write
    );
    return 0;
  }

  const a = (d: number) => (d === Infinity ? '∞' : String(d));
  out('\nBridge triage — structural decidability against established physics');
  out('(review/confrontation priority — NOT a credibility ranking)\n');

  if (board.length === 0) {
    out('   0 non-established bridges in this graph — the canonical L-layer is all-established; triage is vacuous here.');
    return 0;
  }

  out('   tier  anchor  grounding   cplx  data   bridge                status');
  out('   ' + '─'.repeat(73));
  let last = 0;
  for (const e of board) {
    if (e.tier !== last) {
      const label =
        e.tier === 1
          ? 'anchored + grounded/tractable — confront first'
          : e.tier === 2
            ? 'anchored OR grounded — second pass'
            : 'isolated + multi-parameter — needs literature review, not structure';
      out(`\n   ── Tier ${e.tier}: ${label}`);
      last = e.tier;
    }
    out(
      [
        '   T' + e.tier,
        a(e.anchoring).padStart(5),
        '  ' + e.grounding.padEnd(10),
        String(e.complexity).padStart(3),
        e.hasDataConfrontation ? ' DATA' : '     ',
        ' ' + e.id.padEnd(20),
        e.status,
      ].join(' ')
    );
  }
  const tiers = board.reduce<Record<number, number>>((m, e) => ((m[e.tier] = (m[e.tier] || 0) + 1), m), {});
  out(`\n   Tiers: ${JSON.stringify(tiers)}  (of ${board.length} non-established bridges)`);
  out('   Reminder: tier ranks decidability/anchoring, not truth.');
  return 0;
}

export const command: Command = {
  name: 'priority',
  aliases: ['prioritize', 'triage'],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
