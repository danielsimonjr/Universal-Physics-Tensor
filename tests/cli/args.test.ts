import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../dist/cli/args.js';
import { UsageError } from '../../dist/cli/errors.js';
import type { FlagSpec } from '../../dist/cli/args.js';

const SPECS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--formula', valueStyle: 'next' },
  { name: '--equation', valueStyle: 'either' },
  { name: '--proposed', valueStyle: 'none' },
  { name: '--anchor', valueStyle: 'attached', repeatable: true },
];

describe('parseArgs', () => {
  it('rejects unknown flags with a message naming the flag and the command', () => {
    expect(() => parseArgs('discover', ['--sourc=canonical'], SPECS)).toThrow(UsageError);
    try {
      parseArgs('discover', ['--sourc=canonical'], SPECS);
      expect.fail('expected parseArgs to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UsageError);
      expect((err as Error).message).toBe(
        "unknown flag '--sourc' for 'discover' (see upt help discover)"
      );
    }
  });

  it('parses attached-style --source=value', () => {
    const result = parseArgs('discover', ['--source=canonical'], SPECS);
    expect(result.flags.get('source')).toEqual(['canonical']);
    expect(result.positionals).toEqual([]);
  });

  it('parses next-token --formula value', () => {
    const result = parseArgs('discover', ['--formula', 'E=mc^2'], SPECS);
    expect(result.flags.get('formula')).toEqual(['E=mc^2']);
    expect(result.positionals).toEqual([]);
  });

  it('throws UsageError when a next-token value is missing (flag is the last token)', () => {
    expect(() => parseArgs('discover', ['--formula'], SPECS)).toThrow(UsageError);
  });

  it('throws UsageError when a next-only flag is given an attached value', () => {
    try {
      parseArgs('discover', ['--formula=X'], SPECS);
      expect.fail('expected parseArgs to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UsageError);
      expect((err as Error).message).toBe(
        "flag '--formula' does not accept an attached value; use '--formula VALUE' for 'discover' (see upt help discover)"
      );
    }
  });

  it('throws UsageError when the next token looks like a flag (starts with --)', () => {
    expect(() => parseArgs('discover', ['--formula', '--proposed'], SPECS)).toThrow(UsageError);
  });

  it('accepts either-style attached form --equation=value', () => {
    const result = parseArgs('discover', ['--equation=X'], SPECS);
    expect(result.flags.get('equation')).toEqual(['X']);
  });

  it('accepts either-style next-token form --equation value', () => {
    const result = parseArgs('discover', ['--equation', 'X'], SPECS);
    expect(result.flags.get('equation')).toEqual(['X']);
  });

  it('either-style + optionalValue stores "" when the flag is the last token', () => {
    const specs: FlagSpec[] = [{ name: '--equation', valueStyle: 'either', optionalValue: true }];
    const result = parseArgs('map', ['--equation'], specs);
    expect(result.flags.get('equation')).toEqual(['']);
  });

  it('either-style + optionalValue stores "" when the next token is another --flag', () => {
    const specs: FlagSpec[] = [
      { name: '--equation', valueStyle: 'either', optionalValue: true },
      { name: '--proposed', valueStyle: 'none' },
    ];
    const result = parseArgs('map', ['--equation', '--proposed'], specs);
    expect(result.flags.get('equation')).toEqual(['']);
    expect(result.flags.get('proposed')).toEqual(['']);
  });

  it('either-style WITHOUT optionalValue still throws when the value is missing', () => {
    expect(() => parseArgs('discover', ['--equation'], SPECS)).toThrow(UsageError);
  });

  it('parses none-style bare --proposed, storing "" as its value', () => {
    const result = parseArgs('discover', ['--proposed'], SPECS);
    expect(result.flags.get('proposed')).toEqual(['']);
  });

  it('throws UsageError when a none-style flag is given =value', () => {
    expect(() => parseArgs('discover', ['--proposed=x'], SPECS)).toThrow(UsageError);
  });

  it('throws UsageError when an attached-only flag is given bare', () => {
    expect(() => parseArgs('discover', ['--source'], SPECS)).toThrow(UsageError);
  });

  it('accumulates repeatable --anchor values in order', () => {
    const result = parseArgs('discover', ['--anchor=a=1', '--anchor=b=2'], SPECS);
    expect(result.flags.get('anchor')).toEqual(['a=1', 'b=2']);
  });

  it('throws UsageError on a repeated non-repeatable --source', () => {
    expect(() => parseArgs('discover', ['--source=a', '--source=b'], SPECS)).toThrow(UsageError);
  });

  it('passes positionals through untouched and in original order', () => {
    const result = parseArgs(
      'discover',
      ['length:distance', 'mass=5', 'bare', '--source=canonical', 'trailing'],
      SPECS
    );
    expect(result.positionals).toEqual(['length:distance', 'mass=5', 'bare', 'trailing']);
    expect(result.flags.get('source')).toEqual(['canonical']);
  });

  it('does not treat a positional containing "=" as a flag (no -- prefix required)', () => {
    const result = parseArgs('discover', ['T=E'], SPECS);
    expect(result.positionals).toEqual(['T=E']);
    expect(result.flags.size).toBe(0);
  });

  it('a bare "--" ends the options: every later token is a positional, flags included', () => {
    const r = parseArgs('discover', ['a', '--', '--source=canonical', '--bogus', 'b'], SPECS);
    expect(r.positionals).toEqual(['a', '--source=canonical', '--bogus', 'b']);
    expect(r.flags.size).toBe(0);
  });
});
