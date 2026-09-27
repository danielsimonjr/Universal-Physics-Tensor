/**
 * `upt path` — the route between two models of a family, and what that route
 * actually WARRANTS.
 *
 * Two answers, kept apart on purpose, because `atlas/path-bound.ts` keeps them
 * apart: `findPath` says a chain of bridges exists, and that says nothing about
 * whether the chain supports a claim. `boundPath` says what it supports, and
 * its answer is a DISCRIMINATED UNION whose `'no-claim'` member carries no
 * number at all. This command never prints a bound for a no-claim, and never
 * synthesizes one — a precise-looking composed number over an undefined
 * composite is the most dangerous thing this tool could emit.
 *
 * A no-claim is an ANSWER, not an error: `upt path` exits 0 when the
 * composition table declines to compose. The refusal is the result.
 *
 * Horizons are evaluated only when `--at` supplies a `t`. An unevaluated
 * horizon is reported as unevaluated, on the same rule that makes
 * `regimeHolds` tri-state.
 *
 * The REGIME of every bridge on the path is checked at the `--at` point too.
 * A bound is claimed only inside its bridge's regime, so a horizon that holds
 * says nothing when the point is outside the regime: this command once printed
 * the pendulum bound and "all hold" at θ0 = 0.8, where the bound's own regime
 * is θ0 ≤ 0.5 and the true error is 2.6 times the bound. An unchecked regime
 * is reported as unknown, never as a pass.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { CliError, EXIT_CHECK_FAILED } from '../errors.js';
import { emitJson } from '../output.js';
import { parseAt, resolveAtPoint, showInequality } from './regime.js';
import { missingForComposite, routeClaim, selectRoute } from './_atlas-route.js';

const FLAGS: FlagSpec[] = [
  { name: '--at', valueStyle: 'either', repeatable: true },
  { name: '--sweep', valueStyle: 'either' },
  { name: '--csv', valueStyle: 'none' },
  { name: '--tolerance', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt path <from> <to> [--at group=value ...] [--tolerance=[observable:]EPS]
        [--sweep name=lo:hi:n[:log]] [--csv] [--json]
        The chain of bridges from one model to another (across families when
        a bridge ends in another family's model), the relation the chain
        composes to, the composed (K, delta) with the norm it holds in,
        whether every bridge's REGIME holds at --at (the bound is claimed only
        inside it), and whether every horizon still holds (pass t=<time> plus
        the parameters, e.g. --at theta0=0.2 T0=1 t=10).
        When the composition table declines to compose the relations, the path
        carries NO bound: the command prints 'no composite claim' and exits 0.
        That refusal is the answer, and no number is invented in its place.
        --sweep name=lo:hi:n[:log] evaluates the path at n samples (2 to 200,
        endpoints included) of one parameter not fixed by --at: per row the
        regime, the horizon and the closed-form point error. Nothing is
        integrated. A row outside a regime or past a horizon carries no
        error, because no bound is claimed there. A sweep exits 0: each row is
        its own verdict. --csv writes the rows as CSV.
        --tolerance=EPS asks whether the path is accurate enough: ADEQUATE only
        when every regime holds, every horizon holds at the given t, and the
        closed-form point error is <= EPS; INADEQUATE (exit 3) when any of
        them fails; UNDETERMINED when the point does not settle it. EPS is in
        the bound's own norm. With --sweep, each row is judged.
        --tolerance=<observable>:EPS asks in ANOTHER observable, only through
        a translation the bridge declares (ab-pendulum-linear: phase, in rad,
        t in the unit of T0). It reports the horizon t* at which the
        accumulated error reaches EPS, ADEQUATE iff t <= t* (inclusive), and
        the translation's own evidence, derived by running its witness. A path
        with no declared translation is UNDETERMINED and says so.
        e.g.  upt path model-pendulum model-spring --at theta0=0.2 T0=1 t=10
              upt path model-pendulum model-spring --at T0=1 t=10 --sweep theta0=0.1:0.8:8
              upt path model-pendulum model-spring --at theta0=0.3 T0=2 t=5 --tolerance=phase:0.1`;

const EPISTEMICS =
  'a path EXISTING is not a warrant: the bound is the warrant. A no-claim carries no number, ' +
  'and none is synthesized for it.';

/** The literal phrase the no-composite-claim case must print. */
const NO_COMPOSITE_PHRASE = 'no composite claim';

interface RegimeReport {
  bridgeId: string;
  ok: boolean | 'unknown';
  violated: string[];
  unchecked: string[];
  /** The bridge's prose side conditions: stated, never evaluated here. */
  premisesNotChecked?: string[];
}

interface HorizonReport {
  bridgeId: string;
  horizon: string;
  holds: boolean | null;
}

const MAX_SAMPLES = 200;

/** `name=lo:hi:n` or `name=lo:hi:n:log`, bounded; the endpoints are both sampled. */
export function parseSweep(spec: string): { name: string; values: number[]; spacing: 'linear' | 'log' } {
  const m = /^([^=\s]+)=([^:]+):([^:]+):([^:]+)(?::(linear|log))?$/.exec(spec);
  if (m === null) throw new CliError(`upt path: --sweep '${spec}' is not name=lo:hi:n[:log], e.g. --sweep theta0=0.05:0.9:18`);
  const [, name, loS, hiS, nS, sp] = m as unknown as [string, string, string, string, string, string | undefined];
  const lo = Number(loS);
  const hi = Number(hiS);
  const n = Number(nS);
  const spacing = sp === 'log' ? 'log' : 'linear';
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(lo < hi)) {
    throw new CliError(`upt path: --sweep '${spec}' needs finite lo < hi`);
  }
  if (!Number.isInteger(n) || n < 2 || n > MAX_SAMPLES) {
    throw new CliError(`upt path: --sweep '${spec}' needs an integer sample count from 2 to ${MAX_SAMPLES}`);
  }
  if (spacing === 'log' && lo <= 0) throw new CliError(`upt path: --sweep '${spec}' is log-spaced, so lo must be > 0`);
  const values = Array.from({ length: n }, (_, i) =>
    spacing === 'log' ? lo * (hi / lo) ** (i / (n - 1)) : lo + ((hi - lo) * i) / (n - 1),
  );
  return { name, values, spacing };
}

type Bridges = readonly import('../../cli-api.js').AtlasBridge[];
type Translation = import('../../cli-api.js').ObservableTranslation;

/** The translations a path can use: those of its bridge, when it is one bridge. */
function pathTranslations(api: CommandCtx['api'], bridges: Bridges): readonly Translation[] {
  return bridges.length === 1 ? api.translationsOf(bridges[0]!.id) : [];
}

/** What a tolerance in the bound's own norm is judged in, and what else this path can be asked in. */
function toleranceScope(api: CommandCtx['api'], bridges: Bridges): string {
  const declared = pathTranslations(api, bridges);
  if (declared.length === 0) {
    return "judged in the bound's own norm only; no translation to another observable (phase, trajectory, amplitude) is encoded for this path";
  }
  const asks = declared.map((t) => `--tolerance=${t.observable}:EPS (${t.unit})`).join(', ');
  return `judged in the bound's own norm only; ${bridges[0]!.id} declares a translation, asked with ${asks}`;
}

/**
 * Whether the path is adequate for a requested tolerance at one point: every
 * regime holds, every horizon holds at the given t, and the closed-form point
 * error is within it. Anything the point does not settle is `undetermined`,
 * never `adequate`.
 * @internal
 */
export function judgeTolerance(
  tolerance: number,
  e: Evaluation,
  tGiven: boolean,
): { verdict: 'adequate' | 'inadequate' | 'undetermined'; reason: string } {
  if (e.allRegimesHold === false) return { verdict: 'inadequate', reason: 'outside a regime on the path: no bound is claimed' };
  if (e.allRegimesHold === 'unknown') return { verdict: 'undetermined', reason: 'a regime coordinate was not supplied' };
  if (e.horizons.length > 0 && !tGiven) return { verdict: 'undetermined', reason: 'no t= given, so the horizon was not evaluated' };
  if (e.horizons.length > 0 && !e.allHold) return { verdict: 'inadequate', reason: 'past the horizon: the bound is not claimed there' };
  if (e.pointBound === null) return { verdict: 'undetermined', reason: e.pointBoundReason ?? 'no point bound' };
  return e.pointBound.delta <= tolerance
    ? { verdict: 'adequate', reason: `error ${e.pointBound.delta} <= tolerance ${tolerance}` }
    : { verdict: 'inadequate', reason: `error ${e.pointBound.delta} exceeds tolerance ${tolerance}` };
}

/** `EPS` in the bound's own norm (`observable: null`), or `<observable>:EPS`. */
export interface ToleranceRequest {
  observable: string | null;
  value: number;
}

export function parseTolerance(raw: string | undefined): ToleranceRequest | null {
  if (raw === undefined) return null;
  const colon = raw.indexOf(':');
  const observable = colon === -1 ? null : raw.slice(0, colon);
  const number = colon === -1 ? raw : raw.slice(colon + 1);
  if (observable !== null && !/^[a-z][a-z-]*$/.test(observable)) {
    throw new CliError(`upt path: --tolerance=${raw} is not EPS or <observable>:EPS, e.g. --tolerance=phase:0.1`);
  }
  const v = Number(number);
  if (number === '' || !Number.isFinite(v) || v <= 0) throw new CliError(`upt path: --tolerance=${raw} must be a finite number > 0`);
  return { observable, value: v };
}

const showTolerance = (r: ToleranceRequest, unit?: string): string =>
  r.observable === null ? String(r.value) : `${r.observable}:${r.value}${unit === undefined ? '' : ` ${unit}`}`;

/** A tolerance in another observable, judged through the path's declared translation. */
interface ObservableJudgement {
  verdict: 'adequate' | 'inadequate' | 'undetermined';
  reason: string;
  translation: Translation | null;
  /** The bound's quantity at this point, in the bound's own norm. */
  boundErrorAtPoint: number | null;
  /** The bound's supremum over its domain, in the same norm. */
  domainSupremum: number | null;
  /** The accumulated error in the observable at the given t. */
  observableErrorAt: number | null;
  /** t*: where the accumulated error reaches the tolerance at this point. */
  horizon: number | null;
  /** t* from the domain supremum: the shortest over the bridge's domain. */
  domainHorizon: number | null;
  /** The bridge's own horizon at t; `null` when t was not given. */
  bridgeHorizonHolds: boolean | null;
}

/**
 * Whether the path is adequate for a tolerance in another observable. Only a
 * one-bridge path whose bridge declares a translation into that observable is
 * judged; the regime, the point bound and the bridge's own horizon still gate
 * it, and anything the point does not settle is `undetermined`.
 * @internal
 */
export function judgeObservable(
  api: CommandCtx['api'],
  request: ToleranceRequest & { observable: string },
  bridges: Bridges,
  e: Evaluation,
  at: Readonly<Record<string, number>>,
): ObservableJudgement {
  const tr = pathTranslations(api, bridges).find((x) => x.observable === request.observable) ?? null;
  const none = {
    translation: tr,
    boundErrorAtPoint: e.pointBound?.delta ?? null,
    domainSupremum: bridges.length === 1 ? (bridges[0]!.bound?.delta ?? null) : null,
    observableErrorAt: null,
    horizon: null,
    domainHorizon: null,
    bridgeHorizonHolds: null,
  };
  if (tr === null) {
    const reason =
      bridges.length !== 1
        ? `no translation into '${request.observable}' is encoded for a path of ${bridges.length} bridges: translations are declared per bridge and none composes`
        : `no translation from '${bridges[0]!.bound?.norm ?? 'no bound'}' into '${request.observable}' is encoded for ${bridges[0]!.id}` +
          (api.translationsOf(bridges[0]!.id).length === 0
            ? ''
            : ` (it declares: ${api.translationsOf(bridges[0]!.id).map((x) => x.observable).join(', ')})`);
    return { verdict: 'undetermined', reason, ...none };
  }
  if (e.allRegimesHold === false) return { verdict: 'inadequate', reason: 'outside a regime on the path: no bound is claimed', ...none };
  if (e.allRegimesHold === 'unknown') return { verdict: 'undetermined', reason: 'a regime coordinate was not supplied', ...none };
  if (e.pointBound === null) return { verdict: 'undetermined', reason: e.pointBoundReason ?? 'no point bound', ...none };
  const missing = tr.parameters.filter((p) => at[p] === undefined);
  if (missing.length > 0) {
    return { verdict: 'undetermined', reason: `the translation needs ${missing.join(', ')} (via --at)`, ...none };
  }
  const bound = bridges[0]!.bound!;
  const eps = e.pointBound.delta;
  const horizon = tr.horizonFor(eps, request.value, at);
  const domainHorizon = tr.horizonFor(bound.delta, request.value, at);
  if (Number.isNaN(horizon)) return { verdict: 'undetermined', reason: 'the translation is undefined at this point', ...none };
  const t = at['t'];
  const judged = { ...none, horizon, domainHorizon };
  if (t === undefined) {
    return {
      verdict: 'undetermined',
      reason: `no t= given; the ${tr.observable} horizon here is t* = ${horizon} (${tr.timeUnit})`,
      ...judged,
    };
  }
  const observableErrorAt = tr.errorAt(eps, t, at);
  const bridgeHorizonHolds = bound.horizonHolds(t, at);
  const withT = { ...judged, observableErrorAt, bridgeHorizonHolds };
  if (!bridgeHorizonHolds) {
    return { verdict: 'inadequate', reason: `past ${bridges[0]!.id}'s own horizon (${bound.horizon}): the bound is not claimed there`, ...withT };
  }
  return t <= horizon
    ? { verdict: 'adequate', reason: `t = ${t} <= t* = ${horizon}: accumulated ${tr.observable} error ${observableErrorAt} ${tr.unit} <= ${request.value}`, ...withT }
    : { verdict: 'inadequate', reason: `t = ${t} > t* = ${horizon}: accumulated ${tr.observable} error ${observableErrorAt} ${tr.unit} exceeds ${request.value}`, ...withT };
}

/** The translation's evidence, DERIVED by running its witnesses now; never the bound's. */
function translationEvidence(api: CommandCtx['api'], tr: Translation) {
  const runs = tr.checks.map((c) => api.runTranslationCheck(c));
  const passing = new Set(runs.filter((r) => r.status === 'checked').map((r) => r.witnessId));
  return {
    tags: [...api.deriveEvidence({ witnesses: tr.witnesses }, passing)].sort(),
    witnesses: runs.map((r) => ({
      id: r.witnessId,
      claim: tr.witnesses.find((w) => w.id === r.witnessId)?.tolerance ?? null,
      status: r.status,
      detail: r.detail,
    })),
    note: "the translation's own evidence, distinct from the bound's; it carries no formal reference",
  };
}

function thresholdOrigin(request: ToleranceRequest, tr: Translation, bridges: Bridges): string {
  return (
    `t* is derived from the requested tolerance ${request.value} ${tr.unit} through the translation; ` +
    `${bridges[0]!.id}'s own horizon (${bridges[0]!.bound!.horizon}) is the record's fixed threshold, judged separately`
  );
}

function observableReport(
  request: ToleranceRequest,
  j: ObservableJudgement,
  bridges: Bridges,
  evidence: ReturnType<typeof translationEvidence> | null,
) {
  const tr = j.translation;
  return {
    observable: request.observable,
    value: request.value,
    verdict: j.verdict,
    reason: j.reason,
    ...(tr === null
      ? { translation: null }
      : {
          unit: tr.unit,
          translation: {
            bridgeId: tr.bridgeId,
            fromNorm: tr.fromNorm,
            definition: tr.definition,
            derivation: tr.derivation,
            premisesNotChecked: [...tr.premises],
            timeUnit: tr.timeUnit,
            notCovered: [...tr.notCovered],
          },
          boundErrorAtPoint: j.boundErrorAtPoint,
          domainSupremum: j.domainSupremum,
          observableErrorAt: j.observableErrorAt,
          horizon: j.horizon,
          domainHorizon: j.domainHorizon,
          horizonConvention: tr.boundary,
          thresholdOrigin: thresholdOrigin(request, tr, bridges),
          bridgeHorizon: { horizon: bridges[0]!.bound!.horizon, holds: j.bridgeHorizonHolds },
          evidence,
        }),
  };
}

function printObservable(
  out: CommandCtx['out'],
  request: ToleranceRequest,
  j: ObservableJudgement,
  bridges: Bridges,
  evidence: ReturnType<typeof translationEvidence> | null,
): void {
  const tr = j.translation;
  out(`  tolerance ${showTolerance(request, tr?.unit)}: ${j.verdict.toUpperCase()} — ${j.reason}`);
  if (tr === null) return;
  const show = (v: number | null): string => (v === null ? 'not evaluated' : String(v));
  out(`    translation (${tr.bridgeId}): ${tr.fromNorm} → ${tr.observable}: ${tr.definition}`);
  out(`      ${tr.derivation}`);
  out(`      premises not machine-checked: ${tr.premises.join('; ')}`);
  out(`    ${bridges[0]!.bound!.norm} at this point: ${show(j.boundErrorAtPoint)}; domain supremum: ${show(j.domainSupremum)}`);
  out(`    accumulated ${tr.observable} error at t: ${j.observableErrorAt === null ? 'not evaluated' : `${j.observableErrorAt} ${tr.unit}`}`);
  out(`    ${tr.observable} horizon t* at this point: ${show(j.horizon)} (${tr.timeUnit}; ${tr.boundary})`);
  out(`    ${tr.observable} horizon over the whole domain ${bridges[0]!.bound!.domain} (from the supremum): ${show(j.domainHorizon)}`);
  out(`    threshold origin: ${thresholdOrigin(request, tr, bridges)}`);
  out(
    `    ${bridges[0]!.id}'s own horizon at t: ${j.bridgeHorizonHolds === null ? 'not evaluated' : j.bridgeHorizonHolds ? 'holds' : 'VIOLATED'} — ${bridges[0]!.bound!.horizon}`,
  );
  out(`    not covered by this translation: ${tr.notCovered.join('; ')}`);
  if (evidence !== null) {
    out(`    translation evidence: ${evidence.tags.join(', ')} (${evidence.note})`);
    for (const w of evidence.witnesses) out(`      - ${w.id} [numeric, run now; ${w.claim ?? 'no claim stated'}]: ${w.status} — ${w.detail}`);
  }
}

type Evaluation = {
  allRegimesHold: boolean | 'unknown';
  horizons: readonly HorizonReport[];
  allHold: boolean;
  pointBound: { K: number; delta: number } | null;
  pointBoundReason: string | null;
};

/**
 * One path evaluated at every sample of one parameter. Each row is what the
 * point command would say there; no trajectory is integrated and no value is
 * interpolated. A row outside a regime or past a horizon carries no error,
 * because no bound is claimed there, and it is not joined to its neighbours.
 */
function runSweep(
  ctx: CommandCtx,
  s: {
    from: string;
    to: string;
    point: Readonly<Record<string, number>>;
    bridges: readonly import('../../cli-api.js').AtlasBridge[];
    result: { kind: 'bound'; norm?: string | null | undefined; bound: { K: number; delta: number } } | { kind: 'no-claim'; reason: string };
    evaluateAt: (at: Readonly<Record<string, number>>) => Evaluation;
    spec: string;
    tolerance: ToleranceRequest | null;
    scope: string;
    judgeRow: (e: Evaluation, at: Readonly<Record<string, number>>, tGiven: boolean) => {
      verdict: string;
      observableErrorAt?: number | null;
      horizon?: number | null;
    };
    translation: { tr: Translation; evidence: ReturnType<typeof translationEvidence> } | null;
  },
): number {
  const { out, args } = ctx;
  const sweep = parseSweep(s.spec);
  if (sweep.name in s.point) {
    throw new CliError(`upt path: '${sweep.name}' is both swept and fixed by --at; give it one role`);
  }
  const rows = sweep.values.map((value) => {
    const at = { ...s.point, [sweep.name]: value };
    const e = s.evaluateAt(at);
    const regime = e.allRegimesHold === true ? 'holds' : e.allRegimesHold === false ? 'violated' : 'unknown';
    const horizon = e.horizons.length === 0 || e.horizons[0]!.holds === null ? 'not-evaluated' : e.allHold ? 'holds' : 'violated';
    let error: number | null = e.pointBound?.delta ?? null;
    let reason = s.result.kind === 'no-claim' ? 'no composite claim' : e.pointBoundReason;
    if (error !== null && horizon === 'violated') {
      error = null;
      reason = 'past the horizon: the bound is not claimed there';
    }
    const judged = s.tolerance === null ? null : s.judgeRow(e, at, 't' in s.point || sweep.name === 't');
    return {
      value,
      regime,
      horizon,
      error,
      ...(error === null && reason !== null ? { reason } : {}),
      ...(judged === null ? {} : { adequacy: judged.verdict }),
      ...(judged?.horizon === undefined ? {} : { observableHorizon: judged.horizon, observableError: judged.observableErrorAt ?? null }),
    };
  });
  const tally = (k: 'regime' | 'horizon', v: string) => rows.filter((r) => r[k] === v).length;
  const evaluated =
    s.result.kind === 'bound'
      ? `the path's closed-form point bound at each sample (the exact error of the reduced model in the norm '${s.result.norm ?? 'none stated'}'); ` +
        'nothing is integrated and no trajectory is produced'
      : `no error: the path carries no composite claim ('${s.result.reason}'); rows report regime and horizon status only`;
  const fixed = Object.entries(s.point).map(([k, v]) => `${k}=${v}`).join(' ') || 'none';

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'path',
        epistemics: EPISTEMICS,
        options: { from: s.from, to: s.to, at: s.point, sweep: { parameter: sweep.name, spacing: sweep.spacing, samples: rows.length } },
        result: {
          path: s.bridges.map((b) => b.id),
          kind: s.result.kind,
          ...(s.result.kind === 'bound' ? { domainSupremum: s.result.bound, norm: s.result.norm } : { reason: s.result.reason }),
          evaluated,
          ...(s.tolerance === null
            ? {}
            : s.tolerance.observable === null
              ? { tolerance: s.tolerance.value, toleranceScope: s.scope }
              : {
                  tolerance: s.tolerance.value,
                  toleranceObservable: s.tolerance.observable,
                  ...(s.translation === null
                    ? { translation: null }
                    : {
                        translation: {
                          bridgeId: s.translation.tr.bridgeId,
                          unit: s.translation.tr.unit,
                          boundary: s.translation.tr.boundary,
                          evidence: s.translation.evidence,
                        },
                      }),
                }),
          rows,
          tally: {
            inRegime: tally('regime', 'holds'),
            outsideRegime: tally('regime', 'violated'),
            regimeUnknown: tally('regime', 'unknown'),
            pastHorizon: tally('horizon', 'violated'),
          },
        },
      },
      ctx.write,
    );
    return 0;
  }
  if (args.flags.has('csv')) {
    const tol = s.tolerance !== null;
    ctx.write(`${sweep.name},regime,horizon,error,${tol ? 'adequacy,' : ''}reason\n`);
    for (const r of rows) {
      ctx.write(
        `${r.value},${r.regime},${r.horizon},${r.error ?? ''},${tol ? `${r.adequacy},` : ''}"${(r.reason ?? '').replace(/"/g, '""')}"\n`,
      );
    }
    return 0;
  }

  out(`\nupt path ${s.from} → ${s.to} — sweep ${sweep.name} over [${sweep.values[0]}, ${sweep.values[sweep.values.length - 1]}], ${rows.length} samples (${sweep.spacing}); fixed: ${fixed}`);
  out(`  path: ${s.bridges.map((b) => b.id).join(' → ')}`);
  if (s.result.kind === 'bound') out(`  domain supremum: K = ${s.result.bound.K} · delta = ${s.result.bound.delta}`);
  out(`  evaluated: ${evaluated}`);
  if (s.tolerance !== null && s.tolerance.observable === null) out(`  tolerance: ${s.tolerance.value}, ${s.scope}`);
  if (s.tolerance !== null && s.tolerance.observable !== null) {
    out(
      s.translation === null
        ? `  tolerance: ${showTolerance(s.tolerance)} — no translation into '${s.tolerance.observable}' is encoded for this path; every row is undetermined`
        : `  tolerance: ${showTolerance(s.tolerance, s.translation.tr.unit)} through ${s.translation.tr.bridgeId}'s declared translation (${s.translation.tr.boundary}); ` +
            `translation evidence: ${s.translation.evidence.tags.join(', ')}`,
    );
  }
  const tolCol = s.tolerance === null ? '' : `${'adequacy'.padEnd(13)} `;
  out(`  ${sweep.name.padEnd(12)} ${'regime'.padEnd(10)} ${'horizon'.padEnd(14)} ${tolCol}error`);
  for (const r of rows) {
    const a = r.adequacy === undefined ? '' : `${r.adequacy.padEnd(13)} `;
    out(`  ${String(Number(r.value.toPrecision(6))).padEnd(12)} ${String(r.regime).padEnd(10)} ${String(r.horizon).padEnd(14)} ${a}${r.error === null ? `— ${r.reason ?? ''}` : r.error}`);
  }
  out(
    `  in regime: ${tally('regime', 'holds')} · outside: ${tally('regime', 'violated')} · unknown: ${tally('regime', 'unknown')} · ` +
      `past the horizon: ${tally('horizon', 'violated')} of ${rows.length}`,
  );
  out('  (a row with no error is not joined to its neighbours: no bound is claimed there. A sweep exits 0; each row is its own verdict.)');
  return 0;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const wantJson = args.flags.has('json');
  const endpoints = args.positionals.filter((p) => !p.includes('='));
  const assignments = [...(args.flags.get('at') ?? []), ...args.positionals.filter((p) => p.includes('='))];

  if (endpoints.length !== 2) {
    throw new CliError(
      `upt path: exactly two model ids are required (got ${endpoints.length}); e.g. ` +
        '`upt path model-pendulum model-spring`',
    );
  }
  const [from, to] = endpoints as [string, string];
  const point = parseAt(assignments, 'path');
  const t = point['t'];

  const bridgeFamily = (id: string): string | undefined =>
    api.ATLAS_FAMILIES.find((f) => f.bridges.some((b) => b.id === id))?.family;
  const { bridges, fromFamily, toFamily } = selectRoute(api, from, to, 'path');

  if (bridges === null) {
    if (wantJson) {
      emitJson(
        { command: 'path', epistemics: EPISTEMICS, options: { from, to, at: point }, result: { path: null } },
        ctx.write,
      );
      return 0;
    }
    out(`\nupt path ${from} → ${to}`);
    out('  no chain of bridges connects these models; there is nothing to compose.');
    return 0;
  }

  if (bridges.length === 0) {
    if (wantJson) {
      emitJson(
        { command: 'path', epistemics: EPISTEMICS, options: { from, to, at: point }, result: { path: [] } },
        ctx.write,
      );
      return 0;
    }
    out(`\nupt path ${from} → ${to}`);
    out('  the endpoints are the same model: the path is empty and composes nothing.');
    return 0;
  }

  const result = routeClaim(api, bridges);
  const missing = result.kind === 'no-claim' && result.reason === 'no-composite-claim' ? missingForComposite(api, bridges) : [];

  const evaluateAt = (at: Readonly<Record<string, number>>) => {
    const horizons: HorizonReport[] = bridges
      .filter((b) => b.bound !== undefined)
      .map((b) => ({
        bridgeId: b.id,
        horizon: b.bound!.horizon,
        holds: at['t'] === undefined ? null : b.bound!.horizonHolds(at['t'], at),
      }));
    const allHold = horizons.every((h) => h.holds === true);

    // The same --at resolution as `upt regime`: group spellings, and groups derived
    // from their parameters. Unknown keys are not reported here, because horizon
    // parameters such as T0 and t are legitimate --at keys on a path.
    const { values: resolved } = resolveAtPoint(at, bridges.map((b) => b.regime));
    const regimes: RegimeReport[] = bridges.map((b) => {
      const check = api.regimeHolds(b.regime, resolved);
      return {
        bridgeId: b.id,
        ok: check.ok,
        violated: check.violated.map(showInequality),
        unchecked: check.unchecked.map(showInequality),
        ...(b.sideConditions.length > 0 ? { premisesNotChecked: [...b.sideConditions] } : {}),
      };
    });
    const allRegimesHold: boolean | 'unknown' = regimes.some((r) => r.ok === false)
      ? false
      : regimes.some((r) => r.ok === 'unknown')
        ? 'unknown'
        : true;

    // The bound AT the --at point (persona finding L9). Printed only when it is
    // PROVEN: every regime holds, every step has a closed-form deltaAt (the exact
    // error), and every value is finite. It is composed by the same rule as the
    // domain supremum, by substituting each step's point value for its delta.
    let pointBound: { K: number; delta: number } | null = null;
    let pointBoundReason: string | null = null;
    if (result.kind === 'bound' && Object.keys(at).length > 0) {
      const steps = bridges.filter((b) => b.bound !== undefined);
      const numerical = steps.find((b) => b.bound!.deltaAtBasis !== 'closed-form');
      if (allRegimesHold !== true) {
        pointBoundReason = 'a regime on the path is violated or unchecked';
      } else if (steps.length === 0) {
        pointBoundReason = 'no step carries a bound';
      } else if (numerical !== undefined) {
        pointBoundReason =
          numerical.bound!.deltaAt === undefined
            ? `${numerical.id} states no point bound`
            : `${numerical.id}'s point bound is numerically supported, not proven`;
      } else {
        const atPoint = bridges.map((b) =>
          b.bound === undefined ? b : { ...b, bound: { ...b.bound, delta: b.bound.deltaAt!(at) } },
        );
        const composed = atPoint.every((b) => b.bound === undefined || Number.isFinite(b.bound.delta))
          ? api.boundPath(atPoint)
          : null;
        if (composed !== null && composed.kind === 'bound') pointBound = composed.bound;
        else pointBoundReason = 'a parameter the point bound needs was not supplied';
      }
    }
    return { regimes, allRegimesHold, horizons, allHold, pointBound, pointBoundReason };
  };
  const tolValues = args.flags.get('tolerance');
  const tolerance = parseTolerance(tolValues === undefined ? undefined : tolValues[tolValues.length - 1]);
  const scope = toleranceScope(api, bridges);
  const translation =
    tolerance?.observable == null ? undefined : pathTranslations(api, bridges).find((x) => x.observable === tolerance.observable);
  const sweepSpec = args.flags.get('sweep');
  if (sweepSpec !== undefined && sweepSpec.length > 0) {
    return runSweep(ctx, {
      from,
      to,
      point,
      bridges,
      result,
      evaluateAt,
      spec: sweepSpec[sweepSpec.length - 1]!,
      tolerance,
      scope,
      judgeRow: (e, at, tGiven) =>
        tolerance === null || tolerance.observable === null
          ? judgeTolerance(tolerance?.value ?? 0, e, tGiven)
          : judgeObservable(api, { ...tolerance, observable: tolerance.observable }, bridges, e, at),
      translation: translation === undefined ? null : { tr: translation, evidence: translationEvidence(api, translation) },
    });
  }
  if (args.flags.has('csv')) throw new CliError('upt path: --csv needs --sweep (a single point is not a table)');

  const evaluation = evaluateAt(point);
  const { regimes, allRegimesHold, horizons, allHold, pointBound, pointBoundReason } = evaluation;
  const adequacy =
    tolerance === null || tolerance.observable !== null ? null : judgeTolerance(tolerance.value, evaluation, t !== undefined);
  const observed =
    tolerance === null || tolerance.observable === null
      ? null
      : judgeObservable(api, { ...tolerance, observable: tolerance.observable }, bridges, evaluation, point);
  const evidence = translation === undefined ? null : translationEvidence(api, translation);

  // A violated regime or horizon is a failed check: exit 3 (persona finding F2),
  // and so is a tolerance the point error exceeds. UNKNOWN, where a coordinate
  // or t was not supplied, is not a failure.
  const exitCode =
    allRegimesHold === false ||
    (t !== undefined && !allHold) ||
    adequacy?.verdict === 'inadequate' ||
    observed?.verdict === 'inadequate'
      ? EXIT_CHECK_FAILED
      : 0;

  if (wantJson) {
    emitJson(
      {
        command: 'path',
        epistemics: EPISTEMICS,
        options: { from, to, at: point },
        result: {
          families: { from: fromFamily, to: toFamily },
          path: bridges.map((b) => ({
            id: b.id,
            relation: b.relation,
            from: b.premises[0],
            to: b.conclusion,
            family: bridgeFamily(b.id),
          })),
          // A no-claim has no `bound` key at all — the type refuses it, and so
          // does this envelope.
          ...(result.kind === 'bound'
            ? {
                kind: 'bound',
                relation: result.relation,
                bound: result.bound,
                norm: result.norm,
                terminal: result.terminal,
              }
            : {
                kind: 'no-claim',
                reason: result.reason,
                detail: result.detail,
                phrase: NO_COMPOSITE_PHRASE,
                ...(missing.length > 0 ? { missing } : {}),
              }),
          regimes,
          allRegimesHold,
          pointBound,
          ...(pointBoundReason !== null ? { pointBoundReason } : {}),
          horizons,
          horizonsEvaluated: t !== undefined,
          allHorizonsHold: t === undefined ? null : allHold,
          ...(adequacy === null ? {} : { tolerance: { value: tolerance!.value, ...adequacy, scope } }),
          ...(observed === null ? {} : { tolerance: observableReport(tolerance!, observed, bridges, evidence) }),
        },
      },
      ctx.write,
    );
    return exitCode;
  }

  out(`\nupt path ${from} → ${to}`);
  out(`  ${bridges.length} bridge(s):`);
  for (const b of bridges) out(`    ${b.premises[0]} --[${b.relation}]--> ${b.conclusion}  (${b.id})`);
  if (fromFamily !== toFamily) {
    out(
      `  crosses families: ${fromFamily} → ${toFamily} (a family is a filing label; ` +
        'the composition rules are the same as within one)',
    );
  }
  out('');
  if (result.kind === 'bound') {
    out(`  composite relation: ${result.relation}`);
    out(`  composed bound: K = ${result.bound.K} · delta = ${result.bound.delta}`);
    out(`  norm: ${result.norm ?? '(none stated — the claim is the vacuous identity)'}`);
    if (result.terminal) out('  terminal: the last step states no Lipschitz constant; the claim ends there');
    if (pointBound !== null) {
      out(
        `  bound at this point: K = ${pointBound.K} · delta = ${pointBound.delta} (closed-form: the exact error; ` +
          "the composed bound above is the supremum over the bridge's domain)",
      );
    } else if (pointBoundReason !== null) {
      out(`  bound at this point: none — ${pointBoundReason}`);
    }
  } else {
    out(`  composite relation: ${NO_COMPOSITE_PHRASE}`);
    out(`  bound: ${NO_COMPOSITE_PHRASE} — reason '${result.reason}'`);
    out(`    ${result.detail}`);
    if (missing.length > 0) {
      out('  to compose, this path would need:');
      for (const m of missing) out(`    - ${m}`);
    }
  }
  out('');
  if (allRegimesHold === false) {
    out('  regimes at --at: VIOLATED — no bound on this path is claimed at this point');
  } else if (allRegimesHold === 'unknown') {
    out('  regimes at --at: UNKNOWN (a coordinate was not supplied); an unchecked regime is not a passing one');
  } else if (bridges.every((b) => b.regime.inequalities.length === 0)) {
    out('  regimes: VACUOUS — no bridge on this path states an inequality; nothing was checked');
  } else {
    out('  regimes at --at: all hold');
  }
  for (const r of regimes) {
    if (r.ok === false) out(`    ${r.bridgeId}: VIOLATED — ${r.violated.join('; ')}`);
    else if (r.ok === 'unknown') out(`    ${r.bridgeId}: unknown — unchecked: ${r.unchecked.join('; ')}`);
  }
  if (regimes.some((r) => r.premisesNotChecked !== undefined)) {
    out('  premises not machine-checked (your judgment or measurement):');
    for (const r of regimes) {
      if (r.premisesNotChecked !== undefined) out(`    ${r.bridgeId}: ${r.premisesNotChecked.join('; ')}`);
    }
  }
  if (horizons.length === 0) {
    out('  horizons: none on this path (no step carries a bound)');
  } else if (t === undefined) {
    out('  horizons: NOT EVALUATED (no t= supplied via --at); an unevaluated horizon is not a passing one');
    for (const h of horizons) out(`    ${h.bridgeId}: ${h.horizon}`);
  } else {
    out(`  horizons at t=${t}: ${allHold ? 'all hold' : 'NOT all hold'}`);
    for (const h of horizons) {
      out(`    ${h.bridgeId}: ${h.holds ? 'holds' : 'VIOLATED'} — ${h.horizon}`);
    }
  }
  if (adequacy !== null) {
    out(`  tolerance ${tolerance!.value}: ${adequacy.verdict.toUpperCase()} — ${adequacy.reason}`);
    out(`    (${scope})`);
  }
  if (observed !== null) printObservable(out, tolerance!, observed, bridges, evidence);
  out(`  (${EPISTEMICS})`);
  return exitCode;
}

export const command: Command = { name: 'path', aliases: [], flags: FLAGS, help: HELP, run };
registerCommand(command);
