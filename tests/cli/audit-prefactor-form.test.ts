/**
 * `upt audit` prints the exact form of a clean prefactor (proposal 3).
 *
 * `attemptDerivation` names the closed form of a clean prefactor (`9/8`, `π/ln 2`) in
 * `prefactorForm`; the audit printed only the rounded number, so a reader could not tell `9/8`
 * from a fitted 1.125. A derived row whose prefactor is clean now prints `×<number> (= <form>)`,
 * and the form is omitted when it is the number's own text (`×1`, `×2`). The JSON row carries
 * `prefactorForm` whenever the prefactor is clean. An empirical row has no form and keeps its
 * `(empirical/tuned constant)` mark.
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function audit(args: string[]) {
  const cap = capture();
  const code = await runCli(['audit', ...args], cap.io);
  return { code, stdout: cap.lines.join('') };
}

describe('upt audit prints the exact form of a clean prefactor', () => {
  it('text: the form follows the number; an identical form and an empirical row print none', async () => {
    const r = await audit([]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^ +be-80 +\+\[\] +×1\.125 \(= 9\/8\)$/m);
    expect(r.stdout).toMatch(/^ +be-84 +\+\[\] +×4\.53236014182719 \(= π\/ln 2\)$/m);
    expect(r.stdout).toMatch(/^ +be-56 +\+\[ℏ,c\] +×-0\.0411233516712057 \(= -π²\/240\)$/m);
    expect(r.stdout).toMatch(/^ +be-15 +\+\[\] +×1$/m);
    expect(r.stdout).toMatch(/^ +be-58 +\+\[k_B\] +×4$/m);
    expect(r.stdout).toMatch(/^ +be-62 +\+\[k_B\] +×1\.76387698886205 +\(empirical\/tuned constant\)$/m);
  });

  it('JSON: each clean derived row carries prefactorForm, an empirical row does not', async () => {
    const r = await audit(['--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.stdout) as {
      result: { derived: { id: string; cleanPrefactor: boolean; prefactorForm?: string }[] };
    };
    const row = (id: string) => env.result.derived.find((d) => d.id === id)!;
    expect(row('be-80').prefactorForm).toBe('9/8');
    expect(row('be-84').prefactorForm).toBe('π/ln 2');
    expect(row('be-15').prefactorForm).toBe('1');
    expect(row('be-62').cleanPrefactor).toBe(false);
    expect('prefactorForm' in row('be-62')).toBe(false);
    for (const d of env.result.derived) expect(d.prefactorForm !== undefined, d.id).toBe(d.cleanPrefactor);
  });
});
