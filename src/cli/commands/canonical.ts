/**
 * `upt canonical` — list the canonical-equation (standard-physics L-layer)
 * registry. Transposed verbatim from bin/upt.mjs's `canonicalCmd()`
 * (lines 801-815), plus `--json`. No `--source`.
 *
 * `--vars` (persona L2 / I1) prints each entry's target and governing variable
 * names — the vocabulary `upt map --equation` / `upt derive` need to match a
 * formula to a CE for the prefactor check.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [
  JSON_FLAG,
  {
    name: '--vars',
    valueStyle: 'none',
    description: 'Also print each entry\'s target and governing variable names.',
  },
];

const HELP = `upt canonical [--vars]
        List the canonical-equation registry — the standard-physics L-layer
        (textbook "answer key") with each entry's fidelity (L0/L1/L2),
        domain, and bridge partners, plus the coverage gap.
        --vars   also print each entry's target and governing variable names
                 (the vocabulary for \`upt map --equation\` / \`upt derive\`).`;

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const entries = api.CANONICAL_EQUATIONS;
  const gap = api.bridgesWithoutCanonicalPartner();
  const withVars = args.flags.has('vars');

  if (args.flags.has('json')) {
    const payload = withVars
      ? {
          entries: entries.map((e) => ({
            ...e,
            target: e.dimensional.target.name,
            variables: e.dimensional.governing.map((g) => g.name),
          })),
          gap,
        }
      : { entries, gap };
    emitJson({ command: 'canonical', result: payload }, ctx.write);
    return 0;
  }

  const fidelity = (e: (typeof entries)[number]) => (e.fieldEquation ? 'L2' : e.scalarAst ? 'L1' : 'L0');
  out('\nCanonical-equation registry — the standard-physics L-layer (Π = L + B + E)');
  out('the textbook "answer key" bridge equations are validated against.\n');
  out(`  ${entries.length} entries:\n`);
  if (withVars) {
    out('   fid  id                       target                 variables');
    out('   ──────────────────────────────────────────────────────────────────────────');
    for (const e of entries) {
      const target = e.dimensional.target.name;
      const vars = e.dimensional.governing.map((g) => g.name).join(', ') || '—';
      out(`   ${fidelity(e).padEnd(3)}  ${e.id.padEnd(24)} ${target.padEnd(22)} ${vars}`);
    }
    out('\n  Use these names in `upt map --equation` / `upt derive` (underscores OK for kebabs).');
  } else {
    out('   fid  domain               id                       partners');
    out('   ─────────────────────────────────────────────────────────────────');
    for (const e of entries) {
      const partners = [...e.partnerBridges, ...(e.restatesBridge ? [`=${e.restatesBridge}`] : [])].join(',') || '—';
      out(`   ${fidelity(e).padEnd(3)}  ${e.domain.padEnd(19)} ${e.id.padEnd(24)} ${partners}`);
    }
    out('\n  tip: `upt canonical --vars` lists the variable names formulas must use');
  }
  out(`  coverage: ${gap.length} catalog bridges have no canonical partner yet`);
  out('  (fidelity: L0 dimensional · L1 scalar-AST · L2 field-equation; "=NN" = restatesBridge)');
  return 0;
}

export const command: Command = {
  name: 'canonical',
  aliases: ['laws'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'List the canonical-equation registry, its fidelity, and the coverage gap.',
  example: 'upt canonical --vars',
  group: 'explore',
  run,
};

registerCommand(command);
