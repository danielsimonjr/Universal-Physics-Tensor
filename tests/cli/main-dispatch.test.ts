import '../helpers/dist.js';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { registerForTest, clearRegistryForTest } from '../../dist/cli/command.js';
import type { Command, CommandCtx } from '../../dist/cli/command.js';
import { UsageError, CliError } from '../../dist/cli/errors.js';
import type { FlagSpec } from '../../dist/cli/args.js';

const STUB_FLAGS: FlagSpec[] = [{ name: '--loud', valueStyle: 'none' }];

function makeStubCommand(overrides: Partial<Command> = {}): Command {
  return {
    name: 'stub',
    aliases: ['stubbed'],
    flags: STUB_FLAGS,
    help: 'upt stub [--loud]\n        A stub command for main-dispatch tests.',
    run: async (ctx: CommandCtx) => {
      ctx.out('stub ran');
      return 0;
    },
    ...overrides,
  };
}

// Minimal capturing Io: mirrors console.log semantics ((line ?? '') + '\n')
// so tests can assert exact stdout/stderr text, while also exposing the raw
// argument arrays for tests that care about call-by-call identity/order.
function makeIo() {
  const outArgs: (string | undefined)[] = [];
  const errArgs: (string | undefined)[] = [];
  const outLines: string[] = [];
  const errLines: string[] = [];
  const writes: string[] = [];
  const io = {
    out: (line?: string) => {
      outArgs.push(line);
      outLines.push((line ?? '') + '\n');
    },
    err: (line?: string) => {
      errArgs.push(line);
      errLines.push((line ?? '') + '\n');
    },
    write: (s: string) => {
      writes.push(s);
    },
  };
  return { io, outArgs, errArgs, outLines, errLines, writes };
}

const pkgPath = new URL('../../package.json', import.meta.url);
const packageVersionOnDisk = (JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }).version;

beforeEach(() => {
  clearRegistryForTest();
});

describe('runCli — unknown verb', () => {
  it('returns 2 and writes the documented message to stderr, nothing to stdout', async () => {
    const { io, outLines, errLines } = makeIo();
    const status = await runCli(['bogus-verb'], io);

    expect(status).toBe(2);
    expect(errLines).toEqual(["Unknown command 'bogus-verb'. See `upt help`.\n"]);
    expect(outLines).toEqual([]);
  });
});

describe('runCli — version', () => {
  it.each(['version', '--version', '-v'])(
    "'%s' prints the package.json version and returns 0",
    async (verb) => {
      const { io, outLines, errLines } = makeIo();
      const status = await runCli([verb], io);

      expect(status).toBe(0);
      expect(outLines).toEqual([packageVersionOnDisk + '\n']);
      expect(errLines).toEqual([]);
    }
  );
});

describe('runCli — top-level help', () => {
  it.each(['help', '--help', '-h'])("'%s' with no further args returns 0 and prints the help text", async (verb) => {
    const { io, outLines } = makeIo();
    const status = await runCli([verb], io);

    expect(status).toBe(0);
    expect(outLines.length).toBe(1);
    expect(outLines[0].startsWith('upt — Universal Physics Tensor bridge-inference CLI\n')).toBe(true);
    // The two lines appended beyond bin/upt.mjs's original help text.
    expect(outLines[0]).toContain('upt version');
    expect(outLines[0]).toContain('--json');
  });

  it('wires the default writers to process.stdout with exact console.log-style framing when no io override is given', async () => {
    const original = process.stdout.write.bind(process.stdout);
    const calls: string[] = [];
    process.stdout.write = ((chunk: string) => {
      calls.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    let status: number;
    try {
      status = await runCli(['version']);
    } finally {
      process.stdout.write = original;
    }

    expect(status).toBe(0);
    expect(calls).toEqual([packageVersionOnDisk + '\n']);
  });
});

describe('runCli — per-command help', () => {
  it("'help <cmd>' renders the registered command's help block verbatim and returns 0", async () => {
    registerForTest(makeStubCommand());
    const { io, outLines } = makeIo();

    const status = await runCli(['help', 'stub'], io);

    expect(status).toBe(0);
    expect(outLines).toEqual(['upt stub [--loud]\n        A stub command for main-dispatch tests.\n']);
  });

  it("'help <unknown-cmd>' returns 2 (UsageError mapped) with a message naming the command", async () => {
    const { io, errLines } = makeIo();

    const status = await runCli(['help', 'no-such-command'], io);

    expect(status).toBe(2);
    expect(errLines).toEqual(["Unknown command 'no-such-command'. See `upt help`.\n"]);
  });
});

describe('runCli — registered-command dispatch', () => {
  it('resolves a command by alias, not just its primary name', async () => {
    registerForTest(makeStubCommand());
    const { io, outLines } = makeIo();

    const status = await runCli(['stubbed'], io);

    expect(status).toBe(0);
    expect(outLines).toEqual(['stub ran\n']);
  });

  it('returns 2 with a message naming the flag and command for an unknown flag', async () => {
    registerForTest(makeStubCommand());
    const { io, errLines } = makeIo();

    const status = await runCli(['stub', '--nope'], io);

    expect(status).toBe(2);
    expect(errLines).toEqual(["unknown flag '--nope' for 'stub' (see upt help stub)\n"]);
  });

  it('maps a UsageError thrown by run() to exit 2 with its message on stderr', async () => {
    registerForTest(
      makeStubCommand({
        run: async () => {
          throw new UsageError('bad usage detail');
        },
      })
    );
    const { io, errLines } = makeIo();

    const status = await runCli(['stub'], io);

    expect(status).toBe(2);
    expect(errLines).toEqual(['bad usage detail\n']);
  });

  it('maps a CliError thrown by run() to exit 1 with its message on stderr', async () => {
    registerForTest(
      makeStubCommand({
        run: async () => {
          throw new CliError('runtime failure detail');
        },
      })
    );
    const { io, errLines } = makeIo();

    const status = await runCli(['stub'], io);

    expect(status).toBe(1);
    expect(errLines).toEqual(['runtime failure detail\n']);
  });

  it('lets other (non-Usage/CliError) exceptions from run() propagate uncaught', async () => {
    registerForTest(
      makeStubCommand({
        run: async () => {
          throw new TypeError('unexpected bug');
        },
      })
    );
    const { io } = makeIo();

    await expect(runCli(['stub'], io)).rejects.toThrow(TypeError);
  });

  it("passes ctx.out/err/write straight through to the injected io, preserving call order and console.log-style undefined/embedded-newline handling", async () => {
    registerForTest(
      makeStubCommand({
        run: async (ctx) => {
          ctx.out('first');
          ctx.out();
          ctx.out('embedded\nnewline');
          ctx.write('raw-no-newline');
          ctx.err('to stderr');
          return 0;
        },
      })
    );
    const { io, outArgs, errArgs, writes } = makeIo();

    const status = await runCli(['stub'], io);

    expect(status).toBe(0);
    expect(outArgs).toEqual(['first', undefined, 'embedded\nnewline']);
    expect(errArgs).toEqual(['to stderr']);
    expect(writes).toEqual(['raw-no-newline']);
  });

  it('injects the real cli-api barrel as ctx.api', async () => {
    let sawCatalogGraph = false;
    registerForTest(
      makeStubCommand({
        run: async (ctx) => {
          sawCatalogGraph = Array.isArray(ctx.api.CATALOG_GRAPH) && ctx.api.CATALOG_GRAPH.length > 0;
          return 0;
        },
      })
    );
    const { io } = makeIo();

    const status = await runCli(['stub'], io);

    expect(status).toBe(0);
    expect(sawCatalogGraph).toBe(true);
  });
});
