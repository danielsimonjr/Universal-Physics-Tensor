/**
 * Phase 2: the energy-to-kelvin rule lives in one function.
 * `alignTemperatureBinding` and `TEMPERATURE_BINDING_NAMES` appear only in
 * `src/numerical/binding-value.ts`, and the only call is inside
 * `readNamedBinding`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
}

function functionSpan(src: string, name: string): { start: number; end: number } {
  const match = new RegExp(`function ${name}\\s*\\(`).exec(src);
  if (match === null || match.index === undefined) throw new Error(`missing function ${name}`);
  const open = src.indexOf('{', match.index);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: match.index, end: i };
    }
  }
  throw new Error(`unbalanced function ${name}`);
}

describe('temperature reading has one owner', () => {
  it('calls alignTemperatureBinding only from readNamedBinding', () => {
    const hits = sourceFiles('src')
      .filter((path) => {
        const text = readFileSync(path, 'utf8');
        return text.includes('alignTemperatureBinding') || text.includes('TEMPERATURE_BINDING_NAMES');
      })
      .map((path) => path.replaceAll('\\', '/'));
    expect(hits.sort()).toEqual(['src/numerical/binding-value.ts']);
    const kelvin = sourceFiles('src').filter((path) => readFileSync(path, 'utf8').includes('kelvinScale'));
    expect(kelvin).toEqual([]);

    const src = readFileSync('src/numerical/binding-value.ts', 'utf8');
    const owner = functionSpan(src, 'readNamedBinding');
    const definition = functionSpan(src, 'alignTemperatureBinding');
    const calls = [...src.matchAll(/\balignTemperatureBinding\s*\(/g)];
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      const at = call.index ?? -1;
      const isDefinition = at >= definition.start && at < src.indexOf('{', definition.start);
      const isOwnerCall = at > owner.start && at < owner.end;
      expect(isDefinition || isOwnerCall).toBe(true);
    }
    expect(calls.some((call) => (call.index ?? -1) > owner.start && (call.index ?? -1) < owner.end)).toBe(true);
    expect(src).not.toMatch(/export function alignTemperatureBinding/);
  });
});
