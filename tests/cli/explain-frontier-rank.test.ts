/**
 * `upt explain` names the missing input when a reversed law would determine the target (#704).
 *
 * `damping-spring` is a source-only leaf. With `damping-zeta` added the rank determines it, so
 * the message must not say that the graph has no derivation path.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('upt explain — frontier over reversed laws', () => {
  it('names damping-zeta and does not claim there is no derivation path', async () => {
    const r = await run(['explain', 'damping-spring', 'damping-dashpot=1', 'damping-inertia=2', '--source=catalog']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('damping-zeta');
    expect(r.text).not.toContain('no derivation path');
    expect(r.text).not.toContain('Knowing one of');
    expect(r.text).not.toContain('also supply');
  });

  it('control: a target with an empty frontier still says there is no derivation path', async () => {
    const r = await run(['explain', 'curvature-k', '--source=canonical', 'mass=2']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('no derivation path');
  });
});
