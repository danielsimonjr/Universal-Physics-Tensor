/**
 * Nano- and microtesla, the proton mass, Avogadro's number, the Faraday
 * constant, and the named dimension `permeability`.
 *
 * `upt eval B B=12nT` and `B=12uT` used to exit 1. `m_p`, `N_A`, and `F`
 * were free. `upt derive ... mu0:permeability` exited 2. Bare `sigma` stays
 * unbound; `sigma_sb` is the Stefan–Boltzmann constant.
 */
import { capture, text } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, MU0_SI } from '../../src/core/constants.js';

const M_PROTON_SI = 1.67262192369e-27;
const N_A_SI = 6.02214076e23;

const errText = (c: ReturnType<typeof capture>) => c.err.join('');

async function evalOf(args: string[]) {
  const cap = capture();
  const code = await runCli(['eval', ...args], cap.io);
  return { code, stdout: text(cap), stderr: errText(cap), value: Number(text(cap).trim()) };
}

describe('tesla prefixes and plasma constants', () => {
  it('reads 12nT and 12uT as tesla, and leaves Ts a terasecond', async () => {
    const nT = await evalOf(['B', 'B=12nT']);
    expect(nT.code).toBe(0);
    expect(nT.value / 12e-9).toBeCloseTo(1, 8);

    const uT = await evalOf(['B', 'B=12uT']);
    expect(uT.code).toBe(0);
    expect(uT.value / 12e-6).toBeCloseTo(1, 8);

    const scientific = await evalOf(['B', 'B=12e-9T']);
    expect(scientific.code).toBe(0);
    expect(scientific.value / nT.value).toBeCloseTo(1, 8);
    expect(scientific.stderr).toMatch(/tesla/);

    const tera = await evalOf(['t', 't=1Ts']);
    expect(tera.code).toBe(0);
    expect(tera.value / 1e12).toBeCloseTo(1, 8);
    expect(tera.stderr).not.toMatch(/tesla/);
  });

  it('fills m_p, m_proton, N_A, and the Faraday constant, and leaves sigma free', async () => {
    const mp = await evalOf(['m_p']);
    expect(mp.code).toBe(0);
    expect(mp.value / M_PROTON_SI).toBeCloseTo(1, 12);

    const proton = await evalOf(['m_proton']);
    expect(proton.code).toBe(0);
    expect(proton.value / mp.value).toBeCloseTo(1, 12);

    const na = await evalOf(['N_A']);
    expect(na.code).toBe(0);
    expect(na.value / N_A_SI).toBeCloseTo(1, 12);

    const faraday = await evalOf(['F']);
    expect(faraday.code).toBe(0);
    expect(faraday.value / (N_A_SI * E_SI)).toBeCloseTo(1, 12);

    const explicit = await evalOf(['F', 'F=2']);
    expect(explicit.code).toBe(0);
    expect(explicit.value).toBe(2);

    const sigma = await evalOf(['sigma']);
    expect(sigma.code).toBe(2);
    expect(sigma.stderr).toMatch(/sigma/);
  });

  it('evaluates an Alfvén speed that names m_p', async () => {
    const cap = await evalOf(['12e-9/sqrt(mu0*14e6*m_p)']);
    expect(cap.code).toBe(0);
    const expected = 12e-9 / Math.sqrt(MU0_SI * 14e6 * M_PROTON_SI);
    expect(cap.value / expected).toBeCloseTo(1, 8);
    expect(cap.stderr).not.toMatch(/free variables/);
  });

  it('accepts permeability as a derive dimension', async () => {
    const cap = capture();
    const code = await runCli(
      [
        'derive',
        'velocity:velocity',
        'B:magnetic_field',
        'mu0:permeability',
        'rho:density',
        '--formula',
        'B/sqrt(mu0*rho)',
      ],
      cap.io,
    );
    expect(code).toBe(0);
    expect(errText(cap)).not.toMatch(/unknown base dimension/);
    expect(text(cap)).toMatch(/recovered prefactor ≈ 1(?!\d)/);
  });
});
