/**
 * Typed observation + confrontation-outcome layer for `upt confront`.
 * The outcome is a discriminated union on `kind` so each confrontation
 * carries only the fields it can honestly populate (no NaN placeholders).
 *
 * @module bridges/observations/types
 */

/** Provenance every observation record must carry. @public */
export interface ObservationProvenance {
  /** Paper + locus, e.g. "Bertotti-Iess-Tortora 2003, Nature 425:374". */
  readonly citation: string;
  readonly year: number;
  /** ISO date the value was transcribed into the repo. */
  readonly retrieved: string;
  /** Caveats: what was digitized, unit conversions, model conventions. */
  readonly note?: string;
}

/** One named uncertainty component (e.g. statistical vs systematic). @public */
export interface SigmaComponent {
  readonly label: string;
  readonly value: number;
}

/** How the observation constrains the prediction. @public */
export type ObservationKind = 'value' | 'upper-bound' | 'consistency' | 'table';

/**
 * What was done to the source's number before it reached the comparison
 * (averaging, selection, conversion, encoding of a stated agreement).
 * `source` names what supports the statement. `not-recorded` means the record
 * states nothing — it is not "no preprocessing".
 *
 * @public
 */
export type ConfrontationPreprocessing =
  | { readonly state: 'recorded'; readonly statement: string; readonly source: string }
  | { readonly state: 'not-recorded' };

/**
 * Whether the prediction is independent of the measurement it is compared
 * with. Separate from goodness of fit: a record can agree within 1σ and still
 * share an input with its prediction. `no-fitted-parameter`: the prediction
 * takes no parameter fitted to this measurement. `shares-input`: prediction
 * and observation share `shared` (a constant, calibration, baseline, or the
 * value itself). `not-recorded`: the record states neither.
 *
 * @public
 */
export type ConfrontationIndependence =
  | { readonly state: 'no-fitted-parameter'; readonly statement: string; readonly source: string }
  | {
      readonly state: 'shares-input';
      readonly shared: string;
      readonly statement: string;
      readonly source: string;
    }
  | { readonly state: 'not-recorded' };

/** Data-handling fields every confrontation outcome carries. @public */
export interface ConfrontationDataHandling {
  readonly preprocessing: ConfrontationPreprocessing;
  readonly independence: ConfrontationIndependence;
}

/**
 * Normalized confrontation result — discriminated on `kind`. Each arm
 * carries only the fields it can honestly populate.
 *
 * @public
 */
export type ConfrontationOutcome = ConfrontationDataHandling & (
  | {
      readonly kind: 'value';
      readonly predicted: number;
      readonly observed: number;
      readonly sigma: number;
      readonly residualInSigma: number;
      readonly withinObserved: boolean;
      readonly units: string;
      readonly provenance: ObservationProvenance;
      /**
       * Present when `observed` is DERIVED from a different measured quantity
       * rather than measured itself. BE-51's "observed" deflection is the
       * prediction times (1 + γ)/2: VLBI measured γ, not a solar-limb
       * deflection to 16 digits. The report shows this measurement, and labels
       * `observed` as derived by `derivation`.
       */
      readonly measured?: {
        readonly quantity: string;
        readonly value: number;
        readonly sigma: number;
        readonly source: string;
        readonly derivation: string;
      };
    }
  | {
      readonly kind: 'upper-bound';
      readonly predicted: number;
      /** The observed upper limit. */
      readonly bound: number;
      readonly satisfied: boolean;
      /**
       * What `predicted` is. `'point'` (the default when absent): a predicted
       * value, satisfied when it lies at or below the observed limit.
       * `'encoded-bound'`: the bridge's own claim is a range `|x| ≤ predicted`,
       * satisfied when the observed limit lies inside it (BE-36). The two are
       * different comparisons and are displayed as such.
       */
      readonly predictedIs?: 'point' | 'encoded-bound';
      /**
       * Optional honesty caveat surfaced in the confront summary line — e.g. a
       * one-sided pass where only part of an asymmetric observed interval was
       * tested against a symmetric encoded bound (BE-36).
       */
      readonly caveat?: string;
      readonly units: string;
      readonly provenance: ObservationProvenance;
    }
  | {
      readonly kind: 'consistency';
      readonly predicted: number;
      readonly approaches: number;
      /** Holds what `fractionalGapIs` says; the name predates that split. */
      readonly fractionalGap: number;
      /**
       * `'agreement-bound'`: `fractionalGap` is the record's stated tolerance
       * on |observed − predicted|/|predicted|, NOT a measured difference.
       * `'observed-difference'`: it is the difference itself, and the outcome
       * carries no agreement bound. `consistencyComparison` computes the
       * difference either way.
       */
      readonly fractionalGapIs: 'agreement-bound' | 'observed-difference';
      readonly units: string;
      readonly provenance: ObservationProvenance;
    }
  | {
      readonly kind: 'table';
      readonly rows: ReadonlyArray<{
        readonly label: string;
        readonly predicted: number;
        readonly observed: number;
        readonly sigma: number;
        readonly residualInSigma: number;
      }>;
      readonly units: string;
      readonly provenance: ObservationProvenance;
    }
);

/** |predicted − observed| in units of the observed 1σ. @public */
export function residualInSigma(predicted: number, observed: number, sigma: number): number {
  if (!(Number.isFinite(sigma) && sigma > 0)) {
    throw new RangeError('residualInSigma: sigma must be finite and > 0');
  }
  return Math.abs(predicted - observed) / sigma;
}

/** A consistency outcome's actual difference, kept apart from its agreement bound. @public */
export interface ConsistencyComparison {
  /** (observed − predicted) / predicted, signed; "observed" is the outcome's `approaches`. */
  readonly relativeDifference: number;
  readonly definition: '(observed − predicted) / predicted';
  /** The record's stated tolerance on |relativeDifference|; null when the outcome carries none. */
  readonly agreementBound: number | null;
  /** |relativeDifference| ≤ agreementBound; null when there is no bound to decide against. */
  readonly withinBound: boolean | null;
}

/**
 * The actual difference of a consistency outcome, computed from its own
 * predicted and observed values, and the compatibility decision against its
 * agreement bound when it has one.
 *
 * @public
 */
export function consistencyComparison(
  o: Extract<ConfrontationOutcome, { kind: 'consistency' }>,
): ConsistencyComparison {
  if (!(Number.isFinite(o.predicted) && o.predicted !== 0)) {
    throw new RangeError('consistencyComparison: predicted must be finite and nonzero');
  }
  const relativeDifference = (o.approaches - o.predicted) / o.predicted;
  const agreementBound = o.fractionalGapIs === 'agreement-bound' ? o.fractionalGap : null;
  return {
    relativeDifference,
    definition: '(observed − predicted) / predicted',
    agreementBound,
    withinBound: agreementBound === null ? null : Math.abs(relativeDifference) <= agreementBound,
  };
}

/** Combined 1σ from named components (root-sum-square). @public */
export function combineInQuadrature(components: readonly SigmaComponent[]): number {
  if (components.length === 0) {
    throw new RangeError('combineInQuadrature: need at least one component');
  }
  return Math.sqrt(components.reduce((acc, c) => acc + c.value * c.value, 0));
}
