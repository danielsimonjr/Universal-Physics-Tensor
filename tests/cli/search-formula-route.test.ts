/**
 * Search for a coherence length was a route to `upt explain be-12`, which
 * prints no formula. The catalog title says mesoscopic coherence length.
 * The theorem is the thermal de Broglie wavelength.
 *
 * `landau` is a prefix of `landauer`. That hit is Landauer's principle.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

const text = (c: ReturnType<typeof capture>) => c.lines.join('') + c.err.join('');

describe('search names the formula and a prefix', () => {
  it('routes coherence length to the thermal-wavelength formula', async () => {
    const cap = capture();
    const code = await runCli(['search', 'coherence length'], cap.io);
    const out = text(cap);
    expect(code, out).toBe(0);
    expect(out).toMatch(/upt atlas be-12/);
    expect(out).not.toMatch(/upt explain be-12/);
    expect(out).toMatch(/Not Caldeira–Leggett dephasing/);
    expect(out).toMatch(/2π/);
  });

  it('says landau matched as a prefix of landauer', async () => {
    const cap = capture();
    const code = await runCli(['search', 'landau'], cap.io);
    const out = text(cap);
    expect(code, out).toBe(0);
    expect(out).toMatch(/landau is a prefix of landauer/);
    expect(out).toMatch(/Landauer/);
  });

  it('landau diamagnetism is not an entry', async () => {
    const cap = capture();
    const code = await runCli(['search', 'landau diamagnetism'], cap.io);
    const out = text(cap);
    // No match is a result (exit 0), not an error.
    expect(code, out).toBe(0);
    expect(out).toMatch(/no entry matches/);
  });
});
