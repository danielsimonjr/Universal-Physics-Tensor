# Bridge-Gradient Tutorial

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document is a tutorial. The tutorial teaches an API through worked examples. It asserts nothing about the size or shape of the repository.
> The drift gate treats a missing Verification section as a failure. This document states
> the opt-out here, so a reader does not have to infer it from its absence.

> Five-minute walkthrough for differentiating UPT catalog relations
> with respect to their input parameters.

## What it does

Many catalog relations are closed-form scalar formulas (Hawking
temperature ∝ 1/M, Shapiro delay ∝ log(R_far/R_near), …). Two paths
compute the gradient of such a relation with respect to its inputs:

- `bridgeGradientNumerical(spec, params, opts?)` — central finite
  differences over a registered `BridgeDiffSpec`. No engine. This is
  the path for the catalog's plain-JS closed forms, which return a
  `number` and so carry no autograd tape.
- `bridgeGradientAST(rhs, varName, bindings)` and
  `bridgeGradientASTById(bridgeId, varName, bindings)` — exact
  reverse-mode AD over a bridge's symbolic RHS AST, lowered through
  `@danielsimonjr/mathts-autograd` (a required dependency).

There is no engine-AD function over a spec: a spec's `evaluate` returns
a number, and no tape survives that, so such a function could only
throw. The one that once existed did, and was removed.

## Five-minute walkthrough

```typescript
import {
  bridgeGradientNumerical,
  HAWKING_TEMPERATURE_DIFF,
} from 'universal-physics-tensor';

const SUN_KG = 1.989e30;

// Forward evaluation:
const T_sun = HAWKING_TEMPERATURE_DIFF.evaluate({ M_kg: SUN_KG });
// → ~6.17e-8 K

// Gradient by central finite differences:
const { value, gradient } = bridgeGradientNumerical(
  HAWKING_TEMPERATURE_DIFF,
  { M_kg: SUN_KG },
);
// value === T_sun
// gradient → { M_kg: -3.10e-38 }   (dT/dM is negative — bigger BH = colder)
```

## Shipped specs

| Spec | Differentiable params | Output |
|---|---|---|
| `DECOHERENCE_RATE_DIFF` | `gamma0_per_s`, `lambda`, `lambda0` | Decoherence rate (s⁻¹) |
| `SHAPIRO_DELAY_DIFF` | `M_kg`, `R_far_m`, `R_near_m` | Time delay (s) |
| `HAWKING_TEMPERATURE_DIFF` | `M_kg` | Temperature (K) |
| `PERIHELION_ADVANCE_DIFF` | `M_kg`, `a_m`, `eccentricity` (`T_yr` optional) | Perihelion advance (rad/orbit) |

All four spec exports and the aggregate `DIFFERENTIABLE_RELATIONS`
array are `@public`. Each spec's `bridgeId` is its relation's catalog
id; a relation with no catalog id cannot be made a spec.

## Limitations

- **Scalar output only.** A spec's evaluator returns one number. A
  relation with several outputs needs a selector that extracts one.

- **Non-smooth branches not supported.** Closed forms with `abs`,
  `max` or a conditional on an input value give a one-sided or
  subgradient value at the kink. There is no smoothing layer.

- **AST gradients differentiate the encoding.** A bridge encoded with a
  typed stub (a transcendental absorbed into one symbol) differentiates
  with respect to the stub, not the physics inside it. Only a fully
  expanded encoding differentiates exactly.
