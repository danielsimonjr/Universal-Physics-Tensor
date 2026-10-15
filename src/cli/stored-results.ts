/**
 * Where the committed witness-results artifact is: the one owner of the path that
 * `upt map --stored` / `upt atlas --stored` read and an experiment record hashes as an input.
 *
 * A support module: both `commands/_atlas-map.ts` and `record.ts` import it, so no support
 * module reaches into `commands/` (the survey of 2026-10-15 found `record.ts` doing that).
 *
 * @module cli/stored-results
 * @internal
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The artifact `--stored` reads, relative to the repository root; not shipped in the package. */
export const STORED_RESULTS_PATH = 'data/atlas/witness-results.json';

/** The repository root, when this module runs from a checkout (`src/cli/` or `dist/cli/`). */
export function repoRoot(): string {
  return fileURLToPath(new URL('../../', import.meta.url));
}

/** The absolute path `--stored` reads, which an experiment record hashes as an input. */
export function storedResultsFile(): string {
  return join(repoRoot(), STORED_RESULTS_PATH);
}
