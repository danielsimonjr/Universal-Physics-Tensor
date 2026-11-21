#!/usr/bin/env node
/**
 * CLI cold-start wall clock: three runs of each named `node bin/upt.mjs`
 * command, one median line per command in milliseconds. Plain Node, no
 * TypeScript, no output file; exits 0. The `upt` launcher is resolved from
 * this file's location, so the script works from any cwd.
 *
 * Usage: node scripts/cli-wall-clock.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const RUNS = 3;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPT = join(ROOT, 'bin', 'upt.mjs');

const COMMANDS = [
  ['version', ['version']],
  ['help', ['help']],
  ['evaluate be-63 mu_e=2', ['evaluate', 'be-63', 'mu_e=2']],
  ['audit', ['audit']],
];

/** Median of a non-empty list: the middle value, or the mean of the two central values when even. */
function median(values) {
  if (values.length === 0) throw new Error('median of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** One timed run of `node <absolute bin/upt.mjs> <args>`, wall clock in ms. */
function timeRun(args) {
  const started = process.hrtime.bigint();
  const result = spawnSync('node', [UPT, ...args], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`upt ${args.join(' ')} exited ${result.status}`);
  }
  return ms;
}

for (const [label, args] of COMMANDS) {
  const times = [];
  for (let i = 0; i < RUNS; i += 1) times.push(timeRun(args));
  console.log(`${label}: ${median(times).toFixed(1)} ms (median of ${RUNS})`);
}
