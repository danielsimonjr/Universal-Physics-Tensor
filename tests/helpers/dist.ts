/**
 * `dist/` must be newer than `src/` before a test reads it.
 *
 * Seventy test files import `dist/…` or spawn `bin/upt.mjs` (a shim over `dist/cli/main.js`).
 * A scoped run after editing `src/cli` without `bun run build` judged the OLD build and passed;
 * one file skipped silently when `dist/` was absent and another warned and returned. All of
 * those are one outcome now: this module throws at import when `dist/` is missing or older than
 * the newest file under `src/`, naming the remedy. Import it FIRST in any test that reads the
 * build, so the throw precedes the `dist/` import:
 *
 *     import '../helpers/dist.js';
 *
 * `tests/tools/dist-freshness.test.ts` scans for that line in every such file.
 *
 * @module tests/helpers/dist
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The newest modification time (ms) of any file under `dir` whose name matches `pattern`. */
export function newestMtimeMs(dir: string, pattern: RegExp): number | null {
  if (!existsSync(dir)) return null;
  let newest: number | null = null;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const p = join(current, entry);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (pattern.test(entry) && (newest === null || st.mtimeMs > newest)) newest = st.mtimeMs;
    }
  }
  return newest;
}

/**
 * The reason `dist/` cannot be trusted, or null when it can. Pure, so the rule is testable:
 * `newestDist` null means no build; a source newer than every emitted file means a stale build.
 */
export function distStaleness(newestDist: number | null, newestSrc: number | null): string | null {
  if (newestDist === null) {
    return 'dist/ is not built. Run `bun run build` before a test that reads the build.';
  }
  if (newestSrc !== null && newestSrc > newestDist) {
    const lag = ((newestSrc - newestDist) / 1000).toFixed(1);
    return `dist/ is older than src/ by ${lag} s. Run \`bun run build\`; a test that reads a stale build judges the previous source.`;
  }
  return null;
}

/** Throws when `dist/` is absent or older than `src/`. Runs once at import. */
export function assertDistFresh(): void {
  const reason = distStaleness(
    newestMtimeMs(resolve(root, 'dist'), /\.js$/),
    newestMtimeMs(resolve(root, 'src'), /\.ts$/),
  );
  if (reason !== null) throw new Error(`tests/helpers/dist.ts: ${reason}`);
}

assertDistFresh();
