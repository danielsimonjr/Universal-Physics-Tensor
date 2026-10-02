/**
 * `upt evaluate <be-NN | case-id> key=value …` — numerically evaluate a closed-form /
 * spacetime bridge (BE-51/52/55…65) via its registered evaluator. Closes the gap
 * where `upt explain <be-NN>` redirected to a "evaluated directly" capability that
 * did not exist. With no bridge id, lists the evaluable bridges + their inputs.
 * `upt evaluate case-<id> …` runs an applied case (`src/cases/`).
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import { UsageError } from '../errors.js';
import { CliError } from '../errors.js';
import type { AppliedCase, CaseResult, EvaluatorParameter } from '../../cli-api.js';
import { C_SI, G_SI } from '../../core/constants.js';
import { JEANS_FORMULA_NOTE } from '../conventions.js';
import { HBAR_TRUNCATION_NOTE } from '../eval-numbers.js';
import { bindingInUnit } from '../../numerical/binding-value.js';
import { missingEvaluatorMessage } from '../../bridges/evaluators.js';

const FLAGS: FlagSpec[] = [
  {
    name: '--sigma',
    valueStyle: 'either',
    repeatable: true,
    description: 'One input uncertainty as key=u, in the input\'s unit. A temperature uncertainty in degC is a difference.',
  },
  {
    name: '--corr',
    valueStyle: 'either',
    repeatable: true,
    description: 'A pairwise correlation as a,b=rho, used with --sigma.',
  },
  JSON_FLAG,
];

const HELP = `upt evaluate <be-NN | case-id> key=value[unit] ...
        Numerically evaluate a closed-form / spacetime bridge (BE-51/52/55..65),
        or an applied case: a whole measurement problem with its parent and
        scalar equations, observable, conditions, regime checks and a route
        to a measurement comparison. A case whose regime check fails prints
        its outputs as NOT QUALIFIED and exits 3.
        e.g.  upt evaluate case-resistor-noise T_K=300 R_ohm=1kohm
              R_in_ohm=1Mohm C_in_F=20pF f_lo_Hz=0 f_hi_Hz=10kHz t_avg_s=10
        Every input is declared: its unit, its meaning, and for a length what
        it measures (a radius, a separation, a semi-major axis). A value may
        carry a unit (d_m=1um, R_ohm=1kohm, T_yr=88d, M_kg=1Msun) or an
        expression of constants and units (M_kg=1*M_sun, v=0.6*c); it is
        converted into the declared unit only when the dimensions agree, and a
        bare number is in the declared unit. The same reader accepts --sigma. An absolute temperature in degC
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
        e.g.  upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=3 --sigma R_ohm=10
        be-51 and be-52 are weak-field formulas. When the impact parameter, or
        the periapsis a(1-e), is not above 10 Schwarzschild radii, the number
        is still printed and a warning names that cut (the same b ≥ 10 r_s cut
        be-51's graph domain already uses). Exit stays 0.`;

/** Unit and geometry trouble is a bad value (exit 1); a missing `=` is a usage error (exit 2). */
function resolveInputs(api: CommandCtx['api'], label: string, parameters: readonly EvaluatorParameter[], args: readonly string[]) {
  for (const a of args) {
    if (a.indexOf('=') <= 0) throw new UsageError(`upt evaluate: '${a}' must be key=value (e.g. mu_e=2). See \`upt help\`.`);
  }
  try {
    return api.resolveEvaluatorInputs(parameters, args);
  } catch (e) {
    if (e instanceof api.UnitError) throw new CliError(`upt evaluate: ${label}: ${e.message}`);
    throw e;
  }
}

/** `d_m [m] plate separation d (geometry: separation) — the gap …` */
function describeParameter(p: EvaluatorParameter): string {
  const extras = [
    ...(p.geometry === undefined ? [] : [`geometry: ${p.geometry}`]),
    ...(p.temperature === undefined ? [] : ['an absolute temperature; degC adds 273.15']),
    ...(p.optional === true ? ['optional'] : []),
  ];
  const alts = (p.alternates ?? []).map((a) => `or give ${a.key}, ${a.meaning}`);
  return (
    `${p.key} [${p.unit || 'dimensionless'}] ${p.quantity} ${p.symbol}${extras.length > 0 ? ` (${extras.join('; ')})` : ''} — ${p.meaning}` +
    (alts.length > 0 ? `; ${alts.join('; ')}` : '')
  );
}

/** A curvature term above this fraction of the linear term marks the linearization unreliable. */
const NONLINEAR_FRACTION = 0.1;

/**
 * be-51's graph domain already refuses `b < 10 r_s`. `upt evaluate` calls the
 * closed form anyway (`b > 0` is the only throw). This note names that cut
 * when the impact parameter, or a periapsis `a(1−e)`, is inside it. The
 * number is unchanged. Solar-limb deflection and Mercury sit far outside it.
 * @internal
 */
export function weakFieldDomainNote(
  bridgeId: number,
  inputs: Readonly<Record<string, number>>,
): string | undefined {
  const mass = inputs.M_kg;
  if (!(mass > 0) || !Number.isFinite(mass)) return undefined;
  const rs = (2 * G_SI * mass) / (C_SI * C_SI);
  if (!(rs > 0) || !Number.isFinite(rs)) return undefined;
  if (bridgeId === 51) {
    const b = inputs.b_m;
    if (b > 0 && b <= 10 * rs) {
      return (
        `WARNING: weak-field formula α = 4GM/(b c²) assumes b ≫ r_s = 2GM/c² ` +
        `(be-51's graph domain requires b ≥ 10 r_s). Here b = ${b} m and r_s = ${rs} m ` +
        `(b/r_s = ${b / rs}). The number above is that formula anyway; it is not the strong-field deflection.`
      );
    }
  }
  if (bridgeId === 52) {
    const a = inputs.a_m;
    const e = inputs.e;
    if (a > 0 && e >= 0 && e < 1) {
      const peri = a * (1 - e);
      if (peri <= 10 * rs) {
        return (
          `WARNING: weak-field formula for the perihelion advance assumes periapsis a(1−e) ≫ r_s = 2GM/c² ` +
          `(the same 10 r_s cut as be-51's graph domain). Here a(1−e) = ${peri} m and r_s = ${rs} m ` +
          `(a(1−e)/r_s = ${peri / rs}). The number above is that formula anyway.`
        );
      }
    }
  }
  return undefined;
}

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
  spec: { readonly parameters: readonly EvaluatorParameter[] },
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
        u = bindingInUnit(m[2]!, p.unit, 'difference').value;
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

const CASE_NOT_INCLUDED =
  "the case's numerical error; model discrepancy beyond the regime checks; the regime checks are evaluated at the given inputs, not at ±u";

interface Uncertainty {
  readonly block: Record<string, unknown>;
  readonly propagated: ReturnType<typeof propagateUncertainty>;
  readonly exactInputs: string[];
  readonly notIncluded: string;
}

function uncertaintyOf(
  ctx: CommandCtx,
  spec: { readonly parameters: readonly EvaluatorParameter[] },
  inputs: Readonly<Record<string, number>>,
  f: (inputs: Record<string, number>) => Record<string, unknown>,
  notIncluded: string,
): Uncertainty | null {
  const sigmaArgs = ctx.args.flags.get('sigma') ?? [];
  const corrArgs = ctx.args.flags.get('corr') ?? [];
  if (sigmaArgs.length === 0 && corrArgs.length > 0) throw new CliError('upt evaluate: --corr needs --sigma for both inputs');
  if (sigmaArgs.length === 0) return null;
  const { sigma, corr } = parseUncertainty(ctx.api, spec, sigmaArgs, corrArgs, inputs);
  const propagated = propagateUncertainty(f, inputs, sigma, corr);
  const exactInputs = Object.keys(inputs).filter((k) => !(k in sigma));
  return {
    block: {
      method: 'first-order propagation (GUM law), central-difference sensitivities, curvature check at ±u per input',
      sigma,
      correlations: Object.fromEntries(corr),
      outputs: propagated,
      exactInputs,
      notIncluded,
    },
    propagated,
    exactInputs,
    notIncluded,
  };
}

function printUncertainty(out: CommandCtx['out'], u: Uncertainty): void {
  const g = (x: number | null): string => (x === null ? 'unavailable' : Number(x.toPrecision(3)).toString());
  out('  uncertainty (first-order, GUM law; a sensitivity is not an uncertainty, the contribution is c·u):');
  for (const [name, p] of Object.entries(u.propagated)) {
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
  const corr = Object.entries((u.block as { correlations: Record<string, number> }).correlations);
  out(`    correlations: ${corr.length === 0 ? 'none given (inputs independent)' : corr.map(([k, r]) => `${k} = ${r}`).join(', ')}`);
  if (u.exactInputs.length > 0) out(`    treated as exact (no --sigma): ${u.exactInputs.join(', ')} — a choice, not a measurement`);
  out(`    not included: ${u.notIncluded}`);
}

type Resolved = ReturnType<typeof resolveInputs>['resolved'];

const conversionsOf = (resolved: Resolved) =>
  resolved
    .filter((r) => r.note !== undefined)
    .map((r) => ({ key: r.key, given: r.given, value: r.value, unit: r.unit, ...(r.via === undefined ? {} : { via: r.via }), note: r.note }));

function printInputs(out: CommandCtx['out'], parameters: readonly EvaluatorParameter[], inputs: Readonly<Record<string, number>>, resolved: Resolved): void {
  out('  inputs: ' + Object.entries(inputs).map(([k, v]) => `${k}=${v}`).join(', '));
  for (const p of parameters) {
    const r = resolved.find((x) => x.key === p.key);
    out(`    ${describeParameter(p)}${r?.note === undefined ? '' : `\n      converted: ${r.note}`}`);
  }
}

const withUnit = (v: number | null, unit: string): string => (v === null ? 'undefined here (its premise fails, or it needs an optional input not given)' : `${v}${unit === '' ? '' : ` ${unit}`}`);

/** A violated regime check is a check that ran and failed: exit 3. */
async function runCase(ctx: CommandCtx, c: AppliedCase, rest: readonly string[]): Promise<number> {
  const { args, api, out } = ctx;
  const { inputs, resolved } = resolveInputs(api, c.id, c.parameters, rest);
  let result: CaseResult;
  try {
    result = api.runAppliedCase(c.id, inputs);
  } catch (e) {
    throw new CliError((e as Error).message);
  }
  const u = uncertaintyOf(ctx, c, inputs, (i) => ({ ...api.runAppliedCase(c.id, i).outputs }), CASE_NOT_INCLUDED);
  const failed = result.checks.filter((k) => !k.holds).map((k) => k.id);
  const code = failed.length === 0 ? 0 : 3;
  const regimeLine = c.regimeAt?.(inputs, result.outputs) ?? '';

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'evaluate',
        result: {
          caseId: c.id,
          title: c.title,
          qualified: failed.length === 0,
          failedChecks: failed,
          inputs,
          parameters: c.parameters,
          conversions: conversionsOf(resolved),
          governing: c.governing,
          observable: c.observable,
          outputs: c.outputs.map((o) => ({ ...o, value: result.outputs[o.key] ?? null })),
          checks: result.checks,
          ...(c.comparison === undefined ? {} : { comparison: c.comparison }),
          conditions: c.conditions,
          unchecked: result.unchecked,
          notIncluded: c.notIncluded,
          measurement: c.measurement,
          links: c.links,
          ...(regimeLine === '' ? {} : { regimeAt: regimeLine }),
          ...(u === null ? {} : { uncertainty: u.block }),
        },
      },
      ctx.write,
    );
    return code;
  }

  out(`\n● ${c.id}  ${c.title}`);
  out('  parent equations (what the scalar result simplifies; not evaluated as the answer):');
  for (const e of c.governing.parent) out(`    ${e}`);
  out('  scalar simplification evaluated:');
  for (const e of c.governing.scalar) out(`    ${e}`);
  out(`  kept and dropped: ${c.governing.distinction}`);
  printInputs(out, c.parameters, inputs, resolved);
  out('  conditions (boundary, initial, equilibrium):');
  for (const s of c.conditions) out(`    - ${s}`);
  out('  outputs:');
  for (const o of c.outputs) out(`    ${o.key} = ${withUnit(result.outputs[o.key] ?? null, o.unit)} — ${o.meaning}`);
  const obs = c.outputs.find((o) => o.key === c.observable)!;
  out(`  observable: ${obs.key} = ${withUnit(result.outputs[obs.key] ?? null, obs.unit)}`);
  out('  regime checks (at the given inputs):');
  if (regimeLine !== '') out(`  regime coordinates: ${regimeLine}`);
  for (const k of result.checks) {
    out(`    ${k.holds ? 'holds   ' : 'VIOLATED'}  ${k.id}: ${k.quantity} = ${Number(k.value.toPrecision(6))} ${k.op} ${k.bound} — ${k.premise} (${k.threshold})`);
  }
  if (c.comparison !== undefined) {
    const d = result.outputs[c.comparison.deviationKey] ?? null;
    out(
      `  comparison (reported beside the checks, not one of them): ${c.comparison.valueKey} / ${c.comparison.referenceKey} − 1 = ` +
        `${d === null ? 'undefined here' : Number(d.toPrecision(6))} — against ${c.comparison.reference}; ${c.comparison.method}`,
    );
  }
  if (result.unchecked.length > 0) {
    out('  stated, not checked:');
    for (const s of result.unchecked) out(`    - ${s}`);
  }
  out(
    failed.length === 0
      ? '  QUALIFIED: every regime check holds at these inputs.'
      : `  NOT QUALIFIED: ${failed.join(', ')} violated — the outputs above are outside the stated regime and are not a ` +
          'qualified prediction at these inputs.',
  );
  if (u !== null) printUncertainty(out, u);
  out('  not included in the model:');
  for (const s of c.notIncluded) out(`    - ${s}`);
  out('  compare with a measurement:');
  for (const s of c.measurement) out(`    - ${s}`);
  out('  rests on:');
  for (const l of c.links) out(`    ${l.id} — ${l.role}`);
  return code;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const [target, ...rest] = args.positionals;

  if (!target) {
    const specs = [...api.BRIDGE_EVALUATORS.values()];
    const cases = [...api.APPLIED_CASES.values()];
    if (args.flags.has('json')) {
      emitJson(
        {
          command: 'evaluate',
          result: [
            ...specs.map((s) => ({ bridgeId: s.bridgeId, name: s.name, inputKeys: s.inputKeys, parameters: s.parameters })),
            ...cases.map((c) => ({ caseId: c.id, name: c.title, inputKeys: c.parameters.map((p) => p.key), parameters: c.parameters })),
          ],
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
    out('\nApplied cases  (upt evaluate <case-id> key=value[unit] ...; a violated regime check exits 3)');
    for (const c of cases) {
      out(`  ${c.id}  ${c.title}`);
      for (const p of c.parameters) out(`      ${describeParameter(p)}`);
      out(`      e.g. upt evaluate ${c.id} ${c.examples.valid.args.join(' ')}`);
    }
    out('\n  A value may carry a unit (d_m=1um, T_K=25degC, R_ohm=1kohm); a bare number is in the declared unit.');
    return 0;
  }

  const appliedCase = api.APPLIED_CASES.get(target.toLowerCase());
  if (appliedCase !== undefined) return runCase(ctx, appliedCase, rest);

  const m = /^be-(\d+)$/i.exec(target);
  if (!m) {
    throw new UsageError(
      `upt evaluate: '${target}' is not a bridge id (be-NN) or a case (${[...api.APPLIED_CASES.keys()].join(', ')}). See \`upt help\`.`,
    );
  }
  const id = Number(m[1]);
  const spec = api.BRIDGE_EVALUATORS.get(id);
  if (spec === undefined) {
    throw new CliError(missingEvaluatorMessage(id));
  }
  const { inputs, resolved } = resolveInputs(api, `be-${spec.bridgeId}`, spec.parameters, rest);

  let result: unknown;
  try {
    result = api.evaluateBridge(id, inputs);
  } catch (e) {
    // unknown-id / missing-input / out-of-range → bad value, exit 1 (documented contract).
    throw new CliError((e as Error).message);
  }

  const u = uncertaintyOf(ctx, spec, inputs, (i) => api.evaluateBridge(id, i) as Record<string, unknown>, NOT_INCLUDED);
  const domainNote = weakFieldDomainNote(id, inputs);
  const formulaNote = id === 65 ? JEANS_FORMULA_NOTE : undefined;
  const hbarNote = id === 56 ? HBAR_TRUNCATION_NOTE : undefined;

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'evaluate',
        result: {
          bridgeId: id,
          inputs,
          parameters: spec.parameters,
          conversions: conversionsOf(resolved),
          output: result,
          ...(domainNote === undefined ? {} : { domainNote }),
          ...(formulaNote === undefined ? {} : { formulaNote }),
          ...(hbarNote === undefined ? {} : { hbarNote }),
          ...(u === null ? {} : { uncertainty: u.block }),
        },
      },
      ctx.write,
    );
    return 0;
  }
  out(`\n● be-${id}  ${spec.name}`);
  printInputs(out, spec.parameters, inputs, resolved);
  for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
    out(`  ${k} = ${typeof v === 'number' ? v : JSON.stringify(v)}`);
  }
  if (domainNote !== undefined) out(`  ${domainNote}`);
  if (formulaNote !== undefined) out(`  ${formulaNote}`);
  if (hbarNote !== undefined) out(`  ${hbarNote}`);
  if (u !== null) printUncertainty(out, u);
  return 0;
}

export const command: Command = {
  name: 'evaluate',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Evaluate a closed-form bridge or an applied case, with units on every input.',
  example: 'upt evaluate be-63 mu_e=2',
  group: 'evaluate',
  run,
};

registerCommand(command);
