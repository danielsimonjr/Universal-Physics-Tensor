/**
 * Internal bridge-discovery pipeline.
 *
 * Seeds, then seed-filtered symbolic enumeration, the Buckingham filter,
 * the structural classifier, the regime join gate, the chain order,
 * and the proof-target stub.
 * A confirmation reports the catalog id. A restatement reports the
 * pre-declared canonical equation. A regime mismatch is recorded and
 * is not a stub. Any other survivor is a statement skeleton. Nothing
 * is written into the catalog.
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
import { enumerateCompositionsWithRefusals } from '../composition/enumerate.js';
import type { CompositionResult } from '../relations/composition-table.js';
import { buckinghamFilter } from '../composition/buckingham-filter.js';
import { matchChain } from '../composition/chain-match.js';
import { compareChainEdgeIds, type ChainCandidate } from '../composition/chain-candidate.js';
import {
  chainOrderKey,
  orderChainRecords,
  type ChainRecord,
} from '../composition/chain-result.js';
import { joinRegimeMismatch, type ChainRegimeMismatch } from '../composition/chain-regime.js';
import { bridgeSeedKeys, physjsTheorem } from './physjs-ref.js';
import { emitProofTarget } from './proof-target.js';
import { scalarSymbolsFromMathTs } from '../composition/mathts-scalar-symbols.js';

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

/**
 * A pair the composition table refused.
 *
 * The message is `UndefinedCompositionError`. A dimension mismatch is not
 * this record.
 *
 * @internal
 */
export interface ChainCompositionRefusal {
  readonly kind: 'rejected: composition table';
  readonly edgeIds: readonly [string, string];
  readonly message: string;
}

/** One ordered survivor, a regime rejection, or a composition-table refusal. @internal */
export type ChainPipelineResult =
  | ChainConfirmationRecord
  | ChainRestatementRecord
  | ChainStubRecord
  | ChainRegimeMismatch
  | ChainCompositionRefusal;

function isNumericName(name: string): boolean {
  return /^\d+(\.\d+)?$/.test(name);
}

function isDimensionlessConstant(name: string): boolean {
  if (/^\d*pi$/.test(name)) return true;
  const registered = CONSTANTS[name];
  return registered !== undefined && equals(registered.dim, DIMENSIONLESS);
}

/**
 * Dimensioned leaves of the composed formula, excluding the target name.
 * The names are the MathTS symbol filter. A dimensionless constant is not
 * a governing symbol. The elementary charge is, because its dimension is
 * charge.
 *
 * @internal
 */
export function governingOf(expr: ExprNode, targetName: string): { name: string; dim: Dimension }[] {
  const vars: { name: string; dim: Dimension }[] = [];
  for (const leaf of scalarSymbolsFromMathTs(expr)) {
    if (leaf.name === targetName) continue;
    if (isNumericName(leaf.name) || isDimensionlessConstant(leaf.name)) continue;
    vars.push(leaf);
  }
  vars.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return vars;
}

/**
 * The category claim recorded for two quantity edges.
 *
 * A quantity edge stores a quantity name, not a category object id.
 * This step does not invent that id, so the recorded result is unset
 * even when both edges store a relation. The pair is not dropped.
 *
 * @internal
 */
export function categoryCompositionForChain(
  first: BridgeEdge,
  second: BridgeEdge,
): CompositionResult | undefined {
  const relationsAreStored = first.relation !== undefined && second.relation !== undefined;
  if (!relationsAreStored) return undefined;
  return undefined;
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

function proofCandidate(record: ChainRecord): ChainCandidate {
  const kind = chainOrderKey(record);
  const theorem = record.theorem ?? undefined;
  const carried = theorem === undefined ? {} : { theorem };
  if (record.classification.kind === 'confirmation') {
    return {
      kind,
      edgeIds: record.edgeIds,
      catalogId: record.classification.catalogId,
      ...carried,
    };
  }
  if (record.classification.kind === 'restatement') {
    return {
      kind,
      edgeIds: record.edgeIds,
      canonicalId: record.classification.canonicalId,
      restatesBridge: record.classification.restatesBridge,
      ...carried,
    };
  }
  return {
    kind,
    edgeIds: record.edgeIds,
    id: record.classification.id,
    ...carried,
  };
}

/**
 * The orchestrator view of one {@link ChainRecord}.
 *
 * A confirmation and a restatement ignore `mismatch`. A provisional
 * record with a mismatch is that rejection. Any other provisional record
 * is a stub whose id and theorem come from the same record the order key
 * reads.
 *
 * @internal
 */
export function renderChainRecord(
  record: ChainRecord,
  seedTheorems: readonly string[] = [],
): ChainPipelineResult {
  if (record.classification.kind === 'confirmation') {
    return {
      kind: 'confirmation',
      catalogId: record.classification.catalogId,
      edgeIds: record.edgeIds,
    };
  }
  if (record.classification.kind === 'restatement') {
    return {
      kind: 'restatement',
      canonicalId: record.classification.canonicalId,
      restatesBridge: record.classification.restatesBridge,
      edgeIds: record.edgeIds,
    };
  }
  if (record.mismatch !== undefined) return record.mismatch;
  const candidate = proofCandidate(record);
  const id = candidate.id ?? `chain-${record.edgeIds.join('-')}`;
  return {
    kind: 'stub',
    id,
    edgeIds: record.edgeIds,
    text: emitProofTarget({ ...candidate, id }, seedTheorems),
  };
}

/**
 * Run the pipeline on `edges`.
 *
 * A manifest key whose derived kind is not `bridge` is not a premise.
 * A chain the Buckingham filter drops is absent. A confirmation or a
 * restatement is not sent to the regime gate. Any other mismatch is
 * `rejected: regime mismatch` and is not a stub. A composition-table
 * refusal is `rejected: composition table` and is not a dimension
 * failure. The catalog array is not modified.
 *
 * @internal
 */
export function runChainPipeline(edges: readonly BridgeEdge[]): readonly ChainPipelineResult[] {
  const seedIds = new Set(bridgeSeedKeys());
  const found = enumerateCompositionsWithRefusals(edges, { seedIds });
  const report = found.report;
  const records: ChainRecord[] = [];
  const rejections: ChainRecord[] = [];
  for (const target of report.proofTargets) {
    const filtered = buckinghamFilter(
      { name: target.second.target.name, dim: target.second.target.dim },
      governingOf(target.expr, target.second.target.name),
    );
    if (filtered === undefined) continue;
    const classification = matchChain(target.expr, [target.first.id, target.second.id]);
    const edgeIds = [target.first.id, target.second.id];
    const record: ChainRecord = {
      edgeIds,
      classification,
      theorem: filtered.theorem,
      mismatch: undefined,
      categoryComposition: categoryCompositionForChain(target.first, target.second),
    };
    if (classification.kind === 'confirmation' || classification.kind === 'restatement') {
      records.push(record);
      continue;
    }
    const mismatch = joinRegimeMismatch(target.first, target.second);
    if (mismatch !== undefined) {
      rejections.push({ ...record, mismatch });
      continue;
    }
    records.push(record);
  }
  const orderedRejections = [...rejections].sort((a, b) =>
    compareChainEdgeIds(a.edgeIds, b.edgeIds),
  );
  const tableRefusals: ChainCompositionRefusal[] = found.relationRefusals
    .map((row) => ({
      kind: 'rejected: composition table' as const,
      edgeIds: [row.first.id, row.second.id] as [string, string],
      message: row.message,
    }))
    .sort((a, b) => compareChainEdgeIds(a.edgeIds, b.edgeIds));
  return [
    ...orderChainRecords(records).map((record) =>
      renderChainRecord(record, theoremsFor(record.edgeIds)),
    ),
    ...orderedRejections.map((record) => renderChainRecord(record)),
    ...tableRefusals,
  ];
}
