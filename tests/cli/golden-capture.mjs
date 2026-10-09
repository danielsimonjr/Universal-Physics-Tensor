#!/usr/bin/env node
/**
 * Captures the golden corpus defined in `golden-cases.mjs` by running the
 * built CLI (`bin/upt.mjs`) for each case and writing its CRLF-normalized
 * stdout (and, for `pinStderr` cases, stderr too) into `tests/cli/golden/`.
 *
 * Committed so the corpus can be regenerated deliberately (after an
 * intentional CLI output change) with:
 *
 *   node tests/cli/golden-capture.mjs            # every case
 *   node tests/cli/golden-capture.mjs audit eval # only the named cases
 *
 * Requires a built `dist/` (`npm run build`) — the CLI refuses to run
 * against a stale/missing build.
 *
 * @module tests/cli/golden-capture
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GOLDEN_CASES } from './golden-cases.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');
const goldenDir = resolve(here, 'golden');

mkdirSync(goldenDir, { recursive: true });

/** Normalize CRLF -> LF so goldens are stable across Windows/POSIX runs. */
function normalize(text) {
  return text.replace(/\r\n/g, '\n');
}

// pinStderr keeps ONLY the equation-landing-report lines (printEquationReport
// in bin/upt.mjs: blank lines, `  ✓/⚠/·/●` lines, `     connects to:`
// continuations) — environment-dependent optional-peer warnings (WASM-fallback
// noise embedding absolute paths) must not be pinned.
// Landing continuations: former `connects to:`, W3 `nearest equations:` / caveat.
const REPORT_LINE = /^$|^  [✓⚠·●]|^     (?:connects to:|nearest equations:|\(shared-quantity)/u;

function filterReportLines(text) {
  return text.split('\n').filter((line) => REPORT_LINE.test(line)).join('\n');
}

// spawnSync (unlike execFileSync) exposes stderr on the result object even
// when the process exits 0 — execFileSync silently discards stderr on
// success, which would make pinStderr captures empty.
function run(args) {
  const result = spawnSync('node', [cli, ...args], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const only = new Set(process.argv.slice(2));
for (const wanted of only) {
  if (!GOLDEN_CASES.some((c) => c.name === wanted)) {
    console.error(`no golden case named '${wanted}' (see golden-cases.mjs)`);
    process.exitCode = 1;
  }
}
for (const { name, args, pinStderr, exitCode } of GOLDEN_CASES) {
  if (only.size > 0 && !only.has(name)) continue;
  const result = run(args);
  if (result.status !== (exitCode ?? 0)) {
    console.error(`FAILED (exit ${result.status}): ${name} — args=${JSON.stringify(args)}`);
    console.error(result.stderr);
    process.exitCode = 1;
    continue;
  }

  const stdoutPath = join(goldenDir, `${name}.txt`);
  writeFileSync(stdoutPath, normalize(result.stdout));
  console.log(`wrote ${stdoutPath}`);

  if (pinStderr) {
    const stderrPath = join(goldenDir, `${name}.stderr.txt`);
    writeFileSync(stderrPath, filterReportLines(normalize(result.stderr)));
    console.log(`wrote ${stderrPath}`);
  }
}
