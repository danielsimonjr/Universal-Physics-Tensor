/**
 * Repro for docs/persona-sessions/2026-10-01-library-api.md.
 *
 * From a built clone:  node docs/persona-sessions/2026-10-01/repro.mjs
 * Imports the package entry points package.json exports (dist/), not src/.
 */
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const rootUrl = pathToFileURL(join(root, 'dist/index.js')).href;
const atlasUrl = pathToFileURL(join(root, 'dist/atlas/index.js')).href;
const evidenceUrl = pathToFileURL(join(root, 'dist/atlas/derive-evidence.js')).href;

const api = await import(rootUrl);
const atlas = await import(atlasUrl);
const { catalogEvidenceInput } = await import(evidenceUrl);

const kindOf = (covers) => {
  const m = /^(reduction|limit|derivation-step|property|cross-check): /.exec(covers ?? '');
  return m ? m[1] : 'unprefixed';
};

const catalog = api.BRIDGE_EQUATIONS.filter((e) => e.formalRef).map((e) => {
  const whole = [...atlas.deriveEvidence({ formalRef: e.formalRef }, atlas.NO_PASSING_WITNESSES)];
  const stripped = [...atlas.deriveEvidence(catalogEvidenceInput(e), atlas.NO_PASSING_WITNESSES)];
  return { id: e.id, kind: kindOf(e.formalRef.covers), whole, stripped, statement: e.formalRef.statement };
});

const atlasRows = [];
for (const fam of atlas.ATLAS_FAMILIES) {
  for (const b of fam.bridges) {
    const derived = [...atlas.deriveEvidence(b, atlas.NO_PASSING_WITNESSES)];
    if (!derived.includes('formally-proved') && !derived.includes('contradicted')) continue;
    atlasRows.push({
      id: b.id,
      reviewStatus: b.reviewStatus,
      stored: [...b.evidence].sort(),
      derived,
    });
  }
}

const M = api.M_SUN_SI;
const Th = api.BridgeEquations.hawkingTemperature({ M_kg: M });
const ThHand =
  (api.HBAR_SI * api.C_SI ** 3) / (8 * Math.PI * api.G_SI * M * api.K_B_SI);
const tiny = api.BridgeEquations.hawkingTemperature({ M_kg: 1e-300 });
const { GM_SUN_SI } = await import(pathToFileURL(join(root, 'dist/core/constants.js')).href);
const product = api.G_SI * api.M_SUN_SI;

let bareE;
try {
  const parsed = await api.parsePhysics('e^2', {});
  bareE = { dim: api.format(parsed.dimension) };
} catch (e) {
  bareE = { error: e.name, message: e.message };
}

const adj = api.adjudicateCatalog(api.BRIDGE_EQUATIONS);
const sin = api.validate({
  kind: 'transcendental',
  fn: 'sin',
  arg: { kind: 'symbol', name: 'x', dim: { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } },
});

const report = {
  catalogFormalRefs: catalog.length,
  kinds: catalog.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {}),
  wholeRefLightsFormallyProved: catalog.filter((r) => r.whole.includes('formally-proved')).map((r) => r.id),
  catalogPathLightsFormallyProved: catalog.filter((r) => r.stripped.includes('formally-proved')).map((r) => r.id),
  barrelExportsCatalogEvidenceInput: typeof atlas.catalogEvidenceInput === 'function',
  atlasDerived: atlasRows,
  hawking: { library: Th, hand: ThHand, agree: Th === ThHand },
  hawkingAt1e300: { value: Number.isFinite(tiny) ? tiny : String(tiny), finite: Number.isFinite(tiny) },
  gmRel: (product - GM_SUN_SI) / GM_SUN_SI,
  bareE,
  adjudication: {
    bridges: adj.bridges.length,
    notABridge: adj.notABridges.length,
    unadjudicated: adj.unadjudicated.length,
  },
  sinOfDimensionless: sin.ok,
  canonical: api.CANONICAL_EQUATIONS.length,
};
console.log(JSON.stringify(report, null, 2));
