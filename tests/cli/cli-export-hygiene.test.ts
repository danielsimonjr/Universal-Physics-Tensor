/**
 * An export nothing imports is not an export. The 2026-10-15 survey found `statusMeaning`
 * (no caller anywhere), four `_atlas-map.ts` names and three `record.ts` names used only in
 * their own file, each listed by `docs/architecture/unused-analysis.md`. The names below are
 * module-private now; the controls are names that stay exported because a script or a module
 * imports them.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import * as statuses from '../../dist/cli/statuses.js';
import * as atlasMap from '../../dist/cli/commands/_atlas-map.js';
import * as record from '../../dist/cli/record.js';
import * as flagHelp from '../../dist/cli/flag-help.js';
import * as storedResults from '../../dist/cli/stored-results.js';

describe('dead and own-file-only exports are gone', () => {
  it('statuses: statusMeaning is deleted', () => {
    expect('statusMeaning' in statuses).toBe(false);
    expect(typeof statuses.definitionsFor).toBe('function'); // control: a used export stays
  });
  it('_atlas-map: the own-file-only names are private; the namespace-used ones stay', () => {
    for (const name of ['formatAtlasFilterLegend', 'resultsLine', 'ATLAS_SOURCE', 'LINK_SOURCE', 'STORED_RESULTS_PATH', 'storedResultsFile']) {
      expect(name in atlasMap, name).toBe(false);
    }
    for (const name of ['parseRoute', 'buildRouteView', 'toMermaid', 'DEFAULT_MAX_ROUTES', 'MAX_ROUTES_CEILING', 'loadStoredResults']) {
      expect(name in atlasMap, name).toBe(true);
    }
  });
  it('record: the schema literal and the two fingerprints are private', () => {
    for (const name of ['RECORD_SCHEMA', 'argvFingerprint', 'entryFingerprint']) expect(name in record, name).toBe(false);
    expect(typeof record.recordInvocation).toBe('function');
  });
  it('controls: what a script imports stays exported', () => {
    expect(typeof flagHelp.flagHeading).toBe('function');
    expect(Array.isArray(flagHelp.BUILTIN_VERBS)).toBe(true);
    expect(typeof storedResults.storedResultsFile).toBe('function');
  });
});
