/**
 * A multi-word search is one noun phrase in one field. "Reynolds number" is
 * not the Reynolds analogy, whose name places "number" next to "Prandtl".
 * A suggestion does not drop the kind of thing the name asked for, so
 * `debye-length` does not fall back to the phonon Debye family.
 *
 * `upt search debye` is one word and still returns that family. The sentence
 * that a Reynolds number bridge is not added is the record from before BE-155.
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

async function search(query: string): Promise<{ code: number; text: string }> {
  const cap = capture();
  const code = await runCli(['search', query], cap.io);
  return { code, text: text(cap) };
}

describe('a multi-word search is a noun phrase in one field', () => {
  it('answers Reynolds number with BE-155 and not the Reynolds analogy', async () => {
    const r = await search('reynolds number');
    // Exit 1 and "no entry matches" is the record from before BE-155.
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-155/);
    expect(r.text).not.toMatch(/be-86/);
  });

  it('still finds the Reynolds analogy by the Prandtl number it states, and says the match is the gloss', async () => {
    const r = await search('prandtl number');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-86/);
    expect(r.text).toMatch(/words in: gloss/);
  });

  it('still finds thermal noise across a name and a description', async () => {
    const r = await search('thermal noise');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-58/);
    expect(r.text).toMatch(/words in: name, description/);
  });

  it('still says landau is a prefix of landauer', async () => {
    const r = await search('landau');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/landau is a prefix of landauer/);
  });

  it('still finds the Reynolds analogy by its own name', async () => {
    const r = await search('reynolds analogy');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-86/);
  });

  it('answers a Debye length with the plasma Debye bridges, not the phonon family', async () => {
    const r = await search('debye length');
    // Exit 1, and no plasma Debye row, is the record from before be-114 and be-115.
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-114/);
    expect(r.text).toMatch(/be-115/);
    expect(r.text).not.toMatch(/CE-debye-frequency/);
    expect(r.text).not.toMatch(/be-89/);
    expect(r.text).not.toMatch(/be-90/);
  });

  it('explain debye-length is NOT COVERED and does not list the phonon family', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'debye-length'], cap.io);
    const out = text(cap);
    expect(code, out).toBe(1);
    expect(out).toMatch(/NOT COVERED/);
    expect(out).not.toMatch(/CE-debye-frequency/);
    expect(out).not.toMatch(/be-89/);
    expect(out).not.toMatch(/be-90/);
    expect(out).not.toMatch(/planck-length/);
    expect(out).toMatch(/be-115/);
  });

  it('a one-word Debye search still returns the phonon family', async () => {
    const r = await search('debye');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/CE-debye-frequency/);
    expect(r.text).toMatch(/be-89/);
  });

  it('keeps phrase hits that are the law asked for', async () => {
    for (const [query, id] of [
      ['sound speed', 'CE-sound-speed'],
      ['speed of sound', 'CE-sound-speed'],
      ['ideal gas', 'CE-ideal-gas'],
      ['plasma frequency', 'CE-plasma-frequency'],
      ['magnetic pressure', 'be-74'],
    ] as const) {
      const r = await search(query);
      expect(r.code, `${query}\n${r.text}`).toBe(0);
      expect(r.text, query).toContain(id);
    }
  });

  it('explain reynolds-number does not suggest the analogy', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'reynolds-number'], cap.io);
    const out = text(cap);
    expect(code, out).toBe(1);
    expect(out).toMatch(/NOT COVERED/);
    expect(out).not.toMatch(/be-86/);
  });

  it('does not invent a magnetic Reynolds number', async () => {
    const r = await search('magnetic reynolds');
    expect(r.code, r.text).toBe(1);
    expect(r.text).not.toMatch(/be-86/);
  });
});
