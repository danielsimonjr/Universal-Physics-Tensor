/**
 * `upt chain` names the orchestrator and does not run it.
 *
 * The design leaves `runChainPipeline` internal. A chain stays provisional
 * and is not written to the catalog. The command is registered so the name
 * is not "Unknown command", and `upt help` does not advertise it.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function invoke(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (line: string) => out.push(line),
    err: (line: string) => err.push(line),
  } as never);
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('upt chain', () => {
  it('exits 2 and says the orchestrator stays internal', async () => {
    const result = await invoke(['chain']);
    expect(result.code).toBe(2);
    expect(result.err).toContain('provisional');
    expect(result.err).toContain('not written to the catalog');
    expect(result.err).not.toContain('Unknown command');
    expect(result.out).toBe('');
  });

  it('is absent from upt help and present in upt help chain', async () => {
    const help = await invoke(['--help']);
    expect(help.code).toBe(0);
    expect(help.out).not.toMatch(/^ {2}upt chain(?![\w-])/m);
    const named = await invoke(['help', 'chain']);
    expect(named.code).toBe(0);
    expect(named.out).toContain('provisional');
    expect(named.out).toContain('Exit 2');
  });

  it('does not import or call the pipeline', () => {
    const source = readFileSync(resolve(root, 'src/cli/commands/chain.ts'), 'utf8');
    expect(source.includes("from '../../atlas/chain-pipeline.js'")).toBe(false);
    expect(source.includes('runChainPipeline(')).toBe(false);
    const barrel = readFileSync(resolve(root, 'src/cli/commands/index.ts'), 'utf8');
    expect(barrel.includes("import './chain.js'")).toBe(true);
    expect(barrel.includes('runChainPipeline')).toBe(false);
  });
});
