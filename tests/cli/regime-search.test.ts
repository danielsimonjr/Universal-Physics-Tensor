/**
 * Domain regime registrations are a search registry. Piezoelectricity is not
 * invisible because the word is absent from the other registries.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { buildSearchIndex } from '../../src/cli/search-index.js';
import * as api from '../../src/cli-api.js';
import { registerRegimeDomain } from '../../src/relations/regime-registration.js';

function capture() {
  const lines: string[] = [];
  return {
    lines,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

describe('upt search indexes domain regimes', () => {
  it('piezoelectric, its prefix, plasma, and tolman name upt regime', async () => {
    for (const word of ['piezoelectric', 'piezo', 'plasma', 'tolman']) {
      const cap = capture();
      const code = await runCli(['search', word], cap.io);
      const text = cap.lines.join('');
      expect(code, text).toBe(0);
      expect(text, word).toMatch(/upt regime (piezoelectricity|plasma|tolman)/);
      expect(text, word).toMatch(/vacuous registration \(no inequality\)/);
    }
  });

  it('a registration that states an inequality does not say vacuous', () => {
    registerRegimeDomain({
      name: 'bounded-test-regime',
      records: [
        {
          id: 'bounded-test-regime',
          kind: 'domain',
          regime: {
            family: 'bounded-test-regime',
            inequalities: [{ group: 'x', op: '<=', bound: 1 }],
            groupDefinitions: {},
          },
        },
      ],
    });
    const index = buildSearchIndex(api);
    expect(index.find((e) => e.id === 'plasma')?.line).toMatch(/vacuous registration \(no inequality\)/);
    expect(index.find((e) => e.id === 'bounded-test-regime')?.line).toBe('bounded-test-regime');
    expect(index.find((e) => e.id === 'bounded-test-regime')?.command).toBe('upt regime bounded-test-regime');
  });

  it('a miss names the regime registry', async () => {
    const cap = capture();
    // No match is a result (exit 0); the scope line names every registry searched.
    expect(await runCli(['search', 'zzqqxx'], cap.io)).toBe(0);
    expect(cap.lines.join('')).toMatch(/applied cases, \d+ regimes; this registry only/);
  });
});
