/**
 * `upt evaluate --json` answers a refusal in JSON too: the envelope carries the command, the
 * error's kind (`usage` for a malformed invocation, `value` for a value the command refuses),
 * the exit code the process returns, and the message. The exit code is unchanged; stderr stays
 * empty, so a script reads one stream. The text mode is unchanged.
 *
 * Found by the 2026-10-15 survey (an `ACTIVE.md` leftover): `upt evaluate --json` still reported
 * a refusal as stderr text, so a JSON consumer saw an empty stdout and no reason.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => out.push((s ?? '') + '\n'),
    err: (s?: string) => err.push((s ?? '') + '\n'),
    write: (s: string) => out.push(s),
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

describe('upt evaluate --json on a refusal', () => {
  it('a missing input is a value refusal: exit 1, the envelope on stdout, nothing on stderr', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=300', '--json']);
    expect(r.code).toBe(1);
    expect(r.stderr).toBe('');
    const env = JSON.parse(r.stdout);
    expect(env.command).toBe('evaluate');
    expect(env.error.kind).toBe('value');
    expect(env.error.exitCode).toBe(1);
    expect(env.error.message).toMatch(/upt evaluate: be-58: missing input 'R_ohm'/);
    expect(env).not.toHaveProperty('result');
  });
  it('a malformed id is a usage refusal: exit 2 with the same envelope shape', async () => {
    const r = await run(['evaluate', 'be-abc', '--json']);
    expect(r.code).toBe(2);
    expect(r.stderr).toBe('');
    const env = JSON.parse(r.stdout);
    expect(env.error.kind).toBe('usage');
    expect(env.error.exitCode).toBe(2);
    expect(env.error.message).toMatch(/'be-abc' is not a bridge id/);
  });
  it('a case whose input is refused answers the same way', async () => {
    const r = await run(['evaluate', 'case-resistor-noise', 'T_K=300', '--json']);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.stdout).error.kind).toBe('value');
  });
  it('CONTROL: a successful evaluation has a result and no error', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.stdout);
    expect(env).toHaveProperty('result');
    expect(env).not.toHaveProperty('error');
  });
  it('CONTROL: the text mode still reports the refusal on stderr with an empty stdout', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=300']);
    expect(r.code).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toMatch(/missing input 'R_ohm'/);
  });
});
