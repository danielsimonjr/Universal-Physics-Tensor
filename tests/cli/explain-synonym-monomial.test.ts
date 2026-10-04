/**
 * A synonym is one governing variable.
 *
 * `shareSynonyms` copies vacuum B onto the other name so either spelling
 * evaluates. Buckingham then saw two inputs of one dimension and said the
 * monomial was not unique. The derivation line already used only the edge
 * source.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { explainQuantity } from '../../src/composition/explain.js';
import { shareSynonyms } from '../../src/composition/aliases.js';

const Q = -1.602176634e-19;
const M = 9.1093837015e-31;

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

describe('a magnetic synonym is one Buckingham variable', () => {
  it('does not call the cyclotron monomial non-unique when only one B was given', async () => {
    const cap = capture();
    const code = await runCli(
      [
        'explain',
        'cyclotron-frequency',
        `charge=${Q}`,
        'magnetic-field=1',
        `mass=${M}`,
        '--source=canonical',
      ],
      cap.io,
    );
    const text = cap.lines.join('');
    expect(code).toBe(0);
    expect(text).toMatch(/Recovered value: -175882001077\.216/);
    expect(text).toMatch(/charge·magnetic-field·mass\^-1/);
    expect(text).toMatch(/fix it up to a dimensionless constant/);
    expect(text).not.toMatch(/do not fix a unique monomial/);
    expect(text).not.toMatch(/magnetic-flux-density/);
  });

  it('keeps the Larmor monomial unique, and still evaluates a flux-density spelling', async () => {
    const cap = capture();
    const code = await runCli(
      [
        'explain',
        'larmor-radius',
        `mass=${M}`,
        'speed=1e6',
        `charge=${-Q}`,
        'magnetic-field=1',
        '--source=canonical',
      ],
      cap.io,
    );
    const text = cap.lines.join('');
    expect(code).toBe(0);
    expect(text).toMatch(/Recovered value: 0\.00000568563010356572/);
    expect(text).not.toMatch(/do not fix a unique monomial/);
    expect(text).not.toMatch(/magnetic-flux-density/);

    const flux = capture();
    const fluxCode = await runCli(
      [
        'explain',
        'cyclotron-frequency',
        `charge=${-Q}`,
        'magnetic-flux-density=1',
        `mass=${M}`,
        '--source=canonical',
      ],
      flux.io,
    );
    const fluxText = flux.lines.join('');
    expect(fluxCode).toBe(0);
    expect(fluxText).toMatch(/Recovered value: 175882001077\.216/);
    expect(fluxText).toMatch(/charge·magnetic-field·mass\^-1/);
    expect(fluxText).not.toMatch(/do not fix a unique monomial/);
  });

  it('keeps two different values of the synonym pair as two inputs', () => {
    const names = new Set(CANONICAL_GRAPH.flatMap((e) => [e.target.name, ...e.sources.map((s) => s.name)]));
    const known = shareSynonyms(
      { charge: -Q, 'magnetic-field': 1, 'magnetic-flux-density': 2, mass: M },
      names,
    );
    const x = explainQuantity(CANONICAL_GRAPH, 'cyclotron-frequency', known as Record<string, number>);
    expect(x.summary).toMatch(/do not fix a unique monomial/);
    expect(x.known).toContain('magnetic-field');
    expect(x.known).toContain('magnetic-flux-density');
  });
});
