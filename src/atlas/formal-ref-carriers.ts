/**
 * The one list of records that can carry a formal reference.
 *
 * The Lean manifest check, the generated-table check, the proof-target check
 * and the axiom gate each need this list. Each read it from a local copy
 * before; this module is the one copy. A canonical equation is a carrier when
 * its id is a manifest key. The module reads the generated table and the
 * canonical registry only: it holds no key list and no canonical id.
 *
 * @module atlas/formal-ref-carriers
 */

import { BRIDGE_EQUATIONS } from '../bridges/index.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import type { FormalRef } from '../relations/types.js';
import { catalogFormalRef } from './catalog-formal-ref.js';
import { ATLAS_FAMILIES } from './families.js';
import { physjsFormalRef, physjsTheorem } from './physjs-ref.js';

/**
 * Every atlas bridge, every catalog row (`be-<n>`), and every canonical
 * equation whose id is a manifest key. A canonical equation with no manifest
 * entry has no carrier. No carrier lights an evidence tag.
 *
 * @internal
 */
export function formalRefCarriers(): readonly { readonly id: string; readonly formalRef?: FormalRef }[] {
  return [
    ...ATLAS_FAMILIES.flatMap((family) => family.bridges),
    ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: catalogFormalRef(entry.id) })),
    ...CANONICAL_EQUATIONS.filter((entry) => physjsTheorem(entry.id) !== undefined).map((entry) => ({
      id: entry.id,
      formalRef: physjsFormalRef(entry.id),
    })),
  ];
}
