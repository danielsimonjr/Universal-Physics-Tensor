/**
 * The defaults and limits a command's help states, read from the library constants that hold
 * them. A flag's help once said "default 5000" while the library held 5000 in its own table:
 * two copies of one number, free to part. A command cannot import a library value, so the
 * values it prints come through this module, as `closed-form-range.ts` does for the evaluators.
 *
 * @module cli/library-defaults
 */

import { DEFAULT_MAX_ORDERS_OF_MAGNITUDE } from '../composition/discovery.js';
import { DEFAULT_HOLDOUT_TOL, DEFAULT_SEARCH_BUDGET } from '../composition/probe/types.js';
import { DEFAULT_ALPHA, MAX_CORRECTION_TERMS } from '../composition/probe/study.js';

/** `upt discover --max-orders`, as the help prints it. @internal */
export const DISCOVER_MAX_ORDERS_DEFAULT = String(DEFAULT_MAX_ORDERS_OF_MAGNITUDE);

/** `upt probe --budget-ms`, as the help prints it. @internal */
export const PROBE_BUDGET_MS_DEFAULT = String(DEFAULT_SEARCH_BUDGET.maxWallClockMs);

/** `upt probe --holdout-tol`, as the help prints it. @internal */
export const PROBE_HOLDOUT_TOL_DEFAULT = String(DEFAULT_HOLDOUT_TOL);

/** `upt probe study --alpha` when the file states none, as the help prints it. @internal */
export const PROBE_STUDY_ALPHA_DEFAULT = String(DEFAULT_ALPHA);

/** The most powers a study file's `correction` may list in all. @internal */
export const PROBE_CORRECTION_TERMS_MAX = MAX_CORRECTION_TERMS;
