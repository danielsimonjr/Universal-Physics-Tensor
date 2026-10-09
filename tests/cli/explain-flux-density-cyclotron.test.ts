/**
 * `magnetic-flux-density` is the same vacuum B as `magnetic-field`.
 *
 * `upt explain cyclotron-frequency ... magnetic-field=12e-9` recovered the
 * cyclotron frequency. The same call with `magnetic-flux-density=12e-9`
 * exited 0, said there was no derivation path, and suggested the wire law
 * (`current`, `distance`, `magnetic-field`, `mu_0`).
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI } from '../../src/core/constants.js';

const M_PROTON_SI = 1.67262192369e-27;
const CHARGE = 'charge=1.602176634e-19';
const MASS = 'mass=1.67262192369e-27';
const EXPECTED = (E_SI * 12e-9) / M_PROTON_SI;

async function explain(binding: string) {
  const cap = capture();
  const code = await runCli(
    ['explain', 'cyclotron-frequency', CHARGE, binding, MASS, '--source=canonical'],
    cap.io,
  );
  return { code, stdout: cap.lines.join(''), stderr: cap.err.join('') };
}

function recovered(text: string): number {
  const m = /Recovered value: ([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?\d+)?)/.exec(text);
  return m === null ? Number.NaN : Number(m[1]);
}

describe('cyclotron frequency from either name for B', () => {
  it('recovers the frequency from magnetic-flux-density', async () => {
    const flux = await explain('magnetic-flux-density=12e-9');
    expect(flux.code).toBe(0);
    expect(flux.stdout).not.toMatch(/no derivation path/);
    expect(flux.stdout).not.toMatch(/current, distance, magnetic-field, mu_0/);
    expect(recovered(flux.stdout) / EXPECTED).toBeCloseTo(1, 4);

    const field = await explain('magnetic-field=12e-9');
    expect(field.code).toBe(0);
    expect(recovered(flux.stdout) / recovered(field.stdout)).toBeCloseTo(1, 6);
  });
});
