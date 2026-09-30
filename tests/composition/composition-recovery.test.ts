/**
 * Composition-derived recovery: a chain of two symbolic edges, compared
 * with the same normal form the single-bridge linkage uses.
 *
 * A chain is not a pre-declared restatement. Even when the second edge's
 * catalog id is the canonical's `restatesBridge`, the chain is `recovers`.
 * Dimensionful cancellation is not applied, so the registered CT-1 and
 * CT-1b chains stay structural misses. That negative result is the scan.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { TEMPERATURE } from '../../src/dimensional/types.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import { be12Edge, be16Edge, be42Edge, be42ViaRsEdge, lawSchwarzschildRadius } from '../../src/composition/edges/calibration.js';
import { temperatureQ, massQ } from '../../src/composition/quantities.js';
import { scanCompositionRecovery } from '../../src/composition/composition-recovery.js';

const sym = (name: string, dim: typeof TEMPERATURE): ExprNode => ({
  kind: 'symbol',
  name,
  dim,
});

describe('scanCompositionRecovery', () => {
  it('a chain that matches a canonical is recovers, including when the second edge is that canonical restatement', () => {
    const first: BridgeEdge = {
      ...be16Edge,
      id: 'identity-temperature',
      beId: null,
      sources: [massQ],
      target: temperatureQ,
      symbolic: sym('temperature', TEMPERATURE),
      evaluate: () => 0,
    };
    const scan = scanCompositionRecovery([first, be16Edge]);
    expect(scan.pairs.map((p) => `${p.firstId}->${p.secondId}`)).toEqual([
      'identity-temperature->be-16',
    ]);
    expect(scan.hits).toEqual([
      {
        firstId: 'identity-temperature',
        secondId: 'be-16',
        canonicalId: 'CE-landauer',
        classification: 'recovers',
      },
    ]);
  });

  it('a same-dimension chain that is not the canonical form is examined and is not a hit', () => {
    const summed: ExprNode = {
      kind: 'op',
      op: '+',
      args: [sym('temperature', TEMPERATURE), sym('temperature', TEMPERATURE)],
    };
    const first: BridgeEdge = {
      ...be16Edge,
      id: 'summed-temperature',
      beId: null,
      sources: [massQ],
      target: temperatureQ,
      symbolic: summed,
      evaluate: () => 0,
    };
    const scan = scanCompositionRecovery([first, be16Edge]);
    expect(scan.pairs).toHaveLength(1);
    expect(scan.hits).toEqual([]);
  });

  it('the catalog chains are searched, and the registered ones are not structural matches', () => {
    const scan = scanCompositionRecovery();
    expect(scan.pairs.map((p) => `${p.firstId}->${p.secondId}`)).toEqual([
      'be-12->be-11-zurek',
      'be-42->be-12',
      'be-42->be-16',
      'be-42->be-33',
      'be-42-via-rs->be-12',
      'be-42-via-rs->be-16',
      'be-42-via-rs->be-33',
      'law-schwarzschild-radius->be-42-via-rs',
    ]);
    expect(scan.hits).toEqual([]);
    // The three chains above are real edges, so a scanner that examined
    // nothing cannot pass this file.
    expect(be42Edge.symbolic).toBeDefined();
    expect(be16Edge.symbolic).toBeDefined();
    expect(be42ViaRsEdge.symbolic).toBeDefined();
    expect(lawSchwarzschildRadius.symbolic).toBeDefined();
    expect(be12Edge.symbolic).toBeDefined();
  });

  it('upt recover prints the chain scan and the json carries the same pairs', async () => {
    const lines: string[] = [];
    const sink = (s?: string) => lines.push((s ?? '') + '\n');
    const io = { out: sink, err: sink, write: (s: string) => lines.push(s) };
    expect(await runCli(['recover'], io)).toBe(0);
    const text = lines.join('');
    expect(text).toContain('Composition-derived recovery');
    expect(text).toContain('never restates-canonical');
    expect(text).toMatch(/\d+ pairs examined, 0 structural matches/);
    expect(text).not.toContain('be-42 -> be-16');

    lines.length = 0;
    expect(await runCli(['recover', '--json'], io)).toBe(0);
    const parsed = JSON.parse(lines.join('')) as {
      compositionRecovery: { pairs: { firstId: string; secondId: string }[]; hits: unknown[] };
    };
    const keys = parsed.compositionRecovery.pairs.map((p) => `${p.firstId}->${p.secondId}`);
    expect(keys).toContain('be-42->be-16');
    expect(parsed.compositionRecovery.hits).toEqual([]);
  });
});
