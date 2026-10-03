/**
 * Verb-first dispatcher for the UPT CLI — `upt <command> [args...]`.
 *
 * Owns: top-level `help`/`version` handling, the no-args demo, unknown-verb
 * exit-2 contract, and per-command dispatch (parse -> run -> map thrown
 * UsageError/CliError to the documented exit codes). Individual commands are
 * plain data (see `command.ts`) registered via `registerCommand`; this file
 * never special-cases a command by name, so later tasks add commands without
 * touching `runCli`'s body.
 *
 * `main.ts` is the one place that imports the real `cli-api.js` barrel and
 * wires `out`/`err`/`write` to real stdio — every `Command.run` receives
 * those as an injected `CommandCtx`, never reaching for `process.*` itself,
 * which is what makes commands testable in-process against `dist/cli/*.js`.
 */

import * as api from '../cli-api.js';
import { UsageError, CliError } from './errors.js';
import { parseArgs } from './args.js';
import { packageVersion } from './version.js';
import { glossaryText } from './statuses.js';
import { listCommandNames, resolveCommand, type Command, type CommandCtx } from './command.js';
import { GLOBAL_FLAGS } from './flag-help.js';
import { renderTopLevelHelp } from './top-level-help.js';
import { recordInvocation, replayRecord, showRecord, type Io } from './record.js';
// Side-effect import: registers every ported command (see commands/index.ts).
import './commands/index.js';

// `Io` is the writer surface `runCli` needs. In production these wrap
// `process.stdout`/`process.stderr` with exact `console.log`/`console.error`
// semantics; tests pass a capturing stand-in as the optional second argument.

function stdoutLine(line?: string): void {
  process.stdout.write((line ?? '') + '\n');
}

function stderrLine(line?: string): void {
  process.stderr.write((line ?? '') + '\n');
}

function stdoutRaw(s: string): void {
  process.stdout.write(s);
}

const defaultIo: Io = { out: stdoutLine, err: stderrLine, write: stdoutRaw };

const unknownCommandMessage = (name: string): string => `Unknown command '${name}'. See \`upt help\`.`;

const GLOBAL_FILE_OPTION = /^--(record|replay|show-record)(?:=(.*))?$/;

/**
 * Verb-first CLI entry point. `argv` is the command + its arguments (NOT
 * `process.argv` — callers slice off the node/script prefix themselves, as
 * `bin/upt.mjs` did with `process.argv.slice(2)`).
 *
 * Leading `--record=FILE` / `--replay=FILE` / `--show-record=FILE` / `--json`
 * are global options. `--json` is moved onto the command so the command's
 * own flag spec parses it. `upt <command> --help` prints that command.
 */
const NO_JSON_VERBS = new Set(['help', '--help', '-h', 'version', '--version', '-v']);

export async function runCli(argv: string[], io: Io = defaultIo): Promise<number> {
  const files: Partial<Record<'record' | 'replay' | 'show-record', string>> = {};
  let json = false;
  let i = 0;
  try {
    for (; i < argv.length; i++) {
      const m = GLOBAL_FILE_OPTION.exec(argv[i]);
      if (m) {
        const name = m[1] as keyof typeof files;
        if (!m[2]) throw new UsageError(`upt: '--${name}' requires '--${name}=FILE'`);
        if (files[name] !== undefined) throw new UsageError(`upt: '--${name}' given more than once`);
        files[name] = m[2];
      } else if (argv[i] === '--json') {
        if (json) throw new UsageError(`upt: '--json' given more than once`);
        json = true;
      } else {
        break;
      }
    }
    let rest = argv.slice(i);
    if (json && (files.replay !== undefined || files['show-record'] !== undefined)) {
      // `--replay` / `--show-record` consume --json themselves and take no command.
    } else if (json) {
      if (rest.length === 0) throw new UsageError(`upt: '--json' requires a command`);
      const verb = rest[0]!;
      if (NO_JSON_VERBS.has(verb)) throw new UsageError(`upt: '${verb}' does not take --json`);
      rest = [verb, '--json', ...rest.slice(1)];
    }
    if (i === 0 && !json) return await dispatch(argv, io);
    if (Object.keys(files).length > 1) {
      throw new UsageError('upt: use one of --record, --replay and --show-record at a time');
    }
    if (files.record !== undefined) return await recordInvocation(files.record, rest, dispatch, io, api);
    if (files.replay !== undefined || files['show-record'] !== undefined) {
      if (rest.length > 0) {
        throw new UsageError(`upt: '--${files.replay !== undefined ? 'replay' : 'show-record'}' takes no command (got '${rest[0]}')`);
      }
      if (files.replay !== undefined) return await replayRecord(files.replay, json, dispatch, io, api);
      return showRecord(files['show-record']!, json, io);
    }
    return await dispatch(rest, io);
  } catch (e) {
    if (e instanceof UsageError) {
      io.err(e.message);
      return 2;
    }
    if (e instanceof CliError) {
      io.err(e.message);
      return 1;
    }
    throw e;
  }
}

async function dispatch(argv: string[], io: Io): Promise<number> {
  const { out, err, write } = io;

  try {
    const [cmd, ...rest] = argv;

    if (cmd === undefined) {
      // Byte-identical to bin/upt.mjs's `case undefined` (lines 861-865): a
      // banner line, then dispatch to the registered `explain` + `priority`
      // commands with their historical demo arguments.
      out('upt — bridge-inference CLI. Demo (run `upt help` for usage):');

      const explainCmd = resolveCommand('explain');
      if (!explainCmd) {
        throw new CliError("upt: the demo needs the 'explain' command, which is not registered yet");
      }
      const explainArgs = parseArgs('explain', ['hawking-temperature', 'mass=1.989e30'], explainCmd.flags);
      const explainCtx: CommandCtx = { args: explainArgs, api, out, err, write };
      const explainStatus = await explainCmd.run(explainCtx);
      if (explainStatus !== 0) return explainStatus;

      const priorityCmd = resolveCommand('priority');
      if (!priorityCmd) {
        throw new CliError("upt: the demo needs the 'priority' command, which is not registered yet");
      }
      const priorityArgs = parseArgs('priority', [], priorityCmd.flags);
      const priorityCtx: CommandCtx = { args: priorityArgs, api, out, err, write };
      return await priorityCmd.run(priorityCtx);
    }

    if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
      if (rest.length > 1) throw new UsageError('upt help takes at most one command name');
      const target = rest[0];
      if (target === 'statuses') {
        out(glossaryText());
        return 0;
      }
      if (target !== undefined) {
        const command = resolveCommand(target);
        if (!command) throw new UsageError(unknownCommandMessage(target));
        out(command.help);
        return 0;
      }
      const commands: Command[] = [];
      for (const name of listCommandNames()) {
        const command = resolveCommand(name);
        if (command !== undefined) commands.push(command);
      }
      out(renderTopLevelHelp(commands, GLOBAL_FLAGS));
      return 0;
    }

    if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
      if (rest.length > 0) throw new UsageError('upt version takes no arguments');
      out(packageVersion());
      return 0;
    }

    const command = resolveCommand(cmd);
    if (!command) {
      err(unknownCommandMessage(cmd));
      return 2;
    }

    if (rest.includes('--help')) {
      out(command.help);
      return 0;
    }

    const parsed = parseArgs(command.name, rest, command.flags);
    const ctx: CommandCtx = { args: parsed, api, out, err, write };
    return await command.run(ctx);
  } catch (e) {
    if (e instanceof UsageError) {
      err(e.message);
      return 2;
    }
    if (e instanceof CliError) {
      err(e.message);
      return 1;
    }
    throw e;
  }
}
