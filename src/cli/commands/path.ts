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

const FLAGS: FlagSpec[] = [
  { name: '--at', valueStyle: 'either', repeatable: true },
  { name: '--sweep', valueStyle: 'either' },
  { name: '--csv', valueStyle: 'none' },
  { name: '--tolerance', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt path <from> <to> [--at group=value ...] [--tolerance=EPS]
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
        the bound's own norm: no translation to another observable (phase,
        trajectory, amplitude) is encoded. With --sweep, each row is judged.
        e.g.  upt path model-pendulum model-spring --at theta0=0.2 T0=1 t=10
              upt path model-pendulum model-spring --at T0=1 t=10 --sweep theta0=0.1:0.8:8`;

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

/**
 * What a `no-composite-claim` path lacks, stated as requirements rather than
 * supplied. The first silent table cell is named; then every exact map after a
 * bound, which states no norm and so records nothing about carrying that
 * bound's quantity through its mapping. Nothing here widens the table.
 */
function missingForComposite(
  api: CommandCtx['api'],
  bridges: readonly import('../../cli-api.js').AtlasBridge[],
): string[] {
  const missing: string[] = [];
  let relation: import('../../cli-api.js').AtlasBridge['relation'] = bridges[0]!.relation;
  for (let i = 1; i < bridges.length; i++) {
    const next = bridges[i]!;
    const composed = api.composeRelation(relation, next.relation);
    if (composed === 'no-composite-claim') {
      missing.push(
        `a composition-table cell for ${relation} then ${next.relation} (silent by design; widening it is a ` +
          'reviewed act, docs/planning/Atlas-Phase-1-Design.md §2.2)',
      );
      break;
    }
    relation = composed;
  }
  let norm: string | undefined;
  for (const b of bridges) {
    if (b.bound !== undefined) norm = b.bound.norm;
    else if (b.relation === 'exact-equivalence' && norm !== undefined) {
      missing.push(`'${b.id}' to state that it carries '${norm}' through its mapping (it states no norm)`);
    }
  }
  return missing;
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

/** What a tolerance is judged in, and what it is not translated into. */
const TOLERANCE_SCOPE =
  "judged in the bound's own norm only; no translation to another observable (phase, trajectory, amplitude) is encoded";

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

export function parseTolerance(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const v = Number(raw);
  if (raw === '' || !Number.isFinite(v) || v <= 0) throw new CliError(`upt path: --tolerance=${raw} must be a finite number > 0`);
  return v;
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
    tolerance: number | null;
  },
): number {
  const { out, args } = ctx;
  const sweep = parseSweep(s.spec);
  if (sweep.name in s.point) {
    throw new CliError(`upt path: '${sweep.name}' is both swept and fixed by --at; give it one role`);
  }
  const rows = sweep.values.map((value) => {
    const e = s.evaluateAt({ ...s.point, [sweep.name]: value });
    const regime = e.allRegimesHold === true ? 'holds' : e.allRegimesHold === false ? 'violated' : 'unknown';
    const horizon = e.horizons.length === 0 || e.horizons[0]!.holds === null ? 'not-evaluated' : e.allHold ? 'holds' : 'violated';
    let error: number | null = e.pointBound?.delta ?? null;
    let reason = s.result.kind === 'no-claim' ? 'no composite claim' : e.pointBoundReason;
    if (error !== null && horizon === 'violated') {
      error = null;
      reason = 'past the horizon: the bound is not claimed there';
    }
    const adequacy = s.tolerance === null ? null : judgeTolerance(s.tolerance, e, 't' in s.point || sweep.name === 't').verdict;
    return {
      value,
      regime,
      horizon,
      error,
      ...(error === null && reason !== null ? { reason } : {}),
      ...(adequacy === null ? {} : { adequacy }),
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
          ...(s.tolerance === null ? {} : { tolerance: s.tolerance, toleranceScope: TOLERANCE_SCOPE }),
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
  if (s.tolerance !== null) out(`  tolerance: ${s.tolerance}, ${TOLERANCE_SCOPE}`);
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

  // Endpoints in one family are searched in that family first, so a route
  // that exists inside it is the one reported. Endpoints in different
  // families, or a same-family pair with no route inside it, are searched
  // across the whole atlas: a family is a filing label, and a bridge such as
  // ab-kg-schrodinger (waves → diffusion) is as qualified as any other.
  const familyOf = (id: string): string | undefined =>
    api.ATLAS_FAMILIES.find((f) => f.models.some((m) => m.id === id))?.family;
  const bridgeFamily = (id: string): string | undefined =>
    api.ATLAS_FAMILIES.find((f) => f.bridges.some((b) => b.id === id))?.family;
  const fromFamily = familyOf(from);
  const toFamily = familyOf(to);
  const family = fromFamily ?? toFamily ?? api.ATLAS_FAMILIES[0]!.family;

  let bridges: readonly import('../../cli-api.js').AtlasBridge[] | null;
  try {
    if (fromFamily !== undefined && toFamily !== undefined) {
      bridges = fromFamily === toFamily ? api.findPath(family, from, to) : null;
      bridges ??= api.findAtlasPath(from, to);
    } else {
      bridges = api.findPath(family, from, to);
    }
  } catch (e) {
    // RangeError: an unknown endpoint. Reported as a CliError (exit 1) rather
    // than surfaced as a crash — and NOT as `null`, which would be
    // indistinguishable from a genuinely disconnected pair.
    throw new CliError(`upt path: ${e instanceof Error ? e.message : String(e)}`);
  }

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

  // boundPath throws, rather than inventing a constant, when a step with no
  // Lipschitz constant is followed by another (ab-kg-oscillator then
  // ab-spring-lc). For this command that is a refusal like any other.
  let result:
    | ReturnType<typeof api.boundPath>
    | { kind: 'no-claim'; reason: 'missing-lipschitz'; detail: string };
  try {
    result = api.boundPath(bridges);
  } catch (e) {
    if (!(e instanceof api.MissingLipschitzError)) throw e;
    const unbounded = bridges.slice(0, -1).find((b) => b.bound === undefined && b.relation !== 'exact-equivalence');
    result = {
      kind: 'no-claim',
      reason: 'missing-lipschitz',
      detail:
        `'${unbounded?.id ?? '?'}' (${unbounded?.relation ?? '?'}) states no Lipschitz constant and is not the ` +
        'last step, so the error after it is unbounded and the path carries no bound',
    };
  }

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
  const sweepSpec = args.flags.get('sweep');
  if (sweepSpec !== undefined && sweepSpec.length > 0) {
    return runSweep(ctx, { from, to, point, bridges, result, evaluateAt, spec: sweepSpec[sweepSpec.length - 1]!, tolerance });
  }
  if (args.flags.has('csv')) throw new CliError('upt path: --csv needs --sweep (a single point is not a table)');

  const evaluation = evaluateAt(point);
  const { regimes, allRegimesHold, horizons, allHold, pointBound, pointBoundReason } = evaluation;
  const adequacy = tolerance === null ? null : judgeTolerance(tolerance, evaluation, t !== undefined);

  // A violated regime or horizon is a failed check: exit 3 (persona finding F2),
  // and so is a tolerance the point error exceeds. UNKNOWN, where a coordinate
  // or t was not supplied, is not a failure.
  const exitCode =
    allRegimesHold === false || (t !== undefined && !allHold) || adequacy?.verdict === 'inadequate' ? EXIT_CHECK_FAILED : 0;

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
          ...(adequacy === null ? {} : { tolerance: { value: tolerance, ...adequacy, scope: TOLERANCE_SCOPE } }),
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
    out(`  tolerance ${tolerance}: ${adequacy.verdict.toUpperCase()} — ${adequacy.reason}`);
    out(`    (${TOLERANCE_SCOPE})`);
  }
  out(`  (${EPISTEMICS})`);
  return exitCode;
}

export const command: Command = { name: 'path', aliases: [], flags: FLAGS, help: HELP, run };
registerCommand(command);
