/**
 * Audit I13: one glossary of status words, `upt help statuses`, and the definitions of each status a
 * command emits in its `--json` envelope.
 *
 * The check is derived from the commands' own output, not from a list kept beside the glossary. In
 * text, an all-capitals status word (VACUOUS, VIOLATED, NEITHER, …) is a status wherever it occurs.
 * In JSON, a status is a string VALUE equal to a glossary word; keys and prose are not read, so a
 * sentence that merely contains "valid" counts for nothing. Every status found must be defined in the
 * same invocation's envelope, with the glossary's meaning.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../../dist/cli/main.js';
import { STATUS_GLOSSARY } from '../../src/cli/statuses.js';

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (x: string) => void (o.stdout += x),
  });
  return { code, ...o };
}

/**
 * The status a word names in `command`. A word may name different statuses in different commands
 * (`decoy` in `audit` and in `discover`); a word the command has no entry for still maps to a key, so
 * the check reports it as undefined there instead of skipping it.
 */
function keyFor(word: string, command: string): string | undefined {
  const w = word.toLowerCase();
  const entries = STATUS_GLOSSARY.filter((s) => s.words.some((x) => x.toLowerCase() === w));
  if (entries.length === 0) return undefined;
  return (entries.find((s) => s.commands.includes(command)) ?? entries[0]!).key;
}
const CAPS = [...new Set(STATUS_GLOSSARY.flatMap((s) => s.words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w))))];

function textStatuses(text: string, command: string): Set<string> {
  const found = new Set<string>();
  for (const w of CAPS) if (new RegExp(`(?<![A-Za-z])${w}(?![A-Za-z])`).test(text)) found.add(keyFor(w, command)!);
  return found;
}

function jsonStatuses(v: unknown, command: string, found = new Set<string>()): Set<string> {
  if (typeof v === 'string') {
    const k = keyFor(v, command);
    if (k !== undefined) found.add(k);
  } else if (Array.isArray(v)) v.forEach((x) => jsonStatuses(x, command, found));
  else if (v !== null && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) if (k !== 'definitions') jsonStatuses(x, command, found);
  }
  return found;
}

/** The statuses an invocation emits that its envelope does not define. */
function undefinedStatuses(text: string, envelope: { command: string; definitions?: Record<string, string> }): string[] {
  const found = new Set([...textStatuses(text, envelope.command), ...jsonStatuses(envelope, envelope.command)]);
  return [...found].filter((k) => envelope.definitions?.[k] === undefined).sort();
}
const INVOCATIONS: string[][] = [
  ['regime', 'waves'],
  ['regime', 'oscillators', '--at', 'theta0=0.9'],
  ['regime', 'oscillators', '--at', 'theta0=0.2'],
  ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=1', '--tolerance=0.01'],
  ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', '--tolerance=0.01'],
  ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10', '--tolerance=1e-9'],
  ['path', 'model-telegraph', 'model-fick', '--compare=model-wave-1d', '--at', 'D=1', 'q=1', 't=1', '--sweep', 'tau=0.001:1000:13:log'],
  ['audit'],
  ['atlas', 'ab-spring-lc', '--run'],
  ['discover'],
];

const reached = new Set<string>();

describe('audit I13: every status a command emits is defined in its envelope', () => {
  it.each(INVOCATIONS.map((a) => [a.join(' '), a] as const))('%s', async (_label, argv) => {
    const text = await run(argv);
    const json = await run([...argv, '--json']);
    const envelope = JSON.parse(json.stdout) as { command: string; definitions?: Record<string, string> };
    for (const k of [...textStatuses(text.stdout, envelope.command), ...jsonStatuses(envelope, envelope.command)]) reached.add(k);
    expect(undefinedStatuses(text.stdout, envelope)).toEqual([]);
    for (const [k, meaning] of Object.entries(envelope.definitions ?? {})) {
      expect(meaning).toBe(STATUS_GLOSSARY.find((s) => s.key === k)!.meaning);
    }
  });

  it('--replay: reproduced, differs and not replayable are defined', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-statuses-'));
    try {
      const file = join(dir, 'r.jsonl');
      expect(await run([`--record=${file}`, 'regime', 'waves'])).toMatchObject({ code: 0 });
      const text = await run([`--replay=${file}`]);
      const json = await run([`--replay=${file}`, '--json']);
      const envelope = JSON.parse(json.stdout);
      expect(jsonStatuses(envelope, 'replay')).toContain('reproduced');
      expect(undefinedStatuses(text.stdout, envelope)).toEqual([]);
      expect(Object.keys(envelope.definitions)).toEqual(expect.arrayContaining(['reproduced', 'differs', 'not-replayable']));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the invocations reach the statuses they are chosen for (so the check above is not vacuous)', () => {
    expect([...reached].sort()).toEqual(
      expect.arrayContaining(['adequate', 'checked', 'decoy', 'inadequate', 'neither', 'promising', 'undetermined', 'unknown', 'vacuous', 'valid', 'violated']),
    );
  });

  it('control: the check finds the statuses of an envelope whose definitions are removed', async () => {
    const text = await run(['regime', 'waves']);
    const json = JSON.parse((await run(['regime', 'waves', '--json'])).stdout);
    delete json.definitions;
    expect(undefinedStatuses(text.stdout, json)).toEqual(expect.arrayContaining(['unknown', 'vacuous']));
  });

  it('control: prose that contains a lower-case status word is not a status', () => {
    expect([...jsonStatuses({ epistemics: 'an unknown verdict is not valid' }, 'regime')]).toEqual([]);
    expect([...jsonStatuses({ verdict: 'valid' }, 'regime')]).toEqual(['valid']);
    expect([...jsonStatuses({ verdict: 'decoy' }, 'discover')]).toEqual(['adjudicated-decoy']);
    expect([...jsonStatuses({ verdict: 'decoy' }, 'audit')]).toEqual(['decoy']);
  });
});

describe('audit I13: one glossary, reached by upt help statuses', () => {
  const REQUIRED = [
    'VACUOUS', 'UNKNOWN', 'unchecked', 'VIOLATED', 'valid', 'ADEQUATE', 'INADEQUATE', 'UNDETERMINED',
    'NEITHER', 'DECOY', 'NOT COVERED', 'no composite claim', 'promising', 'inert', 'contradictory',
    'reproduced', 'differs', 'not replayable', 'checked', 'refuted', 'unresolved',
  ];

  it('defines every status word the audit names, each once', () => {
    for (const w of REQUIRED) expect(keyFor(w, ''), w).toBeDefined();
    // Within one command a word names one status.
    const commands = new Set(STATUS_GLOSSARY.flatMap((s) => s.commands));
    for (const c of commands) {
      const words = STATUS_GLOSSARY.filter((s) => s.commands.includes(c)).flatMap((s) => [...new Set(s.words.map((w) => w.toLowerCase()))]);
      expect(new Set(words).size, c).toBe(words.length);
    }
    expect(new Set(STATUS_GLOSSARY.map((s) => s.key)).size).toBe(STATUS_GLOSSARY.length);
  });

  it('prints each word and its meaning', async () => {
    const r = await run(['help', 'statuses']);
    expect(r.code).toBe(0);
    for (const s of STATUS_GLOSSARY) {
      expect(r.stdout).toContain(s.words.join(' / '));
      expect(r.stdout).toContain(s.meaning);
    }
    expect((await run(['help'])).stdout).toContain('upt help statuses');
  });

  it("audit's DECOY definition is the glossary's", async () => {
    const env = JSON.parse((await run(['audit', '--json'])).stdout);
    expect(env.result.definitions.decoy).toBe(STATUS_GLOSSARY.find((s) => s.key === 'decoy')!.meaning);
  });

  it('a record that states no inequality does not begin its line with valid', async () => {
    const r = await run(['regime', 'waves']);
    expect(r.stdout).toMatch(/\] model-string: no machine condition evaluated \(VACUOUS/);
    expect(r.stdout).not.toMatch(/: valid \(VACUOUS/);
    const env = JSON.parse((await run(['regime', 'waves', '--json'])).stdout);
    const rec = env.result.records.find((x: { id: string }) => x.id === 'model-string');
    expect(rec).toMatchObject({ vacuous: true, verdict: 'vacuous' });
  });
});
