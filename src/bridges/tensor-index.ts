/**
 * §VI.6.1 tensor-index component for a catalog category.
 *
 * Part II §VI.6.1 files each bridge under one component. The component is
 * the category cluster. It is not the `bridges` tuple, and it is not the
 * formula's tensor rank or `dimensional_signature`. Those three were checked
 * against the lists for ids 11–50: when they disagree with the category, the
 * list follows the category (BE-34, BE-39, BE-48 for the tuple; BE-13 and
 * BE-17 for rank; BE-11 and BE-48 share `[frequency]` and do not share a
 * component).
 *
 * `unassigned` is category N. The specification states that those three
 * equations do not fit the other five patterns. A category letter absent
 * from this map throws: a new letter is not silently `unassigned`.
 *
 * The pattern strings are the alt text of the five displayed indices.
 *
 * @internal
 * @module bridges/tensor-index
 */

/** The five displayed indices, plus the category-N refusal. */
export type TensorIndexComponent =
  | 'quantum-classical'
  | 'information-geometry'
  | 'emergence'
  | 'field-unification'
  | 'scale-transition'
  | 'unassigned';

/**
 * Alt text of the index Part II §VI.6.1 displays for that component.
 * Category N has no index.
 */
export const TENSOR_INDEX_PATTERN: Readonly<
  Record<Exclude<TensorIndexComponent, 'unassigned'>, string>
> = {
  'quantum-classical':
    '\\boldsymbol{\\Pi}^{\\text{quantum},\\text{classical},\\gamma,\\delta,\\epsilon,\\zeta}',
  'information-geometry':
    '\\boldsymbol{\\Pi}^{\\alpha,\\beta,\\text{Poincaré},\\text{info},\\epsilon,\\zeta}',
  // U+2026, the character in the §VI.6.1 alt text, not the LaTeX command \ldots.
  emergence: '\\boldsymbol{\\Pi}^{\\alpha\\beta\\gamma\\delta\\epsilon\\zeta\u2026}',
  'field-unification':
    '\\boldsymbol{\\Pi}^{\\alpha,\\text{force}_i,\\text{symmetry},\\delta,\\epsilon,\\zeta}',
  'scale-transition':
    '\\boldsymbol{\\Pi}^{\\text{scale}_i,\\text{scale}_j,\\gamma,\\delta,\\epsilon,\\zeta}',
};

/**
 * Category letter → component. A and J are one component, and so on, matching
 * the id lists in §VI.6.1 for ids 11–50.
 */
export const TENSOR_INDEX_BY_CATEGORY: Readonly<Record<string, TensorIndexComponent>> = {
  A: 'quantum-classical',
  J: 'quantum-classical',
  B: 'information-geometry',
  I: 'information-geometry',
  M: 'information-geometry',
  C: 'emergence',
  H: 'emergence',
  O: 'emergence',
  D: 'field-unification',
  K: 'field-unification',
  L: 'field-unification',
  E: 'scale-transition',
  F: 'scale-transition',
  G: 'scale-transition',
  N: 'unassigned',
};

/**
 * Component for a catalog category letter.
 *
 * @throws when `category` is not one of A–O. A new letter is not guessed.
 */
export function tensorIndexComponent(category: string): TensorIndexComponent {
  const component = TENSOR_INDEX_BY_CATEGORY[category];
  if (component === undefined) {
    throw new Error(`no §VI.6.1 tensor-index component for category ${category}`);
  }
  return component;
}
