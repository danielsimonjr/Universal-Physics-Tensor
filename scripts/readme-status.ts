/**
 * Stamp the README development-status counts, the membership sentence, the
 * TypeScript badge, and the ROADMAP Phase 4 kind counts from the registries.
 *
 * `bun scripts/readme-status.ts` rewrites the marked spans.
 * `bun scripts/readme-status.ts --check` exits 1 when a marked span is stale.
 * The `docs-fresh` job runs `--check`. Hand-edited numbers inside a span do
 * not survive the next stamp.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRIDGE_EQUATIONS } from '../src/bridges/index.js';
import { adjudicateCatalog } from '../src/bridges/membership.js';
import { CONFRONTATIONS } from '../src/bridges/confrontations.js';
import { CATALOG_GRAPH } from '../src/composition/catalog-graph.js';
import { CANONICAL_EQUATIONS } from '../src/canonical/registry.js';
import { catalogFormalRef } from '../src/atlas/catalog-formal-ref.js';
import { ATLAS_FAMILIES } from '../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../src/atlas/derive-evidence.js';
import type { FormalRefKind } from '../src/relations/types.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export interface RefRow {
  readonly id: number;
  readonly kind: FormalRefKind;
  readonly covers: string;
}

export interface StatusFacts {
  readonly catalog: number;
  readonly idMin: number;
  readonly idMax: number;
  readonly contiguous: boolean;
  readonly status: Readonly<Record<string, number>>;
  readonly bridges: number;
  readonly notABridge: number;
  readonly unadjudicated: number;
  readonly graphEdges: number;
  readonly canonical: number;
  readonly confrontations: number;
  readonly provedAtlas: number;
  readonly counted: number;
  readonly kindBridge: number;
  readonly crossCheck: number;
  readonly property: number;
  readonly plainProperty: number;
  readonly derivationStepProperties: readonly number[];
  readonly circular: number;
  readonly unusedFiles: number;
  readonly unusedExports: number;
  readonly typescriptBadge: string;
}

const STATUS_WORDS: Readonly<Record<string, string>> = {
  established: 'established',
  speculative: 'speculative',
  'highly-speculative': 'highly speculative',
};

function typescriptBadge(): string {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    devDependencies?: { typescript?: string };
  };
  const spec = pkg.devDependencies?.typescript;
  const match = spec === undefined ? null : /^[\^~>=\s]*(\d+)\.(\d+)/.exec(spec);
  if (match === null) {
    throw new Error(`package.json devDependencies.typescript is not a version range: ${spec}`);
  }
  return `TypeScript-${match[1]}.${match[2]}+`;
}

function generatedCount(file: string, label: string): number {
  const text = readFileSync(join(root, file), 'utf8');
  const match = new RegExp(`\\*\\*${label}\\*\\*: (\\d+)`).exec(text);
  if (match === null) {
    throw new Error(`${file} does not state "**${label}**: <number>"`);
  }
  return Number(match[1]);
}

function circularCount(): number {
  const text = readFileSync(join(root, 'docs/architecture/DEPENDENCY_GRAPH.md'), 'utf8');
  if (text.includes('**No circular dependencies detected.**')) return 0;
  const match = /\*\*(\d+) circular dependenc/.exec(text);
  if (match === null) {
    throw new Error('DEPENDENCY_GRAPH.md does not state a circular-dependency count');
  }
  return Number(match[1]);
}

/** Live counts. A hardcoded copy of these numbers is what this script exists to remove. */
export function statusFacts(): StatusFacts {
  const ids = BRIDGE_EQUATIONS.map((e) => e.id);
  const idMin = Math.min(...ids);
  const idMax = Math.max(...ids);
  const status: Record<string, number> = {};
  for (const entry of BRIDGE_EQUATIONS) {
    status[entry.status] = (status[entry.status] ?? 0) + 1;
  }
  const adjudication = adjudicateCatalog(BRIDGE_EQUATIONS);
  const atlas = ATLAS_FAMILIES.flatMap((family) => family.bridges);
  const provedAtlas = atlas.filter((bridge) =>
    deriveEvidence(bridge, NO_PASSING_WITNESSES).has('formally-proved'),
  ).length;
  const rows: RefRow[] = [];
  for (const entry of BRIDGE_EQUATIONS) {
    const ref = catalogFormalRef(entry.id);
    if (ref === undefined) continue;
    rows.push({ id: entry.id, kind: ref.kind, covers: ref.covers });
  }
  const ofKind = (kind: FormalRefKind): RefRow[] => rows.filter((row) => row.kind === kind);
  const kindBridge = ofKind('bridge');
  if (kindBridge.some((row) => !row.covers.startsWith('derivation-step'))) {
    const offenders = kindBridge
      .filter((row) => !row.covers.startsWith('derivation-step'))
      .map((row) => `be-${row.id}`)
      .join(', ');
    throw new Error(`kind bridge whose covers line does not begin with derivation-step: ${offenders}`);
  }
  const properties = ofKind('property');
  const derivationStepProperties = properties
    .filter((row) => row.covers.startsWith('derivation-step'))
    .map((row) => row.id);
  return {
    catalog: BRIDGE_EQUATIONS.length,
    idMin,
    idMax,
    contiguous: idMax - idMin + 1 === ids.length && new Set(ids).size === ids.length,
    status,
    bridges: adjudication.bridges.length,
    notABridge: adjudication.notABridges.length,
    unadjudicated: adjudication.unadjudicated.length,
    graphEdges: CATALOG_GRAPH.length,
    canonical: CANONICAL_EQUATIONS.length,
    confrontations: CONFRONTATIONS.size,
    provedAtlas,
    counted: ofKind('reduction').length + ofKind('limit').length + ofKind('derivation-step').length,
    kindBridge: kindBridge.length,
    crossCheck: ofKind('cross-check').length,
    property: properties.length,
    plainProperty: properties.length - derivationStepProperties.length,
    derivationStepProperties,
    circular: circularCount(),
    unusedFiles: generatedCount('docs/architecture/unused-analysis.md', 'Potentially unused files'),
    unusedExports: generatedCount('docs/architecture/unused-analysis.md', 'Potentially unused exports'),
    typescriptBadge: typescriptBadge(),
  };
}

function statusPhrase(status: Readonly<Record<string, number>>): string {
  const preferred = ['established', 'speculative', 'highly-speculative'];
  const keys = [
    ...preferred.filter((key) => status[key] !== undefined),
    ...Object.keys(status).filter((key) => !preferred.includes(key)).sort(),
  ];
  return keys
    .map((key) => {
      const word = STATUS_WORDS[key];
      if (word === undefined) {
        throw new Error(`catalog status '${key}' has no README word; add it to STATUS_WORDS`);
      }
      return `${status[key]} ${word}`;
    })
    .join(', ');
}

function catalogCell(facts: StatusFacts): string {
  const range = facts.contiguous
    ? `BE-${facts.idMin}…${facts.idMax}`
    : `ids ${facts.idMin}–${facts.idMax}, not a contiguous span`;
  return (
    `**${facts.catalog} entries (${range})**: ${statusPhrase(facts.status)}; ` +
    'the JSON artifact is freshness-tested against the TypeScript registry'
  );
}

function propertyClause(facts: StatusFacts): string {
  if (facts.derivationStepProperties.length === 0) return '';
  const ids = facts.derivationStepProperties.map((id) => `\`be-${id}\``).join(' and ');
  const verb = facts.derivationStepProperties.length === 1 ? 'is' : 'are';
  const noun = facts.derivationStepProperties.length === 1 ? 'a property' : 'properties';
  const line = facts.derivationStepProperties.length === 1 ? 'line begins' : 'lines begin';
  return `, and ${ids} ${verb} ${noun} whose covers ${line} with \`derivation-step\``;
}

export function formalCell(facts: StatusFacts): string {
  return (
    `**${facts.provedAtlas}** atlas bridges derive \`formally-proved\` from a reviewed \`lean4-physjs\` reference. ` +
    `**${facts.counted}** catalog equations carry a counted reference and do not light that tag. ` +
    `**${facts.kindBridge}** state the catalogued equation, so the kind is \`bridge\` while the covers line still begins with \`derivation-step\`; ` +
    'passing one to `deriveEvidence` lights `formally-proved`, and the catalog path still omits it. ' +
    `**${facts.crossCheck}** carry a cross-check and **${facts.plainProperty}** carry a property` +
    `${propertyClause(facts)}. Nested statements are not second references. The pin and the split are ` +
    '[`NOTES.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/NOTES.md)'
  );
}

export function developmentTable(facts: StatusFacts): string {
  const cycles =
    facts.circular === 0
      ? '**0 circular dependencies**'
      : facts.circular === 1
        ? '**1 circular dependency**'
        : `**${facts.circular} circular dependencies**`;
  const fileWord = facts.unusedFiles === 1 ? 'file' : 'files';
  const exportWord = facts.unusedExports === 1 ? 'export' : 'exports';
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['Surface', 'Current state'],
    ['Bridge catalog', catalogCell(facts)],
    [
      'Empirical spine',
      `**${facts.confrontations} committed confrontations**, exposed through \`upt confront\` with rigor/caveat metadata`,
    ],
    [
      'Composition layer',
      `**${facts.graphEdges} bridge edges** plus the canonical L-layer graph; dimensional, symbolic, discovery, consequence, and visualization tooling`,
    ],
    [
      'Canonical reference layer',
      `**${facts.canonical} canonical equations** used as the non-speculative answer-key layer for bridge recovery/linkage`,
    ],
    [
      'Architecture',
      `Generated dependency graph reports ${cycles}. The unused-analysis report lists **${facts.unusedFiles}** ${fileWord} and **${facts.unusedExports}** ${exportWord} with no importer. Both reports are regenerated by \`bun run docs:deps\`, and the \`docs-fresh\` job fails when they are stale`,
    ],
    [
      'Quality gates',
      'Build, strict source+test TypeScript checks, full Vitest suite, active-plan audit, package-content smoke test, and nightly long-horizon GL4/Shapiro accuracy tests',
    ],
    ['Formal references', formalCell(facts)],
  ];
  const header = `| ${rows[0]![0]} | ${rows[0]![1]} |\n|---|---|`;
  const body = rows
    .slice(1)
    .map(([surface, state]) => `| ${surface} | ${state} |`)
    .join('\n');
  return `${header}\n${body}`;
}

export function membershipSentence(facts: StatusFacts): string {
  const bridgeWord = facts.bridges === 1 ? 'bridge' : 'bridges';
  return `${facts.bridges} ${bridgeWord} · ${facts.notABridge} not-a-bridge · ${facts.unadjudicated} unadjudicated`;
}

export function phase4Sentence(facts: StatusFacts): string {
  const named = facts.derivationStepProperties.map((id) => `\`be-${id}\``).join(' and ');
  const including =
    facts.derivationStepProperties.length === 0
      ? ''
      : `, including ${named}, whose covers line begins with \`derivation-step\``;
  return (
    `Atlas reviewed \`formalRef\` is ${facts.provedAtlas}, kind \`bridge\`, which meets the ≥5 gate. ` +
    `Catalog kind \`bridge\` is ${facts.kindBridge}. ` +
    `Catalog references that stay a reduction, a limit, or a derivation-step are ${facts.counted} and do not light \`formally-proved\`. ` +
    `Catalog cross-check \`formalRef\`s are ${facts.crossCheck}. ` +
    `Catalog property \`formalRef\`s are ${facts.property}${including}. ` +
    'Only kind `bridge` lights `formally-proved`, and only when the reference is passed to `deriveEvidence`. ' +
    'The catalog path does not pass it.'
  );
}

function replaceSpan(text: string, name: string, body: string, inline: boolean): string {
  const start = `<!-- readme-status:${name} -->`;
  const end = `<!-- /readme-status:${name} -->`;
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < i) {
    throw new Error(`${name}: missing ${start} … ${end}`);
  }
  const wrapped = inline ? body : `\n${body}\n`;
  return text.slice(0, i + start.length) + wrapped + text.slice(j);
}

/** Rewrite every marked span. The input must already contain the markers. */
export function stampText(readme: string, roadmap: string, facts: StatusFacts = statusFacts()): {
  readme: string;
  roadmap: string;
} {
  let nextReadme = readme;
  nextReadme = replaceSpan(
    nextReadme,
    'badge',
    `[![TypeScript](https://img.shields.io/badge/${facts.typescriptBadge}-blue)](https://www.typescriptlang.org/)`,
    false,
  );
  nextReadme = replaceSpan(nextReadme, 'membership', membershipSentence(facts), true);
  nextReadme = replaceSpan(nextReadme, 'table', developmentTable(facts), false);
  const nextRoadmap = replaceSpan(roadmap, 'phase4', phase4Sentence(facts), true);
  return { readme: nextReadme, roadmap: nextRoadmap };
}

function main(): void {
  const check = process.argv.includes('--check');
  const readmePath = join(root, 'README.md');
  const roadmapPath = join(root, 'ROADMAP.md');
  const readme = readFileSync(readmePath, 'utf8');
  const roadmap = readFileSync(roadmapPath, 'utf8');
  const stamped = stampText(readme, roadmap);
  if (stamped.readme === readme && stamped.roadmap === roadmap) {
    console.log('readme-status: marked spans match the registries.');
    return;
  }
  if (check) {
    console.error('readme-status: README.md or ROADMAP.md is stale. Run `bun scripts/readme-status.ts` and commit the result.');
    process.exit(1);
  }
  if (stamped.readme !== readme) writeFileSync(readmePath, stamped.readme);
  if (stamped.roadmap !== roadmap) writeFileSync(roadmapPath, stamped.roadmap);
  console.log('readme-status: rewrote marked spans.');
}

if (import.meta.main) main();
