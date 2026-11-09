/**
 * `key=value[unit]` arguments → an evaluator's numeric inputs, through the
 * evaluator's declared parameters.
 *
 * Every argument must name a declared input or a declared alternate: an
 * unrecognised key is refused rather than ignored, because an ignored
 * `radius_m=` beside a required `diameter_m` is exactly the silent mistake the
 * declarations exist to catch. A value may carry a unit; it is converted into
 * the declared unit only when the dimensions agree.
 *
 * @module bridges/evaluator-inputs
 */
import { splitAssignment } from '../core/assignment.js';
import { formatQuantity } from '../core/format.js';
import { affineReadingNote, unitConventionNotes, UnitError, type TemperatureReading } from '../dimensional/units.js';
import { temperatureQuantityRole } from '../dimensional/formula-names.js';
import { readNamedBinding, type NamedBindingSibling } from '../numerical/binding-value.js';
import type { EvaluatorParameter } from './evaluators.js';
import { UnknownInputError } from './evaluation-errors.js';
import { parameterContract, repeatedInput, slotForSpelling, type InputContract } from './input-contract.js';

/** One input as it was given and as the evaluator receives it. @internal */
export interface ResolvedInput {
  readonly key: string;
  readonly value: number;
  readonly unit: string;
  readonly given: string;
  /** The alternate key it was given under, when it was. */
  readonly via?: string;
  readonly note?: string;
}

/** 15 significant digits in the note; the value itself is passed unrounded. */
const show = formatQuantity;

/** Disclosures that a unit symbol does not carry by itself. */
function unitAside(given: string): string {
  const notes = unitConventionNotes(given);
  return notes.length === 0 ? '' : ` — ${notes.join('; ')}`;
}

const splitArg = (a: string): [string, string] => {
  const split = splitAssignment(a);
  if (split === null) throw new UnitError(`'${a}' must be key=value (e.g. d_m=1um)`);
  return [split.name, split.raw];
};

function convert(
  p: EvaluatorParameter,
  raw: string,
  reading: TemperatureReading,
  siblings: readonly NamedBindingSibling[],
  givenName: string,
): { value: number; note?: string } {
  const read = readNamedBinding(givenName, raw, { reading, siblings, declaredUnit: p.unit });
  if (!read.dimensioned) return { value: read.value };
  // How an affine reading was applied comes from the unit table's own row (scale and ice point).
  const offset = read.affine === undefined ? '' : ` (${affineReadingNote(read.affine, reading)})`;
  // An angular input counts radians; a cycle-counting unit (the `cycles` flag on its row) takes 2π per cycle.
  const turns = p.angular === true ? read.cycles : 0;
  if (Number.isNaN(turns)) {
    throw new UnitError(`'${raw.trim()}' adds a cycle rate to a plain rate, so its radians per second are not defined`);
  }
  const value = turns === 0 ? read.value : read.value * (2 * Math.PI) ** turns;
  const turnsNote = turns === 0 ? '' : turns === 1 ? ' (cycles: × 2π)' : ` (cycles: × (2π)^${turns})`;
  const base = `${raw.trim()} → ${show(value)} ${p.unit || '(dimensionless)'}${offset}${turnsNote}${unitAside(raw)}`;
  return { value, note: read.temperatureNote === undefined ? base : `${base}. ${read.temperatureNote}` };
}

/**
 * Resolve `args` against `parameters`. `id` names the evaluated id in an input error.
 * `contract` is the spelling table of the id, the same table `evaluateRelation`
 * reads. Without it, a plain contract of the parameter keys is used.
 * @throws UnknownInputError on an unknown key.
 * @throws DuplicateInputError on an input given twice.
 * @throws UnitError on a unit that does not fit.
 * @internal
 */
export function resolveEvaluatorInputs(
  parameters: readonly EvaluatorParameter[],
  args: readonly string[],
  id?: string,
  contract: InputContract = parameterContract(id ?? '', parameters),
): { inputs: Record<string, number>; resolved: ResolvedInput[] } {
  const inputs: Record<string, number> = {};
  const resolved: ResolvedInput[] = [];
  const known = parameters.flatMap((p) => [p.key, ...(p.alternates ?? []).map((a) => a.key)]);
  const siblings: NamedBindingSibling[] = args.map((arg) => {
    const [key, raw] = splitArg(arg);
    return { name: key, raw };
  });
  for (const arg of args) {
    const [key, raw] = splitArg(arg);
    const slot = slotForSpelling(contract, key)?.slot;
    const p = slot === undefined ? undefined : parameters.find((candidate) => candidate.key === slot.key);
    if (p === undefined) throw new UnknownInputError(id, key, known, contract.elsewhere?.[key]);
    const earlier = resolved.find((r) => r.key === p.key);
    const role = temperatureQuantityRole(p.quantity) === 'difference' ? 'difference' : temperatureQuantityRole(key);
    const c = convert(p, raw, role, siblings, key);
    const alt = (p.alternates ?? []).find((a) => a.key === key);
    const value = alt === undefined ? c.value : c.value * alt.toKey;
    if (earlier !== undefined) {
      repeatedInput(id, p.key, { key: earlier.via ?? earlier.key, value: earlier.value }, key, value);
      continue;
    }
    inputs[p.key] = value;
    resolved.push({
      key: p.key,
      value,
      unit: p.unit,
      given: raw,
      ...(key !== p.key ? { via: key } : {}),
      ...(alt !== undefined
        ? { note: `${key}=${raw.trim()} is ${alt.meaning}; ${p.key} = ${alt.toKey} × ${show(c.value)} = ${show(value)} ${p.unit}` }
        : c.note === undefined
          ? {}
          : { note: c.note }),
    });
  }
  return { inputs, resolved };
}
