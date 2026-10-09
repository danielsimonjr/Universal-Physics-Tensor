import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');

// Regression guard (Eve, v0.24.0): the vitest suite does not import bin/upt.mjs,
// so a syntax error there (e.g. a stray backtick inside the help() template
// literal) ships green. `node --check` parses the file without executing it.
describe('upt CLI parses', () => {
  it('bin/upt.mjs has no syntax error', () => {
    expect(() => execFileSync('node', ['--check', cli], { stdio: 'pipe' })).not.toThrow();
  });
});
