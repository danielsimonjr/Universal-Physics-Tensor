/**
 * `upt metric` — Christoffel symbols and curvature scalars for a named metric.
 *
 * `--geodesic` integrates a short Schwarzschild circular orbit, or a Kerr
 * geodesic. θ = π/2 is equatorial and circular. Any other θ is an inclined
 * spherical orbit with that polar turning point.
 *
 * @module cli/commands/metric
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { emitJson } from '../output.js';
import { UsageError } from '../errors.js';
import {
  curvatureReport,
  kerrEquatorialCircular,
  kerrGeodesic,
  kerrTurningPointOrbit,
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
        Signature of the line element is (-,+,+,+), the same mostly-plus
        signature as the canonical Einstein-equation metric node.
        Schwarzschild Kretschmann is checked against 48 G² M² / (c⁴ r⁶).
        FLRW prints the Friedmann equation including the curvature term
        −k c²/a² and Λ. Kerr Kretschmann uses the Boyer–Lindquist closed form.
        --geodesic integrates a short Schwarzschild circular orbit, or a Kerr
        geodesic (equatorial and circular at θ = π/2; inclined, with that
        polar turning point, at any other θ). Kerr's a is a length in metres;
        the report prints a/M = a/(GM/c²). A Ricci scalar that has a closed
        form is that form; a vacuum finite-difference residual is not listed
        as Ricci. \`upt help metric\` describes every flag.
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
  let geodesic:
    | {
        readonly kind: 'circular' | 'inclined';
        readonly r0: number;
        readonly rEnd: number;
        readonly theta0?: number;
        readonly thetaEnd?: number;
        readonly phiAdvance: number;
        readonly steps: number;
        readonly E0?: number;
        readonly EEnd?: number;
        readonly L0?: number;
        readonly LEnd?: number;
        readonly Q0?: number;
        readonly QEnd?: number;
        readonly norm0?: number;
        readonly normEnd?: number;
      }
    | undefined;
  if (args.flags.has('geodesic')) {
    try {
      if (name === 'schwarzschild') {
        const M = report.parameters.M;
        const r = report.parameters.r;
        const orbit = schwarzschildCircularOrbit({
          ...(M === undefined ? {} : { M }),
          ...(r === undefined ? {} : { r }),
        });
        geodesic = { kind: 'circular', ...orbit };
      } else if (name === 'kerr') {
        const Mgeom = report.parameters.M_geom_m;
        const a = report.parameters.a ?? 0;
        const r = report.parameters.r;
        const theta = report.parameters.theta ?? Math.PI / 2;
        if (Mgeom === undefined || !(Mgeom > 0)) throw new Error('Kerr geodesic needs a positive mass');
        const rOverM = (r ?? 10 * Mgeom) / Mgeom;
        const aOverM = a / Mgeom;
        if (!(Math.abs(aOverM) <= 1)) throw new Error('Kerr geodesic wants |a| ≤ GM/c²');
        const shared = { M: Mgeom, aOverM, rOverM, fraction: 0.005, steps: 40 };
        geodesic =
          Math.abs(theta - Math.PI / 2) < 1e-6
            ? { kind: 'circular' as const, ...kerrEquatorialCircular(shared) }
            : {
                kind: 'inclined' as const,
                ...kerrGeodesic({
                  ...shared,
                  theta,
                  ...kerrTurningPointOrbit({ M: Mgeom, aOverM, rOverM, theta }),
                  mu2: 1,
                }),
              };
      } else {
        throw new UsageError('upt metric: --geodesic is for schwarzschild or kerr.');
      }
    } catch (e) {
      if (e instanceof UsageError) throw e;
      throw new UsageError((e as Error).message);
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
  if (geodesic) {
    const cons =
      geodesic.E0 === undefined
        ? ''
        : ` E ${geodesic.E0}→${geodesic.EEnd} L ${geodesic.L0}→${geodesic.LEnd} Q ${geodesic.Q0}→${geodesic.QEnd} norm ${geodesic.norm0}→${geodesic.normEnd}`;
    const polar =
      geodesic.theta0 === undefined ? '' : ` θ ${geodesic.theta0}→${geodesic.thetaEnd}`;
    const label = geodesic.kind === 'inclined' ? 'inclined orbit' : 'circular orbit';
    out(
      `  geodesic: ${label} r0=${geodesic.r0} rEnd=${geodesic.rEnd}${polar} Δφ=${geodesic.phiAdvance} over ${geodesic.steps} steps${cons}`,
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
