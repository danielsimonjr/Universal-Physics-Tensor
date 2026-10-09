/**
 * The one statement of the Node version the TEST SUITE needs.
 *
 * `package.json` `engines.node` is the floor of the shipped library (18). The suite spawns
 * `node --experimental-strip-types` (22.6) and reads `import.meta.dirname` (20.11), so its floor
 * is higher. `tests/node-floor.test.ts` checks it first, with a message that names this file;
 * CONTRIBUTING.md states the same number.
 *
 * @module tests/helpers/node-floor
 */

/** Lowest Node version the suite runs on, as `major.minor.patch`. */
export const SUITE_NODE_FLOOR = '22.6.0';

function parts(version: string): [number, number, number] {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) throw new Error(`not a Node version: ${version}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** True when `version` (for example `process.versions.node`) is at or above the floor. */
export function nodeMeetsFloor(version: string, floor: string = SUITE_NODE_FLOOR): boolean {
  const [a, b, c] = parts(version);
  const [x, y, z] = parts(floor);
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c >= z;
}
