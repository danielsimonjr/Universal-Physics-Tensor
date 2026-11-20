/**
 * An applied-case output that is `null` says WHICH cause applies (#682). A case output declares
 * `needs`: the optional inputs it depends on. A null output with an absent `needs` key names the
 * key; a null output with none absent reports a failed premise. Needs `npm run build`.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { APPLIED_CASES } from '../../dist/cli-api.js';

async function run(args: string[]): Promise<{ out: string; code: number }> {
  let out = '';
  const code = await runCli(args, {
    out: (line?: string) => {
      out += `${line ?? ''}\n`;
    },
    err: () => {},
    write: (s: string) => {
      out += s;
    },
  });
  return { out, code: code as number };
}

const keyOf = (arg: string): string => arg.split('=')[0]!;

/** Output keys whose value is null, for a case run on `args`, read from the --json envelope. */
async function nullKeys(id: string, args: string[]): Promise<Set<string>> {
  const r = await run(['evaluate', id, ...args, '--json']);
  const env = JSON.parse(r.out);
  return new Set(env.result.outputs.filter((o: { value: number | null }) => o.value === null).map((o: { key: string }) => o.key));
}

describe('a null case output names its cause (#682)', () => {
  it('names the optional inputs a null output needs', async () => {
    const r = await run([
      'evaluate', 'case-resistor-noise', 'T_K=300', 'R_ohm=1000', 'R_in_ohm=1e6', 'C_in_F=1e-11',
      'f_lo_Hz=1', 'f_hi_Hz=1000', 't_avg_s=1',
    ]);
    expect(r.out).toContain('V_rms_total_V = undefined here: needs optional input e_n2_V2_per_Hz, i_n2_A2_per_Hz');
    expect(r.out).toContain('T_n_K = undefined here: needs optional input e_n2_V2_per_Hz, i_n2_A2_per_Hz');
    expect(r.out).not.toContain('or it needs');
  });

  it('reports a failed premise when no declared optional input is absent', async () => {
    const r = await run([
      'evaluate', 'case-damped-resonator', 'f0_Hz=1kHz', 'Q=0.3', 'x0_m=1um', 't_s=0.1', 't_obs_s=20',
      'T_K=300', 'k_N_per_m=1',
    ]);
    expect(r.out).toContain('f_d_Hz = undefined here: its premise fails at these inputs');
    expect(r.out).not.toContain('needs optional input');
  });
});

/**
 * The class guard. For one case, with its valid example run in full and with every optional
 * input removed (all at once: the damped case throws on one key alone), an output is null in the
 * bare run and non-null in the full run if and only if it declares `needs`.
 */
interface Probe {
  readonly id: string;
  readonly declared: ReadonlyMap<string, readonly string[]>;
  readonly nullBare: ReadonlySet<string>;
  readonly nullFull: ReadonlySet<string>;
}

function mismatches(p: Probe): string[] {
  const bad: string[] = [];
  for (const [key, needs] of p.declared) {
    if (!p.nullBare.has(key)) bad.push(`${p.id}.${key} declares needs [${needs.join(', ')}] but is not null without them`);
    if (p.nullFull.has(key)) bad.push(`${p.id}.${key} declares needs but is null with every input given`);
  }
  for (const key of p.nullBare) {
    if (!p.nullFull.has(key) && !p.declared.has(key)) bad.push(`${p.id}.${key} depends on an optional input and declares no needs`);
  }
  return bad;
}

async function probe(id: string): Promise<Probe> {
  const c = APPLIED_CASES.get(id)!;
  const optional = new Set(c.parameters.filter((p) => p.optional === true).map((p) => p.key));
  const args = c.examples.valid.args;
  const declared = new Map(c.outputs.filter((o) => o.needs !== undefined).map((o) => [o.key, o.needs!] as const));
  for (const [key, needs] of declared) {
    for (const n of needs) expect(optional.has(n), `${id}.${key} needs '${n}', which is not an optional parameter`).toBe(true);
  }
  return {
    id,
    declared,
    nullFull: await nullKeys(id, [...args]),
    nullBare: await nullKeys(id, args.filter((a) => !optional.has(keyOf(a)))),
  };
}

describe('every output that depends on an optional input declares it (#682)', () => {
  const ids = [...APPLIED_CASES.keys()];

  it.each(ids)('%s: needs matches what the runner does', async (id) => {
    const p = await probe(id);
    expect(mismatches(p)).toEqual([]);
  });

  it('the guard catches a dropped declaration', async () => {
    const p = await probe('case-resistor-noise');
    expect(p.declared.size).toBe(3);
    const dropped = new Map(p.declared);
    dropped.delete('T_n_K');
    expect(mismatches({ ...p, declared: dropped })).toEqual([
      'case-resistor-noise.T_n_K depends on an optional input and declares no needs',
    ]);
    const wrong = new Map(p.declared);
    wrong.set('resistor_fraction_bogus', ['e_n2_V2_per_Hz']);
    expect(mismatches({ ...p, declared: wrong })).toEqual([
      'case-resistor-noise.resistor_fraction_bogus declares needs [e_n2_V2_per_Hz] but is not null without them',
    ]);
  });
});
