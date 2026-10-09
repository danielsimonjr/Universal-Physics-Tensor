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
        pos = evaluateFormula(rel.expression, { ...base, [name]: magnitude }, rel.sources);
        neg = evaluateFormula(rel.expression, { ...base, [name]: -magnitude }, rel.sources);
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

/**
 * Whether `inputs` satisfy the relation's validity condition. An unbound or
 * unparsable condition is false; an input that names a constant the relation
 * does not declare as a source throws `ConstantInputError`.
 */
export function relationHolds(rel: CatalogRelation, inputs: Readonly<Record<string, number>>): boolean {
  try {
    return holds(rel.holds, inputs, formulaScope(), [...formulaNames()], rel.sources);
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
  return evaluateFormula(rel.expression, adjusted, rel.sources);
}
