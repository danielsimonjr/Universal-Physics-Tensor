/**
 * Step 9 of the bridge-discovery pipeline. A chain candidate becomes a
 * Lean statement skeleton and the theorem chain of its seed steps.
 * The skeleton is a target. The manifest checker reports a problem on
 * the draft inside it.
 *
 * Control: an emitter path that marks leanProof complete and attaches
 * propext, Classical.choice, and Quot.sound clears that leanProof
 * problem. The skeleton must not take that path.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import {
  emitProofTarget,
  proofTargetDraft,
  PROOF_TARGET_DRAFT_BEGIN,
  PROOF_TARGET_DRAFT_END,
} from '../../src/atlas/proof-target.js';
import {
  physjsManifestProblems,
  physjsTheorem,
  type PhysjsManifestFile,
} from '../../src/atlas/physjs-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import type { ChainCandidate } from '../../src/composition/chain-candidate.js';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = resolve(root, 'src/atlas/proof-target.ts');
const manifest = JSON.parse(
  readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf8'),
) as PhysjsManifestFile;

const THREE_AXIOMS = ['propext', 'Classical.choice', 'Quot.sound'] as const;

type DraftEntry = PhysjsManifestFile['entries'][number];

const carriers = [
  ...ATLAS_FAMILIES.flatMap((family) => family.bridges),
  ...BRIDGE_EQUATIONS.map((entry) => ({
    id: `be-${entry.id}`,
    formalRef: catalogFormalRef(entry.id),
  })),
];

const thermal = physjsTheorem('be-12');
const hall = physjsTheorem('be-55');

const monomial: ChainCandidate = {
  kind: 'unique-monomial',
  edgeIds: ['be-12', 'be-55'],
  theorem: 'PhysJS.Dimensional.monomial_form',
  id: 'chain-be-12-be-55',
};

function sourceText(): string {
  return readFileSync(sourcePath, 'utf8');
}

function codeWithoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function theoremChain(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('-- theorem: '))
    .map((line) => line.slice('-- theorem: '.length));
}

function coversOf(text: string): string {
  const line = text.split('\n').find((row) => row.startsWith('-- covers: '));
  expect(line, 'covers line').toBeDefined();
  return (line as string).slice('-- covers: '.length);
}

function draftEntry(text: string): DraftEntry {
  const start = text.indexOf(PROOF_TARGET_DRAFT_BEGIN);
  const end = text.indexOf(PROOF_TARGET_DRAFT_END);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return JSON.parse(
    text.slice(start + PROOF_TARGET_DRAFT_BEGIN.length, end).trim(),
  ) as DraftEntry;
}

function problemsFor(entry: DraftEntry): string[] {
  return physjsManifestProblems({
    manifest: { ...manifest, entries: [entry] },
    bridges: carriers,
  });
}

function leanProofProblem(problems: readonly string[]): boolean {
  return problems.some(
    (problem) => problem.includes('leanProof') && problem.includes("expected 'complete'"),
  );
}

function markedCompleteWithAxioms(entry: DraftEntry): boolean {
  return (
    entry.leanProof === 'complete' &&
    entry.axioms.length === THREE_AXIOMS.length &&
    entry.axioms.every((axiom, i) => axiom === THREE_AXIOMS[i])
  );
}

describe('emitProofTarget', () => {
  it('reads seed theorems from the manifest copy and prints them in chain order', () => {
    expect(thermal).toBe('PhysJS.ThermalDeBroglie.wavelength_eq');
    expect(hall).toBe('PhysJS.QuantumHall.reciprocal');
    const theorems = [thermal as string, hall as string];
    const alphabetical = [...theorems].sort();
    expect(alphabetical).not.toEqual(theorems);

    const catalog = BRIDGE_EQUATIONS;
    const catalogIds = BRIDGE_EQUATIONS.map((entry) => entry.id);
    const text = emitProofTarget(monomial, theorems);

    expect(theoremChain(text)).toEqual(theorems);
    expect(text.indexOf(theorems[0] as string)).toBeLessThan(text.indexOf(theorems[1] as string));
    expect(BRIDGE_EQUATIONS).toBe(catalog);
    expect(BRIDGE_EQUATIONS.map((entry) => entry.id)).toEqual(catalogIds);
  });

  it('a dimensional survivor is a derivation-step and imports PhysJS.Dimensional', () => {
    const text = emitProofTarget(monomial, [thermal as string, hall as string]);
    const covers = coversOf(text);
    expect(covers.startsWith('derivation-step:')).toBe(true);
    expect(covers).toContain('PhysJS.Dimensional.monomial_form');
    expect(covers).toContain('unfixed');
    expect(covers).toContain('f(1,…,1)');
    expect(covers).toMatch(/exponent vector/);
    expect(covers).toMatch(/unit change/);
    expect(text).toContain('import PhysJS.Dimensional');
    expect(text).toContain('Fin 7');
    expect(text).toContain('L, M, T, I, Theta, N, J');
    expect(text).toContain('-- PROOF TARGET');
    expect(text).toContain('statement skeleton only');
    expect(text).toContain('proof body absent');
    expect(text).not.toMatch(/\bsorry\b/);
    expect(text).not.toMatch(/:=\s*by\b/);
    expect(text).not.toContain(':=');
    expect(text).not.toContain('leanProof: complete');
    expect(text).not.toContain('"leanProof": "complete"');
  });

  it('names the unfixed hypothesis for each dimensional theorem', () => {
    const shapes: readonly { theorem: string; needle: string }[] = [
      { theorem: 'PhysJS.Dimensional.product_shape', needle: 'f(1,1)' },
      { theorem: 'PhysJS.Dimensional.ratio_shape', needle: 'function of the ratio' },
      { theorem: 'PhysJS.Dimensional.ratio_power_invariant', needle: 'real power p' },
    ];
    for (const shape of shapes) {
      const text = emitProofTarget(
        {
          kind: 'unfixed-shape',
          edgeIds: ['be-12'],
          theorem: shape.theorem,
          id: 'chain-be-12',
        },
        [thermal as string],
      );
      const covers = coversOf(text);
      expect(covers.startsWith('derivation-step:'), shape.theorem).toBe(true);
      expect(covers, shape.theorem).toContain(shape.theorem);
      expect(covers, shape.theorem).toContain('unfixed');
      expect(covers, shape.theorem).toContain(shape.needle);
      expect(text, shape.theorem).toContain('import PhysJS.Dimensional');
    }
  });

  it('the comment block is the draft object', () => {
    const theorems = [thermal as string, hall as string];
    const draft = proofTargetDraft(monomial, theorems);
    const text = emitProofTarget(monomial, theorems);
    expect(draft.leanProof).toBe('absent');
    expect(draft.axioms).toEqual([]);
    expect(draftEntry(text)).toEqual(draft);
    expect(coversOf(text)).toBe(draft.covers);
    expect(text).toContain(`-- target id: ${draft.key}`);
    expect(text).toContain(`-- statement: ${draft.theorem} : Prop`);
    const start = text.indexOf(PROOF_TARGET_DRAFT_BEGIN);
    const end = text.indexOf(PROOF_TARGET_DRAFT_END);
    expect(text.slice(start + PROOF_TARGET_DRAFT_BEGIN.length, end).trim()).toBe(
      JSON.stringify(draft, null, 2),
    );
    const mutated = { ...draft, leanProof: 'complete' as const, axioms: [...THREE_AXIOMS] };
    expect(leanProofProblem(problemsFor(mutated))).toBe(false);
    expect(problemsFor(mutated).length).toBeGreaterThan(0);
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    const atlasPublic = readFileSync(resolve(root, 'src/atlas/public.ts'), 'utf8');
    expect(index).not.toContain('proofTargetDraft');
    expect(atlasPublic).not.toContain('proofTargetDraft');
  });

  it('the manifest checker reports a leanProof problem on the stub', () => {
    const text = emitProofTarget(monomial, [thermal as string, hall as string]);
    const entry = draftEntry(text);
    expect(entry.key).toBe('chain-be-12-be-55');
    expect(entry.bridgeId).toBe(entry.key);
    expect(entry.leanProof).toBe('absent');
    expect(entry.axioms).toEqual([]);
    expect(entry.coverage).not.toBe('covers its statement only');
    const problems = problemsFor(entry);
    expect(problems.length).toBeGreaterThan(0);
    expect(leanProofProblem(problems)).toBe(true);
    expect(markedCompleteWithAxioms(entry)).toBe(false);
  });

  it('CONTROL: leanProof complete and the three axioms clear the leanProof problem', () => {
    const text = emitProofTarget(monomial, [thermal as string, hall as string]);
    const entry = draftEntry(text);
    expect(leanProofProblem(problemsFor(entry))).toBe(true);
    const forged: DraftEntry = {
      ...entry,
      leanProof: 'complete',
      axioms: [...THREE_AXIOMS],
    };
    expect(markedCompleteWithAxioms(forged)).toBe(true);
    expect(leanProofProblem(problemsFor(forged))).toBe(false);
    expect(problemsFor(forged).length).toBeGreaterThan(0);
  });

  it('a confirmation reports the catalog id and does not import PhysJS.Dimensional', () => {
    const text = emitProofTarget(
      { kind: 'confirmation', edgeIds: ['be-55', 'be-12'], catalogId: 12 },
      [hall as string, thermal as string],
    );
    expect(coversOf(text).startsWith('confirmation:')).toBe(true);
    expect(coversOf(text)).toContain('12');
    expect(coversOf(text).startsWith('derivation-step:')).toBe(false);
    expect(text).not.toContain('import PhysJS.Dimensional');
    expect(theoremChain(text)).toEqual([hall, thermal]);
    expect(draftEntry(text).leanProof).toBe('absent');
    expect(leanProofProblem(problemsFor(draftEntry(text)))).toBe(true);
  });

  it('refuses a theorem name that is not the manifest copy', () => {
    expect(() =>
      emitProofTarget(monomial, ['PhysJS.NotOn.the_copy', hall as string]),
    ).toThrow(/manifest copy records 'PhysJS\.ThermalDeBroglie\.wavelength_eq'/);
  });

  it('does not call the formal-reference builder and does not write a catalog or a manifest', () => {
    const body = codeWithoutComments(sourceText());
    expect(scanFileImports(sourceText()).sort()).toEqual(
      ['../composition/chain-candidate.js', './physjs-ref.js'].sort(),
    );
    for (const word of [
      'physjsFormalRef(',
      'deriveEvidence(',
      'writeFile',
      'BRIDGE_EQUATIONS',
      'PHYSJS_ENTRIES',
      'catalog-formal-ref',
      'manifest.json',
      'sorry',
      "leanProof: 'complete'",
      '"leanProof": "complete"',
    ]) {
      expect(body.includes(word), word).toBe(false);
    }
  });
});
