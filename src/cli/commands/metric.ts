/**
 * `upt metric` — Christoffel symbols and curvature scalars for a named metric.
 *
 * `--geodesic` integrates a short Schwarzschild circular orbit, or a Kerr
 * geodesic. θ = π/2 is equatorial and circular. Any other θ is an inclined
 * spherical orbit with that polar turning point.
 *
 * @module cli/commands/metric
 */
import { METRIC_TOPICS } from '../metric-topics.js';
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import { CliError, UsageError } from '../errors.js';
import { splitAssignments } from '../bindings.js';
import type { MetricId } from '../../cli-api.js';

const FLAGS: FlagSpec[] = [
  JSON_FLAG,
  {
    name: '--geodesic',
    valueStyle: 'none',
    description: 'Integrate a short Schwarzschild circular orbit, or a Kerr geodesic at the given θ.',
  },
];

const NAMES = Object.keys(METRIC_TOPICS) as Array<keyof typeof METRIC_TOPICS>;

const HELP = `upt metric <minkowski|schwarzschild|flrw|kerr> [key=value ...] [--geodesic] [--json]
        Christoffel symbols, the Ricci tensor, the Ricci scalar and the
        Kretschmann scalar of one exact metric. Alias: upt curvature.
        Signature of the line element is (-,+,+,+), the same mostly-plus
        signature as the canonical Einstein-equation metric node.
        Schwarzschild Kretschmann is checked against 48 G² M² / (c⁴ r⁶).
        FLRW prints the Friedmann equation including the curvature term
        −k c²/a² and Λ. Kerr uses T = ct in metres for tensor components.
        For |a/M| ≤ 1 it reports both horizons in metres and prograde and
        retrograde ISCO and photon radii in r/M.
        --geodesic integrates a short Schwarzschild circular orbit, or a Kerr
        geodesic (equatorial and circular at θ = π/2; inclined, with that
        polar turning point, at any other θ). Kerr's a is a length in metres;
        the report prints a/M = a/(GM/c²). Exact vacuum and trace-free Ricci
        scalars are labeled as closed forms. The numerical tensors also carry
        finite-difference error bounds. A numerical value within its bound
        is marked unresolved. A
        parameter is a number, a unit (M=1Msun, r=1km) or a
        constant expression (theta=pi/2). A bare number is already in the
        parameter's SI unit; a dimensioned quantity must match it.
        \`upt help metric\` describes every flag.
        e.g.  upt metric schwarzschild M=1Msun r=1e8 theta=pi/2
              upt metric flrw k=1 t=2
              upt curvature kerr a=1000 r=1e8 theta=1.2`;

function isMetric(s: string | undefined): s is MetricId {
  return (NAMES as readonly string[]).includes(s ?? '');
}

/**
 * The metric library refuses a bad value (a non-positive mass, a point inside
 * the horizon, an unknown or repeated parameter, a start the integrator cannot
 * take, a parameter in the wrong unit) with `MetricMassError`,
 * `MetricValueError` or a `UnitError`. Each is a bad value, exit 1. Any other
 * class (a plain `Error`, a TypeError, a RangeError) is a defect and is not
 * converted.
 */
function metricValueError(api: CommandCtx['api'], e: unknown): unknown {
  if (e instanceof api.MetricMassError || e instanceof api.MetricValueError || e instanceof api.UnitError) {
    return new CliError(`upt metric: ${e.message}`);
  }
  return e;
}

/** The error-bound suffix of one printed curvature value. */
function boundText(bound: number | undefined, resolved: boolean | undefined, symbol = 'R'): string {
  if (bound === undefined) return '';
  return resolved === true ? `  (bound ${bound})` : `  (unresolved: |${symbol}| <= bound ${bound})`;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const name = args.positionals[0];
  if (!isMetric(name)) {
    throw new UsageError(
      `upt metric needs one of ${NAMES.join(', ')}. See \`upt help metric\`.`,
    );
  }
  const pairs = args.positionals.slice(1);
  // A token with no `=` is usage (exit 2); a parameter given twice is refused (exit 1).
  splitAssignments('metric', pairs, 'key=value');
  let report;
  try {
    report = api.curvatureReport(name, pairs);
  } catch (e) {
    throw metricValueError(api, e);
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
        readonly properTimeSeconds?: number;
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
        const orbit = api.schwarzschildCircularOrbit({
          ...(M === undefined ? {} : { M }),
          ...(r === undefined ? {} : { r }),
        });
        geodesic = { kind: 'circular', ...orbit };
      } else if (name === 'kerr') {
        const Mgeom = report.parameters.M_geom_m;
        const a = report.parameters.a ?? 0;
        const r = report.parameters.r;
        const theta = report.parameters.theta ?? Math.PI / 2;
        // Reachable: `curvatureReport` refuses M ≤ 0, but G=0 (or a c that overflows) makes
        // M_geom = G M / c² zero with M > 0, and a supplied r passes its own check.
        if (Mgeom === undefined || !(Mgeom > 0)) throw new CliError('upt metric: Kerr geodesic needs a positive mass');
        const rOverM = (r ?? 10 * Mgeom) / Mgeom;
        const aOverM = a / Mgeom;
        if (!(Math.abs(aOverM) <= 1)) throw new CliError('upt metric: Kerr geodesic wants |a| ≤ GM/c²');
        const equatorial = theta === Math.PI / 2;
        const shared = { M: Mgeom, aOverM, rOverM, fraction: 0.005, steps: 40, prograde: a >= 0 };
        const orbit = equatorial
          ? api.kerrEquatorialCircular(shared)
          : api.kerrGeodesic({
              ...shared,
              theta,
              ...api.kerrTurningPointOrbit({ ...shared, theta }),
              mu2: 1,
            });
        geodesic = {
          kind: equatorial ? 'circular' : 'inclined',
          ...orbit,
          properTimeSeconds: orbit.affineLength / (report.parameters.c ?? 1),
        };
      } else {
        throw new UsageError('upt metric: --geodesic is for schwarzschild or kerr.');
      }
    } catch (e) {
      if (e instanceof UsageError || e instanceof CliError) throw e;
      throw metricValueError(api, e);
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
  for (const c of report.ricci) out(`    ${c.index} = ${c.value}${boundText(c.bound, c.resolved)}`);
  const ricciSource = report.ricciScalarSource === 'closed-form'
    ? '  (exact closed form)'
    : boundText(report.ricciScalarBound, report.ricciScalarResolved);
  out(`  Ricci scalar R = ${report.ricciScalar}${ricciSource}`);
  out(`  Kretschmann K = ${report.kretschmann}${boundText(report.kretschmannBound, report.kretschmannResolved, 'K')}`);
  out('  closed form: ' + Object.entries(report.closedForm).map(([k, v]) => `${k}=${v}`).join(' '));
  if (geodesic) {
    const cons =
      geodesic.E0 === undefined
        ? ''
        : ` E [dimensionless] ${geodesic.E0}→${geodesic.EEnd} L [m] ${geodesic.L0}→${geodesic.LEnd} Q [m²] ${geodesic.Q0}→${geodesic.QEnd} norm ${geodesic.norm0}→${geodesic.normEnd}`;
    const polar =
      geodesic.theta0 === undefined ? '' : ` θ ${geodesic.theta0}→${geodesic.thetaEnd}`;
    const label = geodesic.kind === 'inclined' ? 'inclined orbit' : 'circular orbit';
    const span = geodesic.properTimeSeconds === undefined ? '' : ` over ${geodesic.properTimeSeconds} s of proper time`;
    out(
      `  geodesic: ${label} r0=${geodesic.r0} rEnd=${geodesic.rEnd}${polar} Δφ=${geodesic.phiAdvance} in ${geodesic.steps} steps${span}${cons}`,
    );
  }
  return 0;
}

export const command: Command = {
  name: 'metric',
  aliases: ['curvature'],
  positionals: { max: Infinity },
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Print Christoffel symbols and curvature scalars for one exact metric.',
  example: 'upt metric schwarzschild M=1Msun r=1e8 theta=pi/2',
  group: 'evaluate',
  run,
};

registerCommand(command);
