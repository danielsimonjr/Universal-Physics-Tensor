/**
 * A path in this repository, as a GitHub blob URL on `master`.
 *
 * The published package is `dist`, `bin`, `README.md`, and `LICENSE`.
 * Command text that tells the reader where a record lives uses this URL.
 * A command that reads a checkout still opens the relative path.
 *
 * @internal
 */

const BLOB = 'https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/';

/** The GitHub blob URL of a repository-relative path. */
export function publishedUrl(repoPath: string): string {
  const path = repoPath.replace(/^\.\//, '').replace(/^\/+/, '');
  if (path.length === 0) throw new Error('publishedUrl: a repository path is required');
  return `${BLOB}${path}`;
}
