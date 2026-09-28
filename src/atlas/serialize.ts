/**
 * JSON projection of an atlas family (Atlas Phase 0, S0.6).
 *
 * The in-memory record is not JSON. Two fields make that true, and both are
 * handled here rather than left to `JSON.stringify`:
 *
 * 1. `AtlasBridge.evidence` is a `ReadonlySet<EvidenceTag>`, and a `Set`
 *    stringifies to `{}` — the artifact would be silently empty exactly where
 *    the evidence lives. Design note §7 requires the emitter to serialize it
 *    explicitly; it is emitted as a SORTED array so the artifact is stable
 *    under insertion-order changes.
 * 2. `ApproximationBound.horizonHolds` is a function, which stringifies to
 *    nothing at all. Only the `horizon` PROSE crosses into JSON; the machine
 *    predicate stays in TypeScript, as `data/schemas/atlas-record.v0.json`
 *    states.
 *
 * Every record key order and every `Record<>` key order is fixed here, so two
 * calls on the same family produce byte-identical output. That is what lets
 * `tests/atlas/atlas-json.test.ts` pin the committed artifact against the live
 * family the way `catalog-json.test.ts` pins the bridge catalog.
 *
 * @module atlas/serialize
 */

import type { PiGroup } from '../dimensional/buckingham.js';
import type {
  ApproximationBound,
  AtlasBridge,
  AtlasRejection,
  Regime,
} from './types.js';
import type { AtlasModel } from './model.js';
import type { AtlasFamily } from './oscillators/index.js';

/** Record major version of the emitted artifact. @internal */
export const ATLAS_RECORD_SCHEMA_VERSION = '0';

/** A JSON value, as emitted. @internal */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [k: string]: JsonValue };

/** The emitted artifact. @internal */
export interface AtlasRecordJson {
  readonly $schema: string;
  readonly schemaVersion: string;
  readonly packageVersion: string;
  readonly family: string;
  readonly models: readonly JsonValue[];
  readonly bridges: readonly JsonValue[];
  readonly rejections: readonly JsonValue[];
}

/** Rebuild a record with its keys in sorted order, so emission is stable. */
const sortedRecord = <T>(source: Readonly<Record<string, T>>): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const key of Object.keys(source).sort()) out[key] = source[key] as T;
  return out;
};

/**
 * Normalize negative zero. `buckinghamPi` produces `-0` exponents (a `-1 * 0`
 * in the null-space arithmetic), and `JSON.stringify(-0)` is `"0"` — so a
 * record holding `-0` does NOT survive its own round-trip. Collapsing it here
 * makes the projection genuinely JSON-faithful instead of nearly so.
 */
const zeroSafe = (n: number): number => (n === 0 ? 0 : n);

const serializePiGroup = (group: PiGroup): JsonValue => {
  const exponents: Record<string, number> = {};
  const sorted = sortedRecord(group.exponents);
  for (const key of Object.keys(sorted)) exponents[key] = zeroSafe(sorted[key] as number);
  return { exponents, formula: group.formula };
};

const serializeRegime = (regime: Regime): JsonValue => {
  const definitions: Record<string, JsonValue> = {};
  for (const key of Object.keys(regime.groupDefinitions).sort()) {
    definitions[key] = serializePiGroup(regime.groupDefinitions[key] as PiGroup);
  }
  return {
    family: regime.family,
    inequalities: regime.inequalities.map((i) => ({
      group: i.group,
      op: i.op,
      bound: zeroSafe(i.bound),
      ...(i.alias === undefined ? {} : { alias: i.alias }),
    })),
    groupDefinitions: definitions,
  };
};

/**
 * `horizonHolds` and `deltaAt` are deliberately absent: a predicate is not
 * data, and a serialized function would be a claim no reader could check.
 * `uniformity` IS data. `null` is the not-yet-analysed state and must be
 * present in the artifact, not dropped.
 */
const serializeBound = (bound: ApproximationBound): JsonValue => ({
  K: zeroSafe(bound.K),
  delta: zeroSafe(bound.delta),
  norm: bound.norm,
  domain: bound.domain,
  horizon: bound.horizon,
  ...(bound.parameterRange === undefined ? {} : { parameterRange: bound.parameterRange }),
  limitCharacter: bound.limitCharacter,
  uniformity: bound.uniformity === null ? null : [...bound.uniformity],
});

/**
 * Fields are enumerated EXPLICITLY, never spread: a new optional field stays
 * invisible to the artifact until it is added here, so a model that records
 * none of the Phase 3 additions serializes byte-identically to the committed
 * `data/atlas/oscillators.json` that `tests/atlas/atlas-json.test.ts`
 * deep-equals against.
 */
const serializeModel = (model: AtlasModel): JsonValue => ({
  id: model.id,
  family: model.family,
  stateSpace: model.stateSpace,
  dynamics: model.dynamics,
  observables: [...model.observables],
  parameters: model.parameters.map((p) => ({
    name: p.name,
    dim: { ...p.dim },
  })),
  dimensionlessInputs: [...model.dimensionlessInputs],
  canonicalRefs: [...model.canonicalRefs],
  regime: serializeRegime(model.regime),
  ...(model.boundaryData === undefined ? {} : { boundaryData: [...model.boundaryData] }),
  ...(model.initialData === undefined ? {} : { initialData: [...model.initialData] }),
  ...(model.symmetryGroup === undefined ? {} : { symmetryGroup: model.symmetryGroup }),
});

const serializeWitnesses = (
  witnesses: AtlasBridge['witnesses'],
): readonly JsonValue[] =>
  witnesses.map((w) => ({
    id: w.id,
    kind: w.kind,
    test: w.test,
    ...(w.tolerance === undefined ? {} : { tolerance: w.tolerance }),
  }));

/**
 * A norm transport's `KAt` and `timeMap.restateHorizon` are functions and are
 * absent for the reason `serializeBound` gives; the declaration's data is kept.
 */
const serializeNormTransports = (
  transports: NonNullable<AtlasBridge['normTransports']>,
): readonly JsonValue[] =>
  transports.map((nt) => ({
    id: nt.id,
    fromModel: nt.fromModel,
    toModel: nt.toModel,
    from: nt.from,
    to: nt.to,
    K: zeroSafe(nt.K),
    domain: nt.domain,
    derivation: nt.derivation,
    timeMap: { map: nt.timeMap.map, uniform: nt.timeMap.uniform, horizon: nt.timeMap.horizon },
    uniformity: nt.uniformity,
    witness: serializeWitnesses([nt.witness])[0]!,
    basis: nt.basis,
  }));

const serializeBridge = (bridge: AtlasBridge): JsonValue => ({
  id: bridge.id,
  relation: bridge.relation,
  premises: [...bridge.premises],
  conclusion: bridge.conclusion,
  transformation: bridge.transformation,
  ...(bridge.inverse === undefined ? {} : { inverse: bridge.inverse }),
  preserves: [...bridge.preserves],
  doesNotPreserve: [...bridge.doesNotPreserve],
  sideConditions: [...bridge.sideConditions],
  ...(bridge.bound === undefined ? {} : { bound: serializeBound(bridge.bound) }),
  regime: serializeRegime(bridge.regime),
  counterexamples: bridge.counterexamples.map((c) => ({
    description: c.description,
    witness: c.witness,
  })),
  // The Set, explicitly — sorted, so the artifact does not churn on
  // insertion order.
  evidence: [...bridge.evidence].sort(),
  witnesses: serializeWitnesses(bridge.witnesses),
  citations: [...bridge.citations],
  reviewStatus: bridge.reviewStatus,
  // Omitted, never emptied, when absent (Phase 4 S4.6): an absent reference is
  // the honest default, and `{}` would read as a reference with no content.
  ...(bridge.formalRef === undefined
    ? {}
    : {
        formalRef: {
          system: bridge.formalRef.system,
          statement: bridge.formalRef.statement,
          version: bridge.formalRef.version,
          axioms: [...bridge.formalRef.axioms],
          fidelity: bridge.formalRef.fidelity,
        },
      }),
  // Omitted when absent, like formalRef: no declaration is the default.
  ...(bridge.normTransports === undefined
    ? {}
    : { normTransports: serializeNormTransports(bridge.normTransports) }),
});

/**
 * `claimed` is emitted as `claimedRelation`, and `reason` is ALSO emitted as
 * `counterexample.description`, because the schema's rejection record names
 * those two keys. The description is the refutation itself restated under the
 * key the schema requires — no new claim is introduced.
 */
const serializeRejection = (rejection: AtlasRejection): JsonValue => ({
  id: rejection.id,
  claimedRelation: rejection.claimed,
  premises: [...rejection.premises],
  conclusion: rejection.conclusion,
  reason: rejection.reason,
  survivingGroup: rejection.survivingGroup,
  counterexample: { description: rejection.reason },
  witnesses: serializeWitnesses(rejection.witnesses),
});

/**
 * Project an atlas family into the shape of
 * `data/schemas/atlas-record.v0.json`.
 *
 * Deterministic: equal inputs give byte-identical `JSON.stringify` output.
 *
 * @internal
 */
export function toAtlasJson(
  family: AtlasFamily,
  packageVersion: string,
): AtlasRecordJson {
  return {
    $schema: '../schemas/atlas-record.v0.json',
    schemaVersion: ATLAS_RECORD_SCHEMA_VERSION,
    packageVersion,
    family: family.family,
    models: family.models.map(serializeModel),
    bridges: family.bridges.map(serializeBridge),
    rejections: family.rejections.map(serializeRejection),
  };
}
