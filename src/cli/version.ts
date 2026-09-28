/**
 * Runtime package-version lookup for the UPT CLI (`upt --version`, etc.).
 *
 * Reads `package.json` relative to this module's own location rather than
 * importing a generated constant, so it stays correct without a build step
 * re-stamping a version string. From `dist/cli/version.js`, `../../package.json`
 * resolves to the package root in both the dev checkout and the installed
 * npm layout (`dist/` ships as part of the published package).
 */

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

export function packageVersion(): string {
  const pkgPath = new URL('../../package.json', import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

/** Installed version of each optional peer the package declares, `null` when absent. Reads the
 * peer's own package.json from the resolution paths, because a peer's `exports` may not expose it. */
export function peerVersions(): Record<string, string | null> {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    peerDependencies?: Record<string, string>;
  };
  const require = createRequire(import.meta.url);
  const peers: Record<string, string | null> = {};
  for (const name of Object.keys(pkg.peerDependencies ?? {}).sort()) {
    peers[name] = null;
    for (const dir of require.resolve.paths(name) ?? []) {
      const manifest = join(dir, name, 'package.json');
      if (existsSync(manifest)) {
        peers[name] = (JSON.parse(readFileSync(manifest, 'utf8')) as { version?: string }).version ?? null;
        break;
      }
    }
  }
  return peers;
}

/** The peer that backs the `mathts` formula parser. */
export const MATHTS_PARSER_PEER = '@danielsimonjr/mathts-functions';

/**
 * The active formula parser with the version that defines it (audit I4): the MathTS peer's
 * version for `mathts`, this package's for `builtin`, whose parser ships in it.
 */
export function formulaParserLabel(kind: 'mathts' | 'builtin'): string {
  return kind === 'mathts'
    ? `mathts (${MATHTS_PARSER_PEER} ${peerVersions()[MATHTS_PARSER_PEER] ?? 'version unknown'})`
    : `builtin (universal-physics-tensor ${packageVersion()})`;
}