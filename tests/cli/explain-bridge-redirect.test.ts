/**
 * `upt explain <be-NN>` — a bridge id is a graph EDGE, not a quantity NODE, so
 * `explain` (which derives quantities) can never resolve it. Instead of a bare
 * "no derivation path", the command recognises a catalog bridge id and redirects
 * helpfully — tailored by grounding tier (closed-form vs graph-computable,
 * data-confronted or not). Regression for the v0.41.0 PI-investigation finding.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('upt explain <bridge-id> redirect', () => {
  it('be-55 (graph-computable, data-confronted): redirects as a bridge + points to confront, exit 0', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'be-55'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/bridge/i);
    expect(text).toMatch(/confront be-55/);
    // graph-computable → must NOT be mislabelled closed-form
    expect(text).not.toMatch(/closed-form/i);
  });

  it('be-57 (closed-form, NOT confronted): notes closed-form + no data confrontation, exit 0', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'be-57'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/closed-form|evaluator/i);
    // be-57 Unruh is deferred — it must NOT falsely advertise a confrontation
    expect(text).not.toMatch(/confront be-57/);
  });

  it('be-37 (graph-computable, data-confronted): redirects as a bridge + points to confront, exit 0', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'be-37'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/bridge/i);
    expect(text).toMatch(/confront be-37/);
    // graph-computable → must NOT be mislabelled closed-form
    expect(text).not.toMatch(/closed-form/i);
  });

  it('a real quantity target still explains normally (no redirect)', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'schwarzschild-radius'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).not.toMatch(/is a bridge equation/i);
  });

  it('--json on a bridge-id target carries a structured redirect envelope', async () => {
    const cap = capture();
    const code = await runCli(['explain', 'be-55', '--json'], cap.io);
    expect(code).toBe(0);
    const env = JSON.parse(cap.lines.join(''));
    expect(env.command).toBe('explain');
    expect(env.result.kind).toBe('bridge-redirect');
    expect(env.result.id).toBe(55);
    expect(env.result.hasGraphEdge).toBe(true);
    expect(env.result.hasDataConfrontation).toBe(true);
  });
});
