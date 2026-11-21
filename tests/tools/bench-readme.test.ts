/**
 * `bench/README.md` says the Files table is every `*.bench.ts` in `bench/`.
 * A file missing from the table, or listed and absent, is a defect. This test
 * is that defect's detector: the table and the directory are the same set.
 *
 * The CONTROL cases mutate the README text and re-parse it. A control that
 * only shuffled the already-parsed `listed` array would still pass if
 * `listedBenchFiles` ignored its argument and returned `onDisk`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const benchDir = join(root, 'bench');
const readme = readFileSync(join(benchDir, 'README.md'), 'utf8');

/** Filenames in the Files table (`| \`name.bench.ts\` | …`). */
function listedBenchFiles(text: string): string[] {
  const section = text.split(/^## /m).find((block) => block.startsWith('Files\n') || block.startsWith('Files\r\n'));
  expect(section, 'bench/README.md has a ## Files section').toBeDefined();
  return [...section!.matchAll(/^\| `([^`\n]+\.bench\.ts)` \|/gm)].map((m) => m[1]!);
}

const listed = listedBenchFiles(readme).sort();
const onDisk = readdirSync(benchDir)
  .filter((name) => name.endsWith('.bench.ts'))
  .sort();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('bench/README.md Files table matches bench/*.bench.ts', () => {
  it('finds bench files on disk and in the table (the equality is not vacuously true of two empty lists)', () => {
    expect(onDisk.length).toBeGreaterThan(0);
    expect(listed.length).toBeGreaterThan(0);
  });

  it('the table and the directory are the same set', () => {
    expect(listed).toEqual(onDisk);
  });

  it('CONTROL: dropping a file that is on disk from the table fails the equality', () => {
    expect(onDisk.length).toBeGreaterThan(0);
    const dropped = onDisk[0]!;
    const edited = readme.replace(new RegExp(`^\\| \`${escapeRegExp(dropped)}\` \\|.*\\n`, 'm'), '');
    expect(edited).not.toBe(readme);
    expect(listedBenchFiles(edited).sort()).not.toEqual(onDisk);
  });

  it('CONTROL: listing a file that is not on disk fails the equality', () => {
    const separator = '|---|---|';
    expect(readme).toContain(separator);
    const edited = readme.replace(separator, `${separator}\n| \`ghost.bench.ts\` | ghost |`);
    expect(edited).not.toBe(readme);
    expect(listedBenchFiles(edited).sort()).not.toEqual(onDisk);
  });
});
