/**
 * A synonym is one governing variable.
 *
 * `shareSynonyms` copies vacuum B onto the other name so either spelling
 * evaluates. Buckingham then saw two inputs of one dimension and said the
 * monomial was not unique. The derivation line already used only the edge
 * source.
 */
import { captureMerged } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { explainQuantity } from '../../src/composition/explain.js';
import { shareSynonyms } from '../../src/composition/aliases.js';

const Q = -1.602176634e-19;
const M = 9.1093837015e-31;

describe('a magnetic synonym is one Buckingham variable', () => {
  it('does not call the cyclotron monomial non-unique when only one B was given', async () => {
    const cap = captureMerged();
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
    const cap = captureMerged();
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

    const flux = captureMerged();
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

    const doubled = captureMerged();
    const doubledCode = await runCli(
      [
        'explain',
        'cyclotron-frequency',
        `charge=${Q}`,
        'magnetic-flux-density=2',
        `mass=${M}`,
        '--source=canonical',
      ],
      doubled.io,
    );
    const doubledText = doubled.lines.join('');
    expect(doubledCode, doubledText).toBe(0);
    expect(doubledText).toMatch(/Recovered value: -351764002154\.433/);
    expect(doubledText).not.toMatch(/do not fix a unique monomial/);
  });

  it('recovers one frequency when both spellings carry the same number', async () => {
    const cap = captureMerged();
    const code = await runCli(
      [
        'explain',
        'cyclotron-frequency',
        `charge=${Q}`,
        'magnetic-field=1',
        'magnetic-flux-density=1',
        `mass=${M}`,
        '--source=canonical',
      ],
      cap.io,
    );
    const text = cap.lines.join('');
    expect(code, text).toBe(0);
    expect(text).toMatch(/Recovered value: -175882001077\.216/);
    expect(text).toMatch(/\{charge, magnetic-field, mass\}/);
    expect(text).not.toMatch(/do not fix a unique monomial/);
    expect(text).not.toMatch(/magnetic-flux-density/);
  });

  it('fails when the two spellings disagree, and does not recover a frequency', async () => {
    const names = new Set(CANONICAL_GRAPH.flatMap((e) => [e.target.name, ...e.sources.map((s) => s.name)]));
    const known = shareSynonyms(
      { charge: -Q, 'magnetic-field': 1, 'magnetic-flux-density': 2, mass: M },
      names,
    );
    expect(() => explainQuantity(CANONICAL_GRAPH, 'cyclotron-frequency', known as Record<string, number>)).toThrow(
      /magnetic-flux-density and magnetic-field are one quantity and disagree/,
    );

    const cap = captureMerged();
    const code = await runCli(
      [
        'explain',
        'cyclotron-frequency',
        `charge=${Q}`,
        'magnetic-field=1',
        'magnetic-flux-density=2',
        `mass=${M}`,
        '--source=canonical',
      ],
      cap.io,
    );
    const text = cap.lines.join('');
    expect(code, text).toBe(1);
    expect(text).toMatch(/magnetic-field and magnetic-flux-density are one quantity and disagree/);
    expect(text).toMatch(/magnetic-field=1/);
    expect(text).toMatch(/magnetic-flux-density=2/);
    expect(text).not.toMatch(/Recovered value/);
  });
});
