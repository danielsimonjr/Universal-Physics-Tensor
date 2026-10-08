/**
 * The unit table is data. `data/units.json` holds every row, prefix, refused
 * spelling, prefix letter, affine scale and note; `units.ts` holds the
 * grammar. The file is validated against its schema at load, and here.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { constantTables } from '../../src/cli/record-tables.js';
import { M_SUN_IAU_SI, M_SUN_SI } from '../../src/core/constants.js';
import { schemaProblems, type JsonSchema } from '../../src/core/json-schema.js';
import { decimalScale, ratioScale, readScaleExpression, scaleToNumber, solidusSides } from '../../src/dimensional/exact-scale.js';
import { readUnitFile, UNIT_DATA } from '../../src/dimensional/unit-data.js';
import { convertValue, parseUnit, readUnit, unitConventionNotes, unitTables, type AffineTemperature } from '../../src/dimensional/units.js';
import { constantRecord } from '../../src/dimensional/symbolic-constants.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const text = readFileSync(resolve(root, 'data/units.json'), 'utf8');
const schema = JSON.parse(readFileSync(resolve(root, 'data/units.schema.json'), 'utf8')) as JsonSchema;
const file = JSON.parse(text) as Record<string, unknown> & {
  units: { symbols: string[]; scale: string; dimension: Record<string, number>; prefixable: boolean }[];
  refused: { symbol: string; reason: string }[];
  prefixLetterUnits: { comment: string; letters: string[] };
  spellingNotes: { spelling: string; note: string }[];
};
const edited = (change: (copy: typeof file) => void): string => {
  const copy = JSON.parse(text) as typeof file;
  change(copy);
  return JSON.stringify(copy);
};

describe('data/units.json is the unit table', () => {
  it('matches data/units.schema.json', () => {
    expect(schemaProblems(schema, file)).toEqual([]);
  });

  it('units.ts states no row, prefix, refused spelling or note of its own', () => {
    const code = readFileSync(resolve(root, 'src/dimensional/units.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/\[\s*'[^']+',\s*row\(/);
    expect(code).not.toMatch(/'0\.45359237'|'9\.80665'|'273\.15'|'1e-6'/);
    expect(code).not.toMatch(/is a logarithmic unit|is a milliyear|bare G is/);
  });

  it('reads every row of the file, one symbol each', () => {
    const symbols = file.units.flatMap((row) => row.symbols);
    expect(new Set(symbols).size).toBe(symbols.length);
    expect([...UNIT_DATA.units.keys()].sort()).toEqual([...symbols].sort());
    expect([...UNIT_DATA.refused.keys()]).toEqual(file.refused.map((row) => row.symbol));
    expect([...UNIT_DATA.prefixLetterUnits]).toEqual(file.prefixLetterUnits.letters);
  });

  it('reads the exact scales the rows state', () => {
    const exact = (symbol: string) => UNIT_DATA.units.get(symbol)!.scale;
    // psi = 0.45359237 × 9.80665 / 0.0254², every digit kept.
    expect(exact('psi')).toEqual(readScaleExpression('0.45359237*9.80665/0.0254^2', () => undefined));
    expect(exact('torr')).toEqual(ratioScale(101325, 760));
    expect(exact('BTU')).toEqual(readScaleExpression('4.1868*453.59237/1.8', () => undefined));
    expect(scaleToNumber(exact('deg'))).toBe(Math.PI / 180);
    expect(exact('deg').irrational).toBe(Math.PI);
    expect(scaleToNumber(exact('Msun_iau'))).toBe(M_SUN_IAU_SI);
    expect(scaleToNumber(exact('Msun'))).toBe(M_SUN_SI);
    expect(exact('Msun_iau')).toEqual(decimalScale(String(constantRecord('Msun_iau')!.value)));
    // Constants are named by their registry spelling: e is the elementary charge, c the speed of light.
    expect(file.units.find((row) => row.symbols.includes('eV'))!.scale).toBe('e');
    expect(scaleToNumber(exact('eV'))).toBe(constantRecord('e')!.value);
    expect(scaleToNumber(exact('ly'))).toBe(constantRecord('c')!.value * 365.25 * 86400);
    // ln 2 is an irrational row of the registry, so the bit carries it as the irrational factor, not a decimal.
    expect(constantRecord('ln2')!.irrational).toBe(true);
    expect(exact('bit')).toEqual({ num: 1n, den: 1n, irrational: Math.LN2 });
    expect(convertValue('1 g/cm^3', 'kg/m^3').value).toBe(1000);
    expect(parseUnit('kcal').scale).toBe(4184);
  });

  it('fills a note placeholder from the registered constant of that spelling', () => {
    expect(unitConventionNotes('Msun')[0]).toContain(`${M_SUN_SI} kg`);
    expect(unitConventionNotes('u')[0]).toContain(`${constantRecord('m_u')!.value} kg`);
    expect(unitConventionNotes('kg')).toEqual([]);
  });

  it('the affine id enum is the public AffineTemperature type, both ways', () => {
    // A Record over the union fails to compile when the type gains or loses an id.
    const typed: Record<AffineTemperature, true> = { celsius: true, fahrenheit: true };
    const affine = (schema.properties as Record<string, JsonSchema>).affine!;
    const row = ((affine.properties as Record<string, JsonSchema>).scales!.items as JsonSchema).properties as Record<string, JsonSchema>;
    expect([...(row.id!.enum as string[])].sort()).toEqual(Object.keys(typed).sort());
    expect(UNIT_DATA.affine.map((r) => r.id).sort()).toEqual(Object.keys(typed).sort());
  });

  it('is covered by the CLI record fingerprint, file and rows', async () => {
    const sha = createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
    expect(unitTables().sourceSha256).toBe(sha);
    const { tables } = await constantTables();
    expect(tables['dimensional/units']!.values['data/units.json.sha256']).toBe(sha);
    expect(tables['dimensional/units']!.values['psi.scale']).toBe(parseUnit('psi').scale);
  });
});

describe('a unit file that breaks a rule does not load', () => {
  it('a field of the wrong type fails the schema', () => {
    expect(() => readUnitFile(edited((f) => ((f.units[0] as Record<string, unknown>).prefixable = 'yes')), schema)).toThrow(
      /\$\.units\[0\]\.prefixable: expected boolean/,
    );
    expect(() => readUnitFile(edited((f) => ((f.units[0] as Record<string, unknown>).extra = 1)), schema)).toThrow(/unexpected property/);
  });

  it('a symbol spelled twice, an unknown scale name, and a refused unit are errors', () => {
    expect(() => readUnitFile(edited((f) => f.units.push({ ...f.units[0]! })), schema)).toThrow(/spelled by two rows/);
    expect(() => readUnitFile(edited((f) => (f.units[0]!.scale = 'furlong')), schema)).toThrow(/names 'furlong'/);
    // A constant is named by its registry spelling; a core/constants.ts export name is not a spelling.
    expect(() => readUnitFile(edited((f) => (f.units[0]!.scale = 'G_SI')), schema)).toThrow(/names 'G_SI'/);
    expect(() => readUnitFile(edited((f) => f.refused.push({ symbol: 'm', reason: 'no' })), schema)).toThrow(/refused 'm' is also a unit/);
  });

  it('a prefix letter that is not a unit, and a note naming no constant, are errors', () => {
    expect(() => readUnitFile(edited((f) => f.prefixLetterUnits.letters.push('k')), schema)).toThrow(/prefix letter 'k'/);
    expect(() => readUnitFile(edited((f) => f.spellingNotes.push({ spelling: 'x', note: '{NOT_A_CONSTANT}' })), schema)).toThrow(
      /names 'NOT_A_CONSTANT'/,
    );
  });

  it('a shared scale may not reuse pi or a registered constant spelling', () => {
    expect(() => readUnitFile(edited((f) => ((f.scales as Record<string, string>).c = '2')), schema)).toThrow(/shared scale 'c' is also a registered constant/);
    expect(() => readUnitFile(edited((f) => ((f.scales as Record<string, string>).pi = '3')), schema)).toThrow(/shared scale 'pi' is also π/);
  });

  it('a shared scale defined through itself is an error', () => {
    expect(() => readUnitFile(edited((f) => ((f.scales as Record<string, string>).inch = 'inch*2')), schema)).toThrow(/in terms of itself/);
  });
});

describe('a scale expression and a unit text read a / the same way', () => {
  const none = () => undefined;

  it('everything after the first / is the denominator (ISO 80000-1)', () => {
    expect(solidusSides('W/m*K')).toEqual({ numerator: 'W', denominator: 'm*K' });
    expect(solidusSides('km/s/Mpc')).toEqual({ numerator: 'km', denominator: 's*Mpc' });
    expect(solidusSides('W/(m*K)')).toEqual({ numerator: 'W', denominator: 'm*K' });
    expect(solidusSides('m*s')).toEqual({ numerator: 'm*s', denominator: '' });
  });

  it('a/b*c is a/(b*c) in a scale, as W/m*K is W/(m*K) in a unit', () => {
    expect(readScaleExpression('8/2*2', none)).toEqual(ratioScale(2, 1));
    expect(readScaleExpression('8/2/2', none)).toEqual(ratioScale(2, 1));
    expect(readScaleExpression('3*4/6', none)).toEqual(ratioScale(2, 1));
    expect(readUnit('W/m*K').dim).toEqual(readUnit('W/(m*K)').dim);
    // The same text through both readers: 1000 g per (100 cm · 10 mm) is 1 kg/m².
    expect(readScaleExpression('1000/100*10', none)).toEqual(ratioScale(1, 1));
    expect(parseUnit('kg/cm*mm').scale).toBe(readUnit('kg/(cm*mm)').scale);
  });

  it('a factor that is not a decimal or a name is an error', () => {
    expect(() => readScaleExpression('2/', none)).toThrow(/not a product of factors/);
    expect(() => readScaleExpression('/2', none)).toThrow(/not a product of factors/);
  });
});

describe('core/json-schema reads the keyword subset and refuses the rest', () => {
  it('checks type, required, enum, pattern, items and $ref', () => {
    const s: JsonSchema = {
      type: 'object',
      required: ['a'],
      properties: { a: { $ref: '#/$defs/word' }, b: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: [1, 2] } } },
      $defs: { word: { type: 'string', pattern: '^[a-z]+$' } },
    };
    expect(schemaProblems(s, { a: 'ok', b: [1, 2] })).toEqual([]);
    expect(schemaProblems(s, { a: 'OK', b: [1, 1, 3] })).toEqual([
      "$.a: 'OK' does not match ^[a-z]+$",
      '$.b: items are not unique',
      '$.b[2]: 3 is not one of [1,2]',
    ]);
    expect(schemaProblems(s, {})).toEqual(["$: missing 'a'"]);
  });

  it('a keyword outside the subset is an error in the schema, not ignored', () => {
    expect(() => schemaProblems({ type: 'number', maximum: 3 }, 1)).toThrow(/keyword 'maximum'/);
  });
});
