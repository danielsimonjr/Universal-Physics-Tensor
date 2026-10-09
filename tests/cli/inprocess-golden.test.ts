/**
 * The CLI golden corpus (spec §5.1), run in-process.
 *
 * Every case in `golden-cases.mjs` is driven through `runCli` from the built `dist/cli/main.js`
 * and compared with the committed `tests/cli/golden/<name>.txt` (and, for `pinStderr` cases, the
 * `.stderr.txt`). `bin/upt.mjs` is a thin shim over the same module, so spawning it per case
 * proved nothing this file does not; `tests/cli/upt-golden.test.ts` once spawned the whole corpus
 * a second time (190 s of the suite) and is gone. The shim's own contract — exit code mapping and
 * a closed pipe — is pinned by `hardening.test.ts` (one spawned golden case) and
 * `closed-stdout.test.ts` (EPIPE).
 *
 * Regenerate the goldens with `node tests/cli/golden-capture.mjs` after a deliberate, reviewed
 * output change; never hand-edit one to make a case pass.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { run } from '../helpers/cli-run.js';
import { GOLDEN_CASES } from './golden-cases.mjs';
import { peerPresent } from '../helpers/peers.js';

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = resolve(here, 'golden');

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

// Golden files are committed LF-only, but a checkout with core.autocrlf=true converts them to
// CRLF on disk; normalize on read too, so the comparison does not depend on the checkout's state.
function readGolden(name: string): string {
  return normalize(readFileSync(join(goldenDir, `${name}.txt`), 'utf8'));
}

function readStderrGolden(name: string): string {
  return normalize(readFileSync(join(goldenDir, `${name}.stderr.txt`), 'utf8'));
}

// Same filter as golden-capture.mjs: pinStderr compares ONLY the equation-landing-report lines
// (printEquationReport: blank lines, `  ✓/⚠/·/●` lines, `     connects to:` continuations) — the
// CLI's own stderr output. Environment-dependent optional-peer warnings must not be pinned.
// Landing continuations: former `connects to:`, W3 `nearest equations:` / caveat.
const REPORT_LINE = /^$|^  [✓⚠·●]|^     (?:connects to:|nearest equations:|\(shared-quantity)/u;

function filterReportLines(text: string): string {
  return text.split('\n').filter((line) => REPORT_LINE.test(line)).join('\n');
}

const ungated = GOLDEN_CASES.filter((c) => !c.peerGated);
const gated = GOLDEN_CASES.filter((c) => c.peerGated);

async function runCase(name: string, args: string[], pinStderr?: boolean, exitCode = 0): Promise<void> {
  // `run` captures one interleaved stdout stream (`write` chunks and `out` lines in emission
  // order, as a spawned process's stdout would show) and stderr apart. The five `discover`
  // cases come from tests/helpers/discover-cache.js: one funnel run per argv, shared with every
  // other file that asks for the same argv.
  const r = await run(args);

  expect(r.code).toBe(exitCode);
  expect(normalize(r.stdout)).toBe(readGolden(name));
  if (pinStderr) {
    expect(filterReportLines(normalize(r.stderr))).toBe(readStderrGolden(name));
  }
}

describe('CLI golden corpus (in-process)', () => {
  it('runs every case the corpus defines', () => {
    expect(ungated.length + gated.length).toBe(GOLDEN_CASES.length);
    expect(GOLDEN_CASES.length).toBeGreaterThan(0);
  });

  // 180 s per case: discover-derive ranks the whole catalog, and the CI runner is slower than a
  // dev box. The number is a ceiling, not a measurement.
  it.each(ungated)('$name', async ({ name, args, pinStderr, exitCode }) => {
    await runCase(name, args, pinStderr, exitCode);
  }, 180_000);
});

describe.skipIf(!peerPresent)('CLI golden corpus (in-process, peer-gated)', () => {
  it.each(gated)('$name', async ({ name, args, pinStderr, exitCode }) => {
    await runCase(name, args, pinStderr, exitCode);
  }, 180_000);
});
