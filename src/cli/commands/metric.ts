/**
 * `upt metric` — Christoffel symbols and curvature scalars for a named metric.
 *
 * Kerr geodesics are not integrated. `--geodesic` runs a short Schwarzschild
 * circular orbit and says so when the metric is Kerr.
 *
 * @module cli/commands/metric
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { emitJson } from '../output.js';
import { UsageError } from '../errors.js';
import {
  curvatureReport,
  schwarzschildCircularOrbit,
  type MetricId,
} from '../../numerical/spacetime-metrics.js';

const FLAGS: FlagSpec[] = [
  { name: '--json', valueStyle: 'none' },
  { name: '--geodesic', valueStyle: 'none' },
];

const NAMES = ['minkowski', 'schwarzschild', 'flrw', 'kerr'] as const;

const HELP = `upt metric <minkowski|schwarzschild|flrw|kerr> [key=value ...] [--geodesic] [--json]
        Christoffel symbols, the Ricci tensor, the Ricci scalar and the
        Kretschmann scalar of one exact metric. Alias: upt curvature.
        Signature of the line element is (-,+,+,+). The Einstein-equation
        tensor AST stays mostly-minus (+,-,-,-); this command does not change it.
        Schwarzschild Kretschmann is checked against 48 G² M² / (c⁴ r⁶).
        FLRW prints the Friedmann equation including the curvature term
        −k c²/a² and Λ. Kerr Kretschmann uses the Boyer–Lindquist closed form;
        Kerr geodesics are not implemented.
        Defaults: Schwarzschild M = M_sun, r = 10 r_s; FLRW flat dust n = 2/3;
        Kerr a = 0, r = 10 GM/c². --geodesic integrates a short Schwarzschild
        circular orbit. \`upt help metric\` describes every flag.
        e.g.  upt metric schwarzschild M=1.989e30 r=1e8
              upt metric flrw k=1 t=2
              upt curvature kerr a=1000 r=1e8 theta=1.2`;

function isMetric(s: string | undefined): s is MetricId {
  return (NAMES as readonly string[]).includes(s ?? '');
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, out } = ctx;
  const name = args.positionals[0];
  if (!isMetric(name)) {
    throw new UsageError(
      `upt metric needs one of ${NAMES.join(', ')}. See \`upt help metric\`.`,
    );
  }
  const pairs = args.positionals.slice(1);
  let report;
  try {
    report = curvatureReport(name, pairs);
  } catch (e) {
    throw new UsageError((e as Error).message);
  }
  let geodesic: { readonly r0: number; readonly rEnd: number; readonly phiAdvance: number; readonly steps: number } | { readonly deferred: string } | undefined;
  if (args.flags.has('geodesic')) {
    if (name === 'schwarzschild') {
      const M = report.parameters.M;
      const r = report.parameters.r;
      geodesic = schwarzschildCircularOrbit({
        ...(M === undefined ? {} : { M }),
        ...(r === undefined ? {} : { r }),
      });
    } else if (name === 'kerr') {
      geodesic = { deferred: 'Kerr geodesic integration is not implemented. Schwarzschild --geodesic runs a circular orbit.' };
    } else {
      throw new UsageError(`upt metric: --geodesic is for schwarzschild (kerr is deferred).`);
    }
  }
  if (args.flags.has('json')) {
    emitJson({ command: 'metric', result: { ...report, ...(geodesic === undefined ? {} : { geodesic }) } }, ctx.write);
    return 0;
  }
  out(`\n${report.metric}  signature ${report.signature}`);
  out(`  ${report.signatureNote}`);
  out(`  coordinates ${report.coordinates}`);
  out('  parameters: ' + Object.entries(report.parameters).map(([k, v]) => `${k}=${v}`).join(' '));
  out('  point: ' + Object.entries(report.point).map(([k, v]) => `${k}=${v}`).join(' '));
  for (const note of report.notes) out(`  ${note}`);
  out('  Christoffel (nonzero):');
  if (report.christoffel.length === 0) out('    (none)');
  for (const c of report.christoffel) out(`    ${c.index} = ${c.value}`);
  out('  Ricci (nonzero):');
  if (report.ricci.length === 0) out('    (none)');
  for (const c of report.ricci) out(`    ${c.index} = ${c.value}`);
  out(`  Ricci scalar R = ${report.ricciScalar}`);
  out(`  Kretschmann K = ${report.kretschmann}`);
  out('  closed form: ' + Object.entries(report.closedForm).map(([k, v]) => `${k}=${v}`).join(' '));
  if (geodesic && 'deferred' in geodesic) out(`  geodesic: ${geodesic.deferred}`);
  else if (geodesic) {
    out(
      `  geodesic: circular orbit r0=${geodesic.r0} rEnd=${geodesic.rEnd} Δφ=${geodesic.phiAdvance} over ${geodesic.steps} steps`,
    );
  }
  return 0;
}

export const command: Command = {
  name: 'metric',
  aliases: ['curvature'],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
