/**
 * `upt regime` — where in parameter space a family's models are claimed to
 * apply, and where nothing is claimed at all.
 *
 * The whole point of this command is the TRI-STATE of `regimeHolds`. A model
 * whose regime could not be checked at the given point is reported as
 * UNKNOWN, never as valid and never as violated: `'unknown'` is a failure to
 * confirm validity, and folding it either way is the silent pass
 * `atlas/regime.ts` exists to prevent. The text and JSON forms therefore both
 * carry three buckets, not two.
 *
 * `--at` states the point. Values are π-group values keyed by
 * `PiGroup.formula` (or a dimensionless input's own name), so `--at
 * theta0=0.2` is a coordinate, not a parameter of the physics.
 *
 * The uncovered-region report is taken over the box the CALLER stated and no
 * other: `uncoveredRegions` refuses to synthesize an extent, so with no `--at`
 * there is no box and the command says so rather than inventing one.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { CliError, EXIT_CHECK_FAILED, UsageError } from '../errors.js';
import { emitJson } from '../output.js';
import { splitAssignments } from '../bindings.js';

const FLAGS: FlagSpec[] = [
  {
    name: '--at',
    valueStyle: 'either',
    repeatable: true,
    description: 'State one regime coordinate as group=value. A value may be an expression such as pi/2.',
  },
  {
    name: '--assume',
    valueStyle: 'either',
    repeatable: true,
    description: 'Record a prose premise as your declaration. It is not evidence and it is not evaluated.',
  },
  {
    name: '--deny',
    valueStyle: 'either',
    repeatable: true,
    description: 'Mark one prose premise contradicted. The others stay unspecified.',
  },
  JSON_FLAG,
];

const HELP = `upt regime <family> [--at group=value ...] [--assume premise ...] [--deny premise ...] [--json]
        Where in parameter space a family's models are claimed to apply.
        --at states a point in REGIME COORDINATES (π-group formulas, or a
        dimensionless input's own name, e.g. --at theta0=0.2). Every model AND
        bridge is reported as valid, violated (naming the failed inequality),
        or UNKNOWN — a coordinate the point never supplied is NOT a pass, and a
        regime that states no inequality reads 'no machine condition evaluated
        (VACUOUS …)' rather than passed (\`upt help statuses\` defines each word).
        Each inequality is listed as satisfied, violated or unchecked. A
        bridge's prose side conditions (lossless, no-slip, ...) are never
        evaluated: they are listed as premises not machine-checked unless you
        --assume one (recorded as your declaration, not as evidence) or --deny
        one (the record then does not apply as stated). Both match a side
        condition by case-insensitive substring and never change the
        inequality verdict.
        A group can be given by its formula (spaces ignored, * read as ·, so
        --at "tau*D*q^2=1" works) or through its parameters: --at tau=1 D=1
        q=1 derives tau · D · q^2 = 1. A key that no record uses is named, and
        ignored.
        Also prints the pairwise overlap of the regimes and, over the box --at
        states, the points no CONSTRAINING regime covers.
        Exit 3 when any record is VIOLATED. VACUOUS, UNKNOWN and a survey with
        no violated record exit 0.
        A value is a number, a unit, or a constant expression (theta0=pi/2,
        t=1s). A bare number is already in the coordinate's unit.
        T, temperature, temp, and T_K are kelvin: an energy on that name is k_B T.
        e.g.  upt regime <name> --at theta0=0.2
              upt regime <name> --deny lossless`;

/**
 * Collect `group=value` assignments from `--at` values and from bare
 * positionals, so `--at theta0=0.2 T0=1 t=10` works as written: the parser
 * gives `--at` one value and leaves the rest as positionals.
 *
 * @throws UsageError on a token with no `=`, CliError on a non-finite value or
 *   a group given twice. A dropped coordinate would silently turn a CHECKED
 *   inequality into an unchecked one, which is exactly the reading this
 *   command exists to keep honest.
 * @internal
 */
export function parseAt(
  api: CommandCtx['api'],
  raw: readonly string[],
  command: string,
  notes?: string[],
): Record<string, number> {
  const assignments = splitAssignments(command, raw, 'group=value');
  const siblings = assignments.map((a) => ({ name: a.name, raw: a.raw }));
  const point: Record<string, number> = {};
  for (const a of assignments) {
    try {
      const read = api.readNamedBinding(a.name, a.raw, { siblings });
      if (a.raw === '' || !Number.isFinite(read.value)) {
        throw new CliError(`upt ${command}: '${a.token}' is not a finite number`);
      }
      point[a.name] = read.value;
      if (notes !== undefined) {
        for (const note of read.notes) if (!notes.includes(note)) notes.push(note);
      }
    } catch (e) {
      if (e instanceof CliError) throw e;
      if (e instanceof api.TemperatureBindingError) {
        throw new CliError(`upt ${command}: '${a.token}' is not a temperature. ${e.message}`);
      }
      throw new CliError(`upt ${command}: '${a.token}' is not a finite number. ${(e as Error).message}`);
    }
  }
  try {
    api.assertSynonymAgreement(point);
  } catch (e) {
    if (e instanceof api.SynonymDisagreementError) throw new CliError(`upt ${command}: ${e.message}`);
    throw e;
  }
  return point;
}

/** A group name with spaces removed and `*` read as `·`, for comparison only. */
const normalizeGroup = (name: string): string => name.replace(/\s+/g, '').replace(/\*/g, '·');

/**
 * Resolve an `--at` point against the regimes it will be checked against
 * (persona finding F1). A key naming a group matches it with spaces ignored and
 * `*` read as `·`, so `tau*D*q^2` reaches the group `tau · D · q^2`. A group
 * whose parameters are all given, and which the point does not state itself, is
 * derived from them: the product of each parameter to its exponent. `unknown`
 * lists the keys that are neither a group nor a parameter of any regime here.
 * @internal
 */
export function resolveAtPoint(
  api: CommandCtx['api'],
  point: Readonly<Record<string, number>>,
  regimes: readonly { groupDefinitions: Readonly<Record<string, { exponents: Readonly<Record<string, number>> }>>; inequalities: readonly { group: string }[] }[],
): { values: Record<string, number>; unknown: string[] } {
  const groups = new Map<string, Readonly<Record<string, number>>>();
  for (const r of regimes) {
    for (const [key, g] of Object.entries(r.groupDefinitions)) groups.set(key, g.exponents);
    for (const i of r.inequalities) if (!groups.has(i.group)) groups.set(i.group, { [i.group]: 1 });
  }
  const byNormal = new Map([...groups.keys()].map((k) => [normalizeGroup(k), k]));
  const named = new Set<string>([...groups.keys(), ...[...groups.values()].flatMap((e) => Object.keys(e))]);
  // A zero exponent does not enter the product: two records can key the same
  // group with and without an extra `c: 0`, and that must not block derivation.
  const used = (e: Readonly<Record<string, number>>) => Object.keys(e).filter((n) => e[n] !== 0);
  const parameters = new Set([...groups.values()].flatMap(used));
  const values: Record<string, number> = {};
  const unknown: string[] = [];
  for (const [key, value] of Object.entries(point)) {
    const resolved = api.resolveQuantityName(key, named) ?? key;
    const group = byNormal.get(normalizeGroup(resolved)) ?? byNormal.get(normalizeGroup(key));
    const stored = group ?? resolved;
    values[stored] = value;
    if (group === undefined && !parameters.has(stored) && !parameters.has(key)) unknown.push(key);
  }
  for (const [key, exponents] of groups) {
    if (key in values) continue;
    const names = used(exponents);
    if (names.length > 0 && names.every((n) => typeof values[n] === 'number')) {
      values[key] = names.reduce((acc, n) => acc * Math.pow(values[n]!, exponents[n]!), 1);
    }
  }
  return { values, unknown };
}

/** Display form of one inequality — the alias when the record states one. */
export function showInequality(ineq: { group: string; op: string; bound: number; alias?: string }): string {
  const literal = `${ineq.group} ${ineq.op} ${ineq.bound}`;
  return ineq.alias === undefined ? literal : `${literal} (${ineq.alias})`;
}

/** The group names an inequality list mentions. */
function groupsOf(inequalities: readonly { group: string }[]): Set<string> {
  return new Set(inequalities.map((i) => i.group));
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out, err } = ctx;
  const wantJson = args.flags.has('json');
  const [familyArg, ...rest] = args.positionals.filter((p) => !p.includes('='));
  const assignments = [...(args.flags.get('at') ?? []), ...args.positionals.filter((p) => p.includes('='))];

  if (familyArg === undefined) {
    throw new UsageError('upt regime: a name is required (e.g. `upt regime <name>`)');
  }
  if (rest.length > 0) {
    throw new UsageError(`upt regime: unexpected argument '${rest[0]}' (one family at a time)`);
  }
  // Atlas families project into the same registry a domain module adds to.
  // This command used to read the family array alone, so a name that was not
  // one of those families had nowhere to put an inequality.
  const registrations = [
    ...api.ATLAS_FAMILIES.map((family) => ({
      name: family.family,
      records: [
        ...family.models.map((m) => ({
          id: m.id,
          kind: 'model' as const,
          regime: m.regime,
          sideConditions: undefined as readonly string[] | undefined,
        })),
        ...family.bridges.map((b) => ({
          id: b.id,
          kind: 'bridge' as const,
          regime: b.regime,
          sideConditions: b.sideConditions,
        })),
      ],
    })),
    ...api.domainRegimeRegistrations(),
  ];
  const registration = registrations.find((entry) => entry.name === familyArg);
  if (registration === undefined) {
    throw new CliError(
      `upt regime: unknown family '${familyArg}' (known: ${registrations.map((entry) => entry.name).join(', ')})`,
    );
  }

  const atNotes: string[] = [];
  const point = parseAt(api, assignments, 'regime', atNotes);
  for (const note of atNotes) err(note);
  const stated = Object.keys(point);
  const assume = args.flags.get('assume') ?? [];
  const deny = args.flags.get('deny') ?? [];
  for (const a of assume) {
    if (deny.some((d) => d.toLowerCase() === a.toLowerCase())) {
      throw new CliError(`upt regime: '${a}' is both assumed and denied`);
    }
  }
  const matches = (declaration: string, premise: string) =>
    declaration !== '' && premise.toLowerCase().includes(declaration.toLowerCase());

  // Models AND bridges, because in this family every MODEL regime states zero
  // inequalities and only the BRIDGES carry real ones. A models-only report
  // would print nine confident 'valid's that were never checked against
  // anything — the tri-state's `true` is vacuous when there is nothing to
  // check, so that case is labelled rather than left to read as a pass.
  const records = registration.records;

  const { values: resolved, unknown } = resolveAtPoint(api, point, records.map((r) => r.regime));
  const unmatched = [
    ...assume.map((d) => ({ flag: '--assume', d })),
    ...deny.map((d) => ({ flag: '--deny', d })),
  ].filter(({ d }) => !records.some((r) => (r.sideConditions ?? []).some((p) => matches(d, p))));

  const verdicts = records.map((r) => {
    const check = api.regimeHolds(r.regime, resolved);
    const violated = check.violated.map(showInequality);
    const unchecked = check.unchecked.map(showInequality);
    const satisfied = r.regime.inequalities
      .map(showInequality)
      .filter((s) => !violated.includes(s) && !unchecked.includes(s));
    const prose = r.sideConditions ?? [];
    const deniedByUser = prose.filter((p) => deny.some((d) => matches(d, p)));
    const declaredByUser = prose.filter((p) => !deniedByUser.includes(p) && assume.some((a) => matches(a, p)));
    const unspecified = prose.filter((p) => !deniedByUser.includes(p) && !declaredByUser.includes(p));
    return {
      id: r.id,
      kind: r.kind,
      ok: check.ok,
      vacuous: r.regime.inequalities.length === 0,
      verdict:
        r.regime.inequalities.length === 0
          ? ('vacuous' as const)
          : check.ok === true
            ? ('valid' as const)
            : check.ok === false
              ? ('violated' as const)
              : ('unknown' as const),
      violated,
      unchecked,
      // The two bases never mix: `machine` is what this command evaluated at
      // the point; the rest is prose, and a user's word about it is recorded
      // as a declaration, never promoted to a check.
      premises: {
        machine: { satisfied, violated, unchecked },
        declaredByUser,
        deniedByUser,
        unspecified,
      },
      // Prose side conditions are premises this command cannot evaluate; only
      // the inequalities above were checked. A premise with a machine form is
      // checked only through its inequality.
      ...(r.sideConditions !== undefined && r.sideConditions.length > 0
        ? { premisesNotChecked: [...r.sideConditions] }
        : {}),
    };
  });

  // Pairwise overlap, restricted to pairs that actually SHARE a coordinate.
  // `regimeOverlap` classifies on shared names only, so a pair with none is
  // vacuously 'nested' — a true answer that says nothing, and printing it
  // would bury the pairs that do constrain each other.
  const overlaps: { a: string; b: string; overlap: string; sharedGroups: string[] }[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i]!;
      const b = records[j]!;
      const gb = groupsOf(b.regime.inequalities);
      const shared = [...groupsOf(a.regime.inequalities)].filter((g) => gb.has(g));
      if (shared.length === 0) continue;
      overlaps.push({
        a: a.id,
        b: b.id,
        overlap: api.regimeOverlap(a.regime, b.regime),
        sharedGroups: shared,
      });
    }
  }

  // The box is what --at states, and nothing else.
  const samples: Record<string, number[]> = {};
  for (const [group, value] of Object.entries(resolved)) samples[group] = [value];
  // Coverage is asked of the records that actually CONSTRAIN something. An
  // unconstrained model regime holds at every point, so including the models
  // would make coverage vacuously total and the report would answer nothing.
  const constraining = records.filter((r) => r.regime.inequalities.length > 0);
  const uncovered =
    stated.length === 0 ? null : api.uncoveredRegions(registration.name, constraining, samples);

  if (wantJson) {
    emitJson(
      {
        command: 'regime',
        epistemics:
          "an 'unknown' verdict is a failure to confirm validity, NEVER validity: a coordinate the " +
          'point did not supply was not checked, and an unchecked inequality is not a satisfied one. ' +
          'Uncovered regions are reported only over the box --at states; none is synthesized.',
        options: { family: registration.name, at: point, assume, deny },
        result: {
          resolvedPoint: resolved,
          unknownCoordinates: unknown,
          unmatchedDeclarations: unmatched.map(({ flag, d }) => ({ flag, declaration: d })),
          records: verdicts,
          overlaps,
          uncovered:
            uncovered === null
              ? null
              : { boxStated: true, points: uncovered.map((r) => ({ point: r.point })) },
        },
      },
      ctx.write,
    );
    return verdicts.some((v) => v.ok === false) ? EXIT_CHECK_FAILED : 0;
  }

  out(`\nRegimes of family '${registration.name}'`);
  // A family whose records state no inequality has nothing to check at any point: VACUOUS, not UNCHECKED.
  const allVacuous = verdicts.every((v) => v.vacuous);
  out(
    allVacuous
      ? '(this family states no inequality: every record is VACUOUS, and no --at point could check it)'
      : stated.length === 0
        ? '(no --at point supplied: every inequality is UNCHECKED, which is not a pass)'
        : `at ${stated.map((g) => `${g}=${point[g]}`).join(' · ')}`,
  );
  if (unknown.length > 0) {
    out(
      `unknown coordinate(s): ${unknown.join(', ')} — no record in family '${registration.name}' uses ` +
        `${unknown.length === 1 ? 'it' : 'them'}; ignored`,
    );
  }
  for (const { flag, d } of unmatched) {
    out(`${flag} '${d}' matches no side condition in family '${registration.name}'; ignored`);
  }
  out('');
  for (const m of verdicts) {
    // A record that states no inequality was not checked, so its line does not begin with a verdict
    // that reads as a pass (audit I13); the tri-state's `true` is vacuous there.
    const verdict = m.vacuous
      ? 'no machine condition evaluated (VACUOUS — states no inequality; nothing was checked)'
      : m.ok === true
        ? 'valid'
        : m.ok === false
          ? 'VIOLATED'
          : 'unknown';
    out(`  [${m.kind}] ${m.id}: ${verdict}`);
    for (const v of m.violated) out(`    violated: ${v}`);
    for (const u of m.unchecked) out(`    unchecked (no value supplied): ${u}`);
    for (const s of m.premises.machine.satisfied) out(`    satisfied: ${s}`);
    if (!m.vacuous && m.violated.length === 0 && m.unchecked.length === 0) {
      out('    every inequality checked and satisfied');
    }
    const p = m.premises;
    if (p.declaredByUser.length > 0) {
      out(`    declared by you (a declaration, not evidence): ${p.declaredByUser.join('; ')}`);
    }
    if (p.deniedByUser.length > 0) {
      out(`    CONTRADICTED by your --deny: ${p.deniedByUser.join('; ')} — this record does not apply as stated`);
    }
    if (p.unspecified.length > 0) {
      out(`    premises not machine-checked: ${p.unspecified.join('; ')}`);
    }
  }

  out('');
  out('Pairwise overlap (on shared coordinates only):');
  if (overlaps.length === 0) {
    out('  no two regimes share a coordinate, so none constrains another');
  } else {
    for (const o of overlaps) {
      out(`  ${o.a} vs ${o.b}: ${o.overlap} — shared: ${o.sharedGroups.join(', ')}`);
    }
  }

  out('');
  if (uncovered === null) {
    out('Uncovered regions: no box stated. Pass --at to say where you want to know about;');
    out('  a synthesized box would measure this tool’s guess, not the atlas.');
  } else if (uncovered.length === 0) {
    out('Uncovered regions: none — some constraining regime holds at every point of the stated box.');
  } else {
    out(
      `Uncovered regions: ${uncovered.length} point(s) of the stated box that no CONSTRAINING ` +
        `regime covers (${constraining.length} of ${records.length} records state an inequality):`,
    );
    for (const r of uncovered) {
      out(`  ${Object.entries(r.point).map(([g, v]) => `${g}=${v}`).join(' · ')}`);
    }
    out("  (an 'unknown' is not coverage — see the tri-state rule above)");
  }
  return verdicts.some((v) => v.ok === false) ? EXIT_CHECK_FAILED : 0;
}

export const command: Command = {
  name: 'regime',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Report where a family\'s models are valid, violated, or unknown.',
  example: 'upt regime oscillators --at theta0=0.2',
  group: 'explore',
  run,
};
registerCommand(command);
