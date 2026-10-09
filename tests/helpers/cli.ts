/**
 * The in-process capture every CLI test shares. Pure: no `dist/` import, so a test that drives
 * `runCli` from `src/` can use it too.
 *
 * Thirty-nine files once defined their own `capture`/`text` over `runCli`, in several shapes
 * that differed in whether stderr was merged into stdout. Two remain: `capture` keeps the
 * streams apart (`lines` is stdout, `err` is stderr); `captureMerged` folds both into `lines`,
 * in emission order, for a test that asserts on either without caring which. The one-call forms
 * (`run`, `runText`, `json`, `spawnCli`) are in `tests/helpers/cli-run.ts`, which reads the build.
 *
 * @module tests/helpers/cli
 */

/** The `Io` shape `runCli` takes. */
export interface CliIo {
  readonly out: (line?: string) => void;
  readonly err: (line?: string) => void;
  readonly write: (chunk: string) => void;
}

/** Two streams: `lines` is stdout (`out` lines and `write` chunks), `err` is stderr. */
export function capture(): { lines: string[]; err: string[]; io: CliIo } {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

/** One stream: stdout and stderr both land in `lines`, in emission order. */
export function captureMerged(): { lines: string[]; io: CliIo } {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

/** The captured stdout (for `captureMerged`, both streams). */
export const text = (c: { lines: string[] }): string => c.lines.join('');

/** The captured stdout followed by the captured stderr. */
export const allText = (c: { lines: string[]; err: string[] }): string => c.lines.join('') + c.err.join('');
