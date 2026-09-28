/**
 * `upt atlas [<bridge-id>]` — one atlas bridge with EVERY qualification visible.
 *
 * Atlas Phase 6, S6.5. The rule this command exists to keep: no output hides a
 * qualification. A bridge is its relation AND its side conditions, regime,
 * bound and horizon, witnesses, counterexamples and formal reference; printing
 * the relation alone would present an approximation valid for θ0 ≤ 0.5 as if it
 * held everywhere. Sections that are empty are PRINTED as empty ("none stated"),
 * never omitted, so an absent qualification is visible as an absence.
 *
 * With no id it lists every bridge of every registered family.
 *
 * ## The two derived tags, shown honestly
 *
 * `formally-proved` is derived here from the record's `formalRef`.
 * `symbolically-checked` is derived from `data/atlas/witness-results.json`, a
 * repository artifact that is NOT shipped in the package, so this command lists
 * the symbolic witnesses and says where the tag is decided rather than printing
 * a verdict it cannot see.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { CliError, EXIT_CHECK_FAILED } from '../errors.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [
  { name: '--run', valueStyle: 'none' },
  { name: '--json', valueStyle: 'none' },
];

/** One witness run as `runWitnessRegistry` reports it. */
interface WitnessRun {
  readonly witnessId: string;
  readonly kind: string;
  readonly status: 'checked' | 'refuted' | 'unresolved';
  readonly reason?: string;
  readonly detail: string;
}

/**
 * Tally witness runs. `refuted` and `unresolved` are kept apart: only a
 * refutation fails the check; an unresolved run is not a pass either.
 * @internal
 */
export function summarizeWitnessRuns(runs: readonly WitnessRun[]): {
  checked: number;
  refuted: number;
  unresolved: number;
  exitCode: number;
} {
  const n = (s: WitnessRun['status']) => runs.filter((r) => r.status === s).length;
  const refuted = n('refuted');
  return { checked: n('checked'), refuted, unresolved: n('unresolved'), exitCode: refuted > 0 ? EXIT_CHECK_FAILED : 0 };
}

/** `null` and `[]` are both not yet analysed, and neither is omitted. */
function formatUniformity(uniformity: readonly string[] | null): string {
  if (uniformity === null || uniformity.length === 0) return 'not yet analysed';
  return uniformity.join('; ');
}

const HELP = `upt atlas [<bridge-id>] [--run] [--json]
        One atlas bridge with every qualification visible: relation, premises
        and conclusion, transformation and inverse, side conditions, regime
        inequalities, bound with its horizon and uniformity, what it preserves and loses,
        witnesses, counterexamples, formal reference and review status. Empty
        sections print as "none stated", never disappear. With no id, lists
        every bridge of every family.
        Evidence is shown BY CLAIM (correspondence, regime, bound, horizon,
        preserves), each citing only what the record's structure links to it;
        a witness is listed under the bound only where the witness registry
        attributes it, and the rest are listed apart. Every witness shows its
        execution status: a witness's name is not
        its result. --run executes the bridge's in-process registered
        witnesses now and reports checked / refuted / unresolved separately
        (exit 3 if any is refuted).
        e.g.  upt atlas ab-pendulum-linear
              upt atlas ab-walk-diffusion --run`;

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const wantJson = args.flags.has('json');
  const [id, extra] = args.positionals;
  if (extra !== undefined) throw new CliError(`upt atlas: unexpected argument '${extra}' (one bridge at a time)`);

  const families = api.ATLAS_FAMILIES;
  const rows = families.flatMap((f) => f.bridges.map((b) => ({ family: f.family, bridge: b })));
  const models = new Map(families.flatMap((f) => f.models.map((m) => [m.id, m] as const)));

  if (id === undefined) {
    const listing = rows.map((r) => ({ id: r.bridge.id, family: r.family, relation: r.bridge.relation }));
    if (wantJson) {
      emitJson({ command: 'atlas', result: { bridges: listing } }, ctx.write);
      return 0;
    }
    out(`\n${listing.length} atlas bridges across ${families.length} families:`);
    for (const l of listing) out(`  ${l.id.padEnd(28)} ${l.relation.padEnd(22)} [${l.family}]`);
    out('\nRun `upt atlas <bridge-id>` for one bridge with every qualification.');
    return 0;
  }

  const row = rows.find((r) => r.bridge.id === id);
  if (row === undefined) {
    throw new CliError(`upt atlas: unknown bridge '${id}' (run \`upt atlas\` to list them)`);
  }
  const b = row.bridge;
  const derived = api.deriveEvidence(b, api.NO_PASSING_WITNESSES);
  const symbolic = b.witnesses.filter((w) => w.kind === 'symbolic').map((w) => w.id);
  const familyOf = (modelId: string): string => models.get(modelId)?.family ?? 'UNKNOWN';

  // A claim cites only what the record's structure links to it. A witness is
  // cited under a claim only where the registry attributes it, and
  // tests/atlas/witness-claims.test.ts checks each attribution against the spec.
  const registered = api.WITNESS_REGISTRY.filter((e) => e.recordId === b.id);
  const boundWitnesses = registered.flatMap((e) =>
    e.kind === 'numeric' && e.claim?.name === 'bound' ? [{ id: e.spec.id, at: e.claim.at(e.spec.fineResolution) }] : [],
  );
  const notTheRef = b.formalRef === undefined ? '' : '; the formal reference is not attributed to it';
  const n = b.regime.inequalities.length;
  const claims = {
    correspondence: {
      formalReference:
        b.formalRef === undefined
          ? null
          : { system: b.formalRef.system, statement: b.formalRef.statement, fidelity: b.formalRef.fidelity },
      text:
        b.formalRef === undefined
          ? 'no formal reference — no checked counterpart is recorded'
          : `formal reference ${b.formalRef.system}, fidelity ${b.formalRef.fidelity} — covers its statement only`,
    },
    regime: {
      inequalities: n,
      vacuous: n === 0,
      text:
        n === 0
          ? 'VACUOUS — no machine inequality to check'
          : `${n} machine ${n === 1 ? 'inequality' : 'inequalities'} — check a point with \`upt regime ${row.family} --at …\``,
    },
    bound:
      b.bound === undefined
        ? null
        : {
            basis: b.bound.deltaAtBasis ?? null,
            witnesses: boundWitnesses,
            text:
              (b.bound.deltaAtBasis === 'closed-form'
                ? 'basis closed-form (deltaAt is the exact error)'
                : b.bound.deltaAtBasis === 'numerically-supported'
                  ? 'basis numerically-supported (witnesses support the formula; no proof covers it)'
                  : 'no basis recorded for its value') + notTheRef,
          },
    horizon: {
      machineForm: b.bound !== undefined,
      text: b.bound === undefined ? 'none stated (no bound)' : `machine form recorded${notTheRef}`,
    },
    preserves: {
      evidence: null,
      text: b.preserves.length === 0 ? 'none stated' : 'no evidence is attributed to a preserved property',
    },
  };

  const registeredIds = new Set(registered.map((e) => e.spec.id));
  const claimOf = (id: string): 'bound' | null => (boundWitnesses.some((w) => w.id === id) ? 'bound' : null);
  const ran = args.flags.has('run') ? (await api.runWitnessRegistry(registered)).results : null;
  const witnessExecution = b.witnesses.map((w) => {
    const result = ran?.find((r) => r.witnessId === w.id);
    if (result !== undefined) {
      return {
        id: w.id,
        kind: w.kind,
        claim: claimOf(w.id),
        status: result.status,
        ...(result.reason === undefined ? {} : { reason: result.reason }),
        detail: result.detail,
      };
    }
    return {
      id: w.id,
      kind: w.kind,
      claim: claimOf(w.id),
      status: registeredIds.has(w.id) ? ('runnable' as const) : ('not-observed' as const),
      rerun: `bunx vitest run ${w.test}`,
    };
  });
  const runSummary = ran === null ? null : summarizeWitnessRuns(ran);

  // A declared norm transport's witness is registered under the transport id,
  // not the bridge's: it checks how the map acts on one norm, not the bridge.
  const declared = b.normTransports ?? [];
  const transportEntries = api.WITNESS_REGISTRY.filter((e) => declared.some((nt) => nt.id === e.recordId));
  const ranTransports = args.flags.has('run') ? (await api.runWitnessRegistry(transportEntries)).results : null;
  const transportSummary = ranTransports === null ? null : summarizeWitnessRuns(ranTransports);
  const normTransports =
    b.relation !== 'exact-equivalence'
      ? null
      : declared.map((nt) => {
          const r = ranTransports?.find((x) => x.recordId === nt.id && x.witnessId === nt.witness.id);
          const registeredHere = transportEntries.some((e) => e.recordId === nt.id && e.spec.id === nt.witness.id);
          return {
            id: nt.id,
            fromModel: nt.fromModel,
            toModel: nt.toModel,
            from: nt.from,
            to: nt.to,
            K: nt.K,
            domain: nt.domain,
            derivation: nt.derivation,
            timeMap: { map: nt.timeMap.map, uniform: nt.timeMap.uniform, horizon: nt.timeMap.horizon },
            uniformity: nt.uniformity,
            witness: { id: nt.witness.id, kind: nt.witness.kind, test: nt.witness.test, tolerance: nt.witness.tolerance ?? null },
            basis: nt.basis,
            status: r === undefined ? (registeredHere ? ('runnable' as const) : ('not-observed' as const)) : r.status,
            ...(r?.reason === undefined ? {} : { reason: r.reason }),
          };
        });
  const exitCode = Math.max(runSummary?.exitCode ?? 0, transportSummary?.exitCode ?? 0);

  const report = {
    id: b.id,
    family: row.family,
    relation: b.relation,
    premises: b.premises.map((p) => ({ id: p, family: familyOf(p) })),
    conclusion: { id: b.conclusion, family: familyOf(b.conclusion) },
    transformation: b.transformation,
    inverse: b.inverse ?? null,
    sideConditions: [...b.sideConditions],
    regime: {
      inequalities: b.regime.inequalities.map((i) => ({ group: i.group, op: i.op, bound: i.bound, alias: i.alias ?? null })),
      vacuous: b.regime.inequalities.length === 0,
    },
    bound:
      b.bound === undefined
        ? null
        : {
            K: b.bound.K,
            delta: b.bound.delta,
            norm: b.bound.norm,
            domain: b.bound.domain,
            horizon: b.bound.horizon,
            limitCharacter: b.bound.limitCharacter,
            uniformity: b.bound.uniformity === null ? null : [...b.bound.uniformity],
          },
    preserves: [...b.preserves],
    doesNotPreserve: [...b.doesNotPreserve],
    storedEvidence: [...b.evidence].sort(),
    formallyProved: derived.has('formally-proved'),
    symbolicWitnesses: symbolic,
    witnesses: b.witnesses.map((w) => ({ id: w.id, kind: w.kind, test: w.test, tolerance: w.tolerance ?? null })),
    counterexamples: b.counterexamples.map((c) => ({ description: c.description, witness: c.witness })),
    formalRef: b.formalRef ?? null,
    formalRefCovers: b.formalRef === undefined ? null : 'the statement only — not the bound, regime or side conditions unless it says so',
    citations: [...b.citations],
    reviewStatus: b.reviewStatus,
    claims,
    witnessExecution,
    witnessRun: runSummary,
    normTransports,
    ...(transportSummary === null ? {} : { normTransportRun: transportSummary }),
  };

  if (wantJson) {
    emitJson(
      {
        command: 'atlas',
        epistemics:
          'Every qualification is included; empty lists mean "none stated", not "none needed". ' +
          'symbolically-checked is decided by data/atlas/witness-results.json, which is not shipped in ' +
          'the package; symbolicWitnesses names the witnesses it is decided over.',
        options: { id, run: ran !== null },
        result: report,
      },
      ctx.write,
    );
    return exitCode;
  }

  const list = (label: string, items: readonly string[]): void => {
    out(`${label}:`);
    if (items.length === 0) out('  none stated');
    for (const i of items) out(`  - ${i}`);
  };
  out(`\n${b.id} — ${b.relation} [${row.family}]`);
  out(`  ${report.premises.map((p) => `${p.id} (${p.family})`).join(' + ')} → ${b.conclusion} (${report.conclusion.family})`);
  out(`transformation: ${b.transformation}`);
  out(`inverse: ${b.inverse ?? 'none stated'}`);
  list('side conditions', b.sideConditions);
  out('regime:');
  if (report.regime.vacuous) out('  VACUOUS — states no inequality; the bridge claims no restricted domain');
  for (const i of b.regime.inequalities) out(`  - ${i.group} ${i.op} ${i.bound}${i.alias === undefined ? '' : ` (${i.alias})`}`);
  out('bound:');
  if (b.bound === undefined) out('  none stated');
  else {
    out(`  K = ${b.bound.K}, delta = ${b.bound.delta} (${b.bound.norm})`);
    out(`  domain: ${b.bound.domain}`);
    out(`  horizon: ${b.bound.horizon}`);
    out(`  limit: ${b.bound.limitCharacter}`);
    out(`  uniformity: ${formatUniformity(b.bound.uniformity)}`);
  }
  list('preserves', b.preserves);
  list('does NOT preserve', b.doesNotPreserve);
  out(`stored evidence: ${report.storedEvidence.join(', ') || 'none'}`);
  out(
    `formally-proved (derived from formalRef): ${
      report.formallyProved
        ? `YES — for the formal-reference statement only (fidelity ${b.formalRef!.fidelity}); ` +
          'NOT the bound, regime, horizon or side conditions unless the statement says so'
        : 'no'
    }`,
  );
  out(
    symbolic.length === 0
      ? 'symbolically-checked: no symbolic witness'
      : `symbolically-checked: decided by data/atlas/witness-results.json over ${symbolic.join(', ')} ` +
          '(repository artifact, not shipped in the package)',
  );
  out('witnesses:');
  if (b.witnesses.length === 0) out('  none stated');
  for (const w of b.witnesses) {
    out(`  - ${w.id} [${w.kind}] ${w.test}${w.tolerance === undefined ? '' : ` — ${w.tolerance}`}`);
  }
  out('counterexamples:');
  if (b.counterexamples.length === 0) out('  none stated');
  for (const c of b.counterexamples) out(`  - ${c.description} (witness ${c.witness})`);
  out('formal reference:');
  if (b.formalRef === undefined) out('  none — no checked counterpart is recorded');
  else {
    out(`  ${b.formalRef.system}: ${b.formalRef.statement}`);
    out(`  version ${b.formalRef.version}; axioms ${b.formalRef.axioms.join(', ') || 'none'}`);
    out(`  fidelity: ${b.formalRef.fidelity}`);
    // The tag above must not read wider than the statement: a reference that
    // certifies a transformation does not certify the bound beside it.
    out('  covers: the statement above ONLY — not the bound, regime or side conditions unless it says so');
  }
  const execution = (w: (typeof witnessExecution)[number]): string => {
    if (!('rerun' in w)) return `${w.status}${'reason' in w ? ` (${w.reason})` : ''} (run now) — ${w.detail}`;
    return w.status === 'runnable'
      ? `registered in-process, not run — \`upt atlas ${b.id} --run\` runs it`
      : `result not observed by this command — its repository test file: ${w.rerun}`;
  };
  out("evidence by claim (derived from the record's structure):");
  out(`  correspondence: ${claims.correspondence.text}`);
  out(`  regime: ${claims.regime.text}`);
  out(`  bound: ${claims.bound?.text ?? 'none stated'}`);
  for (const bw of boundWitnesses) {
    const at = Object.entries(bw.at)
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([k, v]) => `${k} = ${v}`)
      .join(', ');
    const w = witnessExecution.find((x) => x.id === bw.id)!;
    out(`    - ${w.id} [${w.kind}] tests it at ${at} (its error there is the bound's norm; tolerance ≤ delta): ${execution(w)}`);
  }
  out(`  horizon: ${claims.horizon.text}`);
  out(`  preserves: ${claims.preserves.text}`);
  const unattributed = witnessExecution.filter((w) => w.claim === null);
  out(
    boundWitnesses.length === 0
      ? 'witness execution (the record does not attribute a witness to a claim):'
      : 'witness execution, witnesses not attributed to a claim:',
  );
  if (unattributed.length === 0) out(witnessExecution.length === 0 ? '  none stated' : '  none');
  for (const w of unattributed) out(`  - ${w.id} [${w.kind}]: ${execution(w)}`);
  if (runSummary !== null) {
    out(
      registered.length === 0
        ? `witnesses run: none — no witness of ${b.id} is registered to run in-process`
        : `witnesses run: ${runSummary.checked} checked · ${runSummary.refuted} refuted · ${runSummary.unresolved} unresolved`,
    );
  }
  if (normTransports !== null) {
    out('norm transports (declared; a bound in any other norm, or crossing the other way, is refused through this map):');
    if (normTransports.length === 0) out('  none declared — this exact map carries no bound in any norm');
    for (const nt of normTransports) {
      out(`  - ${nt.id}: ${nt.fromModel} → ${nt.toModel}, '${nt.from}' → '${nt.to}', K = ${nt.K} (${nt.domain})`);
      out(`    time map: ${nt.timeMap.map} (${nt.timeMap.uniform ? 'uniform' : 'NOT uniform — not applied'})`);
      const status =
        nt.status === 'runnable'
          ? `registered in-process, not run — \`upt atlas ${b.id} --run\` runs it`
          : nt.status === 'not-observed'
            ? `result not observed by this command — its repository test file: bunx vitest run ${nt.witness.test}`
            : `${nt.status}${'reason' in nt ? ` (${nt.reason})` : ''} (run now)`;
      out(`    witness ${nt.witness.id} [${nt.witness.kind}; ${nt.basis} when it checks]: ${status}`);
    }
  }
  list('citations', b.citations);
  out(`review status: ${b.reviewStatus}`);
  return exitCode;
}

export const command: Command = { name: 'atlas', aliases: [], flags: FLAGS, help: HELP, run };
registerCommand(command);
