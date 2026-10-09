/**
 * The test suite's Node floor, stated once and checked early.
 *
 * `engines.node` in package.json is the floor of the SHIPPED library (18). The suite needs more:
 * `tests/examples/basic-usage.test.ts`, `tests/tools/readme-examples.test.ts` and
 * `tests/dimensional/readme-snippets.test.ts` spawn `node --experimental-strip-types` (Node 22.6),
 * and seven files read `import.meta.dirname` (Node 20.11). Below the floor those files fail with
 * a message about an unknown flag or an undefined path, far from the cause. This file fails first,
 * by name. CONTRIBUTING.md states the same floor; `tests/tools/package-metadata.test.ts` keeps
 * `engines.node` honest for `src/`.
 */
import { describe, expect, it } from 'vitest';
import { SUITE_NODE_FLOOR, nodeMeetsFloor } from './helpers/node-floor.js';

describe('node floor for the test suite', () => {
  it(`runs on Node >= ${SUITE_NODE_FLOOR}`, () => {
    expect(
      nodeMeetsFloor(process.versions.node),
      `The test suite needs Node ${SUITE_NODE_FLOOR} or newer (--experimental-strip-types); this is Node ${process.versions.node}. The published library still runs on Node 18 (package.json engines).`,
    ).toBe(true);
  });

  it('control: the comparison is numeric, not lexical', () => {
    expect(nodeMeetsFloor('22.6.0')).toBe(true);
    expect(nodeMeetsFloor('22.5.9')).toBe(false);
    expect(nodeMeetsFloor('9.9.9')).toBe(false);
    expect(nodeMeetsFloor('100.0.0')).toBe(true);
    expect(nodeMeetsFloor('22.10.0')).toBe(true);
  });
});
