/**
 * `upt testplan` — the measurement plan already stored on a case or a
 * confrontation: what would confirm it, what would falsify it, and what the
 * record leaves out. Generated from those records, not from a writeup.
 *
 * @module cli/commands/testplan
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import { UsageError, CliError } from '../errors.js';
import type { AppliedCase } from '../../cases/types.js';
import type { ConfrontationOutcome } from '../../bridges/observations/types.js';

const FLAGS: FlagSpec[] = [JSON_FLAG];

const HELP = `upt testplan <be-NN | case-id> [--json]
        The measurement plan for one bridge confrontation or one applied case:
        the observable, the confirm and falsify criteria the record already
        states, what is not included, and the links. Markdown by default,
        JSON with --json. \`upt help testplan\` describes every flag.
        e.g.  upt testplan be-58
              upt testplan case-brownian-sphere
              upt testplan case-skin-depth --json`;

interface Plan {
  readonly id: string;
  readonly title: string;
  readonly observable: string;
  readonly confirm: readonly string[];
  readonly falsify: readonly string[];
  readonly notIncluded: readonly string[];
  readonly measurement: readonly string[];
  readonly links: readonly string[];
  readonly preprocessing?: string;
  readonly independence?: string;
}

function linesOf(outcome: ConfrontationOutcome): { confirm: string[]; falsify: string[] } {
  if (outcome.kind === 'value') {
    return {
      confirm: [
        `predicted ${outcome.predicted} ${outcome.units}, observed ${outcome.observed} ± ${outcome.sigma} ${outcome.units}`,
        `within the stated comparison: ${outcome.withinObserved}`,
      ],
      falsify: [
        outcome.withinObserved
          ? 'a later measurement outside that comparison falsifies the recorded agreement'
          : 'the recorded comparison is already outside the stated band',
      ],
    };
  }
  if (outcome.kind === 'upper-bound') {
    return {
      confirm: [`predicted ${outcome.predicted}, observed bound ${outcome.bound}, satisfied: ${outcome.satisfied}`],
      falsify: ['an observed bound that fails the recorded comparison falsifies it'],
    };
  }
  if (outcome.kind === 'table') {
    return {
      confirm: outcome.rows.map(
        (r) => `${r.label}: predicted ${r.predicted}, observed ${r.observed} ± ${r.sigma} ${outcome.units}`,
      ),
      falsify: ['a row whose residual leaves the recorded comparison falsifies that row'],
    };
  }
  return {
    confirm: [
      `predicted ${outcome.predicted}, approaches ${outcome.approaches}, fractional gap ${outcome.fractionalGap} (${outcome.fractionalGapIs})`,
    ],
    falsify: ['a fractional gap outside the record\'s stated comparison falsifies it'],
  };
}

function fromCase(api: CommandCtx['api'], c: AppliedCase): Plan {
  const { inputs } = api.resolveEvaluatorInputs(c.parameters, c.examples.valid.args);
  const result = api.runAppliedCase(c.id, inputs);
  const held = result.checks.filter((k) => k.holds).map((k) => `${k.id}: ${k.quantity} ${k.op} ${k.bound} — ${k.premise}`);
  const broken = result.checks.filter((k) => !k.holds).map((k) => `${k.id} violated at the worked point`);
  return {
    id: c.id,
    title: c.title,
    observable: `${c.observable} — ${c.outputs.find((o) => o.key === c.observable)?.meaning ?? ''}`,
    confirm: [`worked point: ${c.examples.valid.args.join(' ')} (${c.examples.valid.note})`, ...held],
    falsify: [
      ...c.examples.failures.map((f) => `${f.args.join(' ')} fails ${f.fails.join(', ')} — ${f.note}`),
      ...broken,
    ],
    notIncluded: [...c.notIncluded],
    measurement: [...c.measurement],
    links: c.links.map((l) => `${l.id}: ${l.role}`),
  };
}

function fromConfrontation(api: CommandCtx['api'], id: number): Plan {
  const entry = api.CONFRONTATIONS.get(id);
  if (entry === undefined) throw new CliError(`upt testplan: no confrontation be-${id}`);
  const outcome = entry.run();
  const { confirm, falsify } = linesOf(outcome);
  return {
    id: `be-${id}`,
    title: entry.title,
    observable: `${outcome.kind} comparison`,
    confirm,
    falsify,
    notIncluded: [],
    measurement: [],
    links: [`be-${id}`],
    preprocessing: outcome.preprocessing.state === 'recorded' ? outcome.preprocessing.statement : 'preprocessing: not-recorded',
    independence: outcome.independence.state === 'not-recorded' ? 'independence: not-recorded' : outcome.independence.statement,
  };
}

function markdown(plan: Plan): string {
  const block = (title: string, rows: readonly string[]) =>
    [`## ${title}`, ...(rows.length === 0 ? ['- (none recorded)'] : rows.map((r) => `- ${r}`))].join('\n');
  return [
    `# Test plan: ${plan.id}`,
    plan.title,
    '',
    `Observable: ${plan.observable}`,
    '',
    block('Confirm', plan.confirm),
    '',
    block('Falsify', plan.falsify),
    '',
    block('Not included', plan.notIncluded),
    '',
    block('Measurement', plan.measurement),
    '',
    block('Links', plan.links),
    ...(plan.preprocessing === undefined ? [] : ['', `Preprocessing: ${plan.preprocessing}`]),
    ...(plan.independence === undefined ? [] : [`Independence: ${plan.independence}`]),
    '',
  ].join('\n');
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const target = args.positionals[0];
  if (!target) throw new UsageError('upt testplan needs a be-NN id or a case id. See `upt help testplan`.');
  const caseHit = api.APPLIED_CASES.get(target);
  let plan: Plan;
  if (caseHit !== undefined) plan = fromCase(api, caseHit);
  else {
    const m = /^(?:be-)?(\d+)$/.exec(target);
    if (m === null || !api.CONFRONTATIONS.has(Number(m[1]))) {
      throw new CliError(
        `upt testplan: '${target}' is not a case (${[...api.APPLIED_CASES.keys()].join(', ')}) or a confrontation id.`,
      );
    }
    plan = fromConfrontation(api, Number(m[1]));
  }
  if (args.flags.has('json')) {
    emitJson({ command: 'testplan', result: plan }, ctx.write);
    return 0;
  }
  out(markdown(plan));
  return 0;
}

export const command: Command = {
  name: 'testplan',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Print the measurement plan stored on a confrontation or an applied case.',
  example: 'upt testplan be-58',
  group: 'data',
  run,
};
registerCommand(command);
