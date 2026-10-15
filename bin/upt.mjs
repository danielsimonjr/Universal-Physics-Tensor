#!/usr/bin/env node
/**
 * upt — thin launcher. All logic lives in src/cli/ (compiled to dist/cli/).
 * This shim only resolves dist/, guards the not-built case, and maps the
 * returned code onto process.exitCode (NOT process.exit — a hard exit can
 * truncate piped stdout). The one exception is a reader that closed the pipe
 * (`upt map | head -1`): nothing more can be delivered, so the run ends quietly.
 *
 * A defect (an error that is neither UsageError nor CliError, which `runCli`
 * rethrows) goes to `reportInternalError` (dist/cli/main.js): `upt: internal
 * error: <message>` with exit 70 (EX_SOFTWARE), not Node's stack and an
 * unhandled rejection.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const entry = pathToFileURL(join(here, '..', 'dist', 'cli', 'main.js')).href;

process.stdout.on('error', (err) => {
  if (err && err.code === 'EPIPE') process.exit(0);
  throw err;
});

let main;
try {
  main = await import(entry);
} catch (err) {
  console.error('Could not load the built package. Run `npm run build` first.');
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}
try {
  process.exitCode = await main.runCli(process.argv.slice(2));
} catch (err) {
  // Last resort: a defect, since every usage error and value refusal was mapped to an exit
  // code inside runCli. reportInternalError prints the message, not the stack, and returns
  // EX_SOFTWARE (70); it is unit-tested in tests/cli/internal-error-exit.test.ts.
  process.exitCode = main.reportInternalError(err);
}
