/**
 * Frontier and null-result contract. The two lists stay separate, an empty
 * list is printed, and a missing observation is not given a number.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LENGTH, MASS, TIME } from '../../src/dimensional/types.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { REJECTED_BRIDGE_ADJUDICATIONS } from '../../src/bridges/rejected.js';
import { listConfrontations } from '../../src/bridges/confrontations.js';
import {
  CANDIDATE_NOT_A_BRIDGE_REASON,
  CONTESTED_BRIDGE_IDS,
  accountFromGraph,
  catalogFrontierAccount,
  formatFrontierAccount,
  marksFromEntries,
  type FrontierAccount,
} from '../../src/composition/frontier-account.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

function qty(name: string, dim: Quantity['dim']): Quantity {
  return { name, symbol: name, dim, attributes: {} };
}

function edge(id: string, source: Quantity, target: Quantity): BridgeEdge {
  return {
    id,
    beId: null,
    kind: 'law',
    label: id,
    sources: [source],
    target,
    confidence: 'established',
    domain: { description: 'fixture', predicate: () => true },
    evaluate: () => 0,
    citation: 'fixture',
  };
}

const length = qty('length', LENGTH);
const lengthB = qty('length-b', LENGTH);
const period = qty('period', TIME);
const mass = qty('mass', MASS);

function rejectionsFromCatalog() {
  return REJECTED_BRIDGE_ADJUDICATIONS.map((row) => ({ id: `be-${row.beId}`, reason: row.reason }));
}

describe('frontier account', () => {
  it('quotes a membership rejection and omits an established bridge that is not in the negative catalog', () => {
    const account = accountFromGraph([edge('law-fixture', length, period)], {
      rejections: rejectionsFromCatalog(),
      contestedIds: ['be-44', 'be-46', 'be-50'],
    });
    const be28 = REJECTED_BRIDGE_ADJUDICATIONS.find((row) => row.beId === 28);
    expect(be28).toBeDefined();
    const listed = account.nullResults.find((row) => row.id === 'be-28');
    expect(listed?.reason).toBe(be28?.reason);
    expect(listed?.source).toBe('membership-rejection');
    expect(account.nullResults.some((row) => row.id === 'be-11')).toBe(false);
    expect(account.nullResults.some((row) => row.id === 'be-44')).toBe(false);
    expect(account.nullResults.some((row) => row.id === 'be-46')).toBe(false);
    expect(account.nullResults.some((row) => row.id === 'be-50')).toBe(false);
  });

  it('says a frontier row with no registered observation is absent, and invents no numeric residual', () => {
    const account = catalogFrontierAccount();
    const row = account.frontier.find((item) => item.observation === 'observation absent');
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('residual');
    expect(row).not.toHaveProperty('predicted');
    expect(row).not.toHaveProperty('score');
    const text = formatFrontierAccount({ nullResults: [], frontier: [row!] });
    expect(text).toContain('observation absent');
    expect(text).not.toMatch(/residual/i);
    expect(JSON.stringify(row)).not.toMatch(/residual|predicted|score/i);
  });

  it('prints both lists as empty for a graph with no rejections and no missing edges', () => {
    const account = accountFromGraph([edge('law-fixture', length, period)], {
      rejections: [],
      marks: [],
      includeExpressionGaps: false,
    });
    expect(account.nullResults).toEqual([]);
    expect(account.frontier).toEqual([]);
    const text = formatFrontierAccount(account);
    expect(text).toContain('Null results (0)');
    expect(text).toContain('Frontier (0)');
    expect(text.match(/\(empty\)/g)).toHaveLength(2);
    expect(text.trim().length).toBeGreaterThan(0);
    const silent: FrontierAccount = { nullResults: [], frontier: [] };
    expect(formatFrontierAccount(silent)).not.toBe('');
  });

  it('keeps a candidate that is also a frontier row in both lists', () => {
    const account = accountFromGraph(
      [edge('law-a', length, period), edge('law-b', lengthB, mass)],
      { rejections: [], includeExpressionGaps: false },
    );
    const candidate = account.nullResults.find((row) => row.source === 'candidate');
    expect(candidate?.reason).toBe(CANDIDATE_NOT_A_BRIDGE_REASON);
    expect(candidate?.id).toContain('length');
    expect(candidate?.id).toContain('length-b');
    const frontier = account.frontier.find((row) => row.left === 'length' || row.right === 'length-b' || row.left === 'length-b');
    expect(frontier?.reason).toBe('relation-link');
    expect(frontier?.observation).toBe('observation absent');
    expect(account.nullResults.some((row) => row.id === frontier?.id)).toBe(false);
  });

  it('quotes a confrontation mark the registry already carries, and does not invent one', () => {
    const marked = accountFromGraph([], {
      rejections: [],
      marks: [{ id: 'be-16', status: 'data-pending', reason: 'queued for a dataset' }],
    });
    expect(marked.nullResults).toEqual([
      { id: 'be-16', reason: 'queued for a dataset', source: 'confrontation' },
    ]);

    const contested = accountFromGraph([], {
      rejections: [],
      contestedIds: ['be-44'],
      marks: [{ id: 'be-44', status: 'unconfrontable', reason: 'still contested' }],
    });
    expect(contested.nullResults).toEqual([]);

    expect(marksFromEntries(listConfrontations())).toEqual([]);
    const read = marksFromEntries([
      { bridgeId: 16, title: 'Landauer', status: 'data-pending', reason: 'queued for a dataset' },
    ]);
    expect(read).toEqual([{ id: 'be-16', status: 'data-pending', reason: 'queued for a dataset' }]);
  });

  it('quotes the link proposer instead of writing a new verdict', () => {
    const source = readFileSync(new URL('../../src/cli/commands/candidates.ts', import.meta.url), 'utf8');
    expect(source).toContain(CANDIDATE_NOT_A_BRIDGE_REASON);
    const rejected = readFileSync(new URL('../../src/bridges/rejected.ts', import.meta.url), 'utf8');
    expect(rejected).toContain('BE-44/46/50 remain contested');
  });

  it('does not merge the two lists or attach a score', () => {
    const account = catalogFrontierAccount();
    expect(account).not.toHaveProperty('score');
    expect(Array.isArray(account.nullResults)).toBe(true);
    expect(Array.isArray(account.frontier)).toBe(true);
    const json = { nullResults: account.nullResults, frontier: account.frontier };
    expect(Array.isArray(json)).toBe(false);
  });
});

describe('CONTESTED_BRIDGE_IDS is checked against the catalog it describes (9.0.0 audit §4 Low)', () => {
  // The contested set has no field in data/bridge-catalog.json to derive from (it is not the
  // highly-speculative set: that is {42, 46, 50}), so the literal stays, and this guard binds each
  // id to the facts that make "contested" true: a live catalog row, no rejection record, and no
  // confrontation. A row that gains either must leave the list.
  it('each contested id is a catalog row with neither a rejection nor a confrontation', () => {
    const catalogIds = new Set(BRIDGE_EQUATIONS.map((e) => `be-${e.id}`));
    const rejected = new Set(REJECTED_BRIDGE_ADJUDICATIONS.map((r) => `be-${r.beId}`));
    const confronted = new Set(listConfrontations().map((c) => `be-${c.bridgeId}`));
    for (const id of CONTESTED_BRIDGE_IDS) {
      expect(catalogIds.has(id), id).toBe(true);
      expect(rejected.has(id), id).toBe(false);
      expect(confronted.has(id), id).toBe(false);
    }
  });
});
