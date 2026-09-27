/**
 * `upt evaluate <be-NN> key=value …` — numerically evaluate a closed-form /
 * spacetime bridge (BE-51/52/55…65) via its registered evaluator. Closes the gap
 * where `upt explain <be-NN>` redirected to a "evaluated directly" capability that
 * did not exist. With no bridge id, lists the evaluable bridges + their inputs.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { emitJson } from '../output.js';
import { UsageError } from '../errors.js';
import { CliError } from '../errors.js';
import type { EvaluatorParameter, EvaluatorSpec } from '../../cli-api.js';

const FLAGS: FlagSpec[] = [
  { name: '--sigma', valueStyle: 'either', repeatable: true },
  { name: '--corr', valueStyle: 'either', repeatable: true },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt evaluate <be-NN> key=value[unit] ...
        Numerically evaluate a closed-form / spacetime bridge (BE-51/52/55..65).
        Every input is declared: its unit, its meaning, and for a length what
        it measures (a radius, a separation, a semi-major axis). A value may
        carry a unit (d_m=1um, R_ohm=1kohm, T_yr=88d, M_kg=1Msun); it is
        converted into the declared unit only when the dimensions agree, and a
        bare number is in the declared unit. An absolute temperature in degC
        adds 273.15 K; a --sigma in degC is a difference and does not. degF is
        refused. An undeclared key exits 1 instead of being ignored. A declared
        alternate (major_axis_m for a_m) is converted exactly and said so.
        e.g.  upt evaluate be-63 mu_e=2   → Chandrasekhar mass ≈ 1.456 M_⊙
              (ideal degenerate gas, with m_u and M_⊙ = 1.989e30 kg)
              upt evaluate be-55 C=1      → quantum Hall R_H = von Klitzing constant
        With no bridge id, lists the evaluable bridges and their declared inputs.
        --sigma key=u (repeatable) gives an input's standard uncertainty;
        --corr a,b=rho its correlation. Propagated to first order (GUM law,
        central-difference sensitivities), with a curvature check per input
        that flags where the linearization is unreliable. An input without
        --sigma is treated as exact. Not included: the evaluator's numerical
        error and model discrepancy (whether the bridge applies).
        e.g.  upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=3 --sigma R_ohm=10`;

/** Unit and geometry trouble is a bad value (exit 1); a missing `=` is a usage error (exit 2). */
function resolveInputs(api: CommandCtx['api'], spec: EvaluatorSpec, args: readonly string[]) {
  for (const a of args) {
    if (a.indexOf('=') <= 0) throw new UsageError(`upt evaluate: '${a}' must be key=value (e.g. mu_e=2). See \`upt help\`.`);
  }
  try {
    return api.resolveEvaluatorInputs(spec.parameters, args);
  } catch (e) {
    if (e instanceof api.UnitError) throw new CliError(`upt evaluate: be-${spec.bridgeId}: ${e.message}`);
    throw e;
  }
}

/** `d_m [m] plate separation d (geometry: separation) — the gap …` */
function describeParameter(p: EvaluatorParameter): string {
  const extras = [
    ...(p.geometry === undefined ? [] : [`geometry: ${p.geometry}`]),
    ...(p.temperature === undefined ? [] : ['an absolute temperature; degC adds 273.15']),
  ];
  const alts = (p.alternates ?? []).map((a) => `or give ${a.key}, ${a.meaning}`);
  return (
    `${p.key} [${p.unit || 'dimensionless'}] ${p.quantity} ${p.symbol}${extras.length > 0 ? ` (${extras.join('; ')})` : ''} — ${p.meaning}` +
    (alts.length > 0 ? `; ${alts.join('; ')}` : '')
  );
}

/** A curvature term above this fraction of the linear term marks the linearization unreliable. */
const NONLINEAR_FRACTION = 0.1;

interface Contribution {
  readonly sensitivity: number | null;
  readonly contribution: number | null;
  /** |f(x+u) + f(x−u) − 2f(x)| / 2 over |c·u|: the second-order term against the first. */
  readonly curvatureRatio: number | null;
  readonly note?: string;
}

/**
 * First-order propagation of input uncertainties through `f`, GUM's law of
 * propagation: u² = Σᵢⱼ cᵢ cⱼ ρᵢⱼ uᵢ uⱼ, with cᵢ by central difference. Each
 * input is also stepped by ±uᵢ, so a curvature term comparable to the linear
 * term is reported rather than hidden in a small-looking σ.
 * @internal
 */
export function propagateUncertainty(
  f: (inputs: Record<string, number>) => Record<string, unknown>,
  inputs: Readonly<Record<string, number>>,
  sigma: Readonly<Record<string, number>>,
  corr: ReadonlyMap<string, number>,
): Record<string, { value: number; u: number | null; relative: number | null; contributions: Record<string, Contribution>; unreliable: string[] }> {
  const at = (key: string, dx: number): Record<string, unknown> | null => {
    try {
      return f({ ...inputs, [key]: inputs[key]! + dx });
    } catch {
      return null;
    }
  };
  const base = f({ ...inputs });
  const keys = Object.keys(sigma);
  const out: ReturnType<typeof propagateUncertainty> = {};
  for (const [name, v] of Object.entries(base)) {
    if (typeof v !== 'number' || name in inputs) continue;
    const contributions: Record<string, Contribution> = {};
    const c: Record<string, number | null> = {};
    const unreliable: string[] = [];
    for (const k of keys) {
      const u = sigma[k]!;
      const h = u > 0 ? u * 1e-3 : Math.abs(inputs[k]!) * 1e-6 || 1e-6;
      const plus = at(k, h)?.[name];
      const minus = at(k, -h)?.[name];
      if (typeof plus !== 'number' || typeof minus !== 'number') {
        c[k] = null;
        contributions[k] = { sensitivity: null, contribution: null, curvatureRatio: null, note: 'the evaluator is undefined next to this input' };
        unreliable.push(k);
        continue;
      }
      const ck = (plus - minus) / (2 * h);
      c[k] = ck;
      const up = at(k, u)?.[name];
      const down = at(k, -u)?.[name];
      let curvatureRatio: number | null = null;
      let note: string | undefined;
      if (typeof up !== 'number' || typeof down !== 'number') {
        note = '±u reaches outside the evaluator\'s domain';
        unreliable.push(k);
      } else if (ck * u !== 0) {
        curvatureRatio = Math.abs(up + down - 2 * v) / 2 / Math.abs(ck * u);
        if (curvatureRatio > NONLINEAR_FRACTION) unreliable.push(k);
      }
      contributions[k] = { sensitivity: ck, contribution: ck * u, curvatureRatio, ...(note === undefined ? {} : { note }) };
    }
    let variance: number | null = 0;
    for (const i of keys) {
      for (const j of keys) {
        const rho = i === j ? 1 : (corr.get(`${i},${j}`) ?? corr.get(`${j},${i}`) ?? 0);
        if (rho === 0) continue;
        if (c[i] === null || c[j] === null) variance = null;
        if (variance !== null) variance += c[i]! * c[j]! * rho * sigma[i]! * sigma[j]!;
      }
    }
    const u = variance === null ? null : Math.sqrt(Math.max(variance, 0));
    out[name] = { value: v, u, relative: u === null || v === 0 ? null : u / Math.abs(v), contributions, unreliable };
  }
  return out;
}

/** A correlation matrix that is not positive semidefinite describes no joint distribution. */
function isPositiveSemidefinite(keys: readonly string[], corr: ReadonlyMap<string, number>): boolean {
  const n = keys.length;
  const a = keys.map((ki) => keys.map((kj) => (ki === kj ? 1 : (corr.get(`${ki},${kj}`) ?? corr.get(`${kj},${ki}`) ?? 0))));
  const l: number[][] = a.map(() => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i]![j]!;
      for (let k = 0; k < j; k++) sum -= l[i]![k]! * l[j]![k]!;
      if (i === j) {
        if (sum < -1e-12) return false;
        l[i]![i] = Math.sqrt(Math.max(sum, 0));
      } else {
        l[i]![j] = l[j]![j]! === 0 ? 0 : sum / l[j]![j]!;
        if (l[j]![j]! === 0 && Math.abs(sum) > 1e-12) return false;
      }
    }
  }
  return true;
}

function parseUncertainty(
  api: CommandCtx['api'],
  spec: EvaluatorSpec,
  sigmaArgs: readonly string[],
  corrArgs: readonly string[],
  inputs: Readonly<Record<string, number>>,
): { sigma: Record<string, number>; corr: Map<string, number> } {
  const sigma: Record<string, number> = {};
  for (const a of sigmaArgs) {
    const m = /^([^=]+)=(.+)$/.exec(a);
    if (m !== null && !(m[1]! in inputs)) {
      throw new CliError(`upt evaluate: --sigma '${m[1]}' is not one of the inputs given (${Object.keys(inputs).join(', ')})`);
    }
    // A σ is a difference: a σ in degC takes no 273.15 offset.
    let u = NaN;
    if (m !== null) {
      const p = spec.parameters.find((x) => x.key === m[1])!;
      try {
        u = api.convertValue(m[2]!, p.unit, 'difference').value;
      } catch (e) {
        if (!(e instanceof api.UnitError)) throw e;
        if (!/is not a (finite )?number/.test(e.message)) throw new CliError(`upt evaluate: --sigma '${a}': ${e.message}`);
      }
    }
    if (m === null || !Number.isFinite(u) || u < 0) throw new CliError(`upt evaluate: --sigma '${a}' is not key=<finite u ≥ 0>`);
    sigma[m[1]!] = u;
  }
  const corr = new Map<string, number>();
  for (const a of corrArgs) {
    const m = /^([^,=]+),([^,=]+)=(.+)$/.exec(a);
    const rho = m === null ? NaN : Number(m[3]);
    if (m === null || !Number.isFinite(rho) || Math.abs(rho) > 1) throw new CliError(`upt evaluate: --corr '${a}' is not a,b=<rho in [-1, 1]>`);
    const [x, y] = [m[1]!, m[2]!];
    if (x === y) throw new CliError(`upt evaluate: --corr '${a}' correlates an input with itself`);
    for (const k of [x, y]) {
      if (!(k in sigma)) throw new CliError(`upt evaluate: --corr names '${k}', which has no --sigma`);
    }
    corr.set(`${x},${y}`, rho);
  }
  if (!isPositiveSemidefinite(Object.keys(sigma), corr)) {
    throw new CliError('upt evaluate: the --corr values are not a valid correlation matrix (not positive semidefinite)');
  }
  return { sigma, corr };
}

const NOT_INCLUDED = "the evaluator's numerical error; model discrepancy (whether the bridge applies at all)";

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const [target, ...rest] = args.positionals;

  if (!target) {
    const specs = [...api.BRIDGE_EVALUATORS.values()];
    if (args.flags.has('json')) {
      emitJson(
        {
          command: 'evaluate',
          result: specs.map((s) => ({ bridgeId: s.bridgeId, name: s.name, inputKeys: s.inputKeys, parameters: s.parameters })),
        },
        ctx.write,
      );
      return 0;
    }
    out('\nEvaluable bridges  (upt evaluate <be-NN> key=value[unit] ...)');
    for (const s of specs) {
      out(`  be-${s.bridgeId}  ${s.name}`);
      for (const p of s.parameters) out(`      ${describeParameter(p)}`);
    }
    out('\n  A value may carry a unit (d_m=1um, T_K=25degC, R_ohm=1kohm); a bare number is in the declared unit.');
    return 0;
  }

  const m = /^be-(\d+)$/i.exec(target);
  if (!m) {
    throw new UsageError(`upt evaluate: '${target}' is not a bridge id (be-NN). See \`upt help\`.`);
  }
  const id = Number(m[1]);
  const spec = api.BRIDGE_EVALUATORS.get(id);
  if (spec === undefined) {
    throw new CliError(
      `evaluateBridge: be-${id} has no evaluator (only closed-form + spacetime bridges do — see \`upt evaluate\` with no args)`,
    );
  }
  const { inputs, resolved } = resolveInputs(api, spec, rest);

  let result: unknown;
  try {
    result = api.evaluateBridge(id, inputs);
  } catch (e) {
    // unknown-id / missing-input / out-of-range → bad value, exit 1 (documented contract).
    throw new CliError((e as Error).message);
  }

  const sigmaArgs = args.flags.get('sigma') ?? [];
  const corrArgs = args.flags.get('corr') ?? [];
  if (sigmaArgs.length === 0 && corrArgs.length > 0) throw new CliError('upt evaluate: --corr needs --sigma for both inputs');
  let uncertainty: Record<string, unknown> | null = null;
  let propagated: ReturnType<typeof propagateUncertainty> | null = null;
  let exactInputs: string[] = [];
  if (sigmaArgs.length > 0) {
    const { sigma, corr } = parseUncertainty(api, spec, sigmaArgs, corrArgs, inputs);
    propagated = propagateUncertainty((i) => api.evaluateBridge(id, i) as Record<string, unknown>, inputs, sigma, corr);
    exactInputs = Object.keys(inputs).filter((k) => !(k in sigma));
    uncertainty = {
      method: 'first-order propagation (GUM law), central-difference sensitivities, curvature check at ±u per input',
      sigma,
      correlations: Object.fromEntries(corr),
      outputs: propagated,
      exactInputs,
      notIncluded: NOT_INCLUDED,
    };
  }

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'evaluate',
        result: {
          bridgeId: id,
          inputs,
          parameters: spec.parameters,
          conversions: resolved.filter((r) => r.note !== undefined).map((r) => ({ key: r.key, given: r.given, value: r.value, unit: r.unit, ...(r.via === undefined ? {} : { via: r.via }), note: r.note })),
          output: result,
          ...(uncertainty === null ? {} : { uncertainty }),
        },
      },
      ctx.write,
    );
    return 0;
  }
  out(`\n● be-${id}  ${spec.name}`);
  out('  inputs: ' + Object.entries(inputs).map(([k, v]) => `${k}=${v}`).join(', '));
  for (const p of spec.parameters) {
    const r = resolved.find((x) => x.key === p.key);
    out(`    ${describeParameter(p)}${r?.note === undefined ? '' : `\n      converted: ${r.note}`}`);
  }
  for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
    out(`  ${k} = ${typeof v === 'number' ? v : JSON.stringify(v)}`);
  }
  if (propagated !== null) {
    const g = (x: number | null): string => (x === null ? 'unavailable' : Number(x.toPrecision(3)).toString());
    out('  uncertainty (first-order, GUM law; a sensitivity is not an uncertainty, the contribution is c·u):');
    for (const [name, p] of Object.entries(propagated)) {
      out(`    ${name} = ${p.value} ± ${g(p.u)} (1σ${p.relative === null ? '' : `; relative ${g(p.relative * 100)}%`})`);
      for (const [k, c] of Object.entries(p.contributions)) {
        out(
          `      from ${k}: c = ${g(c.sensitivity)}, c·u = ${g(c.contribution)}` +
            (c.curvatureRatio === null ? '' : `, curvature/linear at ±u = ${g(c.curvatureRatio)}`) +
            (c.note === undefined ? '' : ` — ${c.note}`),
        );
      }
      if (p.unreliable.length > 0) {
        out(`      LINEARIZATION UNRELIABLE for ${p.unreliable.join(', ')}: the first-order σ above does not describe what ±u does to it`);
      }
    }
    const corr = Object.entries((uncertainty as { correlations: Record<string, number> }).correlations);
    out(`    correlations: ${corr.length === 0 ? 'none given (inputs independent)' : corr.map(([k, r]) => `${k} = ${r}`).join(', ')}`);
    if (exactInputs.length > 0) out(`    treated as exact (no --sigma): ${exactInputs.join(', ')} — a choice, not a measurement`);
    out(`    not included: ${NOT_INCLUDED}`);
  }
  return 0;
}

export const command: Command = {
  name: 'evaluate',
  aliases: [],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
