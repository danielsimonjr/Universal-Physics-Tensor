/**
 * Names `upt regime` can survey that are not atlas families.
 *
 * An atlas family is models, bridges, and rejections. A domain module adds a
 * name and the records that carry inequalities, and does not construct those.
 * This is not `src/core/regime-registry.ts`, which stores tensor-cell regimes.
 *
 * @module relations/regime-registration
 */

import type { Regime } from './types.js';

/** One record a domain registration surveys. @internal */
export interface RegimeDomainRecord {
  readonly id: string;
  readonly kind: 'domain';
  readonly regime: Regime;
  readonly sideConditions?: readonly string[];
}

/** A name plus the records whose inequalities the command evaluates. @internal */
export interface RegimeDomainRegistration {
  readonly name: string;
  readonly records: readonly RegimeDomainRecord[];
}

const registrations: RegimeDomainRegistration[] = [];

/**
 * Add a domain. A second registration of the same name is a programming error:
 * the command would otherwise survey one and hide the other.
 *
 * @internal
 */
export function registerRegimeDomain(registration: RegimeDomainRegistration): void {
  if (registrations.some((existing) => existing.name === registration.name)) {
    throw new Error(`regime '${registration.name}' is already registered`);
  }
  registrations.push(registration);
}

/** Domain registrations, in the order they were added. @internal */
export function domainRegimeRegistrations(): readonly RegimeDomainRegistration[] {
  return registrations;
}
