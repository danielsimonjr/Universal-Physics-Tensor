/**
 * `bench/README.md` says the Files table is every `*.bench.ts` in `bench/`.
 * A file missing from the table, or listed and absent, is a defect. This test
 * is that defect's detector: the table and the directory are the same set.
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
    const dropped = listed.filter((name) => name !== onDisk[0]);
    expect(dropped).not.toEqual(onDisk);
  });

  it('CONTROL: listing a file that is not on disk fails the equality', () => {
    expect(listed.concat(['ghost.bench.ts']).sort()).not.toEqual(onDisk);
  });
});
