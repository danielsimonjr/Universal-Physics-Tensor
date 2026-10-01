/**
 * Stage 2 shims. A moved value is the same binding through `src/atlas/` and
 * through `src/relations/`. A wrapper that copied the function would pass a
 * behavior test and still be a different binding.
 */

import { describe, expect, it } from 'vitest';
import { checkConventions } from '../../src/atlas/conventions.js';
import { composeRelation, NO_COMPOSITE_CLAIM } from '../../src/atlas/composition-table.js';
import { deriveRegimeGroups } from '../../src/atlas/regime.js';
import { checkConventions as checkConventionsRel } from '../../src/relations/conventions.js';
import { composeRelation as composeRelationRel, NO_COMPOSITE_CLAIM as noClaimRel } from '../../src/relations/composition-table.js';
import { deriveRegimeGroups as deriveRegimeGroupsRel } from '../../src/relations/regime.js';

describe('relations vocabulary — shim identity', () => {
  it('composeRelation, NO_COMPOSITE_CLAIM, checkConventions, and deriveRegimeGroups are the same bindings', () => {
    expect(composeRelation).toBe(composeRelationRel);
    expect(NO_COMPOSITE_CLAIM).toBe(noClaimRel);
    expect(checkConventions).toBe(checkConventionsRel);
    expect(deriveRegimeGroups).toBe(deriveRegimeGroupsRel);
  });
});
