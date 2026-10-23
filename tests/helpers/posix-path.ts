/**
 * Repository-relative paths with forward slashes, on every platform.
 *
 * A test that walks `src/` and compares each path with a literal (`'bridges/catalog-load.ts'`,
 * `startsWith('canonical/entries/')`, `endsWith('src/relations/category.ts')`) must compare the
 * same spelling on every host. `path.relative`, `path.join` and `path.resolve` use the host's
 * separator, so on Windows they return `bridges\catalog-load.ts` and every such comparison is
 * false. Produce the path through these two functions and the literal stays a forward-slash
 * literal. On a host whose separator is already `/` both are the identity.
 *
 * @module tests/helpers/posix-path
 */
import { relative, sep } from 'node:path';

/** `path` with each host path separator replaced by `/`. The identity where the separator is `/`. */
export function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/');
}

/** `path.relative(from, to)` spelled with `/`. */
export function relativePosix(from: string, to: string): string {
  return toPosix(relative(from, to));
}
