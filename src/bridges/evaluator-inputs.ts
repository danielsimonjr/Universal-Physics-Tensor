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
import { bindingInUnit, boltzmannBindingScale, readNamedBinding } from '../numerical/binding-value.js';
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

function convert(
  p: EvaluatorParameter,
  key: string,
  raw: string,
  reading: TemperatureReading,
  kB: number,
): { value: number; note?: string } {
  if (p.temperature === 'absolute') {
    const read = readNamedBinding(key, raw, { reading, kB, asTemperature: true });
    const kelvin = read.notes.find((note) => note.includes('k_B T'));
    if (kelvin !== undefined) return { value: read.value, note: kelvin };
    if (!read.dimensioned) return { value: read.value };
    const offset = /degC|°C/.test(raw) && reading === 'absolute' ? ' (absolute: + 273.15)' : '';
    return { value: read.value, note: `${raw.trim()} → ${show(read.value)} ${p.unit}${offset}${unitAside(raw)}` };
  }
  const { value, given } = bindingInUnit(raw, p.unit, reading);
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
  const specs: { key: string; raw: string; p: EvaluatorParameter; direct: boolean }[] = [];
  for (const arg of args) {
    const [key, raw] = splitArg(arg);
    const direct = parameters.find((p) => p.key === key);
    const viaAlt = parameters.find((p) => (p.alternates ?? []).some((a) => a.key === key));
    const p = direct ?? viaAlt;
    if (p === undefined) throw new UnitError(`'${key}' is not an input here; the inputs are: ${known.join(', ')}`);
    const earlier = specs.find((r) => r.p.key === p.key);
    if (earlier !== undefined) {
      const throughAlternate = direct === undefined || !earlier.direct;
      throw new UnitError(`'${p.key}' is given twice${throughAlternate ? ' (once through an alternate)' : ''}`);
    }
    specs.push({ key, raw, p, direct: direct !== undefined });
  }
  const scaleFrom = specs
    .filter((s) => s.key === 'boltzmann-constant' || s.key === 'k_B' || s.key === 'kB')
    .map((s) => ({ name: s.key, read: readNamedBinding(s.key, s.raw) }));
  const kB = boltzmannBindingScale(scaleFrom);
  for (const spec of specs) {
    const c = convert(spec.p, spec.key, spec.raw, 'absolute', kB);
    const alt = spec.direct ? undefined : spec.p.alternates!.find((a) => a.key === spec.key)!;
    const value = alt === undefined ? c.value : c.value * alt.toKey;
    inputs[spec.p.key] = value;
    resolved.push({
      key: spec.p.key,
      value,
      unit: spec.p.unit,
      given: spec.raw,
      ...(alt === undefined ? {} : { via: spec.key }),
      ...(alt !== undefined
        ? { note: `${spec.key}=${spec.raw.trim()} is ${alt.meaning}; ${spec.p.key} = ${alt.toKey} × ${show(c.value)} = ${show(value)} ${spec.p.unit}` }
        : c.note === undefined
          ? {}
          : { note: c.note }),
    });
  }
  return { inputs, resolved };
}
