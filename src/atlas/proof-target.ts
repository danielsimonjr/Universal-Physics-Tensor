/**
 * Lean statement skeleton for one chain candidate.
 *
 * The text names the theorem chain in the order the caller recorded,
 * checked against the compiled manifest copy. It is a target. The proof
 * body is absent. Nothing here is written into the catalog, the
 * formal-reference overlay, or the vendored manifest.
 *
 * A draft is a new target, so its `kind` is `derivation-step`, one of
 * `FORMAL_REF_KINDS`, stated as its own field and its own `-- kind:` line.
 * The covers line names the hypothesis the dimensional theorem leaves open
 * and does not begin with a kind word. A confirmation of a catalog id and a
 * restatement of a bridge are not new targets: no draft is made for them.
 * The import `PhysJS.Dimensional` is present when that filter named one of
 * its theorems. `Dim` is fixed at `n = 7` in the base order
 * `src/dimensional/types.ts` declares.
 *
 * @module atlas/proof-target
 */

import type { ChainCandidate } from '../composition/chain-candidate.js';
import type { FormalRefKind } from '../relations/types.js';
import { physjsTheorem } from './physjs-ref.js';

/** Marker before the draft object the manifest checker can read. @internal */
export const PROOF_TARGET_DRAFT_BEGIN = 'PROOF-TARGET-DRAFT-BEGIN';

/** Marker after the draft object. @internal */
export const PROOF_TARGET_DRAFT_END = 'PROOF-TARGET-DRAFT-END';

const MONOMIAL = 'PhysJS.Dimensional.monomial_form';
const RATIO = 'PhysJS.Dimensional.ratio_shape';
const PRODUCT = 'PhysJS.Dimensional.product_shape';
const POWER = 'PhysJS.Dimensional.ratio_power_invariant';

const DIMENSIONAL = new Set<string>([MONOMIAL, RATIO, PRODUCT, POWER]);

/**
 * The dimensional theorem this candidate names, when the filter named one.
 * A unique monomial is `monomial_form` even when the field was left blank.
 */
function dimensionalTheorem(candidate: ChainCandidate): string | undefined {
  if (candidate.theorem !== undefined && DIMENSIONAL.has(candidate.theorem)) {
    return candidate.theorem;
  }
  if (candidate.kind === 'unique-monomial') return MONOMIAL;
  return undefined;
}

/**
 * The kind of the target `candidate` would be. A unique monomial and an
 * unfixed shape are a step a derivation still has to close. A confirmation
 * names an id the catalog has and a restatement names a bridge it has, so
 * neither is a new target and both are refused.
 */
function draftKind(candidate: ChainCandidate): FormalRefKind {
  if (candidate.kind === 'confirmation' || candidate.kind === 'restatement') {
    throw new Error(`proof target: a ${candidate.kind} is not a new target; no draft is made for chain ${candidate.edgeIds.join(', ')}`);
  }
  return 'derivation-step';
}

/** Covers line: the hypothesis left open. It does not begin with a kind word; the kind is its own field. */
function coversLine(candidate: ChainCandidate): string {
  const theorem = dimensionalTheorem(candidate);
  if (theorem === MONOMIAL) {
    return (
      'PhysJS.Dimensional.monomial_form. The constant is unfixed. ' +
      'f(1,…,1) is unfixed. The exponent vector is a hypothesis. ' +
      'A unit change that can reach every positive tuple is a hypothesis.'
    );
  }
  if (theorem === PRODUCT) return 'PhysJS.Dimensional.product_shape. The constant is unfixed. f(1,1) is unfixed.';
  if (theorem === RATIO) return 'PhysJS.Dimensional.ratio_shape. The function of the ratio is unfixed.';
  if (theorem === POWER) return 'PhysJS.Dimensional.ratio_power_invariant. The real power p is unfixed.';
  return 'The constant is unfixed.';
}

function targetKey(candidate: ChainCandidate): string {
  if (candidate.id !== undefined && candidate.id.length > 0) return candidate.id;
  return `chain-${candidate.edgeIds.join('-')}`;
}

function leanIdent(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+/, '');
  const body = cleaned.length > 0 ? cleaned : 'target';
  return `PhysJS.ProofTarget.${body}`;
}

function assertTheorems(candidate: ChainCandidate, seedTheorems: readonly string[]): void {
  if (seedTheorems.length !== candidate.edgeIds.length) {
    throw new Error(
      `proof target: ${candidate.edgeIds.length} seed steps and ${seedTheorems.length} theorem names`,
    );
  }
  for (let i = 0; i < candidate.edgeIds.length; i++) {
    const id = candidate.edgeIds[i] as string;
    const given = seedTheorems[i] as string;
    const recorded = physjsTheorem(id);
    if (recorded !== undefined && recorded !== given) {
      throw new Error(
        `proof target: manifest copy records '${recorded}' for '${id}', not '${given}'`,
      );
    }
  }
}

/**
 * The draft the comment block renders.
 *
 * The fields are the ones the comment's JSON already carries. `kind` is a
 * {@link FormalRefKind}, `derivation-step` for every draft, and `covers`
 * does not repeat it. `leanProof` stays `absent`. This value is not a
 * manifest entry.
 *
 * @internal
 */
export interface ProofTargetDraft {
  readonly key: string;
  readonly bridgeId: string;
  readonly theorem: string;
  readonly kind: FormalRefKind;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: 'absent';
  readonly axioms: readonly string[];
}

/**
 * The draft `emitProofTarget` renders into the comment block.
 *
 * `seedTheorems` is one PhysJS theorem name per seed step, in chain order.
 * A name that disagrees with the compiled manifest copy is refused, and so
 * is a confirmation or a restatement candidate, which is not a new target.
 * The object is not written anywhere.
 *
 * @internal
 */
export function proofTargetDraft(
  candidate: ChainCandidate,
  seedTheorems: readonly string[],
): ProofTargetDraft {
  const kind = draftKind(candidate);
  assertTheorems(candidate, seedTheorems);
  const key = targetKey(candidate);
  return {
    key,
    bridgeId: key,
    theorem: leanIdent(key),
    kind,
    covers: coversLine(candidate),
    coverage: 'statement skeleton only',
    leanProof: 'absent',
    axioms: [],
  };
}

/**
 * Lean 4 statement skeleton and the theorem chain it would compose.
 *
 * The comment lines and the JSON between the markers are
 * {@link proofTargetDraft}. The returned text is not written anywhere.
 *
 * @internal
 */
export function emitProofTarget(
  candidate: ChainCandidate,
  seedTheorems: readonly string[],
): string {
  const draft = proofTargetDraft(candidate, seedTheorems);
  const theorem = dimensionalTheorem(candidate);
  const lines: string[] = [
    '-- PROOF TARGET',
    '-- statement skeleton only',
    '-- proof body absent',
    '-- not a catalog entry',
    '-- not a formalRef',
    '',
  ];
  if (theorem !== undefined) {
    lines.push('import PhysJS.Dimensional', '');
  }
  lines.push('-- theorem chain');
  for (const name of seedTheorems) {
    lines.push(`-- theorem: ${name}`);
  }
  lines.push('', `-- kind: ${draft.kind}`, `-- covers: ${draft.covers}`, '');
  if (theorem !== undefined) {
    lines.push(
      '-- Dim : Fin 7 → ℚ',
      '-- base order: L, M, T, I, Theta, N, J',
      '',
    );
  }
  lines.push(`-- target id: ${draft.key}`, `-- statement: ${draft.theorem} : Prop`, '');
  lines.push(PROOF_TARGET_DRAFT_BEGIN, JSON.stringify(draft, null, 2), PROOF_TARGET_DRAFT_END, '');
  return lines.join('\n');
}
