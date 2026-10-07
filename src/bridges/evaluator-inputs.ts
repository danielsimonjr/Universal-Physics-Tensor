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
import { unitConventionNotes, UnitError, type TemperatureReading } from '../dimensional/units.js';
import {
  resolveQuantityName,
  synonymGroup,
  synonymDisagreement,
  temperatureQuantityRole,
} from '../dimensional/formula-names.js';
import { readNamedBinding, type NamedBindingSibling } from '../numerical/binding-value.js';
import type { EvaluatorParameter } from './evaluators.js';

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

/** 15 significant digits: the value itself is passed unrounded. */
const show = (v: number): number => Number(v.toPrecision(15));

/** Hz and rpm count cycles; an angular-frequency slot counts radians, so they need 2π. */
const CYCLIC_FREQUENCY = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*(?:da|[YZEPTGMkhdcmuµμnpfazy])?(?:Hz|rpm)\s*$/;
const cyclicFrequencyUnit = (raw: string): boolean => CYCLIC_FREQUENCY.test(raw);

/** Disclosures that a unit symbol does not carry by itself. */
function unitAside(given: string): string {
  const notes = unitConventionNotes(given);
  return notes.length === 0 ? '' : ` — ${notes.join('; ')}`;
}

const splitArg = (a: string): [string, string] => {
  const eq = a.indexOf('=');
  if (eq <= 0) throw new UnitError(`'${a}' must be key=value (e.g. d_m=1um)`);
  return [a.slice(0, eq), a.slice(eq + 1)];
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
  const celsius = /degC|°C/.test(raw);
  const fahrenheit = /degF|°F/.test(raw);
  const offset = celsius && reading === 'absolute'
    ? ' (absolute: + 273.15)'
    : celsius
      ? ' (a difference: no offset)'
      : fahrenheit && reading === 'absolute'
        ? ' (absolute: (degF − 32) × 5/9 + 273.15)'
        : fahrenheit
          ? ' (a difference: × 5/9, no offset)'
          : '';
  const cycles = p.angular === true && cyclicFrequencyUnit(raw);
  const value = cycles ? read.value * 2 * Math.PI : read.value;
  const turns = cycles ? ' (cycles: × 2π)' : '';
  const base = `${raw.trim()} → ${show(value)} ${p.unit || '(dimensionless)'}${offset}${turns}${unitAside(raw)}`;
  const temperature = read.notes.find((note) => note.includes('k_B T'));
  return { value, note: temperature === undefined ? base : `${base}. ${temperature}` };
}

/**
 * Resolve `args` against `parameters`.
 * @throws UnitError on an unknown key, a repeated input, or a unit that does not fit.
 * @internal
 */
export function resolveEvaluatorInputs(
  parameters: readonly EvaluatorParameter[],
  args: readonly string[],
): { inputs: Record<string, number>; resolved: ResolvedInput[] } {
  const inputs: Record<string, number> = {};
  const resolved: ResolvedInput[] = [];
  const known = parameters.flatMap((p) => [p.key, ...(p.alternates ?? []).map((a) => a.key)]);
  const parameterNames = new Set(parameters.map((p) => p.key));
  const siblings: NamedBindingSibling[] = args.map((arg) => {
    const [key, raw] = splitArg(arg);
    return { name: key, raw };
  });
  for (const arg of args) {
    const [key, raw] = splitArg(arg);
    const direct = parameters.find((p) => p.key === key);
    const viaAlt = parameters.find((p) => (p.alternates ?? []).some((a) => a.key === key));
    const viaName = direct === undefined && viaAlt === undefined ? resolveQuantityName(key, parameterNames) : null;
    const viaSynonym = viaName === null ? undefined : parameters.find((p) => p.key === viaName);
    const p = direct ?? viaAlt ?? viaSynonym;
    if (p === undefined) throw new UnitError(`'${key}' is not an input here; the inputs are: ${known.join(', ')}`);
    const earlier = resolved.find((r) => r.key === p.key);
    const role = temperatureQuantityRole(p.quantity) === 'difference' ? 'difference' : temperatureQuantityRole(key);
    const c = convert(p, raw, role, siblings, key);
    const alt = direct === undefined && viaAlt !== undefined ? p.alternates!.find((a) => a.key === key)! : undefined;
    const value = alt === undefined ? c.value : c.value * alt.toKey;
    if (earlier !== undefined) {
      const earlierName = earlier.via ?? earlier.key;
      const group = synonymGroup(key);
      const synonymRepeat =
        group !== undefined && earlierName !== key && group.includes(earlierName) && group.includes(key);
      if (synonymRepeat && earlier.value === value) continue;
      if (synonymRepeat) {
        throw synonymDisagreement([earlierName, key], { [earlierName]: earlier.value, [key]: value })!;
      }
      const throughAlternate = direct === undefined || earlier.via !== undefined;
      throw new UnitError(`'${p.key}' is given twice${throughAlternate ? ' (once through an alternate)' : ''}`);
    }
    inputs[p.key] = value;
    resolved.push({
      key: p.key,
      value,
      unit: p.unit,
      given: raw,
      ...(alt !== undefined || viaSynonym !== undefined ? { via: key } : {}),
      ...(alt !== undefined
        ? { note: `${key}=${raw.trim()} is ${alt.meaning}; ${p.key} = ${alt.toKey} × ${show(c.value)} = ${show(value)} ${p.unit}` }
        : c.note === undefined
          ? {}
          : { note: c.note }),
    });
  }
  return { inputs, resolved };
}
