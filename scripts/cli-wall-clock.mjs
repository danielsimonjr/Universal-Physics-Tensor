#!/usr/bin/env node
/**
 * CLI cold-start wall clock: three runs of each named `node bin/upt.mjs`
 * command, one median line per command in milliseconds. Plain Node, no
 * TypeScript, no output file; exits 0.
 *
 * Usage: node scripts/cli-wall-clock.mjs
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const RUNS = 3;

const COMMANDS = [
  ['version', ['version']],
  ['help', ['help']],
  ['evaluate be-63 mu_e=2', ['evaluate', 'be-63', 'mu_e=2']],
  ['audit', ['audit']],
];

/** Median of an odd-sized list of numbers. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) / 2];
}

/** One timed run of `node bin/upt.mjs <args>`, wall clock in ms. */
function timeRun(args) {
  const started = process.hrtime.bigint();
  const result = spawnSync(process.execPath, ['bin/upt.mjs', ...args], {
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
