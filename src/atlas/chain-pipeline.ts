/**
 * Internal bridge-discovery pipeline.
 *
 * Seeds, then seed-filtered symbolic enumeration, the Buckingham filter,
 * the structural classifier, the chain order, and the proof-target stub.
 * A confirmation reports the catalog id. A restatement reports the
 * pre-declared canonical equation. Any other survivor is a statement
 * skeleton. Nothing is written into the catalog.
 *
 * No command calls this. `discovery.ts` and the probe are not inputs.
 *
 * @module atlas/chain-pipeline
 */

import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { equals } from '../dimensional/algebra.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import type { BridgeEdge } from '../composition/edge.js';
import { enumerateCompositions } from '../composition/enumerate.js';
import { buckinghamFilter } from '../composition/buckingham-filter.js';
import type { BuckinghamFilterRecord } from '../composition/buckingham-filter.js';
import { matchChain } from '../composition/chain-match.js';
import {
  orderChainCandidates,
  type ChainCandidate,
} from '../composition/chain-candidate.js';
import type { ChainClassification } from '../canonical/structural.js';
import { bridgeSeedKeys, physjsTheorem } from './physjs-ref.js';
import { emitProofTarget } from './proof-target.js';

/** A chain whose normal form matches a catalog equation. Nothing was written. @internal */
export interface ChainConfirmationRecord {
  readonly kind: 'confirmation';
  readonly catalogId: number;
  readonly edgeIds: readonly string[];
}

/** A chain the registry pre-declared with `restatesBridge`. Not a new equation. @internal */
export interface ChainRestatementRecord {
  readonly kind: 'restatement';
  readonly canonicalId: string;
  readonly restatesBridge: string;
  readonly edgeIds: readonly string[];
}

/** A provisional chain, as a Lean statement skeleton. @internal */
export interface ChainStubRecord {
  readonly kind: 'stub';
  readonly id: string;
  readonly edgeIds: readonly string[];
  readonly text: string;
}

/** One ordered survivor. @internal */
export type ChainPipelineResult =
  | ChainConfirmationRecord
  | ChainRestatementRecord
  | ChainStubRecord;

function isNumericName(name: string): boolean {
  return /^\d+(\.\d+)?$/.test(name);
}

function isDimensionlessConstant(name: string): boolean {
  if (/^\d*pi$/.test(name)) return true;
  const registered = CONSTANTS[name];
  return registered !== undefined && equals(registered.dim, DIMENSIONLESS);
}

function collectSymbols(expr: ExprNode, out: Map<string, Dimension>): void {
  switch (expr.kind) {
    case 'symbol':
      out.set(expr.name, expr.dim);
      return;
    case 'op':
      for (const arg of expr.args) collectSymbols(arg, out);
      return;
    case 'integral':
      collectSymbols(expr.over, out);
      collectSymbols(expr.integrand, out);
      return;
    case 'derivative':
      collectSymbols(expr.of, out);
      collectSymbols(expr.wrt, out);
      return;
    case 'transcendental':
    case 'abs':
    case 'dirac-delta':
      collectSymbols(expr.arg, out);
      return;
    default:
      return;
  }
}

/** Dimensioned leaves of the composed formula, excluding the target name. */
function governingOf(expr: ExprNode, targetName: string): { name: string; dim: Dimension }[] {
  const dims = new Map<string, Dimension>();
  collectSymbols(expr, dims);
  const vars: { name: string; dim: Dimension }[] = [];
  for (const [name, dim] of dims) {
    if (name === targetName) continue;
    if (isNumericName(name) || isDimensionlessConstant(name)) continue;
    vars.push({ name, dim });
  }
  vars.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return vars;
}

function toCandidate(
  classification: ChainClassification,
  filter: BuckinghamFilterRecord,
): ChainCandidate {
  const theorem = filter.theorem ?? undefined;
  const carried = theorem === undefined ? {} : { theorem };
  if (classification.kind === 'confirmation') {
    return {
      kind: 'confirmation',
      edgeIds: classification.edgeIds,
      catalogId: classification.catalogId,
      ...carried,
    };
  }
  if (classification.kind === 'restatement') {
    return {
      kind: 'restatement',
      edgeIds: classification.edgeIds,
      canonicalId: classification.canonicalId,
      restatesBridge: classification.restatesBridge,
      ...carried,
    };
  }
  const kind = filter.theorem === 'PhysJS.Dimensional.monomial_form'
    ? 'unique-monomial'
    : 'unfixed-shape';
  return {
    kind,
    edgeIds: classification.edgeIds,
    id: classification.id,
    ...carried,
  };
}

function theoremsFor(edgeIds: readonly string[]): string[] {
  return edgeIds.map((id) => {
    const name = physjsTheorem(id);
    if (name === undefined) {
      throw new Error(`chain pipeline: manifest copy has no theorem for seed '${id}'`);
    }
    return name;
  });
}

function emit(candidate: ChainCandidate): ChainPipelineResult {
  if (candidate.kind === 'confirmation' && candidate.catalogId !== undefined) {
    return {
      kind: 'confirmation',
      catalogId: candidate.catalogId,
      edgeIds: candidate.edgeIds,
    };
  }
  if (
    candidate.kind === 'restatement' &&
    candidate.canonicalId !== undefined &&
    candidate.restatesBridge !== undefined
  ) {
    return {
      kind: 'restatement',
      canonicalId: candidate.canonicalId,
      restatesBridge: candidate.restatesBridge,
      edgeIds: candidate.edgeIds,
    };
  }
  const id = candidate.id ?? `chain-${candidate.edgeIds.join('-')}`;
  return {
    kind: 'stub',
    id,
    edgeIds: candidate.edgeIds,
    text: emitProofTarget({ ...candidate, id }, theoremsFor(candidate.edgeIds)),
  };
}

/**
 * Run the pipeline on `edges`.
 *
 * A manifest key whose derived kind is not `bridge` is not a premise.
 * A chain the Buckingham filter drops is absent. The catalog array is
 * not modified.
 *
 * @internal
 */
export function runChainPipeline(edges: readonly BridgeEdge[]): readonly ChainPipelineResult[] {
  const seedIds = new Set(bridgeSeedKeys());
  const report = enumerateCompositions(edges, { seedIds });
  const candidates: ChainCandidate[] = [];
  for (const target of report.proofTargets) {
    const filtered = buckinghamFilter(
      { name: target.second.target.name, dim: target.second.target.dim },
      governingOf(target.expr, target.second.target.name),
    );
    if (filtered === undefined) continue;
    const classification = matchChain(target.expr, [target.first.id, target.second.id]);
    candidates.push(toCandidate(classification, filtered));
  }
  return orderChainCandidates(candidates).map(emit);
}
