/**
 * `upt derive` accepts the circuit named dimensions (issue 683) and lists the accepted
 * named dimensions when a term is unknown.
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function cli(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, out: cap.lines.join(''), err: cap.err.join('') };
}

describe('upt derive with circuit dimensions', () => {
  it('derive x:voltage R:resistance is accepted: never exit 2', async () => {
    const r = await cli(['derive', 'x:voltage', 'R:resistance']);
    expect(r.code).not.toBe(2);
    expect(r.err).not.toContain('unknown base dimension');
  });
  it('derive x:voltage I:current R:resistance derives x = I*R, exit 0', async () => {
    const r = await cli(['derive', 'x:voltage', 'I:current', 'R:resistance']);
    expect(r.code).toBe(0);
  });
  it('an unknown term exits 2 and lists the named dimensions', async () => {
    const r = await cli(['derive', 'x:zqx', 'y:length']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('capacitance');
  });
  it('the derive help names the six new dimensions', async () => {
    const r = await cli(['derive', '--help']);
    const text = r.out + r.err;
    for (const n of ['voltage', 'capacitance', 'inductance', 'permittivity', 'conductance', 'magnetic_flux']) {
      expect(text).toContain(n);
    }
  });
});
