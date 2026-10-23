/**
 * Append-only Product B candidate store + rejection registry.
 * Product A adjudications stay in `adjudication.ts`.
 *
 * @module composition/probe/candidate-store
 */

import type {
  ProbeCandidateRecord,
  ProbeCandidateStatus,
  ProbeRejectionRecord,
  StatusEvent,
} from './types.js';

const ORDER: readonly ProbeCandidateStatus[] = [
  'generated',
  'structurally-valid',
  'empirically-fit',
  'heldout-supported',
  'falsification-survivor',
  'expert-review-required',
];

const TERMINAL: ReadonlySet<ProbeCandidateStatus> = new Set([
  'rejected',
  'falsified',
  'equivalent-known',
  'insufficient-evidence',
  'expert-review-required',
]);

const ALLOWED: ReadonlyMap<ProbeCandidateStatus | 'none', ReadonlySet<ProbeCandidateStatus>> =
  new Map([
    ['none', new Set<ProbeCandidateStatus>(['generated'])],
    ['generated', new Set<ProbeCandidateStatus>(['structurally-valid', 'rejected'])],
    [
      'structurally-valid',
      new Set<ProbeCandidateStatus>([
        'empirically-fit',
        'equivalent-known',
        'insufficient-evidence',
        'rejected',
      ]),
    ],
    [
      'empirically-fit',
      new Set<ProbeCandidateStatus>(['heldout-supported', 'insufficient-evidence', 'rejected']),
    ],
    [
      'heldout-supported',
      new Set<ProbeCandidateStatus>([
        'falsification-survivor',
        'falsified',
        'rejected',
        'equivalent-known',
      ]),
    ],
    ['falsification-survivor', new Set<ProbeCandidateStatus>(['expert-review-required'])],
  ]);

/** True when `to` is a legal successor of `from`. @internal */
export function canTransition(
  from: ProbeCandidateStatus | 'none',
  to: ProbeCandidateStatus,
): boolean {
  return ALLOWED.get(from)?.has(to) === true;
}

/**
 * Append a status event. Throws if the transition skips a required gate.
 * Current `status` is always the last event's `to`.
 *
 * @internal
 */
export function applyStatus(
  record: ProbeCandidateRecord,
  to: ProbeCandidateStatus,
  reason: string,
  runId: string,
  at = new Date().toISOString(),
): ProbeCandidateRecord {
  const from = record.statusHistory.length === 0 ? 'none' : record.status;
  if (TERMINAL.has(record.status) && record.status !== 'falsification-survivor') {
    throw new RangeError(
      `applyStatus: terminal status '${record.status}' cannot transition to '${to}'`,
    );
  }
  if (!canTransition(from, to)) {
    throw new RangeError(`applyStatus: illegal transition ${String(from)} → ${to}`);
  }
  const event: StatusEvent = { at, from, to, reason, runId };
  return {
    ...record,
    status: to,
    statusHistory: [...record.statusHistory, event],
  };
}

/** Pipeline order index; terminals sort last. @internal */
export function statusRank(s: ProbeCandidateStatus): number {
  const i = ORDER.indexOf(s);
  return i >= 0 ? i : -1;
}

/** The in-memory store of probe candidate records and their rejections. */
export class ProbeCandidateStore {
  private readonly byId = new Map<string, ProbeCandidateRecord>();
  private readonly rejections: ProbeRejectionRecord[] = [];

  /** Insert a freshly generated record (must be `generated`). @internal */
  put(record: ProbeCandidateRecord): void {
    if (this.byId.has(record.id)) {
      throw new RangeError(`ProbeCandidateStore: duplicate id '${record.id}'`);
    }
    this.byId.set(record.id, record);
  }

  get(id: string): ProbeCandidateRecord | undefined {
    return this.byId.get(id);
  }

  /** Replace after `applyStatus`. @internal */
  replace(record: ProbeCandidateRecord): void {
    this.byId.set(record.id, record);
  }

  all(): readonly ProbeCandidateRecord[] {
    return [...this.byId.values()];
  }

  rememberRejection(rec: ProbeRejectionRecord): void {
    this.rejections.push(rec);
  }

  /** True when an equivalent fingerprint was rejected in the same context. @internal */
  isRejected(canonicalAstHash: string, context: string): boolean {
    return this.rejections.some(
      (r) => r.fingerprint.canonicalAstHash === canonicalAstHash && r.context === context,
    );
  }

  rejectionList(): readonly ProbeRejectionRecord[] {
    return this.rejections;
  }
}
