/**
 * A regime name is a registration. Plasma, piezoelectricity, and Tolman are
 * domains whose inequality lists are empty. The command source does not name
 * a family.
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

const regimeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../src/cli/commands/regime.ts'),
  'utf8',
);

const VACUOUS =
  'no machine condition evaluated (VACUOUS — states no inequality; nothing was checked)';

describe('regime registrations', () => {
  it('the command source names no family', () => {
    expect(regimeSource).not.toMatch(/\b(oscillators|diffusion|waves|plasma|piezoelectricity|tolman)\b/);
  });

  it.each(['plasma', 'piezoelectricity', 'tolman'])(
    '%s is a vacuous registration and exits 0',
    async (name) => {
      const cap = captureMerged();
      const code = await runCli(['regime', name], cap.io);
      const text = cap.lines.join('');
      expect(code).toBe(0);
      expect(text).toContain(VACUOUS);
      expect(text).not.toMatch(/violated:|satisfied:|unchecked/);
      expect(text).not.toMatch(/β|beta <|piezoelectric bound|T √/);
    },
  );

  it('an unregistered name exits 1 and the known names come from the registry', async () => {
    const cap = captureMerged();
    const code = await runCli(['regime', 'no-such-regime'], cap.io);
    const text = cap.lines.join('');
    expect(code).toBe(1);
    expect(text).toMatch(/unknown family 'no-such-regime'/);
    expect(text).toMatch(/plasma/);
    expect(text).toMatch(/piezoelectricity/);
    expect(text).toMatch(/tolman/);
    expect(text).toMatch(/oscillators/);
  });
});
