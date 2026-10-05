/**
 * Discovery-run manifest construction (schema v0).
 *
 * @module composition/probe/run-manifest
 */

import type {
  DiscoveryBackendDescriptor,
  DiscoveryRunManifest,
  SearchBudget,
  SearchStopReason,
} from './types.js';
import { DEFAULT_SEARCH_BUDGET, SCHEMA_VERSION } from './types.js';
import { captureEnvironment, hashCanonical } from '../canonical-json.js';

export { captureEnvironment } from '../canonical-json.js';

export interface ManifestDraft {
  readonly runId: string;
  readonly repositoryCommit: string;
  readonly problem: unknown;
  readonly datasetHashes?: readonly string[];
  readonly backendDescriptors?: readonly DiscoveryBackendDescriptor[];
  readonly randomSeeds?: Readonly<Record<string, string | number>>;
  readonly tolerances?: Readonly<Record<string, number>>;
  readonly searchBudget?: SearchBudget;
  readonly startedAt?: string;
}

/** Open a run manifest (completedAt / stopReason filled at close). @internal */
export function openManifest(draft: ManifestDraft): DiscoveryRunManifest {
  if (!draft.runId.startsWith('dr-')) {
    throw new RangeError(`openManifest: runId must start with 'dr-' (got '${draft.runId}')`);
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: draft.runId,
    repositoryCommit: draft.repositoryCommit,
    problemHash: hashCanonical(draft.problem),
    datasetHashes: draft.datasetHashes ?? [],
    backendDescriptors: draft.backendDescriptors ?? [
      {
        protocolVersion: '0',
        backendId: 'native',
        backendVersion: SCHEMA_VERSION,
        capabilities: ['grammar-enumerator'],
        deterministic: 'yes',
      },
    ],
    randomSeeds: draft.randomSeeds ?? {},
    tolerances: draft.tolerances ?? { holdoutRmse: 0.15 },
    environment: captureEnvironment(),
    searchBudget: draft.searchBudget ?? DEFAULT_SEARCH_BUDGET,
    startedAt: draft.startedAt ?? new Date().toISOString(),
    nondeterminism: [],
  };
}

/** Close a manifest with stop reason and completion time. @internal */
export function closeManifest(
  open: DiscoveryRunManifest,
  stopReason: SearchStopReason,
  completedAt = new Date().toISOString(),
): DiscoveryRunManifest {
  return { ...open, stopReason, completedAt };
}
