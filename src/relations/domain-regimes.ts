/**
 * Domains whose inequality list is empty.
 *
 * Plasma, piezoelectricity, and Tolman are names a caller can survey. No
 * bound is written down here: a plasma-β, a piezoelectric inequality, and a
 * Tolman gradient are not catalog statements. The command reports the empty
 * list as vacuous. Input guards on an evaluator are not this registration.
 *
 * @module relations/domain-regimes
 */

import { registerRegimeDomain } from './regime-registration.js';
import type { Regime } from './types.js';

function vacuous(name: string): Regime {
  return { family: name, inequalities: [], groupDefinitions: {} };
}

for (const name of ['plasma', 'piezoelectricity', 'tolman'] as const) {
  registerRegimeDomain({
    name,
    records: [{ id: name, kind: 'domain', regime: vacuous(name) }],
  });
}
