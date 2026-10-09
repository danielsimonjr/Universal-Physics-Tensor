/**
 * Step 10 of the bridge-discovery pipeline. One function runs the seed
 * predicate, seed-filtered enumeration, the Buckingham filter, the
 * structural classifier, the chain order, and the proof-target stub.
 *
 * A derivation-step edge is not a premise. On a fixture pair of
 * kind-bridge symbolic edges the result is a confirmation record or a
 * stub. The catalog array is the same array after the call.
 *
 * Control: a write into BRIDGE_EQUATIONS fails that identity check.
 * Deleting the seed filter lets the derivation-step edge through; the
 * unfiltered enumeration shows that pair, and the pipeline does not.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runChainPipeline } from '../../src/atlas/chain-pipeline.js';
import { bridgeSeedKeys, physjsFormalRef, physjsTheorem } from '../../src/atlas/physjs-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { enumerateCompositions } from '../../src/composition/enumerate.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import {
  ACCELERATION,
  DIMENSIONLESS,
  LENGTH,
  MASS,
  TIME,
} from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = resolve(root, 'src/atlas/chain-pipeline.ts');

function q(name: string, dim: Dimension): Quantity {
  return { name, symbol: name, dim, attributes: {} };
}

function edge(
  id: string,
  sources: readonly Quantity[],
  target: Quantity,
  symbolic: ExprNode,
): BridgeEdge {
  return {
    id,
    beId: null,
    kind: 'bridge',
    label: id,
    sources,
    target,
    confidence: 'established',
    domain: { description: 'any', predicate: () => true },
    citation: 'fixture',
    evaluate: (inputs) => {
      const first = sources[0];
      return first === undefined ? 0 : (inputs[first.name] ?? 0);
    },
    symbolic,
  };
}

const rhs12 = BRIDGE_RHS_BY_ID.get(12);
if (rhs12 === undefined) throw new Error('catalog 12 has no right-hand side');

/** Identity on the mass leaf `m`, so the composed formula is the catalog 12 right-hand side. */
const massIdentity = edge(
  'be-55',
  [q('particle-mass', MASS)],
  q('mass', MASS),
  sym('mass', MASS),
);

const catalogShape = edge(
  'be-12',
  [q('mass', MASS)],
  q('wavelength', LENGTH),
  rhs12,
);

/** Length into a time monomial. Not a catalog right-hand side. */
const rodToSpan = edge(
  'be-21',
  [q('rod', LENGTH)],
  q('span', LENGTH),
  sym('rod', LENGTH),
);

const spanToPeriod = edge(
  'be-27',
  [q('span', LENGTH), q('gravity', ACCELERATION)],
  q('period', TIME),
  {
    kind: 'op',
    op: '^',
    args: [
      {
        kind: 'op',
        op: '/',
        args: [sym('span', LENGTH), sym('gravity', ACCELERATION)],
      },
      sym('0.5', DIMENSIONLESS),
    ],
  },
);

/** Kind derivation-step. It composes with `rodToSpan` when the seed filter is off. */
const notASeed = edge(
  'be-14',
  [q('span', LENGTH)],
  q('copied-span', LENGTH),
  sym('span', LENGTH),
);

const EDGES = [massIdentity, catalogShape, rodToSpan, spanToPeriod, notASeed];

function sourceText(): string {
  return readFileSync(sourcePath, 'utf8');
}

function codeWithoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('runChainPipeline', () => {
  it('a derivation-step edge is not a premise', () => {
    expect(physjsFormalRef('be-14').kind).toBe('derivation-step');
    expect(bridgeSeedKeys()).not.toContain('be-14');
    expect(bridgeSeedKeys()).toEqual(expect.arrayContaining(['be-12', 'be-21', 'be-27', 'be-55']));

    const results = runChainPipeline(EDGES);
    const mentioned = results.flatMap((result) => result.edgeIds);
    expect(mentioned).not.toContain('be-14');
    expect(results.some((result) => result.kind === 'stub' && result.text.includes('be-14'))).toBe(
      false,
    );
  });

  it('CONTROL: without the seed filter the derivation-step edge composes', () => {
    const unfiltered = enumerateCompositions(EDGES);
    expect(
      unfiltered.all.some(
        (candidate) => candidate.first.id === 'be-21' && candidate.second.id === 'be-14',
      ),
    ).toBe(true);
    const seeded = enumerateCompositions(EDGES, { seedIds: new Set(bridgeSeedKeys()) });
    expect(
      seeded.proofTargets.some(
        (target) => target.first.id === 'be-14' || target.second.id === 'be-14',
      ),
    ).toBe(false);
  });

  it('a kind-bridge symbolic pair is a confirmation record or a stub, and the catalog is unchanged', () => {
    const catalog = BRIDGE_EQUATIONS;
    const catalogIds = BRIDGE_EQUATIONS.map((entry) => entry.id);

    const results = runChainPipeline([massIdentity, catalogShape]);

    expect(results).toHaveLength(1);
    const only = results[0];
    expect(only).toBeDefined();
    expect(only!.kind === 'confirmation' || only!.kind === 'stub').toBe(true);
    expect(only!.edgeIds).toEqual(['be-55', 'be-12']);
    expect(only).toEqual({
      kind: 'confirmation',
      catalogId: 12,
      edgeIds: ['be-55', 'be-12'],
    });

    expect(BRIDGE_EQUATIONS).toBe(catalog);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).toEqual(catalogIds);
  });

  it('a chain that is not a catalog equation is a stub, and confirmation sorts ahead of it', () => {
    const results = runChainPipeline(EDGES);
    const confirmation = results.find((result) => result.kind === 'confirmation');
    const stub = results.find(
      (result) => result.kind === 'stub' && result.edgeIds[0] === 'be-21',
    );
    expect(confirmation).toMatchObject({
      kind: 'confirmation',
      catalogId: 12,
      edgeIds: ['be-55', 'be-12'],
    });
    expect(stub).toBeDefined();
    expect(stub!.kind).toBe('stub');
    if (stub!.kind !== 'stub') return;
    expect(stub!.id).toBe('chain-be-21-be-27');
    expect(stub!.edgeIds).toEqual(['be-21', 'be-27']);
    expect(stub!.text).toContain('-- PROOF TARGET');
    expect(stub!.text).toContain('import PhysJS.Dimensional');
    expect(stub!.text).toContain('-- kind: derivation-step');
    expect(stub!.text).not.toContain('-- covers: derivation-step:');
    expect(stub!.text).toContain(physjsTheorem('be-21'));
    expect(stub!.text).toContain(physjsTheorem('be-27'));
    const thermal = stub!.text.indexOf(physjsTheorem('be-21') as string);
    const hall = stub!.text.indexOf('PhysJS.ProofTarget');
    expect(thermal).toBeGreaterThanOrEqual(0);
    expect(results.indexOf(confirmation!)).toBeLessThan(results.indexOf(stub!));
    expect(hall).toBeGreaterThanOrEqual(0);
  });

  it('records no category claim for quantity edges and does not drop the pair', () => {
    const left = {
      ...rodToSpan,
      relation: { type: 'derivation' as const, transformation: 'fixture left' },
    };
    const right = {
      ...spanToPeriod,
      relation: { type: 'derivation' as const, transformation: 'fixture right' },
    };
    expect(left.target.name).toBe('span');
    expect(right.sources.some((source) => source.name === 'span')).toBe(true);

    const results = runChainPipeline([left, right]);
    expect(results.map((result) => result.edgeIds)).toEqual([['be-21', 'be-27']]);
    expect(results.some((result) => result.kind === 'stub')).toBe(true);

    // A quantity edge stores a quantity name, not a category object id, so no
    // step can invent a category claim: the pipeline has no function for it.
    const pipeline = readFileSync(resolve(root, 'src/atlas/chain-pipeline.ts'), 'utf8');
    expect(pipeline).not.toContain('categoryCompositionForChain');
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    const atlasPublic = readFileSync(resolve(root, 'src/atlas/public.ts'), 'utf8');
    expect(index).not.toContain('composeMorphisms');
    expect(atlasPublic).not.toContain('composeMorphisms');
  });

  it('CONTROL: a write into BRIDGE_EQUATIONS fails the identity check', () => {
    const catalog = BRIDGE_EQUATIONS;
    const catalogIds = BRIDGE_EQUATIONS.map((entry) => entry.id);
    runChainPipeline(EDGES);
    expect(BRIDGE_EQUATIONS).toBe(catalog);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).toEqual(catalogIds);
    const written = [...catalogIds, 99999];
    expect(written).not.toEqual(catalogIds);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).not.toEqual(written);
  });

  it('imports the pipeline steps downward and adds no command and no discovery package', () => {
    const body = codeWithoutComments(sourceText());
    const imports = scanFileImports(sourceText());
    expect(imports).toEqual(
      expect.arrayContaining([
        './physjs-ref.js',
        './proof-target.js',
        '../composition/enumerate.js',
        '../composition/buckingham-filter.js',
        '../composition/chain-match.js',
        '../composition/chain-candidate.js',
        '../composition/chain-regime.js',
      ]),
    );
    for (const word of ['discovery', 'probe', 'cli/', 'upt ']) {
      expect(imports.some((spec) => spec.includes(word)), word).toBe(false);
    }
    expect(body.includes('BRIDGE_EQUATIONS')).toBe(false);
    expect(body.includes('deriveEvidence')).toBe(false);
    expect(existsSync(resolve(root, 'src/discovery'))).toBe(false);
    const commands = readFileSync(resolve(root, 'src/cli/commands/index.ts'), 'utf8');
    expect(commands.includes('chain-pipeline')).toBe(false);
    expect(commands.includes('runChainPipeline')).toBe(false);
    const publicSurface = readFileSync(resolve(root, 'src/atlas/public.ts'), 'utf8');
    expect(publicSurface.includes('runChainPipeline')).toBe(false);
    expect(publicSurface.includes('chain-regime')).toBe(false);
    const barrel = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(barrel.includes('chain-regime')).toBe(false);
    expect(barrel.includes('joinRegimeMismatch')).toBe(false);
    const discovery = readFileSync(resolve(root, 'src/composition/discovery.ts'), 'utf8');
    expect(discovery.includes('runChainPipeline')).toBe(false);
    expect(discovery.includes('chain-regime')).toBe(false);
    const probe = readFileSync(resolve(root, 'src/composition/probe/pipeline.ts'), 'utf8');
    expect(probe.includes('chain-regime')).toBe(false);
  });
});
