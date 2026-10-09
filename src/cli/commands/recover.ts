/**
 * `upt recover` — validate bridges against standard physics (bridge↔canonical
 * linkage, the F4 circularity guard). Transposed verbatim from bin/upt.mjs's
 * `recoverCmd()` (lines 818-841), plus `--json`. No `--source`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [JSON_FLAG];

const HELP = `upt recover
        Validate bridges against standard physics: classify each bridge↔
        canonical link as restates-canonical (F4 circularity — NOT a
        discovery), recovers (undeclared structural match), or
        dimensional-only. A chain of two symbolic edges is reported
        separately. That comparison does not cancel dimensionful constants,
        and a chain is never restates-canonical.`;

const EPISTEMICS =
  '⚠ structural match is "same relation UP TO a dimensionless factor"; that factor\n' +
  '  may itself be physically substantive (e.g. ⟨e^-βW⟩). A review surface.';

/**
 * The advisory suffix for one linkage row, or `''`.
 *
 * ADVISORY ONLY — it changes no classification, no ordering and no exit code.
 * It is empty unless BOTH the canonical equation and the bridge's graph edge
 * DECLARE a convention key and declare it differently; `checkConventions`
 * treats an undeclared key as unknown, so a record that says nothing is never
 * reported as disagreeing. No record in the repo declares conventions today,
 * so this returns `''` for every row and the output is unchanged — pinned by
 * `tests/cli/recover-conventions.test.ts`.
 */
function conventionAdvisory(
  api: CommandCtx['api'],
  canonicalId: string,
  bridgeId: number,
): string {
  const ce = api.CANONICAL_EQUATIONS.find((e) => e.id === canonicalId);
  const edge = api.CATALOG_GRAPH.find((e) => e.beId === bridgeId);
  const keys = api.checkConventions(ce?.conventions, edge?.conventions);
  return keys.length === 0 ? '' : `\n      ⚠ conventions differ: ${keys.join(', ')}`;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const all = api.scanLinkages();
  const composition = api.scanCompositionRecovery();

  if (args.flags.has('json')) {
    emitJson(
      { command: 'recover', epistemics: EPISTEMICS, result: all, compositionRecovery: composition },
      ctx.write,
    );
    return 0;
  }
  const by = (c: string) => all.filter((r) => r.classification === c);
  const restates = by('restates-canonical');
  const recovers = by('recovers');
  const dimOnly = by('dimensional-only');
  out('\nBridge↔canonical recovery — validating bridges against standard physics');
  out('⚠ structural match is "same relation UP TO a dimensionless factor"; that factor');
  out('  may itself be physically substantive (e.g. ⟨e^-βW⟩). A review surface.\n');
  out(
    `  ${all.length} non-unrelated links  →  ${restates.length} restates-canonical  ` +
      `·  ${recovers.length} recovers  ·  ${dimOnly.length} dimensional-only\n`
  );
  if (restates.length) {
    out('  RESTATES-CANONICAL (the bridge IS the canonical law — F4: NOT a discovery):');
    for (const r of restates) {
      const rec = r.recovery && r.recovery.tested ? ` (recovery exact, err ${api.formatQuantity(r.recovery.maxRelErr)})` : '';
      out(
        `    ${r.canonicalId.padEnd(26)} ≡ bridge ${r.bridgeId}${rec}` +
          conventionAdvisory(api, r.canonicalId, r.bridgeId)
      );
    }
  }
  if (recovers.length) {
    out("\n  RECOVERS (undeclared structural correspondence — worth a physicist's look):");
    for (const r of recovers) {
      out(
        `    ${r.canonicalId.padEnd(26)} ~ bridge ${r.bridgeId}  (same form up to a dimensionless factor)` +
          conventionAdvisory(api, r.canonicalId, r.bridgeId)
      );
    }
  }
  out(`\n  (${dimOnly.length} dimensional-only: same dimension, different form. Run \`upt canonical\` for the registry.)`);
  out('\nComposition-derived recovery — a chain of two symbolic edges');
  out('  Compared up to a dimensionless factor. Dimensionful cancellation is not applied.');
  out('  A chain is never restates-canonical.');
  out(`  ${composition.pairs.length} pairs examined, ${composition.hits.length} structural matches.`);
  for (const hit of composition.hits) {
    out(`    ${hit.firstId} -> ${hit.secondId}  recovers  ${hit.canonicalId}`);
  }
  return 0;
}

export const command: Command = {
  name: 'recover',
  aliases: ['recovery', 'validate'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Classify each bridge-to-canonical link as restates, recovers, or dimensional-only.',
  example: 'upt recover',
  group: 'explore',
  run,
};

registerCommand(command);
