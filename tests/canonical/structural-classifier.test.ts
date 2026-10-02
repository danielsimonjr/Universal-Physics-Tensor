/**
 * Step 7 of the bridge-discovery pipeline. One structural classifier —
 * same dimension, `normalForm`, and the F4 `restatesBridge` guard — is
 * what `classifyLinkage` and the chain pipeline both call. Numerical
 * recovery stays in `linkage.ts` and is not a confirmation.
 *
 * Control: a pre-declared restatement (CE-landauer, bridge 16) classified
 * as a new `chain-` id fails this file. The linkage suite does not build
 * a chain id, so it stays green while that classification is wrong.
 *
 * @module tests/canonical/structural-classifier
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { BRIDGE_RHS_BY_ID, parseBridgeId } from '../../src/bridges/rhs-registry.js';
import { classifyLinkage } from '../../src/canonical/linkage.js';
import { normalForm } from '../../src/canonical/normal-form.js';
import { CANONICAL_EQUATIONS, canonicalById } from '../../src/canonical/registry.js';
import { classifyStructure } from '../../src/canonical/structural.js';
import { matchChain } from '../../src/composition/chain-match.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { ENERGY } from '../../src/dimensional/types.js';
import { validate } from '../../src/dimensional/validator.js';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

/** Call sites outside comments. A mention in a comment is not a call. */
function callCount(relativePath: string, name: string): number {
  const stripped = source(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  return [...stripped.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'g'))].length;
}

describe('structural classifier', () => {
  it('confirms a catalog right-hand side the registry did not pre-declare, and writes nothing', () => {
    const rhs = BRIDGE_RHS_BY_ID.get(12);
    expect(rhs).toBeDefined();
    const form = normalForm(rhs!);
    const predeclared = CANONICAL_EQUATIONS.filter(
      (ce) =>
        ce.scalarAst !== undefined &&
        ce.restatesBridge !== undefined &&
        normalForm(ce.scalarAst) === form,
    );
    expect(predeclared).toEqual([]);

    const catalog = BRIDGE_EQUATIONS;
    const catalogIds = BRIDGE_EQUATIONS.map((entry) => entry.id);
    const canons = CANONICAL_EQUATIONS;
    const ref12 = catalogFormalRef(12);
    const edgeIds = ['be-12', 'be-11-zurek'] as const;

    const result = matchChain(rhs!, edgeIds);

    expect(result).toEqual({
      kind: 'confirmation',
      catalogId: 12,
      edgeIds: ['be-12', 'be-11-zurek'],
    });
    expect(BRIDGE_EQUATIONS).toBe(catalog);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).toEqual(catalogIds);
    expect(CANONICAL_EQUATIONS).toBe(canons);
    expect(catalogFormalRef(12)).toBe(ref12);
    expect(catalogFormalRef(999)).toBeUndefined();
    expect(BRIDGE_EQUATIONS.some((entry) => String(entry.id).startsWith('chain-'))).toBe(false);
  });

  it('a pre-declared restatement is a restatement, not a new chain', () => {
    // Control. CE-landauer's restatesBridge names bridge 16, and the two
    // right-hand sides are the same normal form. Classifying that chain as
    // `provisional` fails here. The existing linkage tests never build a
    // chain id, so they do not catch this.
    expect(canonicalById('CE-landauer')?.restatesBridge).toBe('16');
    const rhs = BRIDGE_RHS_BY_ID.get(16);
    expect(rhs).toBeDefined();
    const catalog = BRIDGE_EQUATIONS;
    const catalogIds = BRIDGE_EQUATIONS.map((entry) => entry.id);
    const canons = CANONICAL_EQUATIONS;

    const result = matchChain(rhs!, ['be-42', 'be-16']);

    expect(result.kind).toBe('restatement');
    expect(result.kind).not.toBe('provisional');
    if (result.kind !== 'restatement') return;
    expect(result.canonicalId).toBe('CE-landauer');
    expect(result.restatesBridge).toBe('16');
    expect(result.edgeIds).toEqual(['be-42', 'be-16']);
    expect(BRIDGE_EQUATIONS).toBe(catalog);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).toEqual(catalogIds);
    expect(CANONICAL_EQUATIONS).toBe(canons);
    expect('id' in result).toBe(false);
  });

  it('a canonical the registry pre-declared, with no catalog right-hand side, is still a restatement', () => {
    // Bridges 51 and 52 have no entry in BRIDGE_RHS_BY_ID. The restatement
    // is the registry's `restatesBridge`, not a second catalog row.
    expect(BRIDGE_RHS_BY_ID.has(51)).toBe(false);
    const ce = canonicalById('CE-light-deflection');
    expect(ce?.restatesBridge).toBe('51');
    expect(ce?.scalarAst).toBeDefined();

    const result = matchChain(ce!.scalarAst!, ['law-schwarzschild-radius', 'be-51']);

    expect(result.kind).toBe('restatement');
    if (result.kind !== 'restatement') return;
    expect(result.canonicalId).toBe('CE-light-deflection');
    expect(result.restatesBridge).toBe('51');
  });

  it('any other chain receives a chain- id, and parseBridgeId rejects it', () => {
    const ce = canonicalById('CE-stefan-boltzmann');
    expect(ce?.restatesBridge).toBeUndefined();
    expect(ce?.scalarAst).toBeDefined();
    const form = normalForm(ce!.scalarAst!);
    const catalogHit = [...BRIDGE_RHS_BY_ID].find(([, rhs]) => normalForm(rhs) === form);
    expect(catalogHit).toBeUndefined();

    const catalog = BRIDGE_EQUATIONS;
    const catalogIds = BRIDGE_EQUATIONS.map((entry) => entry.id);
    const edgeIds = ['be-42', 'be-16'] as const;
    const result = matchChain(ce!.scalarAst!, edgeIds);

    expect(result).toEqual({
      kind: 'provisional',
      id: 'chain-be-42-be-16',
      edgeIds: ['be-42', 'be-16'],
    });
    if (result.kind !== 'provisional') return;
    // Order is the chain order. A sorted copy is a different id.
    expect(matchChain(ce!.scalarAst!, ['be-16', 'be-42'])).toMatchObject({
      id: 'chain-be-16-be-42',
    });
    expect(result.id.startsWith('chain-')).toBe(true);
    expect(result.id.startsWith('be-')).toBe(false);
    expect(result.id.startsWith('ab-')).toBe(false);
    expect(result.id.startsWith('CE-')).toBe(false);
    // Positive control: the parser still accepts a real catalog id. A
    // parser that throws on every string would make the rejection vacuous.
    expect(parseBridgeId('BE-16')).toBe(16);
    expect(parseBridgeId(12)).toBe(12);
    expect(() => parseBridgeId(result.id)).toThrow(TypeError);
    expect(BRIDGE_EQUATIONS).toBe(catalog);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).toEqual(catalogIds);
  });

  it('same dimension without the same normal form is not a confirmation', () => {
    // Landauer is energy. This symbol is energy. Numerical recovery is not
    // consulted: the structural module does not import expr-eval, and the
    // chain is not confirmed.
    const expr = sym('not-a-catalog-equation', ENERGY);
    const result = matchChain(expr, ['be-16']);
    expect(result.kind).toBe('provisional');
    if (result.kind !== 'provisional') return;
    expect(result.id).toBe('chain-be-16');
    expect(() => parseBridgeId(result.id)).toThrow(TypeError);
  });

  it('linkage and the pipeline call classifyStructure', () => {
    expect(callCount('src/canonical/linkage.ts', 'classifyStructure')).toBeGreaterThan(0);
    expect(callCount('src/composition/chain-match.ts', 'classifyStructure')).toBeGreaterThan(0);

    const structuralImports = scanFileImports(source('src/canonical/structural.ts'));
    expect(structuralImports.some((spec) => spec.includes('expr-eval'))).toBe(false);
    expect(structuralImports.some((spec) => spec.includes('derive-evidence'))).toBe(false);
    expect(structuralImports.some((spec) => spec.includes('discovery'))).toBe(false);
    expect(structuralImports.some((spec) => spec.includes('/probe/'))).toBe(false);

    const pipelineImports = scanFileImports(source('src/composition/chain-match.ts'));
    expect(pipelineImports).toContain('../canonical/structural.js');
    expect(pipelineImports.some((spec) => spec.includes('expr-eval'))).toBe(false);

    expect(scanFileImports(source('src/canonical/linkage.ts'))).toContain(
      '../composition/expr-eval.js',
    );
    const allow = JSON.parse(source('tools/layer-order/allowlist.json')) as { edges: string[] };
    expect(allow.edges).toContain('src/canonical/linkage.ts -> src/composition/expr-eval.ts');

    const ce = canonicalById('CE-landauer');
    const rhs = BRIDGE_RHS_BY_ID.get(16);
    expect(ce?.scalarAst).toBeDefined();
    expect(rhs).toBeDefined();
    const validated = validate(rhs!);
    const relation = classifyStructure({
      left: ce!.scalarAst!,
      leftDim: ce!.dimensional.target.dim,
      right: rhs!,
      rightDim: validated.inferredDimension,
      restatesBridge: ce!.restatesBridge,
      bridgeId: '16',
    });
    const link = classifyLinkage('CE-landauer', 16);
    expect(relation).toEqual({ dimMatch: true, structuralMatch: true, restates: true });
    expect(link.structuralMatch).toBe(relation.structuralMatch);
    expect(link.dimMatch).toBe(relation.dimMatch);
    expect(link.classification).toBe('restates-canonical');
    // Numerical recovery still runs in linkage, after the structural call.
    // The structural result has no recovery field.
    expect(link.recovery?.tested).toBe(true);
    expect(link.recovery?.maxRelErr).toBe(0);
    expect('recovery' in relation).toBe(false);

    const misnamed = classifyStructure({
      left: ce!.scalarAst!,
      leftDim: ce!.dimensional.target.dim,
      right: rhs!,
      rightDim: validated.inferredDimension,
      restatesBridge: '16',
      bridgeId: '99',
    });
    expect(misnamed.structuralMatch).toBe(true);
    expect(misnamed.restates).toBe(false);

    const chain = matchChain(rhs!, ['be-16']);
    expect(chain.kind).toBe('restatement');
    expect(relation.restates).toBe(true);
  });
});
