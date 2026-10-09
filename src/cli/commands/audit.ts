/**
 * `upt audit` — try to derive every bridge equation by dimensions. Transposed
 * verbatim from bin/upt.mjs's `audit()` (lines 264-287), plus `--source`
 * (module-level `GRAPH` in the old CLI was always the catalog graph) and
 * `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [
  sourceFlag('catalog', 'Which graph to read: catalog, canonical, or both.'),
  JSON_FLAG,
];

const HELP = `upt audit [--source=catalog|canonical|both]
        Try to derive every built-in bridge equation by dimensions: which
        re-derive as a recognized monomial (with the prefactor recovered),
        which are dimensional with no sourced prefactor (the evaluator's 1
        is that absence), which are decoys, which add dimensionful terms
        (not a monomial), which are dimensionally open.
        A DECOY is a failed dimensional RECONSTRUCTION: a set of constants
        closes the dimensions, but its monomial does not reproduce the
        bridge's evaluator. It is not a physical refutation of the formula.
        NOT A MONOMIAL means the encoded formula adds dimensionful terms, so
        a monomial reconstruction does not apply. It is not a failed
        reconstruction and not a physical refutation.
        --source picks the graph (default catalog).`;


async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, source } = resolveGraph(api, args.flags);

  const derived: Array<{ e: (typeof graph)[number]; d: ReturnType<typeof api.attemptDerivation>; c: number }> = [];
  const coefficientUnset: Array<{ e: (typeof graph)[number]; c: number }> = [];
  const decoy: Array<{ e: (typeof graph)[number]; c: number }> = [];
  const notAMonomial: Array<{ e: (typeof graph)[number]; c: number }> = [];
  const open: Array<{ e: (typeof graph)[number]; c: number }> = [];
  for (const e of graph) {
    const d = api.attemptDerivation(e);
    const c = api.dimensionalFreedom(e);
    if (d.status === 'derived') derived.push({ e, d, c });
    else if (d.status === 'coefficient-unset') coefficientUnset.push({ e, c });
    else if (d.status === 'decoy') decoy.push({ e, c });
    else if (d.status === 'not-a-monomial') notAMonomial.push({ e, c });
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
          coefficientUnset: coefficientUnset.map(({ e, c }) => ({ id: e.id, complexity: c })),
          decoy: decoy.map(({ e, c }) => ({ id: e.id, complexity: c })),
          notAMonomial: notAMonomial.map(({ e, c }) => ({ id: e.id, complexity: c })),
          open: openSorted.map(({ e, c }) => ({ id: e.id, complexity: c, ...(Number.isFinite(c) ? {} : { unspannable: true }) })),
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
    out(`    ${e.id.padEnd(22)} +[${(d.subset || []).join(',')}]  ×${api.formatQuantity(d.prefactor!)}${tag}`);
  }
  out(
    `\n  COEFFICIENT UNSET (${coefficientUnset.length}) — dimensional, and no sourced prefactor multiplies the monomial. ` +
      "The evaluator's 1 is that absence, not a recovered constant:",
  );
  out('    ' + coefficientUnset.map((x) => x.e.id).join(', '));
  out('    (not a recovered prefactor, not a failed reconstruction, and not a free dimensionless group)');
  out(
    `\n  DIMENSIONAL-RECONSTRUCTION MISMATCH (DECOY, ${decoy.length}) — a set of constants closes the dimensions, ` +
      'but its monomial does not reproduce the evaluator:',
  );
  out('    ' + decoy.map((x) => x.e.id).join(', '));
  out('    (NOT a physical refutation: the evaluator and any confrontation of these bridges stand as they are)');
  out(
    `\n  NOT A MONOMIAL (${notAMonomial.length}) — the encoded formula adds dimensionful terms, so it is not a proportionality. ` +
      'A monomial reconstruction does not apply:',
  );
  out('    ' + notAMonomial.map((x) => x.e.id).join(', '));
  out('    (not a failed reconstruction of a monomial, and not a physical refutation)');
  out(`\n  OPEN (${open.length}) — irreducible free dimensionless group(s); by complexity:`);
  for (const { e, c } of [...open].sort((a, b) => a.c - b.c)) {
    // An infinite complexity is a target outside the span of its governing variables: no
    // dimensionless group exists, so the row is unspannable, not merely hard.
    out(`    cplx=${Number.isFinite(c) ? c : '∞ (unspannable)'}  ${e.id}`);
  }
  out('\n  (derivability is ORTHOGONAL to credibility — see the priority command)');
  return 0;
}

export const command: Command = {
  name: 'audit',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary:
    'Derive every bridge equation by dimensions and sort derived, coefficient unset, decoy, not a monomial, and open.',
  example: 'upt audit',
  group: 'evaluate',
  run,
};

registerCommand(command);
