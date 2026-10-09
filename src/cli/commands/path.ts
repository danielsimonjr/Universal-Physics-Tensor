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
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { CliError, EXIT_CHECK_FAILED, UsageError } from '../errors.js';
import { emitJson } from '../output.js';
import { parseAt, resolveAtPoint, showInequality } from './regime.js';
import { explainsRefusal, missingForComposite, routeClaim, selectRoute, transportReport, type RouteClaim } from './_atlas-route.js';

const FLAGS: FlagSpec[] = [
  {
    name: '--at',
    valueStyle: 'either',
    repeatable: true,
    description: 'State one regime coordinate as group=value. A value may be an expression such as pi/2.',
  },
  {
    name: '--sweep',
    valueStyle: 'either',
    description: 'Sample one coordinate as name=lo:hi:n or name=lo:hi:n:log, with n from 2 to 200.',
  },
  {
    name: '--compare',
    valueStyle: 'either',
    description: 'Sweep a second route from the same source to this model id and mark NEITHER where no limit applies.',
  },
  { name: '--csv', valueStyle: 'none', description: 'Write sweep rows as CSV.' },
  {
    name: '--tolerance',
    valueStyle: 'attached',
    description: 'Judge adequacy against EPS in the bound\'s norm, or name:EPS through a declared translation. Exit 3 when inadequate.',
  },
  JSON_FLAG,
];

const HELP = `upt path <from> <to> [--at group=value ...] [--tolerance=[observable:]EPS]
        [--sweep name=lo:hi:n[:log]] [--compare=<to2>] [--csv] [--json]
        The chain of bridges from one model to another (across families when
        a bridge ends in another family's model), the relation the chain
        composes to, the composed (K, delta) with the norm it holds in,
        whether every bridge's REGIME holds at --at (the bound is claimed only
        inside it), and whether every horizon still holds (pass t=<time> plus
        the parameters, e.g. --at theta0=0.2 T0=1 t=10).
        When the composition table declines to compose the relations, the path
        carries NO bound: the command prints 'no composite claim' and exits 0.
        That refusal is the answer, and no number is invented in its place.
        An exact equivalence carries a bound only in a norm it DECLARES a
        transport of, in the declared direction, with a witness (ab-spring-lc:
        relative period error, spring → lc; the horizon is restated on the
        circuit clock). Any other norm or direction is refused as
        'norm-not-stated', and the refusal names the missing declaration.
        --at values are numbers, units, or constant expressions (theta0=pi/2).
        T, temperature, temp, and T_K are kelvin: an energy on that name is k_B T.
        A sweep of one of those names reads its endpoints the same way.
        A regime or horizon that was checked and failed prints no bound
        number: the domain supremum is not a claim at that point.
        --sweep name=lo:hi:n[:log] evaluates the path at n samples (2 to 200,
        endpoints included) of one parameter not fixed by --at: per row the
        regime, the horizon and the closed-form point error. A row outside a
        regime or past a horizon carries no error, because no bound is claimed
        there. A sweep exits 0: each row is its own verdict. --csv writes the
        rows as CSV.
        --compare=<to2> (with --sweep) sweeps a second route from the same
        source beside the first: per row each route's regime, horizon and
        error in its OWN norm (never compared with the other's), and NEITHER,
        with no number, where no encoded limit applies.
        --tolerance=EPS asks whether the path is accurate enough: ADEQUATE only
        when every regime holds, every horizon holds at the given t, and the
        closed-form point error is <= EPS; INADEQUATE (exit 3) when any of
        them fails; UNDETERMINED when the point does not settle it. EPS is in
        the bound's own norm. With --sweep, each row is judged.
        --tolerance=<observable>:EPS asks in ANOTHER observable, only through
        a translation the first bridge declares (ab-pendulum-linear: phase, the
        exact accumulated error, and position, an upper bound on |θ − θ_lin|;
        both in rad, t in the unit of T0), carried past each later bridge only
        by that bridge's declared carriage (ab-spring-lc carries phase). It
        reports the horizon t* at which the error reaches EPS, ADEQUATE iff
        t <= t* (inclusive; past t* an upper bound is UNDETERMINED, not
        INADEQUATE), and the evidence of the translation and of each carriage,
        derived by running their witnesses, plus the translation's witness
        run at this point with a control. Otherwise it is UNDETERMINED.
        A route may cross families. A bound crosses only through the relation,
        uniformity, Lipschitz, and norm gates, and, across families, only
        through a witnessed norm transport; a matching norm name is not one
        (reason cross-family-unmapped, still exit 0).
        A bridge with two or more premises is named when both models appear
        among its premises and its conclusion. That line is the bridge; it is
        not a step of the chain, and a missing chain still exits 0.
        e.g.  upt path model-pendulum model-spring --at theta0=0.2 T0=1 t=10
              upt path model-pendulum model-spring --at T0=1 t=10 --sweep theta0=0.1:0.8:8
              upt path model-pendulum model-lc --at theta0=0.3 T0=2 t=5 --tolerance=phase:0.1
              upt path model-telegraph model-fick --compare=model-wave-1d --at D=1 q=1 t=1 --sweep tau=0.001:1000:13:log`;

const EPISTEMICS =
  'a path EXISTING is not a warrant: the bound is the warrant. A no-claim carries no number, ' +
  'and none is synthesized for it.';

interface MultiPremise {
  readonly id: string;
  readonly premises: readonly string[];
  readonly conclusion: string;
}

/** Bridges with two or more premises that mention both endpoints. Not a chain. */
function multiPremiseBridges(api: CommandCtx['api'], from: string, to: string): MultiPremise[] {
  const rows: MultiPremise[] = [];
  const seen = new Set<string>();
  for (const f of api.ATLAS_FAMILIES) {
    for (const b of f.bridges) {
      if (b.premises.length < 2 || seen.has(b.id)) continue;
      const ends = new Set([...b.premises, b.conclusion]);
      if (!ends.has(from) || !ends.has(to)) continue;
      seen.add(b.id);
      rows.push({ id: b.id, premises: [...b.premises], conclusion: b.conclusion });
    }
  }
  return rows;
}

function printMultiPremise(out: CommandCtx['out'], rows: readonly MultiPremise[]): void {
  for (const b of rows) {
    out(`  multi-premise bridge: ${b.id}: ${b.premises.join(' + ')} → ${b.conclusion}`);
  }
  if (rows.length > 0) {
    out('  A path composes one premise at a time. This bridge needs every premise named above.');
  }
}

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
  /** The transports that restated this horizon for the end of the route; absent when none did. */
  restatedBy?: { transport: string; horizon: string }[];
  /** Set when a family change reached this step with no time map. Unevaluated, not violated. */
  unevaluated?: 'cross-family';
}

const MAX_SAMPLES = 200;

/** `name=lo:hi:n` or `name=lo:hi:n:log`, bounded; the endpoints are both sampled. */
export function parseSweep(
  api: CommandCtx['api'],
  spec: string,
): { name: string; values: number[]; spacing: 'linear' | 'log' } {
  const m = /^([^=\s]+)=([^:]+):([^:]+):([^:]+)(?::(linear|log))?$/.exec(spec);
  if (m === null) throw new CliError(`upt path: --sweep '${spec}' is not name=lo:hi:n[:log], e.g. --sweep theta0=0.05:0.9:18`);
  const [, name, loS, hiS, nS, sp] = m as unknown as [string, string, string, string, string, string | undefined];
  const endpoint = (raw: string): number => {
    try {
      const read = api.readNamedBinding(name, raw);
      return Number.isFinite(read.value) ? read.value : Number.NaN;
    } catch (e) {
      if (e instanceof api.UnitError) {
        throw new CliError(`upt path: --sweep '${spec}' is not a temperature. ${e.message}`);
      }
      return Number.NaN;
    }
  };
  const lo = endpoint(loS);
  const hi = endpoint(hiS);
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

// `readonly` directly before `import('…').T` is a tree-sitter ERROR node. Alias
// the import type first; the array is still readonly.
type AtlasBridge = import('../../cli-api.js').AtlasBridge;
type Witness = import('../../cli-api.js').Witness;
type Bridges = readonly AtlasBridge[];
type Translation = import('../../cli-api.js').ObservableTranslation;
type Carriage = import('../../cli-api.js').ObservableCarriage;

function modelFamilyOf(api: CommandCtx['api'], id: string | null): string | undefined {
  if (id === null) return undefined;
  return api.ATLAS_FAMILIES.find((f) => f.models.some((m) => m.id === id))?.family;
}

function filingFamilyOf(api: CommandCtx['api'], id: string): string | undefined {
  return api.ATLAS_FAMILIES.find((f) => f.bridges.some((b) => b.id === id))?.family;
}

/** The model a step leaves, entered at `entry`. An exact step may leave by either end. */
function leaveModel(bridge: AtlasBridge, entry: string): string | null {
  if (bridge.premises.length !== 1) return null;
  const premise = bridge.premises[0]!;
  if (entry === premise) return bridge.conclusion;
  if (bridge.relation === 'exact-equivalence' && entry === bridge.conclusion) return premise;
  return null;
}

interface PathStepLabel {
  readonly id: string;
  readonly relation: AtlasBridge['relation'];
  readonly from: string | undefined;
  readonly to: string;
  readonly family: string | undefined;
  readonly fromModelFamily: string | undefined;
  readonly toModelFamily: string | undefined;
}

/**
 * Families of the models a route visits, in order, starting at `from`.
 * Adjacent duplicates collapse. A family visited again after a different one
 * stays in the list. `family` on each step stays the filing family.
 */
function routeFamilyLabels(
  api: CommandCtx['api'],
  bridges: readonly AtlasBridge[],
  from: string,
): {
  readonly crossFamily: boolean;
  readonly modelFamilies: readonly string[];
  readonly steps: readonly PathStepLabel[];
} {
  const modelFamilies: string[] = [];
  const push = (id: string | null): string | undefined => {
    const family = modelFamilyOf(api, id);
    if (family !== undefined && modelFamilies[modelFamilies.length - 1] !== family) modelFamilies.push(family);
    return family;
  };
  if (bridges.length === 0) {
    push(from);
    return { crossFamily: false, modelFamilies, steps: [] };
  }
  let at: string | null = from;
  const steps = bridges.map((b) => {
    const entry = at;
    const exit = entry === null ? null : leaveModel(b, entry);
    const fromModelFamily = modelFamilies.length === 0 ? push(entry) : modelFamilyOf(api, entry);
    const toModelFamily = push(exit);
    at = exit;
    return {
      id: b.id,
      relation: b.relation,
      from: b.premises[0],
      to: b.conclusion,
      family: filingFamilyOf(api, b.id),
      fromModelFamily,
      toModelFamily,
    };
  });
  return { crossFamily: modelFamilies.length > 1, modelFamilies, steps };
}

/**
 * The translation a path can use for `observable`: the first bridge's, carried
 * through every later bridge only by that bridge's declared carriage of the
 * same observable. A later bridge without one stops it, whatever its relation.
 */
function pathTranslation(
  api: CommandCtx['api'],
  bridges: Bridges,
  observable: string,
): { tr: Translation; carriages: Carriage[] } | { tr: null; blockedBy: string | null } {
  const tr = api.translationsOf(bridges[0]!.id).find((x) => x.observable === observable);
  if (tr === undefined) return { tr: null, blockedBy: null };
  const carriages: Carriage[] = [];
  for (const b of bridges.slice(1)) {
    const c = api.carriageOf(b.id, observable);
    if (c === undefined) return { tr: null, blockedBy: b.id };
    carriages.push(c);
  }
  return { tr, carriages };
}

/** The observables a path can be asked in: its first bridge's translations that every later bridge carries. */
function pathObservables(api: CommandCtx['api'], bridges: Bridges): Translation[] {
  return api
    .translationsOf(bridges[0]!.id)
    .filter((t) => pathTranslation(api, bridges, t.observable).tr !== null);
}

/** What a tolerance in the bound's own norm is judged in, and what else this path can be asked in. */
function toleranceScope(api: CommandCtx['api'], bridges: Bridges): string {
  const declared = pathObservables(api, bridges);
  if (declared.length === 0) {
    return "judged in the bound's own norm only; no translation to another observable (phase, trajectory, amplitude) is encoded for this path";
  }
  const asks = declared.map((t) => `--tolerance=${t.observable}:EPS (${t.unit})`).join(', ');
  const through = bridges.length > 1 ? `, carried by ${bridges.slice(1).map((b) => b.id).join(', ')}` : '';
  return `judged in the bound's own norm only; ${bridges[0]!.id} declares a translation${through}, asked with ${asks}`;
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
  if (e.horizons.some((h) => h.holds === false)) return { verdict: 'inadequate', reason: 'past the horizon: the bound is not claimed there' };
  if (e.horizons.some((h) => h.holds === null)) {
    return { verdict: 'undetermined', reason: 'a family change did not restate a horizon onto the next clock' };
  }
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

/** Read a `--tolerance` argument as `EPS` or `<observable>:EPS`. Returns null when the flag is absent, and throws a {@link CliError} when it is present and malformed. */
export function parseTolerance(api: CommandCtx['api'], raw: string | undefined): ToleranceRequest | null {
  if (raw === undefined) return null;
  const colon = raw.indexOf(':');
  const observable = colon === -1 ? null : raw.slice(0, colon);
  const number = colon === -1 ? raw : raw.slice(colon + 1);
  if (observable !== null && !/^[a-z][a-z-]*$/.test(observable)) {
    throw new CliError(`upt path: --tolerance=${raw} is not EPS or <observable>:EPS, e.g. --tolerance=phase:0.1`);
  }
  let v = Number.NaN;
  try {
    if (number !== '') v = api.readBinding(number).value;
  } catch {
    v = Number.NaN;
  }
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
  /** The later bridges' declared carriages of the observable, in path order. */
  carriages: Carriage[];
  /** The translated bridge's quantity at this point, in its bound's norm. */
  boundErrorAtPoint: number | null;
  /** The translated bridge's supremum over its domain, in the same norm. */
  domainSupremum: number | null;
  /** The accumulated error in the observable at the given t (an upper bound when the translation is one). */
  observableErrorAt: number | null;
  /** t*: where the accumulated error reaches the tolerance at this point. */
  horizon: number | null;
  /** t* from the domain supremum: the shortest over the bridge's domain. */
  domainHorizon: number | null;
  /** The translated bridge's own horizon at t; `null` when t was not given. */
  bridgeHorizonHolds: boolean | null;
}

/**
 * Whether the path is adequate for a tolerance in another observable. Only a
 * path whose first bridge declares a translation into that observable, and
 * whose every later bridge declares that it carries it, is judged; every
 * regime, the translated bridge's closed-form point value and its own horizon
 * still gate it, and anything the point does not settle is `undetermined`. An
 * upper-bound translation past its horizon is `undetermined` too: there the
 * BOUND exceeds the tolerance, which does not show that the error does.
 * @internal
 */
export function judgeObservable(
  api: CommandCtx['api'],
  request: ToleranceRequest & { observable: string },
  bridges: Bridges,
  e: Evaluation,
  at: Readonly<Record<string, number>>,
): ObservableJudgement {
  const found = pathTranslation(api, bridges, request.observable);
  const tr = found.tr;
  const first = bridges[0]!;
  const bound = first.bound;
  const pointValue =
    e.allRegimesHold === true && bound?.deltaAt !== undefined && bound.deltaAtBasis === 'closed-form' ? bound.deltaAt(at) : null;
  const none = {
    translation: tr,
    carriages: found.tr === null ? [] : found.carriages,
    boundErrorAtPoint: pointValue !== null && Number.isFinite(pointValue) ? pointValue : null,
    domainSupremum: tr === null ? (bridges.length === 1 ? (bound?.delta ?? null) : null) : (bound?.delta ?? null),
    observableErrorAt: null,
    horizon: null,
    domainHorizon: null,
    bridgeHorizonHolds: null,
  };
  if (found.tr === null) {
    const declared = api.translationsOf(first.id);
    const reason =
      found.blockedBy !== null
        ? `${first.id}'s translation into '${request.observable}' does not reach the end of this path: '${found.blockedBy}' ` +
          `declares no carriage of '${request.observable}' through its map, and a translation composes only through one`
        : `no translation from '${bound?.norm ?? 'no bound'}' into '${request.observable}' is encoded for ${first.id}` +
          (declared.length === 0 ? '' : ` (it declares: ${declared.map((x) => x.observable).join(', ')})`);
    return { verdict: 'undetermined', reason, ...none };
  }
  if (e.allRegimesHold === false) return { verdict: 'inadequate', reason: 'outside a regime on the path: no bound is claimed', ...none };
  if (e.allRegimesHold === 'unknown') return { verdict: 'undetermined', reason: 'a regime coordinate was not supplied', ...none };
  if (bound === undefined || bound.deltaAt === undefined || bound.deltaAtBasis !== 'closed-form') {
    return { verdict: 'undetermined', reason: `${first.id} states no closed-form point value to translate`, ...none };
  }
  if (none.boundErrorAtPoint === null) {
    return { verdict: 'undetermined', reason: 'a parameter the point value needs was not supplied', ...none };
  }
  const missing = found.tr.parameters.filter((p) => at[p] === undefined);
  if (missing.length > 0) {
    return { verdict: 'undetermined', reason: `the translation needs ${missing.join(', ')} (via --at)`, ...none };
  }
  const tx = found.tr;
  const eps = none.boundErrorAtPoint;
  const floor = tx.floor?.(eps);
  if (floor !== undefined && floor > request.value) {
    return {
      verdict: 'undetermined',
      reason:
        `the translation's time-independent term is ${floor} ${tx.unit} at this point, above the tolerance: this bound ` +
        'certifies no t, which is not a finding that the error exceeds the tolerance',
      ...none,
    };
  }
  const horizon = tx.horizonFor(eps, request.value, at);
  const domainHorizon = tx.horizonFor(bound.delta, request.value, at);
  if (Number.isNaN(horizon)) return { verdict: 'undetermined', reason: 'the translation is undefined at this point', ...none };
  const t = at['t'];
  const judged = { ...none, horizon, domainHorizon: Number.isNaN(domainHorizon) ? null : domainHorizon };
  if (t === undefined) {
    return {
      verdict: 'undetermined',
      reason: `no t= given; the ${tx.observable} horizon here is t* = ${horizon} (${tx.timeUnit})`,
      ...judged,
    };
  }
  const observableErrorAt = tx.errorAt(eps, t, at);
  const bridgeHorizonHolds = bound.horizonHolds(t, at);
  const withT = { ...judged, observableErrorAt, bridgeHorizonHolds };
  if (!bridgeHorizonHolds) {
    return { verdict: 'inadequate', reason: `past ${first.id}'s own horizon (${bound.horizon}): the bound is not claimed there`, ...withT };
  }
  const what = tx.errorKind === 'upper-bound' ? `bound on the ${tx.observable} error` : `accumulated ${tx.observable} error`;
  if (t <= horizon) {
    return { verdict: 'adequate', reason: `t = ${t} <= t* = ${horizon}: ${what} ${observableErrorAt} ${tx.unit} <= ${request.value}`, ...withT };
  }
  return tx.errorKind === 'upper-bound'
    ? {
        verdict: 'undetermined',
        reason:
          `t = ${t} > t* = ${horizon}: the ${what} is ${observableErrorAt} ${tx.unit}, above ${request.value}; ` +
          'the error itself may still be within it, so this is not shown inadequate',
        ...withT,
      }
    : { verdict: 'inadequate', reason: `t = ${t} > t* = ${horizon}: ${what} ${observableErrorAt} ${tx.unit} exceeds ${request.value}`, ...withT };
}

/** Evidence DERIVED by running a record's witnesses now. */
function runWitnesses(api: CommandCtx['api'], witnesses: readonly Witness[], checks: Translation['checks']) {
  const runs = checks.map((c) => api.runTranslationCheck(c));
  const passing = new Set(runs.filter((r) => r.status === 'checked').map((r) => r.witnessId));
  return {
    tags: [...api.deriveEvidence({ witnesses }, passing)].sort(),
    witnesses: runs.map((r) => ({
      id: r.witnessId,
      claim: witnesses.find((w) => w.id === r.witnessId)?.tolerance ?? null,
      status: r.status,
      detail: r.detail,
    })),
  };
}

/** The translation's evidence, and each carriage's, DERIVED by running their witnesses now; never the bound's. */
function translationEvidence(api: CommandCtx['api'], tr: Translation, carriages: readonly Carriage[]) {
  return {
    ...runWitnesses(api, tr.witnesses, tr.checks),
    note: "the translation's own evidence, distinct from the bound's; it carries no formal reference",
    carriages: carriages.map((c) => ({
      bridgeId: c.bridgeId,
      observable: c.observable,
      map: c.map,
      derivation: c.derivation,
      premisesNotChecked: [...c.premises],
      timeMap: c.timeMap,
      ...runWitnesses(api, c.witnesses, c.checks),
    })),
  };
}

type PointWitness =
  | { unavailable: string }
  | {
      id: string;
      claim: string;
      status: string;
      detail: string;
      control?: { id: string; claim: string; status: string; detail: string; discriminates: boolean };
    };

/**
 * The translation's witness run at THIS point, bounded in cost, and, when
 * asked, its control: the same measurement against a plausible wrong map. A
 * control that is not refuted here shows this witness cannot tell the two
 * maps apart at this point, and is reported as such.
 */
function pointWitness(api: CommandCtx['api'], tr: Translation, eps: number, withControl: boolean): PointWitness {
  const pc = tr.pointCheck(eps);
  if ('unavailable' in pc) return { unavailable: pc.unavailable };
  const r = api.runTranslationCheck(pc.check);
  const base = { id: r.witnessId, claim: pc.claim, status: r.status, detail: r.detail };
  if (!withControl) return base;
  const c = api.runTranslationCheck(pc.control);
  return {
    ...base,
    control: { id: c.witnessId, claim: pc.controlClaim, status: c.status, detail: c.detail, discriminates: c.status === 'refuted' },
  };
}

/** A judgement with its point witness; a witness refuted here withdraws any verdict to undetermined. @internal */
export function judgeAtPoint(
  api: CommandCtx['api'],
  request: ToleranceRequest & { observable: string },
  bridges: Bridges,
  e: Evaluation,
  at: Readonly<Record<string, number>>,
  withControl: boolean,
): ObservableJudgement & { pointWitness: PointWitness | null } {
  const j = judgeObservable(api, request, bridges, e, at);
  if (j.translation === null || j.horizon === null || j.boundErrorAtPoint === null) return { ...j, pointWitness: null };
  const pw = pointWitness(api, j.translation, j.boundErrorAtPoint, withControl);
  if ('status' in pw && pw.status === 'refuted') {
    return {
      ...j,
      verdict: 'undetermined',
      reason: `the translation's witness at this point (${pw.id}) is refuted, so its horizon is not relied on here: ${pw.detail}`,
      pointWitness: pw,
    };
  }
  return { ...j, pointWitness: pw };
}

function thresholdOrigin(request: ToleranceRequest, tr: Translation, bridges: Bridges): string {
  return (
    `t* is derived from the requested tolerance ${request.value} ${tr.unit} through the translation; ` +
    `${bridges[0]!.id}'s own horizon (${bridges[0]!.bound!.horizon}) is the record's fixed threshold, judged separately`
  );
}

function observableReport(
  request: ToleranceRequest,
  j: ReturnType<typeof judgeAtPoint>,
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
            errorKind: tr.errorKind,
            definition: tr.definition,
            derivation: tr.derivation,
            premisesNotChecked: [...tr.premises],
            timeUnit: tr.timeUnit,
            notCovered: [...tr.notCovered],
            carriedBy: j.carriages.map((c) => c.bridgeId),
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
          pointWitness: j.pointWitness,
        }),
  };
}

function printObservable(
  out: CommandCtx['out'],
  request: ToleranceRequest,
  j: ReturnType<typeof judgeAtPoint>,
  bridges: Bridges,
  evidence: ReturnType<typeof translationEvidence> | null,
  composite: 'bound' | 'no-claim',
): void {
  const tr = j.translation;
  out(`  tolerance ${showTolerance(request, tr?.unit)}: ${j.verdict.toUpperCase()} — ${j.reason}`);
  if (tr === null) return;
  const show = (v: number | null): string => (v === null ? 'not evaluated' : String(v));
  const first = bridges[0]!;
  const kind = tr.errorKind === 'upper-bound' ? 'an UPPER BOUND on the error, not the error' : 'the error itself';
  out(`    translation (${tr.bridgeId}; ${kind}): ${tr.fromNorm} → ${tr.observable}: ${tr.definition}`);
  out(`      ${tr.derivation}`);
  out(`      premises not machine-checked: ${tr.premises.join('; ')}`);
  for (const c of evidence?.carriages ?? []) {
    out(`    carried by ${c.bridgeId} (its declared carriage of ${c.observable}): ${c.map}`);
    out(`      ${c.derivation}; ${c.timeMap}`);
    out(`      premises not machine-checked: ${c.premisesNotChecked.join('; ')}`);
  }
  if (j.carriages.length > 0 && composite === 'no-claim') {
    out(
      `    the composite bound is still '${NO_COMPOSITE_PHRASE}': the composition table is not consulted or widened; ` +
        `this judgement is in ${tr.observable} only, through the declared carriage`,
    );
  } else if (j.carriages.length > 0) {
    out(
      `    the composite bound above is in '${first.bound!.norm}', carried by a declared norm transport; ` +
        `this judgement is a separate claim in ${tr.observable}, through the declared carriage, and neither implies the other`,
    );
  }
  const what = tr.errorKind === 'upper-bound' ? `bound on the ${tr.observable} error` : `accumulated ${tr.observable} error`;
  out(`    ${first.bound!.norm} at this point: ${show(j.boundErrorAtPoint)}; domain supremum: ${show(j.domainSupremum)}`);
  out(`    ${what} at t: ${j.observableErrorAt === null ? 'not evaluated' : `${j.observableErrorAt} ${tr.unit}`}`);
  out(`    ${tr.observable} horizon t* at this point: ${show(j.horizon)} (${tr.timeUnit}; ${tr.boundary})`);
  out(`    ${tr.observable} horizon over the whole domain ${first.bound!.domain} (from the supremum): ${show(j.domainHorizon)}`);
  out(`    threshold origin: ${thresholdOrigin(request, tr, bridges)}`);
  out(
    `    ${first.id}'s own horizon at t: ${j.bridgeHorizonHolds === null ? 'not evaluated' : j.bridgeHorizonHolds ? 'holds' : 'VIOLATED'} — ${first.bound!.horizon}`,
  );
  out(`    not covered by this translation: ${tr.notCovered.join('; ')}`);
  if (evidence !== null) {
    out(`    translation evidence (fixture, the regression anchor): ${evidence.tags.join(', ')} (${evidence.note})`);
    for (const w of evidence.witnesses) out(`      - ${w.id} [numeric, run now; ${w.claim ?? 'no claim stated'}]: ${w.status} — ${w.detail}`);
    for (const c of evidence.carriages) {
      out(`    carriage evidence (${c.bridgeId}): ${c.tags.join(', ')}`);
      for (const w of c.witnesses) out(`      - ${w.id} [numeric, run now; ${w.claim ?? 'no claim stated'}]: ${w.status} — ${w.detail}`);
    }
  }
  const pw = j.pointWitness;
  if (pw === null) {
    out('    witness at this point: not run (the translation was not evaluated here)');
  } else if ('unavailable' in pw) {
    out(`    witness at this point: not run — ${pw.unavailable}`);
  } else {
    out(`    witness at this point: ${pw.id} [${pw.claim}]: ${pw.status} — ${pw.detail}`);
    if (pw.control !== undefined) {
      out(
        `      control ${pw.control.id} [${pw.control.claim}]: ${pw.control.status}` +
          (pw.control.discriminates
            ? ' — the check fails on the wrong map here, so it can fail'
            : ' — NOT refuted: at this point the witness cannot tell the wrong map from the declared one') +
          ` (${pw.control.detail})`,
      );
    }
  }
}

type Evaluation = {
  allRegimesHold: boolean | 'unknown';
  horizons: readonly HorizonReport[];
  allHold: boolean;
  pointBound: { K: number; delta: number } | null;
  pointBoundReason: string | null;
  regimeCollisions: readonly { readonly group: string; readonly families: readonly string[] }[];
};

type SweepResult = { kind: 'bound'; norm?: string | null | undefined; bound: { K: number; delta: number } } | { kind: 'no-claim'; reason: string };

/** A row's status on one path: what the point command would say there, with no error where no bound is claimed. */
function sweepCell(e: Evaluation, result: SweepResult) {
  const regime = e.allRegimesHold === true ? 'holds' : e.allRegimesHold === false ? 'violated' : 'unknown';
  const horizon = e.horizons.length === 0 || e.horizons[0]!.holds === null ? 'not-evaluated' : e.allHold ? 'holds' : 'violated';
  let error: number | null = e.pointBound?.delta ?? null;
  let reason = result.kind === 'no-claim' ? 'no composite claim' : e.pointBoundReason;
  if (error !== null && horizon === 'violated') {
    error = null;
    reason = 'past the horizon: the bound is not claimed there';
  }
  return { regime, horizon, error, reason };
}

function checkSweep(api: CommandCtx['api'], spec: string, point: Readonly<Record<string, number>>) {
  const sweep = parseSweep(api, spec);
  if (sweep.name in point) {
    throw new CliError(`upt path: '${sweep.name}' is both swept and fixed by --at; give it one role`);
  }
  return sweep;
}

/**
 * One path evaluated at every sample of one parameter. Each row is what the
 * point command would say there; no trajectory is interpolated. A row outside
 * a regime or past a horizon carries no error, because no bound is claimed
 * there, and it is not joined to its neighbours.
 */
function runSweep(
  ctx: CommandCtx,
  s: {
    from: string;
    to: string;
    point: Readonly<Record<string, number>>;
    bridges: readonly AtlasBridge[];
    result: SweepResult;
    evaluateAt: (at: Readonly<Record<string, number>>) => Evaluation;
    spec: string;
    tolerance: ToleranceRequest | null;
    scope: string;
    judgeRow: (e: Evaluation, at: Readonly<Record<string, number>>, tGiven: boolean) => {
      verdict: string;
      observableErrorAt?: number | null;
      horizon?: number | null;
      pointWitness?: PointWitness | null;
    };
    translation: { tr: Translation; evidence: ReturnType<typeof translationEvidence> } | null;
  },
): number {
  const { out, args } = ctx;
  const sweep = checkSweep(ctx.api, s.spec, s.point);
  const rows = sweep.values.map((value) => {
    const at = { ...s.point, [sweep.name]: value };
    const e = s.evaluateAt(at);
    const { regime, horizon, error, reason } = sweepCell(e, s.result);
    const judged = s.tolerance === null ? null : s.judgeRow(e, at, 't' in s.point || sweep.name === 't');
    const pw = judged?.pointWitness;
    return {
      value,
      regime,
      horizon,
      error,
      ...(error === null && reason !== null ? { reason } : {}),
      ...(judged === null ? {} : { adequacy: judged.verdict }),
      ...(judged?.horizon === undefined ? {} : { observableHorizon: judged.horizon, observableError: judged.observableErrorAt ?? null }),
      ...(pw === undefined || pw === null ? {} : { pointWitness: 'unavailable' in pw ? { status: 'not-run', reason: pw.unavailable } : { id: pw.id, status: pw.status } }),
    };
  });
  const tally = (k: 'regime' | 'horizon', v: string) => rows.filter((r) => r[k] === v).length;
  const integrated =
    s.translation === null
      ? 'nothing is integrated and no trajectory is produced'
      : `the only integration is the translation's witness, run at each judged row's point (${s.translation.tr.bridgeId}, ` +
        'RK4, bounded); no trajectory is output';
  const evaluated =
    s.result.kind === 'bound'
      ? `the path's closed-form point bound at each sample (the exact error of the reduced model in the norm '${s.result.norm ?? 'none stated'}'); ` +
        integrated
      : `no error: the path carries no composite claim ('${s.result.reason}'); rows report regime and horizon status only` +
        (s.translation === null ? '' : `; ${integrated}`);
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
                          errorKind: s.translation.tr.errorKind,
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
    const pwCol = s.translation !== null;
    ctx.write(`${sweep.name},regime,horizon,error,${tol ? 'adequacy,' : ''}${pwCol ? 'point_witness,' : ''}reason\n`);
    for (const r of rows) {
      ctx.write(
        `${r.value},${r.regime},${r.horizon},${r.error ?? ''},${tol ? `${r.adequacy},` : ''}${pwCol ? `${r.pointWitness?.status ?? ''},` : ''}` +
          `"${(r.reason ?? '').replace(/"/g, '""')}"\n`,
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
    const carried = s.translation?.evidence.carriages.map((c) => c.bridgeId) ?? [];
    out(
      s.translation === null
        ? `  tolerance: ${showTolerance(s.tolerance)} — no translation into '${s.tolerance.observable}' reaches the end of this path; every row is undetermined`
        : `  tolerance: ${showTolerance(s.tolerance, s.translation.tr.unit)} through ${s.translation.tr.bridgeId}'s declared translation` +
            `${carried.length > 0 ? `, carried by ${carried.join(', ')}` : ''} (${s.translation.tr.boundary}); ` +
            `translation evidence (fixture): ${s.translation.evidence.tags.join(', ')}`,
    );
  }
  const tolCol = s.tolerance === null ? '' : `${'adequacy'.padEnd(13)} `;
  const pwCol = s.translation === null ? '' : `${'point witness'.padEnd(14)} `;
  out(`  ${sweep.name.padEnd(12)} ${'regime'.padEnd(10)} ${'horizon'.padEnd(14)} ${tolCol}${pwCol}error`);
  for (const r of rows) {
    const a = r.adequacy === undefined ? '' : `${r.adequacy.padEnd(13)} `;
    const w = s.translation === null ? '' : `${(r.pointWitness?.status ?? '—').padEnd(14)} `;
    out(`  ${ctx.api.formatQuantity(r.value, 6).padEnd(12)} ${String(r.regime).padEnd(10)} ${String(r.horizon).padEnd(14)} ${a}${w}${r.error === null ? `— ${r.reason ?? ''}` : ctx.api.formatQuantity(r.error, 6)}`);
  }
  out(
    `  in regime: ${tally('regime', 'holds')} · outside: ${tally('regime', 'violated')} · unknown: ${tally('regime', 'unknown')} · ` +
      `past the horizon: ${tally('horizon', 'violated')} of ${rows.length}`,
  );
  out('  (a row with no error is not joined to its neighbours: no bound is claimed there. A sweep exits 0; each row is its own verdict.)');
  return 0;
}

/** One side of a `--compare` sweep: a route from the shared source and what it composes to. */
interface CompareSide {
  to: string;
  bridges: Bridges;
  result: SweepResult;
  evaluateAt: (at: Readonly<Record<string, number>>) => Evaluation;
}

/**
 * Two routes from one source, swept side by side over one parameter. Per row,
 * each route is `claimed` (regime and horizon hold, and a closed-form error
 * exists), `not-claimed` (a regime or horizon is violated, or the route carries
 * no composite claim) or `unsettled` (a coordinate or t was not supplied). A
 * row where every route is not-claimed is NEITHER: no encoded limit applies,
 * and it carries no number. The two errors are in their own norms and are
 * never compared with each other.
 */
function runCompare(ctx: CommandCtx, from: string, point: Readonly<Record<string, number>>, spec: string, sides: readonly CompareSide[]): number {
  const { out, args } = ctx;
  const sweep = checkSweep(ctx.api, spec, point);
  const rows = sweep.values.map((value) => {
    const at = { ...point, [sweep.name]: value };
    const paths = sides.map((side) => {
      const e = side.evaluateAt(at);
      const cell = sweepCell(e, side.result);
      const state =
        cell.error !== null && cell.regime === 'holds' && cell.horizon !== 'not-evaluated'
          ? 'claimed'
          : cell.error !== null && cell.regime === 'holds' && e.horizons.length === 0
            ? 'claimed'
            : cell.regime === 'violated' || cell.horizon === 'violated' || side.result.kind === 'no-claim'
              ? 'not-claimed'
              : 'unsettled';
      return {
        to: side.to,
        regime: cell.regime,
        horizon: cell.horizon,
        state,
        error: state === 'claimed' ? cell.error : null,
        ...(state !== 'claimed' && cell.reason !== null ? { reason: cell.reason } : {}),
        ...(state === 'unsettled' && cell.error !== null ? { reason: 'no t= given, so the horizon was not evaluated' } : {}),
      };
    });
    const claimedBy = paths.filter((p) => p.state === 'claimed').map((p) => p.to);
    const coverage = claimedBy.length > 0 ? 'covered' : paths.every((p) => p.state === 'not-claimed') ? 'neither' : 'unsettled';
    return { value, paths, claimedBy, coverage };
  });
  const count = (c: string) => rows.filter((r) => r.coverage === c).length;
  const tally = {
    covered: count('covered'),
    neither: count('neither'),
    unsettled: count('unsettled'),
    claimedBy: Object.fromEntries(sides.map((sd) => [sd.to, rows.filter((r) => r.claimedBy.includes(sd.to)).length])),
    claimedByAll: rows.filter((r) => r.claimedBy.length === sides.length).length,
  };
  const evaluated =
    "each route's closed-form point bound at each sample, in that route's OWN norm; the two errors are different " +
    'quantities and are not compared with each other. Nothing is integrated and no trajectory is produced';
  const neitherNote = `no encoded limit applies: the parent ${from} is the model to use there, and no reduced-model number is given`;
  const fixed = Object.entries(point).map(([k, v]) => `${k}=${v}`).join(' ') || 'none';

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'path',
        epistemics: EPISTEMICS,
        options: {
          from,
          to: sides.map((sd) => sd.to),
          at: point,
          sweep: { parameter: sweep.name, spacing: sweep.spacing, samples: rows.length },
        },
        result: {
          compare: sides.map((sd) => ({
            to: sd.to,
            path: sd.bridges.map((b) => b.id),
            kind: sd.result.kind,
            ...(sd.result.kind === 'bound' ? { domainSupremum: sd.result.bound, norm: sd.result.norm } : { reason: sd.result.reason }),
          })),
          evaluated,
          neither: neitherNote,
          rows,
          tally,
        },
      },
      ctx.write,
    );
    return 0;
  }
  if (args.flags.has('csv')) {
    const head = sides.flatMap((sd) => [`${sd.to}_regime`, `${sd.to}_horizon`, `${sd.to}_state`, `${sd.to}_error`]);
    ctx.write(`${sweep.name},${head.join(',')},coverage\n`);
    for (const r of rows) {
      const cells = r.paths.flatMap((p) => [p.regime, p.horizon, p.state, p.error ?? '']);
      ctx.write(`${r.value},${cells.join(',')},${r.coverage === 'covered' ? r.claimedBy.join('+') : r.coverage}\n`);
    }
    return 0;
  }

  out(
    `\nupt path ${from} → ${sides.map((sd) => sd.to).join(' | ')} — sweep ${sweep.name} over [${sweep.values[0]}, ` +
      `${sweep.values[sweep.values.length - 1]}], ${rows.length} samples (${sweep.spacing}); fixed: ${fixed}`,
  );
  for (const sd of sides) {
    out(
      `  → ${sd.to}: ${sd.bridges.map((b) => b.id).join(' → ')}; ` +
        (sd.result.kind === 'bound' ? `norm: ${sd.result.norm ?? 'none stated'}` : `no composite claim ('${sd.result.reason}')`),
    );
  }
  out(`  evaluated: ${evaluated}`);
  const heads = sides.map((sd) => `${sd.to}: regime/horizon error`);
  const w = Math.max(30, ...heads.map((h) => h.length));
  out(`  ${sweep.name.padEnd(12)} ${heads.map((h) => h.padEnd(w)).join(' ')} covered by`);
  for (const r of rows) {
    const cells = r.paths.map((p) =>
      `${p.regime}/${p.horizon} ${p.error === null ? '—' : ctx.api.formatQuantity(p.error, 6)}`.padEnd(w),
    );
    const cov = r.coverage === 'covered' ? r.claimedBy.join(' + ') : r.coverage === 'neither' ? `NEITHER — ${neitherNote}` : 'UNSETTLED — a coordinate or t was not supplied';
    out(`  ${ctx.api.formatQuantity(r.value, 6).padEnd(12)} ${cells.join(' ')} ${cov}`);
  }
  out(
    `  covered: ${tally.covered} (${sides.map((sd) => `${sd.to}: ${tally.claimedBy[sd.to]}`).join(', ')}; by all: ${tally.claimedByAll}) · ` +
      `NEITHER: ${tally.neither} · unsettled: ${tally.unsettled} of ${rows.length}`,
  );
  out('  (errors to 6 significant digits, --json for full precision; a row with no error is not joined to its neighbours. A sweep exits 0.)');
  return 0;
}

/** The point evaluation of one route: regimes, horizons and the proven point bound at `at`. */
function makeEvaluator(api: CommandCtx['api'], bridges: Bridges, result: RouteClaim) {
  return (at: Readonly<Record<string, number>>): Evaluation & { regimes: RegimeReport[] } => {
    // A horizon is read at the END of the route: a transport applied after a
    // bound restates it on the later model's clock (ADR, time map).
    const carried = result.kind === 'bound' ? (result.transports ?? []) : [];
    const horizons: HorizonReport[] = bridges.flatMap((b, i) => {
      const h = api.horizonOnRoute(bridges, carried, i);
      if (h === null) return [];
      // A later step in another family keeps its horizon unevaluated unless a
      // transport on that step restates the clock. The earlier horizon stays
      // in the time of the model where it was stated.
      const blocked = api.familyChangeBlocksHorizon(bridges, carried, i);
      return [
        {
          bridgeId: b.id,
          horizon: h.horizon,
          holds: at['t'] === undefined || blocked ? null : h.holds(at['t'], at),
          ...(h.restatedBy.length > 0
            ? { restatedBy: h.restatedBy.map((a) => ({ transport: a.transport.id, horizon: a.transport.timeMap.horizon })) }
            : {}),
          ...(blocked ? { unevaluated: 'cross-family' as const } : {}),
        },
      ];
    });
    const allHold = horizons.every((h) => h.holds === true);

    // Each step is checked against its own regime. A group name whose π-groups
    // differ is dropped on every step that defines it, so the supplied number
    // is not applied to either definition. intersectRegimes is not called.
    const regimeCollisions = api.collidingRegimeGroups(bridges.map((b) => b.regime));
    const blockedGroups = new Set(regimeCollisions.map((c) => c.group));
    const regimes: RegimeReport[] = bridges.map((b) => {
      const { values } = resolveAtPoint(api, at, [b.regime]);
      for (const name of blockedGroups) delete values[name];
      const check = api.regimeHolds(b.regime, values);
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
        // A transport's K is substituted by its closed form at the point, as a
        // bound's delta is (for ab-spring-lc both are the constant 1).
        const atPoint = bridges.map((b) =>
          b.bound === undefined
            ? b.normTransports === undefined
              ? b
              : { ...b, normTransports: b.normTransports.map((nt) => ({ ...nt, K: nt.KAt(at) })) }
            : { ...b, bound: { ...b.bound, delta: b.bound.deltaAt!(at) } },
        );
        const composed = atPoint.every((b) => b.bound === undefined || Number.isFinite(b.bound.delta))
          ? api.boundPath(atPoint)
          : null;
        if (composed !== null && composed.kind === 'bound') pointBound = composed.bound;
        else pointBoundReason = 'a parameter the point bound needs was not supplied';
      }
    }
    return { regimes, allRegimesHold, horizons, allHold, pointBound, pointBoundReason, regimeCollisions };
  };
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out, err } = ctx;
  const wantJson = args.flags.has('json');
  const endpoints = args.positionals.filter((p) => !p.includes('='));
  const assignments = [...(args.flags.get('at') ?? []), ...args.positionals.filter((p) => p.includes('='))];

  if (endpoints.length !== 2) {
    throw new UsageError(
      `upt path: exactly two model ids are required (got ${endpoints.length}); e.g. ` +
        '`upt path model-pendulum model-spring`',
    );
  }
  const [from, to] = endpoints as [string, string];
  const atNotes: string[] = [];
  const point = parseAt(api, assignments, 'path', atNotes);
  for (const note of atNotes) err(note);
  const t = point['t'];

  const { bridges, fromFamily, toFamily } = selectRoute(api, from, to, 'path');
  const multi = from === to ? [] : multiPremiseBridges(api, from, to);

  if (bridges === null) {
    if (wantJson) {
      emitJson(
        {
          command: 'path',
          epistemics: EPISTEMICS,
          options: { from, to, at: point },
          result: { path: null, ...(multi.length === 0 ? {} : { multiPremise: multi }) },
        },
        ctx.write,
      );
      return 0;
    }
    out(`\nupt path ${from} → ${to}`);
    out('  no chain of bridges connects these models; there is nothing to compose.');
    printMultiPremise(out, multi);
    return 0;
  }

  const labels = routeFamilyLabels(api, bridges, from);

  if (bridges.length === 0) {
    if (wantJson) {
      emitJson(
        {
          command: 'path',
          epistemics: EPISTEMICS,
          options: { from, to, at: point },
          result: { path: [], crossFamily: labels.crossFamily, modelFamilies: labels.modelFamilies },
        },
        ctx.write,
      );
      return 0;
    }
    out(`\nupt path ${from} → ${to}`);
    out('  the endpoints are the same model: the path is empty and composes nothing.');
    return 0;
  }

  const result = routeClaim(api, bridges);
  const missing = explainsRefusal(result) ? missingForComposite(api, bridges) : [];

  const evaluateAt = makeEvaluator(api, bridges, result);
  const tolValues = args.flags.get('tolerance');
  const tolerance = parseTolerance(api, tolValues === undefined ? undefined : tolValues[tolValues.length - 1]);
  const scope = toleranceScope(api, bridges);
  const found = tolerance?.observable == null ? null : pathTranslation(api, bridges, tolerance.observable);
  const translation = found?.tr ?? undefined;
  const carriages = found !== null && found.tr !== null ? found.carriages : [];
  const sweepSpec = args.flags.get('sweep');
  const compareTo = args.flags.get('compare');
  if (compareTo !== undefined && compareTo.length > 0) {
    if (sweepSpec === undefined || sweepSpec.length === 0) {
      throw new CliError('upt path: --compare needs --sweep (two routes are compared row by row over a sweep)');
    }
    if (tolerance !== null) {
      throw new CliError('upt path: --compare does not take --tolerance: judge each route on its own, since their errors are in different norms');
    }
    const to2 = compareTo[compareTo.length - 1]!;
    if (to2 === to) throw new CliError(`upt path: --compare=${to2} is the same target as the path; name a different model`);
    const other = selectRoute(api, from, to2, 'path').bridges;
    if (other === null || other.length === 0) {
      throw new CliError(
        `upt path: --compare=${to2}: ${other === null ? `no chain of bridges connects ${from} to ${to2}` : 'the endpoints are the same model'}; there is nothing to compare`,
      );
    }
    const otherResult = routeClaim(api, other);
    return runCompare(ctx, from, point, sweepSpec[sweepSpec.length - 1]!, [
      { to, bridges, result, evaluateAt },
      { to: to2, bridges: other, result: otherResult, evaluateAt: makeEvaluator(api, other, otherResult) },
    ]);
  }
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
          : judgeAtPoint(api, { ...tolerance, observable: tolerance.observable }, bridges, e, at, false),
      translation: translation === undefined ? null : { tr: translation, evidence: translationEvidence(api, translation, carriages) },
    });
  }
  if (args.flags.has('csv')) throw new CliError('upt path: --csv needs --sweep (a single point is not a table)');

  const evaluation = evaluateAt(point);
  const { regimes, allRegimesHold, horizons, allHold, pointBound, pointBoundReason, regimeCollisions } = evaluation;
  const adequacy =
    tolerance === null || tolerance.observable !== null ? null : judgeTolerance(tolerance.value, evaluation, t !== undefined);
  const observed =
    tolerance === null || tolerance.observable === null
      ? null
      : judgeAtPoint(api, { ...tolerance, observable: tolerance.observable }, bridges, evaluation, point, true);
  const evidence = translation === undefined ? null : translationEvidence(api, translation, carriages);

  // A violated regime or horizon is a failed check: exit 3 (persona finding F2),
  // and so is a tolerance the point error exceeds. UNKNOWN, where a coordinate
  // or t was not supplied, is not a failure.
  const horizonViolated = t !== undefined && horizons.some((h) => h.holds === false);
  // The domain supremum is the route's answer only while the point check has
  // not withdrawn it. A violated regime or horizon is not a claim, so neither
  // text nor JSON carries a bound number.
  const claimWithdrawn = allRegimesHold === false || horizonViolated;
  const withdrawnReason = allRegimesHold === false
    ? (pointBoundReason ?? 'a regime on the path is violated or unchecked')
    : 'past the horizon, no bound is claimed at this point';
  const exitCode =
    allRegimesHold === false ||
    horizonViolated ||
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
          crossFamily: labels.crossFamily,
          modelFamilies: labels.modelFamilies,
          path: labels.steps,
          // A no-claim has no `bound` key at all — the type refuses it, and so
          // does this envelope.
          ...(result.kind === 'bound'
            ? {
                kind: 'bound',
                relation: result.relation,
                ...(claimWithdrawn ? {} : { bound: result.bound }),
                norm: result.norm,
                terminal: result.terminal,
                ...(result.transports === undefined ? {} : { transports: result.transports.map(transportReport) }),
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
          pointBound: claimWithdrawn ? null : pointBound,
          ...((claimWithdrawn ? withdrawnReason : pointBoundReason) !== null
            ? { pointBoundReason: claimWithdrawn ? withdrawnReason : pointBoundReason }
            : {}),
          horizons,
          ...(multi.length === 0 ? {} : { multiPremise: multi }),
          ...(regimeCollisions.length === 0 ? {} : { regimeCollisions }),
          horizonsEvaluated: t !== undefined,
          allHorizonsHold:
            t === undefined || horizons.some((h) => h.holds === null) ? (horizonViolated ? false : null) : allHold,
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
  printMultiPremise(out, multi);
  if (labels.crossFamily) {
    out(`  crosses families: ${labels.modelFamilies.join(' → ')}`);
  }
  out('');
  if (result.kind === 'bound') {
    out(`  composite relation: ${result.relation}`);
    if (claimWithdrawn) {
      out('  composed bound: none — no bound is claimed at this point');
    } else {
      out(`  composed bound: K = ${result.bound.K} · delta = ${result.bound.delta}`);
    }
    out(`  norm: ${result.norm ?? '(none stated — the claim is the vacuous identity)'}`);
    if (result.terminal) out('  terminal: the last step states no Lipschitz constant; the claim ends there');
    for (const a of result.transports ?? []) {
      const nt = a.transport;
      out(`  why the bound crosses '${a.bridgeId}' (exact): it declares the norm transport '${nt.id}'`);
      out(`    ${nt.fromModel} → ${nt.toModel}: '${nt.from}' → '${nt.to}', K = ${nt.K} (${nt.domain})`);
      out(`    because: ${nt.derivation}`);
      out(`    time map: ${nt.timeMap.map} (uniform)`);
      out(`    horizon: ${nt.timeMap.horizon}`);
      out(
        `    witness: ${nt.witness.id} (${nt.witness.kind}; ${nt.basis} when it checks, never formally proved) — ` +
          `\`upt map --route=${from},${to} --run\` runs it`,
      );
      out('    no other norm or direction through this map is declared, and each stays refused');
    }
    if (!claimWithdrawn && pointBound !== null) {
      out(
        `  bound at this point: K = ${pointBound.K} · delta = ${pointBound.delta} (closed-form: the exact error; ` +
          "the composed bound above is the supremum over the bridge's domain)",
      );
    } else if ((claimWithdrawn ? withdrawnReason : pointBoundReason) !== null) {
      out(`  bound at this point: none — ${claimWithdrawn ? withdrawnReason : pointBoundReason}`);
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
  if (regimeCollisions.length > 0) {
    out('  regime group names collide (unchecked on each step that defines them):');
    for (const c of regimeCollisions) out(`    ${c.group}: ${c.families.join(', ')}`);
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
    for (const h of horizons) {
      out(`    ${h.bridgeId}: ${h.horizon}`);
      for (const r of h.restatedBy ?? []) out(`      restated by '${r.transport}': ${r.horizon}`);
    }
  } else if (horizons.some((h) => h.unevaluated === 'cross-family') && !horizonViolated) {
    out(`  horizons at t=${t}: NOT EVALUATED — a family change does not restate a horizon onto the next clock`);
    for (const h of horizons) {
      const state = h.holds === null ? 'unevaluated' : h.holds ? 'holds' : 'VIOLATED';
      out(`    ${h.bridgeId}: ${state} — ${h.horizon}`);
      for (const r of h.restatedBy ?? []) out(`      restated by '${r.transport}': ${r.horizon}`);
    }
  } else {
    out(`  horizons at t=${t}: ${allHold ? 'all hold' : 'NOT all hold'}`);
    for (const h of horizons) {
      const state = h.holds === null ? 'unevaluated' : h.holds ? 'holds' : 'VIOLATED';
      out(`    ${h.bridgeId}: ${state} — ${h.horizon}`);
      for (const r of h.restatedBy ?? []) out(`      restated by '${r.transport}': ${r.horizon}`);
    }
  }
  if (adequacy !== null) {
    out(`  tolerance ${tolerance!.value}: ${adequacy.verdict.toUpperCase()} — ${adequacy.reason}`);
    out(`    (${scope})`);
  }
  if (observed !== null) printObservable(out, tolerance!, observed, bridges, evidence, result.kind);
  out(`  (${EPISTEMICS})`);
  return exitCode;
}

export const command: Command = {
  name: 'path',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Show the bridge chain between two models and whether a bound is claimed there.',
  example: 'upt path model-pendulum model-spring --at theta0=0.2 T0=1 t=10',
  group: 'explore',
  run,
};
registerCommand(command);
