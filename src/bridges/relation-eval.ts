/**
 * Evaluate one catalog relation: validity condition, carrier-sign policy,
 * and the parsed expression. No per-equation branch.
 *
 * @module bridges/relation-eval
 */

import { quantityRecord } from '../dimensional/quantity-registry.js';
import { applyCarrierSignPolicy, CarrierSignError } from './carrier-sign.js';
import type { CatalogRelation } from './catalog-types.js';
import { evaluateFormula, formulaNames, formulaScope } from './expr-parse.js';
import { holds, HoldsError } from './holds.js';

/** Thrown when two carrier roles have opposite signs. */
export { CarrierSignError };

const parityCache = new Map<string, { readonly even: readonly string[]; readonly pair?: { readonly charge: string; readonly mobility: string } }>();

function named(rel: CatalogRelation, name: string): string {
  const alias = rel.aliases[name]?.[0];
  return alias === undefined ? name : `${name} (${alias})`;
}

function signRole(name: string): 'charge' | 'mobility' | undefined {
  return quantityRecord(name)?.signRole;
}

function sampleInputs(rel: CatalogRelation): Record<string, number> | null {
  if (rel.reference !== undefined) return { ...rel.reference.inputs };
  if (rel.sources.length === 0) return {};
  return null;
}

function classify(rel: CatalogRelation): { even: readonly string[]; pair?: { charge: string; mobility: string } } {
  const cached = parityCache.get(rel.id);
  if (cached !== undefined) return cached;
  const base = sampleInputs(rel);
  const even: string[] = [];
  const odd: { charge: string[]; mobility: string[] } = { charge: [], mobility: [] };
  if (base !== null) {
    for (const name of rel.sources) {
      const x = base[name];
      if (x === undefined || x === 0 || !Number.isFinite(x)) continue;
      const magnitude = Math.abs(x);
      let pos: number;
      let neg: number;
      try {
        pos = evaluateFormula(rel.expression, { ...base, [name]: magnitude });
        neg = evaluateFormula(rel.expression, { ...base, [name]: -magnitude });
      } catch {
        continue;
      }
      if (!Number.isFinite(pos) || !Number.isFinite(neg)) continue;
      const scale = Math.max(Math.abs(pos), Math.abs(neg), 1);
      const isEven = Math.abs(pos - neg) <= 1e-8 * scale;
      const isOdd = Math.abs(pos + neg) <= 1e-8 * scale;
      if (isEven && !isOdd) even.push(name);
      if (isOdd && !isEven) {
        const role = signRole(name);
        if (role === 'charge') odd.charge.push(name);
        if (role === 'mobility') odd.mobility.push(name);
      }
    }
  }
  const charge = odd.charge[0];
  const mobility = odd.mobility[0];
  const found = {
    even,
    ...(charge !== undefined && mobility !== undefined ? { pair: { charge, mobility } } : {}),
  };
  parityCache.set(rel.id, found);
  return found;
}

/** Whether `inputs` satisfy the relation's validity condition. */
export function relationHolds(rel: CatalogRelation, inputs: Readonly<Record<string, number>>): boolean {
  try {
    return holds(rel.holds, inputs, formulaScope(), [...formulaNames()]);
  } catch (error) {
    if (error instanceof HoldsError) return false;
    throw error;
  }
}

/**
 * The relation's number at `inputs`. The caller has already checked the
 * validity condition. Opposite carrier signs throw {@link CarrierSignError}.
 */
export function evaluateCatalogRelation(
  rel: CatalogRelation,
  inputs: Readonly<Record<string, number>>,
): number {
  const policy = classify(rel);
  const pair = policy.pair;
  const adjusted = applyCarrierSignPolicy(
    null,
    inputs,
    new Set(policy.even),
    pair === undefined
      ? undefined
      : {
          a: inputs[pair.charge] ?? Number.NaN,
          b: inputs[pair.mobility] ?? Number.NaN,
          left: named(rel, pair.charge),
          right: named(rel, pair.mobility),
        },
  );
  return evaluateFormula(rel.expression, adjusted);
}

/**
 * Recover the one missing finite input that makes the relation equal `target`.
 * A bracket that does not change sign has no root and throws.
 */
export function solveCatalogRelation(
  rel: CatalogRelation,
  known: Readonly<Record<string, number>>,
  unknown: string,
  target = 0,
): number {
  const f = (value: number): number => evaluateCatalogRelation(rel, { ...known, [unknown]: value }) - target;
  let lo = 1e-6;
  let hi = 1;
  let flo = f(lo);
  let fhi = f(hi);
  for (let i = 0; i < 60 && flo * fhi > 0; i += 1) {
    lo /= 2;
    hi *= 2;
    flo = f(lo);
    fhi = f(hi);
  }
  if (!(flo * fhi <= 0)) {
    throw new Error(`solveCatalogRelation: ${rel.id} has no root for ${unknown}`);
  }
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (flo * fmid <= 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}
