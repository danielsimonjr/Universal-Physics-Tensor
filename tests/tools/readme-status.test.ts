/**
 * The README and ROADMAP count spans are stamped from the registries.
 *
 * A hand-edited number inside a span does not survive the next stamp.
 * The neighbouring figure is the control: it must come back as the live count.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { adjudicateCatalog } from '../../src/bridges/membership.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import {
  membershipSentence,
  phase4Sentence,
  stampText,
  statusFacts,
} from '../../scripts/readme-status.js';
import { CENSUS } from '../helpers/census.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('readme-status stamps', () => {
  const facts = statusFacts();
  const readme = read('README.md');
  const roadmap = read('ROADMAP.md');
  const stamped = stampText(readme, roadmap, facts);

  it('is idempotent', () => {
    const again = stampText(stamped.readme, stamped.roadmap, facts);
    expect(again).toEqual(stamped);
  });

  it('membership, edges, badge, and Phase 4 follow the registries', () => {
    const adjudication = adjudicateCatalog(BRIDGE_EQUATIONS);
    expect(facts.graphEdges).toBe(CATALOG_GRAPH.length);
    expect(facts.bridges).toBe(adjudication.bridges.length);
    expect(facts.unadjudicated).toBe(adjudication.unadjudicated.length);
    expect(membershipSentence(facts)).toBe(
      `${adjudication.bridges.length} bridges · ${adjudication.notABridges.length} not-a-bridge · ${adjudication.unadjudicated.length} unadjudicated` +
        " (by the catalog's `bridges` label tuple, not the endpoint-regime criterion)",
    );
    // Tom's second round: the sentence names the criterion the count comes from (law 4): the
    // label-tuple proxy, where the endpoint-regime criterion on the 158 relations gives 52 and 106.
    expect(membershipSentence(facts)).not.toContain('contested');
    expect(stamped.readme).toContain(`**${CATALOG_GRAPH.length} bridge edges**`);
    expect(stamped.readme).toContain(membershipSentence(facts));
    const pkg = JSON.parse(read('package.json')) as { devDependencies: { typescript: string } };
    const match = /^[\^~>=\s]*(\d+)\.(\d+)/.exec(pkg.devDependencies.typescript);
    expect(match).not.toBeNull();
    expect(stamped.readme).toContain(`TypeScript-${match![1]}.${match![2]}+`);
    expect(stamped.readme).not.toContain('TypeScript-6.0+');
    expect(phase4Sentence(facts)).toContain(`Catalog kind \`bridge\` is ${facts.kindBridge}`);
    expect(phase4Sentence(facts)).toContain(`Catalog property \`formalRef\`s are ${facts.property}`);
    // 95 is the record from before the PhysJS manifest carried kind: twenty-four catalog theorems that
    // state their equations were labelled derivation-step.
    expect(facts.kindBridge).toBe(CENSUS.formalRefs.catalogBridgeKind);
    expect(facts.property).toBe(CENSUS.formalRefs.catalogProperty);
    expect(stamped.roadmap).toContain(phase4Sentence(facts));
  });

  it('CONTROL: a stale edge count, badge, and kind count are rewritten', () => {
    const staleReadme = stamped.readme
      .replace(`**${facts.graphEdges} bridge edges**`, '**41 bridge edges**')
      .replace(`TypeScript-${facts.typescriptBadge.slice('TypeScript-'.length)}`, 'TypeScript-6.0+');
    const staleRoadmap = stamped.roadmap.replace(
      `Catalog kind \`bridge\` is ${facts.kindBridge}`,
      'Catalog kind `bridge` is 13',
    );
    const restored = stampText(staleReadme, staleRoadmap, facts);
    expect(restored.readme).toContain(`**${facts.graphEdges} bridge edges**`);
    expect(restored.readme).not.toContain('**41 bridge edges**');
    expect(restored.readme).toContain(facts.typescriptBadge);
    expect(restored.readme).not.toContain('TypeScript-6.0+');
    expect(restored.roadmap).toContain(`Catalog kind \`bridge\` is ${facts.kindBridge}`);
    expect(restored.roadmap).not.toContain('Catalog kind `bridge` is 13');
  });
});
