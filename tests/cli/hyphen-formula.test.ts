/**
 * A name accepted as a dimension argument is one symbol in `--formula`.
 * `reduced-planck-constant` was read as subtraction, then the error named
 * only the first piece.
 */
import { allText, capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

describe('a declared hyphenated name is one symbol in upt derive --formula', () => {
  it('recovers the Fermi prefactor from the declared names', async () => {
    const cap = capture();
    const code = await runCli(
      [
        'derive',
        'fermi-energy:energy',
        'reduced-planck-constant:action',
        'mass:mass',
        'carrier-density:L^-3',
        '--formula',
        '(reduced-planck-constant^2/(2*mass))*(3*pi^2*carrier-density)^(2/3)',
      ],
      cap.io,
    );
    const out = allText(cap);
    expect(code, out).toBe(0);
    expect(out).toMatch(/4\.78539/);
    expect(out).not.toMatch(/undeclared symbol/);
  });

  it('says a remaining hyphen is subtraction', async () => {
    const cap = capture();
    const code = await runCli(
      [
        'derive',
        'fermi-energy:energy',
        'hbar:action',
        'mass:mass',
        'n:L^-3',
        '--formula',
        '(reduced-planck-constant^2/(2*mass))*(3*pi^2*n)^(2/3)',
      ],
      cap.io,
    );
    const out = allText(cap);
    expect(code, out).not.toBe(0);
    expect(out).toMatch(/undeclared symbol 'reduced'/);
    expect(out).toMatch(/hyphen between names is subtraction/);
  });
});
