/**
 * Load the MathTS peer without its console chatter reaching stderr.
 *
 * MathTS writes with `console.warn`/`console.error` directly (its `warnOnce`,
 * the factorisation fallbacks, the WASM-integrity notice) and offers no option
 * to route or silence them: `ImportOptions.silent` is for importing user
 * functions, not for logging. The only way to keep that text out of a CLI's
 * stderr is to replace the three process-global sinks for the duration of the
 * call, which is what the two helpers here do, and nothing else in `src/` may
 * do.
 *
 * THE INVARIANT: the replacement is process-global, so a concurrent caller in
 * the same process (a worker pool thread, a vitest worker sharing a process)
 * loses its console for the window. The window is therefore confined to the
 * peer's ONE-TIME load and first-use smoke in `expr-simplify.ts` and
 * `mathts-scalar-symbols.ts`: both cache the loaded module, so the sinks are
 * replaced once per process, and never around a per-call parse or simplify.
 * Both helpers restore the sinks in `finally`, so a throw inside the window
 * cannot leave them replaced. `tests/composition/mathts-quiet.test.ts` scans
 * `src/` for any other reassignment and traps the sinks during a call.
 *
 * @module composition/mathts-quiet
 */

type Sinks = {
  readonly warn: typeof console.warn;
  readonly error: typeof console.error;
  readonly write: typeof process.stderr.write;
};

function silence(): Sinks {
  const saved: Sinks = { warn: console.warn, error: console.error, write: process.stderr.write };
  console.warn = () => {};
  console.error = () => {};
  (process.stderr as { write: unknown }).write = () => true;
  return saved;
}

function restore(saved: Sinks): void {
  console.warn = saved.warn;
  console.error = saved.error;
  (process.stderr as { write: unknown }).write = saved.write;
}

/** Run `fn` with the console sinks replaced, restoring them in `finally`. @internal */
export function quietlySync<T>(fn: () => T): T {
  const saved = silence();
  try {
    return fn();
  } finally {
    restore(saved);
  }
}

/** The asynchronous form of {@link quietlySync}: the window spans the awaited promise. @internal */
export async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const saved = silence();
  try {
    return await fn();
  } finally {
    restore(saved);
  }
}
