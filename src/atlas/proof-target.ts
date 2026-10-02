/**
 * Lean statement skeleton for one chain candidate.
 *
 * The text names the theorem chain in the order the caller recorded,
 * checked against the compiled manifest copy. It is a target. The proof
 * body is absent. Nothing here is written into the catalog, the
 * formal-reference overlay, or the vendored manifest.
 *
 * A units-only survivor carries a covers line that begins with
 * `derivation-step:` and names the hypothesis the dimensional theorem
 * leaves open. The import `PhysJS.Dimensional` is present when that
 * filter named one of its theorems. `Dim` is fixed at `n = 7` in the
 * base order `src/dimensional/types.ts` declares.
 *
 * @module atlas/proof-target
 */

import type { ChainCandidate } from '../composition/chain-candidate.js';
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

/** Covers line. Units-only survivors start with `derivation-step:`. */
function coversLine(candidate: ChainCandidate): string {
  const theorem = dimensionalTheorem(candidate);
  if (theorem === MONOMIAL) {
    return (
      'derivation-step: PhysJS.Dimensional.monomial_form. The constant is unfixed. ' +
      'f(1,…,1) is unfixed. The exponent vector is a hypothesis. ' +
      'A unit change that can reach every positive tuple is a hypothesis.'
    );
  }
  if (theorem === PRODUCT) {
    return (
      'derivation-step: PhysJS.Dimensional.product_shape. The constant is unfixed. f(1,1) is unfixed.'
    );
  }
  if (theorem === RATIO) {
    return (
      'derivation-step: PhysJS.Dimensional.ratio_shape. The function of the ratio is unfixed.'
    );
  }
  if (theorem === POWER) {
    return (
      'derivation-step: PhysJS.Dimensional.ratio_power_invariant. The real power p is unfixed.'
    );
  }
  if (candidate.kind === 'unfixed-shape') {
    return 'derivation-step: the constant is unfixed.';
  }
  if (candidate.kind === 'confirmation') {
    const id = candidate.catalogId === undefined ? '' : ` ${candidate.catalogId}`;
    return `confirmation: catalog id${id}. The run reports the id and writes nothing.`;
  }
  if (candidate.kind === 'restatement') {
    const canon = candidate.canonicalId ?? '';
    const bridge = candidate.restatesBridge ?? '';
    return `restatement: ${canon} restates ${bridge}. Not a new equation.`;
  }
  return 'statement skeleton only';
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
 * Lean 4 statement skeleton and the theorem chain it would compose.
 *
 * `seedTheorems` is one PhysJS theorem name per seed step, in chain order.
 * A name that disagrees with the compiled manifest copy is refused.
 * The returned text is not written anywhere.
 *
 * @internal
 */
export function emitProofTarget(
  candidate: ChainCandidate,
  seedTheorems: readonly string[],
): string {
  assertTheorems(candidate, seedTheorems);
  const key = targetKey(candidate);
  const covers = coversLine(candidate);
  const theorem = dimensionalTheorem(candidate);
  const statement = leanIdent(key);
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
  lines.push('', `-- covers: ${covers}`, '');
  if (theorem !== undefined) {
    lines.push(
      '-- Dim : Fin 7 → ℚ',
      '-- base order: L, M, T, I, Theta, N, J',
      '',
    );
  }
  lines.push(`-- target id: ${key}`, `-- statement: ${statement} : Prop`, '');
  const draft = {
    key,
    bridgeId: key,
    theorem: statement,
    covers,
    coverage: 'statement skeleton only',
    leanProof: 'absent',
    axioms: [] as string[],
  };
  lines.push(PROOF_TARGET_DRAFT_BEGIN, JSON.stringify(draft, null, 2), PROOF_TARGET_DRAFT_END, '');
  return lines.join('\n');
}
