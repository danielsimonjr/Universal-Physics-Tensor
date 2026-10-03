/**
 * Numerical-backend error type. Subclass of UPTError so downstream
 * consumers discriminate UPT-source errors uniformly with `instanceof`.
 *
 * @module numerical/errors
 */
import { UPTError } from '../dimensional/errors.js';

/**
 * Error type thrown by the numerical-contraction backend. Subclass of
 * `UPTError` so consumers can discriminate UPT-source errors with `instanceof`.
 * @public
 */
export class NumericalBackendError extends UPTError {
  constructor(message: string) {
    super(message);
    this.name = 'NumericalBackendError';
    Object.setPrototypeOf(this, NumericalBackendError.prototype);
  }
}

/**
 * Thrown when a TensorEngine method required for an operation is not
 * implemented by the active engine. Call `hasAutogradSupport(engine)` before
 * invoking AD methods to avoid this error.
 * @public
 */
export class EngineCapabilityError extends NumericalBackendError {
  constructor(
    public readonly engineName: string,
    public readonly missingMethod: string,
  ) {
    super(
      `Engine "${engineName}" does not implement "${missingMethod}". ` +
      `Call \`hasAutogradSupport(engine)\` to detect support before invoking.`,
    );
    this.name = 'EngineCapabilityError';
    Object.setPrototypeOf(this, EngineCapabilityError.prototype);
  }
}

/**
 * Thrown when the GL4 implicit-stage Picard fixed-point solver fails to
 * reach `picardTol` within `picardMaxIter` iterations. Carries a message
 * matching `/Picard iteration did not converge/` for I7-style specific
 * error-class assertions.
 *
 * Picard convergence is linear with contraction rate ≈ h·|∂f/∂x|; failure
 * usually indicates the step size h is too large for the local curvature.
 * Adaptive step-halving (Task 5) is the production response — direct
 * callers of `solveGL4Stage` should adjust h or picardMaxIter.
 *
 * @public
 */
export class GL4ConvergenceError extends NumericalBackendError {
  constructor(message: string) {
    super(message);
    this.name = 'GL4ConvergenceError';
    Object.setPrototypeOf(this, GL4ConvergenceError.prototype);
  }
}
