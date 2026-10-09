/**
 * Atlas Phase 6, S6.4 — the versioned export: one combined JSON artifact for
 * every family, and a JSON-LD projection with stable ids, QUDT quantity kinds
 * where they genuinely resolve, and PROV-O-shaped provenance.
 *
 * Design note: `docs/planning/Atlas-Phase-6-Design.md` §2.
 *
 * Pure: no I/O. The QUDT resolution table (`data/atlas/qudt-resolution.json`) is
 * passed IN by the emitter, so this module cannot drift from the table it was
 * given and never reads the tree.
 *
 * ## Why the QUDT table is keyed by (model, parameter), never by name
 *
 * `kappa` is a SPRING CONSTANT in `model-chain` and a THERMAL CONDUCTIVITY in
 * `model-heat`. A name-keyed table would assign one of them the other's
 * quantity kind — a notation collision in the atlas's own data.
 *
 * ## Schema version
 *
 * The combined artifact keeps `schemaVersion: '0'`. Phase 4 added one OPTIONAL
 * field (`formalRef`); an additive optional field is not a breaking change, and
 * the plan bumps to `v1` only on one.
 *
 * @module atlas/export
 * @internal
 */

import type { AtlasFamily } from './family.js';
import type { AtlasRecordJson } from './serialize.js';
import { toAtlasJson } from './serialize.js';
import type { WitnessResultsArtifact } from './witness-artifact.js';

/** The QUDT resolution table: `"<model-id>/<parameter>"` → IRI, or null when none resolves. @internal */
export interface QudtResolution {
  /** When and how the IRIs were checked. */
  readonly probedAt: string;
  readonly method: string;
  readonly entries: Readonly<Record<string, string | null>>;
}

/** The stable id namespace. A URN, so no id depends on a host that could move. @internal */
export const ATLAS_ID_PREFIX = 'urn:upt:atlas:';

const modelIri = (id: string): string => `${ATLAS_ID_PREFIX}model:${id}`;
const bridgeIri = (id: string): string => `${ATLAS_ID_PREFIX}bridge:${id}`;

/** One family's record inside the combined artifact: the per-family record without its own version stamp. @internal */
export type CombinedFamilyRecord = Omit<AtlasRecordJson, 'packageVersion'>;

/** The combined artifact: every family's record under one version stamp. @internal */
export interface CombinedAtlasJson {
  readonly schemaVersion: '0';
  readonly packageVersion: string;
  readonly families: readonly CombinedFamilyRecord[];
}

/**
 * The combined artifact: every family's record under one version stamp.
 *
 * @param witnessResults - forwarded to `toAtlasJson`, which derives each
 * bridge's `evidence` against it.
 * @internal
 */
export function toCombinedAtlasJson(
  families: readonly AtlasFamily[],
  packageVersion: string,
  witnessResults: WitnessResultsArtifact,
): CombinedAtlasJson {
  return {
    schemaVersion: '0',
    packageVersion,
    families: families.map((f) => {
      const { packageVersion: _dropped, ...record } = toAtlasJson(f, packageVersion, witnessResults);
      return record;
    }),
  };
}

/**
 * The JSON-LD projection.
 *
 * @throws Error when a model parameter has NO entry in the resolution table — an
 * unlisted parameter is a gap in the table, and exporting it silently blank
 * would be indistinguishable from a deliberate "no QUDT kind resolves".
 * @internal
 */
export function toAtlasJsonLd(
  families: readonly AtlasFamily[],
  packageVersion: string,
  qudt: QudtResolution,
): unknown {
  const graph: unknown[] = [];
  for (const family of families) {
    for (const m of family.models) {
      graph.push({
        '@id': modelIri(m.id),
        '@type': 'upt:Model',
        'upt:family': family.family,
        'upt:dynamics': m.dynamics,
        'upt:parameter': m.parameters.map((p) => {
          const key = `${m.id}/${p.name}`;
          if (!(key in qudt.entries)) {
            throw new Error(`toAtlasJsonLd: no QUDT resolution entry for ${key}`);
          }
          const kind = qudt.entries[key];
          return {
            'upt:symbol': p.name,
            'upt:dimension': [p.dim.L, p.dim.M, p.dim.T, p.dim.I, p.dim.Theta, p.dim.N, p.dim.J],
            ...(kind === null ? {} : { 'qudt:hasQuantityKind': { '@id': kind } }),
          };
        }),
        ...(m.canonicalRefs.length === 0 ? {} : { 'upt:canonicalRef': [...m.canonicalRefs] }),
      });
    }
    for (const b of family.bridges) {
      graph.push({
        '@id': bridgeIri(b.id),
        '@type': ['upt:Bridge', 'prov:Entity'],
        'upt:relation': b.relation,
        'upt:premise': b.premises.map((p) => ({ '@id': modelIri(p) })),
        'upt:conclusion': { '@id': modelIri(b.conclusion) },
        // PROV-O shape: the bridge's claim is derived from its premises, and
        // its sources are the citations it states.
        'prov:wasDerivedFrom': b.premises.map((p) => ({ '@id': modelIri(p) })),
        'dcterms:source': [...b.citations],
        'upt:reviewStatus': b.reviewStatus,
        'upt:witness': b.witnesses.map((w) => ({ 'upt:id': w.id, 'upt:kind': w.kind, 'upt:test': w.test })),
        ...(b.formalRef === undefined
          ? {}
          : { 'upt:formalRef': { 'upt:statement': b.formalRef.statement, 'upt:fidelity': b.formalRef.fidelity } }),
      });
    }
  }
  return {
    '@context': {
      upt: `${ATLAS_ID_PREFIX}vocab:`,
      prov: 'http://www.w3.org/ns/prov#',
      qudt: 'http://qudt.org/schema/qudt/',
      dcterms: 'http://purl.org/dc/terms/',
    },
    '@id': `${ATLAS_ID_PREFIX}release:${packageVersion}`,
    'upt:qudtProbedAt': qudt.probedAt,
    '@graph': graph,
  };
}
