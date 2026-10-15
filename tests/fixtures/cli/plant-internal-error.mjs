/**
 * A node `--import` preload for `tests/cli/internal-error-exit.test.ts`: it re-registers the
 * `audit` command with a `run` that throws a TypeError, so `node --import <this> bin/upt.mjs
 * audit` takes the route a real defect takes (neither catch in `runCli` converts it, and the
 * shim's last-resort handler reports it). Production code reads no test hook: the plant lives
 * here, in the test's process only. ES modules are singletons per URL, so the registry this
 * file writes is the one `dist/cli/main.js` reads when the shim imports it.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const dist = join(dirname(fileURLToPath(import.meta.url)), '../../../dist/cli');
const { registerCommand, resolveCommand } = await import(pathToFileURL(join(dist, 'command.js')).href);
await import(pathToFileURL(join(dist, 'commands/index.js')).href);

const audit = resolveCommand('audit');
if (audit === undefined) throw new Error('plant-internal-error: no audit command is registered');
registerCommand({
  ...audit,
  run: async () => {
    throw new TypeError('planted internal error for upt audit (tests/fixtures/cli/plant-internal-error.mjs)');
  },
});
