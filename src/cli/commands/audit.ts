/**
 * `upt audit` — try to derive every bridge equation by dimensions. Transposed
 * verbatim from bin/upt.mjs's `audit()` (lines 264-287), plus `--source`
 * (module-level `GRAPH` in the old CLI was always the catalog graph) and
 * `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';
import { statusMeaning } from '../statuses.js';

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt audit
        Try to derive every built-in bridge equation by dimensions: which
        re-derive as a recognized monomial (with the prefactor recovered),
        which are decoys, which are dimensionally open.
        A DECOY is a failed dimensional RECONSTRUCTION: a set of constants
        closes the dimensions, but its monomial does not reproduce the
        bridge's evaluator. It is not a physical refutation of the formula.`;

const DECOY_DEFINITION = statusMeaning('decoy');

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, source } = resolveGraph(api, args.flags);

  const derived: Array<{ e: (typeof graph)[number]; d: ReturnType<typeof api.attemptDerivation>; c: number }> = [];
  const decoy: Array<{ e: (typeof graph)[number]; c: number }> = [];
  const open: Array<{ e: (typeof graph)[number]; c: number }> = [];
  for (const e of graph) {
    const d = api.attemptDerivation(e);
    const c = api.dimensionalFreedom(e);
    if (d.status === 'derived') derived.push({ e, d, c });
    else if (d.status === 'decoy') decoy.push({ e, c });
    else open.push({ e, c });
  }

  if (args.flags.has('json')) {
    const openSorted = [...open].sort((a, b) => a.c - b.c);
    emitJson(
      {
        command: 'audit',
        source,
        result: {
          derived: derived.map(({ e, d, c }) => ({
            id: e.id,
            subset: d.subset,
            prefactor: d.prefactor,
            cleanPrefactor: d.cleanPrefactor,
            complexity: c,
          })),
          decoy: decoy.map(({ e, c }) => ({ id: e.id, complexity: c })),
          open: openSorted.map(({ e, c }) => ({ id: e.id, complexity: c })),
          definitions: { decoy: DECOY_DEFINITION },
        },
      },
      ctx.write
    );
    return 0;
  }

  out('\nDeriving the bridge equations by dimensions');
  out('(form by dimensions; the constant is recovered by matching the evaluator)\n');
  out(`  DERIVED (${derived.length}) — recognized monomial, prefactor recovered:`);
  for (const { e, d } of derived) {
    const tag = d.cleanPrefactor ? '' : '  (empirical/tuned constant)';
    out(`    ${e.id.padEnd(22)} +[${(d.subset || []).join(',')}]  ×${d.prefactor!.toExponential(3)}${tag}`);
  }
  out(
    `\n  DIMENSIONAL-RECONSTRUCTION MISMATCH (DECOY, ${decoy.length}) — a set of constants closes the dimensions, ` +
      'but its monomial does not reproduce the evaluator:',
  );
  out('    ' + decoy.map((x) => x.e.id).join(', '));
  out('    (NOT a physical refutation: the evaluator and any confrontation of these bridges stand as they are)');
  out(`\n  OPEN (${open.length}) — irreducible free dimensionless group(s); by complexity:`);
  for (const { e, c } of [...open].sort((a, b) => a.c - b.c)) {
    out(`    cplx=${c}  ${e.id}`);
  }
  out('\n  (derivability is ORTHOGONAL to credibility — see the priority command)');
  return 0;
}

export const command: Command = {
  name: 'audit',
  aliases: [],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
