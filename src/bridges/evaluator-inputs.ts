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
import { convertValue, unitConventionNotes, UnitError, type TemperatureReading } from '../dimensional/units.js';
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

function convert(p: EvaluatorParameter, raw: string, reading: TemperatureReading): { value: number; note?: string } {
  const { value, given } = convertValue(raw, p.unit, reading);
  if (given === '') return { value };
  const offset = /degC|°C/.test(given) && reading === 'absolute' ? ' (absolute: + 273.15)' : /degC|°C/.test(given) ? ' (a difference: no offset)' : '';
  return { value, note: `${raw.trim()} → ${show(value)} ${p.unit || '(dimensionless)'}${offset}${unitAside(given)}` };
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
  for (const arg of args) {
    const [key, raw] = splitArg(arg);
    const direct = parameters.find((p) => p.key === key);
    const viaAlt = parameters.find((p) => (p.alternates ?? []).some((a) => a.key === key));
    const p = direct ?? viaAlt;
    if (p === undefined) throw new UnitError(`'${key}' is not an input here; the inputs are: ${known.join(', ')}`);
    const earlier = resolved.find((r) => r.key === p.key);
    if (earlier !== undefined) {
      const throughAlternate = direct === undefined || earlier.via !== undefined;
      throw new UnitError(`'${p.key}' is given twice${throughAlternate ? ' (once through an alternate)' : ''}`);
    }
    const c = convert(p, raw, 'absolute');
    const alt = direct === undefined ? p.alternates!.find((a) => a.key === key)! : undefined;
    const value = alt === undefined ? c.value : c.value * alt.toKey;
    inputs[p.key] = value;
    resolved.push({
      key: p.key,
      value,
      unit: p.unit,
      given: raw,
      ...(alt === undefined ? {} : { via: key }),
      ...(alt !== undefined
        ? { note: `${key}=${raw.trim()} is ${alt.meaning}; ${p.key} = ${alt.toKey} × ${show(c.value)} = ${show(value)} ${p.unit}` }
        : c.note === undefined
          ? {}
          : { note: c.note }),
    });
  }
  return { inputs, resolved };
}
