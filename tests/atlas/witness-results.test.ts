/**
 * Atlas Phase 4, S4.3 — the committed witness-results artifact, and the two
 * tags derived from it.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §3.
 *
 * ⚠ **This file READS `data/atlas/witness-results.json` and never writes it.**
 * The Lead regenerates it with `bun run atlas:witness-results`. A test that
 * wrote the artifact would certify whatever the last run produced.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  artifactPassingWitnessIds,
  runWitnessRegistry,
} from '../../src/atlas/witness-artifact.js';
import type { WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';
import type { RegisteredWitness } from '../../src/atlas/witness-specs.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { BRIDGE_DAMPED_RLC, BRIDGE_SPRING_LC } from '../../src/atlas/oscillators/bridges-exact.js';
import { BRIDGE_HEAT_DIFFUSION } from '../../src/atlas/diffusion/bridges.js';
import { BRIDGE_STOKES_EINSTEIN } from '../../src/atlas/diffusion/bridges-closure.js';
import type { FormalFidelity } from '../../src/atlas/types.js';
import { isSimplifierAvailable } from '../../src/composition/expr-simplify.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { CAPACITANCE, INDUCTANCE } from '../../src/atlas/oscillators/dimensions.js';

const here = dirname(fileURLToPath(import.meta.url));
const artifactPath = resolve(here, '../../data/atlas/witness-results.json');
const committed = JSON.parse(readFileSync(artifactPath, 'utf-8')) as WitnessResultsArtifact;

const peerPresent = await isSimplifierAvailable();
const peerRequired = process.env.UPT_REQUIRE_PEERS === '1';

describe('data/atlas/witness-results.json — committed artifact', () => {
  it('has schemaVersion "0" and one row per registered witness, in registry order', () => {
    expect(committed.schemaVersion).toBe('0');
    expect(committed.results.map((r) => [r.recordId, r.witnessId])).toEqual(
      WITNESS_REGISTRY.map((w) => [w.recordId, w.spec.id]),
    );
  });

  it('FRESHNESS: deep-equals a fresh run (re-run `bun run atlas:witness-results`)', async () => {
    if (!peerPresent && !peerRequired) {
      // Without the CAS peer a fresh run records every symbolic witness as
      // peer-absent, so it CANNOT equal an artifact emitted with the peer. The
      // emitter refuses to write in that state for the same reason.
      return;
    }
    // Round-trip through JSON so the comparison sees what the file can hold
    // (a ratio of Infinity serializes as null).
    const live = JSON.parse(JSON.stringify(await runWitnessRegistry())) as WitnessResultsArtifact;
    expect(committed).toEqual(live);
  });

  it('every row that is unresolved carries a reason, and no other row does', () => {
    for (const r of committed.results) {
      if (r.status === 'unresolved') expect(r.reason).toBeDefined();
      else expect(r.reason).toBeUndefined();
    }
  });
});

describe('W1s / W2s — the spring ↔ circuit dictionary, checked by the CAS', () => {
  it('W1s and W2s are recorded as checked in the committed artifact', () => {
    expect(artifactPassingWitnessIds(committed, 'ab-spring-lc')).toEqual(new Set(['W1s']));
    expect(artifactPassingWitnessIds(committed, 'ab-damped-rlc')).toEqual(new Set(['W2s']));
  });

  it('NEGATIVE CONTROL: a WRONG dictionary (k ↔ C instead of 1/C) does not check', async () => {
    if (!peerPresent && !peerRequired) return;
    const w1s = WITNESS_REGISTRY.find((w) => w.spec.id === 'W1s');
    if (w1s === undefined || w1s.kind !== 'symbolic') throw new Error('W1s missing');
    const L = sym('L', INDUCTANCE);
    const C = sym('C', CAPACITANCE);
    // C/L is what the premise k/m becomes under the wrong mapping k ↔ C.
    const wrong: RegisteredWitness = {
      recordId: 'ab-spring-lc',
      kind: 'symbolic',
      spec: { ...w1s.spec, id: 'W1s-wrong', lhs: { kind: 'op', op: '/', args: [C, L] } },
    };
    const run = await runWitnessRegistry([wrong]);
    expect(run.results[0]?.status).not.toBe('checked');
  });

  it('with the peer ABSENT every symbolic witness is unresolved/peer-absent, and earns nothing', async () => {
    const absent = await runWitnessRegistry(WITNESS_REGISTRY, null);
    for (const r of absent.results) {
      if (r.kind !== 'symbolic') continue;
      expect(r.status).toBe('unresolved');
      expect(r.reason).toBe('peer-absent');
    }
    expect(artifactPassingWitnessIds(absent, 'ab-spring-lc').size).toBe(0);
  });
});

describe('WD2s — the heat ↔ Fick dictionary on the Fourier decay rate, checked by the CAS', () => {
  it('WD2s is recorded as checked, and earns ab-heat-diffusion symbolically-checked', () => {
    const ids = artifactPassingWitnessIds(committed, 'ab-heat-diffusion');
    expect(ids.has('WD2s')).toBe(true);
    expect(deriveEvidence(BRIDGE_HEAT_DIFFUSION, ids).has('symbolically-checked')).toBe(true);
  });
});

describe('WD5s — the Stokes–Einstein substitution, checked by the CAS', () => {
  it('WD5s is recorded as checked, and earns ab-stokes-einstein symbolically-checked', () => {
    const ids = artifactPassingWitnessIds(committed, 'ab-stokes-einstein');
    expect(ids.has('WD5s')).toBe(true);
    expect(deriveEvidence(BRIDGE_STOKES_EINSTEIN, ids).has('symbolically-checked')).toBe(true);
  });
});

describe('numeric rows carry their convergence record', () => {
  it('every numeric row that ran records coarse, fine and ratio, and a checked one has ratio > 1', () => {
    const numeric = committed.results.filter((r) => r.kind === 'numeric');
    expect(numeric.length).toBeGreaterThan(0);
    for (const r of numeric) {
      expect(r.convergence).toBeDefined();
      if (r.status === 'checked') expect(r.convergence!.ratio).toBeGreaterThan(1);
    }
  });
});

describe('symbolically-checked is DERIVED from the artifact', () => {
  it('ab-spring-lc earns symbolically-checked through the artifact, and only through it', () => {
    const viaArtifact = deriveEvidence(
      BRIDGE_SPRING_LC,
      artifactPassingWitnessIds(committed, 'ab-spring-lc'),
    );
    expect(viaArtifact.has('symbolically-checked')).toBe(true);
    // Same record, nothing marked passing: the tag is not there. It lives in the
    // artifact, not on the record.
    expect(deriveEvidence(BRIDGE_SPRING_LC, NO_PASSING_WITNESSES).has('symbolically-checked')).toBe(
      false,
    );
    expect(Object.hasOwn(BRIDGE_SPRING_LC, 'evidence')).toBe(false);
  });

  it('ab-damped-rlc earns it the same way', () => {
    expect(
      deriveEvidence(BRIDGE_DAMPED_RLC, artifactPassingWitnessIds(committed, 'ab-damped-rlc')).has(
        'symbolically-checked',
      ),
    ).toBe(true);
  });

  it('an UNRESOLVED artifact row earns nothing', () => {
    const unresolved: WitnessResultsArtifact = {
      schemaVersion: '0',
      results: [
        {
          recordId: 'ab-spring-lc',
          witnessId: 'W1s',
          kind: 'symbolic',
          status: 'unresolved',
          reason: 'timeout',
          detail: '',
        },
      ],
    };
    const ids = artifactPassingWitnessIds(unresolved, 'ab-spring-lc');
    expect(deriveEvidence(BRIDGE_SPRING_LC, ids).has('symbolically-checked')).toBe(false);
  });
});

describe('formally-proved is DERIVED from formalRef.fidelity', () => {
  const ref = (fidelity: FormalFidelity) => ({
    system: 'other' as const,
    statement: 's',
    version: 'v',
    axioms: [],
    fidelity,
    kind: 'bridge' as const,
  });

  it('Eve E4: fidelity "unreviewed" can NOT earn formally-proved', () => {
    const tags = deriveEvidence({ formalRef: ref('unreviewed') }, NO_PASSING_WITNESSES);
    expect(tags.has('formally-proved')).toBe(false);
    expect([...tags]).toEqual(['proposed']);
  });

  it.each(['two-formalizers', 'back-translation', 'sanity-lemmas'] as const)(
    'fidelity %s earns formally-proved',
    (fidelity) => {
      expect(deriveEvidence({ formalRef: ref(fidelity) }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(
        true,
      );
    },
  );

  it('no formalRef, no tag', () => {
    expect(deriveEvidence({}, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
  });
});
