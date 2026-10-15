/**
 * Cheap experiment-design suggestions for two competing hypotheses.
 *
 * Grid-search max |H1−H2|/σ under declared bounds. Never recommend a
 * forbidden region.
 *
 * @internal
 */

import type { ExprNode } from '../../dimensional/ast-types.js';
import { evalExpr } from '../expr-eval.js';

export interface DesignBounds {
  readonly variables: Readonly<Record<string, { min: number; max: number; steps?: number }>>;
  readonly forbidden?: readonly Readonly<Record<string, { min: number; max: number }>>[];
  readonly sigma?: number;
}

/** What a JSON value is, in the words a file author would use. */
function kindOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'string') return 'text';
  if (typeof v === 'number') return Number.isFinite(v) ? 'a number' : String(v);
  if (typeof v === 'boolean') return 'true or false';
  return typeof v === 'object' ? 'an object' : typeof v;
}

/** A finite number, or null: nothing is coerced (`null`, `""` and `"0"` once read as 0). */
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** `{min, max}` as two finite numbers, located by `where` in any refusal. */
function readRange(spec: Record<string, unknown>, where: string): { min: number; max: number } {
  const min = finite(spec.min);
  const max = finite(spec.max);
  if (min === null || max === null) {
    throw new Error(`${where} needs finite min/max numbers (found ${kindOf(spec.min)} and ${kindOf(spec.max)})`);
  }
  return { min, max };
}

/**
 * Coerce unknown JSON into {@link DesignBounds}. Every bound is a finite
 * number and `steps` a positive integer; a value of another kind is refused,
 * naming the field and what was found. @internal
 */
export function parseDesignBounds(raw: unknown, source: string): DesignBounds {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`design bounds at ${source} is not an object`);
  }
  const obj = raw as {
    variables?: unknown;
    forbidden?: unknown;
    sigma?: unknown;
  };
  if (!obj.variables || typeof obj.variables !== 'object' || Array.isArray(obj.variables)) {
    throw new Error(`design bounds at ${source} is missing variables`);
  }
  const variables: Record<string, { min: number; max: number; steps?: number }> = {};
  for (const [name, spec] of Object.entries(obj.variables as Record<string, unknown>)) {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      throw new Error(`design bounds at ${source}: variables.${name} is not an object`);
    }
    const where = `design bounds at ${source}: variables.${name}`;
    const { min, max } = readRange(spec as Record<string, unknown>, where);
    if (min > max) {
      throw new Error(`${where} has min > max`);
    }
    const entry: { min: number; max: number; steps?: number } = { min, max };
    const { steps } = spec as { steps?: unknown };
    if (steps !== undefined) {
      if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 1) {
        throw new Error(`${where}.steps must be a positive integer (found ${typeof steps === 'number' ? steps : kindOf(steps)})`);
      }
      entry.steps = steps;
    }
    variables[name] = entry;
  }
  let forbidden: DesignBounds['forbidden'];
  if (obj.forbidden !== undefined) {
    if (!Array.isArray(obj.forbidden)) {
      throw new Error(`design bounds at ${source}: forbidden must be an array`);
    }
    forbidden = obj.forbidden.map((region, i) => {
      if (!region || typeof region !== 'object' || Array.isArray(region)) {
        throw new Error(`design bounds at ${source}: forbidden[${i}] is not an object`);
      }
      const out: Record<string, { min: number; max: number }> = {};
      for (const [k, r] of Object.entries(region as Record<string, unknown>)) {
        if (!r || typeof r !== 'object' || Array.isArray(r)) {
          throw new Error(`design bounds at ${source}: forbidden[${i}].${k} is not an object`);
        }
        out[k] = readRange(r as Record<string, unknown>, `design bounds at ${source}: forbidden[${i}].${k}`);
      }
      return out;
    });
  }
  let sigma: number | undefined;
  if (obj.sigma !== undefined) {
    const s = finite(obj.sigma);
    if (s === null || s <= 0) {
      throw new Error(`design bounds at ${source}: sigma must be a positive number (found ${s === null ? kindOf(obj.sigma) : s})`);
    }
    sigma = s;
  }
  return { variables, ...(forbidden ? { forbidden } : {}), ...(sigma !== undefined ? { sigma } : {}) };
}

export interface DesignSuggestion {
  readonly point: Readonly<Record<string, number>>;
  readonly discrimination: number;
  readonly h1: number;
  readonly h2: number;
  readonly abstained?: boolean;
  readonly reason?: string;
}

function inForbidden(
  point: Record<string, number>,
  forbidden: readonly Readonly<Record<string, { min: number; max: number }>>[] | undefined,
): boolean {
  if (!forbidden) return false;
  return forbidden.some((region) =>
    Object.entries(region).every(([k, r]) => {
      const v = point[k];
      return v !== undefined && v >= r.min && v <= r.max;
    }),
  );
}

/** Suggest the grid point that maximises |H1−H2|/σ, skipping forbidden regions. @internal */
export function suggestDiscriminatingPoint(
  h1: ExprNode,
  h2: ExprNode,
  bounds: DesignBounds,
): DesignSuggestion {
  const names = Object.keys(bounds.variables);
  if (names.length === 0) {
    return {
      point: {},
      discrimination: 0,
      h1: NaN,
      h2: NaN,
      abstained: true,
      reason: 'no free variables in bounds',
    };
  }

  const sigma = bounds.sigma ?? 1;
  let best: DesignSuggestion | null = null;

  const grids = names.map((n) => {
    const b = bounds.variables[n]!;
    const steps = Math.max(2, b.steps ?? 8);
    const out: number[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      out.push(b.min + t * (b.max - b.min));
    }
    return out;
  });

  const idx = new Array(names.length).fill(0);
  const rec = (d: number): void => {
    if (d === names.length) {
      const point: Record<string, number> = {};
      for (let i = 0; i < names.length; i++) point[names[i]!] = grids[i]![idx[i]!]!;
      if (inForbidden(point, bounds.forbidden)) return;
      let y1: number;
      let y2: number;
      try {
        y1 = evalExpr(h1, point);
        y2 = evalExpr(h2, point);
      } catch {
        return;
      }
      if (!Number.isFinite(y1) || !Number.isFinite(y2)) return;
      const disc = Math.abs(y1 - y2) / sigma;
      if (!best || disc > best.discrimination) {
        best = { point, discrimination: disc, h1: y1, h2: y2 };
      }
      return;
    }
    for (let i = 0; i < grids[d]!.length; i++) {
      idx[d] = i;
      rec(d + 1);
    }
  };
  rec(0);

  if (!best) {
    return {
      point: {},
      discrimination: 0,
      h1: NaN,
      h2: NaN,
      abstained: true,
      reason: 'every grid point was forbidden or non-finite',
    };
  }
  return best;
}
