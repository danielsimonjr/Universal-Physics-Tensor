/**
 * `upt connectors` prints a ledger verdict as that verdict.
 *
 * A shared hyphen token is not a motivation. A decoy the ledger already
 * recorded, and the Förster/Schwarzschild decoy, leave the motivated heading.
 */

import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function text(args: string[]): Promise<{ code: number; stdout: string }> {
  const lines: string[] = [];
  const code = await runCli(args, { out: (s: string) => lines.push(s), err: () => {} } as never);
  return { code, stdout: lines.join('\n') };
}

const FOERSTER = 'a Förster radius is not a Schwarzschild radius';
const COARSENING =
  'Non-equilibrium vs equilibrium length; unanimous. A coarsening length is a non-equilibrium domain size formed by quenching through a critical point; the quantum correlation length ξ is an equilibrium static property at it. Different processes — not the same length.';
const TUNNELING =
  "Different particles/Hamiltonians; unanimous. A proton's inertia in a specific biomolecular potential vs. an emergent electronic quasiparticle's effective mass in a strongly-correlated metal. Different particles, different Hamiltonians, unrelated scales.";

describe('upt connectors reads the adjudication ledger', () => {
  it('prints recorded decoys under that verdict, and a shared token stays unadjudicated', async () => {
    const r = await text(['connectors', '--source=catalog']);
    expect(r.code).toBe(0);
    expect(r.stdout).not.toMatch(/motivated/);
    const decoyAt = r.stdout.indexOf('DECOY (recorded verdict)');
    const openAt = r.stdout.indexOf('UNADJUDICATED');
    expect(decoyAt).toBeGreaterThan(-1);
    expect(openAt).toBeGreaterThan(decoyAt);
    const decoy = r.stdout.slice(decoyAt, openAt);
    const open = r.stdout.slice(openAt);
    expect(decoy).toContain('foerster-radius ≟ schwarzschild-radius');
    expect(decoy).toContain(FOERSTER);
    expect(decoy).toContain('coarsening-length ≟ quantum-correlation-length');
    expect(decoy).toContain(COARSENING);
    expect(decoy).toContain('tunneling-mass ≟ effective-mass');
    expect(decoy).toContain(TUNNELING);
    expect(open).not.toContain('foerster-radius ≟ schwarzschild-radius');
    expect(open).not.toContain('coarsening-length ≟ quantum-correlation-length');
    expect(open).not.toContain('tunneling-mass ≟ effective-mass');
    expect(open).toContain('coarsening-length ≟ reference-correlation-length');
    expect(open).toMatch(/shared token/);
  });
});
