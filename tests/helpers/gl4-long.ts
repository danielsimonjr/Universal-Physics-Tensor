/**
 * The scope of a long GL4 run, derived from ONE switch.
 *
 * `GL4_LONG=1` (set by the nightly `long-tests` job in `.github/workflows/ci.yml`) selects a
 * test's `long` scope; otherwise its `short` scope runs. `GL4_LONG_ORBITS` and `GL4_LONG_STEPS`
 * override either, for a hand run. A test states both scopes in its own source, so a reader sees
 * the per-commit cost and the nightly cost side by side, and nothing has to be exported into the
 * environment for the nightly to run the full scope.
 *
 * @module tests/helpers/gl4-long
 */

/** Orbit and step counts of one run. */
export interface Gl4Scope {
  readonly orbits: number;
  readonly steps: number;
}

/** The two scopes a test declares. */
export interface Gl4Scopes {
  readonly short: Gl4Scope;
  readonly long: Gl4Scope;
}

function positiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, not '${raw}'`);
  }
  return n;
}

/** True when the environment asks for the long scope. */
export function isGl4Long(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.GL4_LONG === '1';
}

/** The scope to run under `env`: `long` when `GL4_LONG=1`, else `short`; the two overrides win. */
export function gl4LongScope(
  scopes: Gl4Scopes,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Gl4Scope {
  const base = isGl4Long(env) ? scopes.long : scopes.short;
  return {
    orbits: positiveInt('GL4_LONG_ORBITS', env.GL4_LONG_ORBITS, base.orbits),
    steps: positiveInt('GL4_LONG_STEPS', env.GL4_LONG_STEPS, base.steps),
  };
}
