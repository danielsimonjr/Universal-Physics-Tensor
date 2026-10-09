/**
 * Peer detection + fail-loud gate for the test suite.
 *
 * Three peers gate tests with `it.skipIf(...)` / `describe.skipIf(...)`:
 * the MathTS autograd peer (the AST-AD arc), the MathTS simplifier (every
 * CAS witness and its negative control), and `@viz-js/viz` (SVG rendering).
 * A skip is reported by vitest as skipped, never as passed; a `return` inside
 * an `it()` would be reported as passed, and `tests/peers-required.test.ts`
 * scans for that form.
 *
 * `requirePeers` reads `UPT_REQUIRE_PEERS` (set in CI). When truthy, the
 * guard test in `tests/peers-required.test.ts` fails loudly if any peer is
 * absent, turning "silently skipped" into "explicitly broken".
 *
 * @module tests/helpers/peers
 */
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { isSimplifierAvailable } from '../../src/composition/expr-simplify.js';

/** True iff the MathTS autograd peer is installed and AD-capable. */
export const peerPresent: boolean = (() => {
  try {
    return hasAutogradSupport(new MathTSEngine());
  } catch {
    return false;
  }
})();

/** True iff the MathTS simplifier (the CAS the symbolic witnesses run on) answers. */
export const simplifierPresent: boolean = await isSimplifierAvailable();

/** True iff the optional `@viz-js/viz` renderer can be imported. */
export const vizPresent: boolean = await (async () => {
  try {
    await import('@viz-js/viz');
    return true;
  } catch {
    return false;
  }
})();

/** True iff the run demands peers be present (CI sets `UPT_REQUIRE_PEERS=1`). */
export const requirePeers: boolean = /^(1|true|yes)$/i.test(
  process.env.UPT_REQUIRE_PEERS ?? '',
);
