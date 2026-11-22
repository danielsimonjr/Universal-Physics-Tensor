# Tutorial: evaluate a bridge equation

The catalog's bridge equations are records, not text: each one names its
inputs, its output dimension and its formula, and the CLI evaluates it. This
tutorial evaluates one bridge, BE-63 (the Chandrasekhar mass of an ideal
degenerate gas), from the command line and from the library, and reads the
same number both ways.

Prerequisites: `npm install universal-physics-tensor` (see
[getting started](../getting-started.md)) for the CLI; the library import
needs the npm package too.

## From the command line

`upt evaluate be-63 mu_e=2` evaluates BE-63 with the mean molecular weight
per electron μ_e = 2 (a carbon/oxygen white dwarf):

```bash
upt evaluate be-63 mu_e=2
```

```text
● be-63  Chandrasekhar mass
  inputs: mu_e=2
    mu_e [dimensionless] mean-molecular-weight-per-electron μ_e — 2 for a carbon/oxygen white dwarf
  mass [kg] = 2.895722231692708e+30 — Chandrasekhar mass M = (ω₃⁰ √(3π)/2) (ℏc/G)^{3/2} (μ_e m_u)^{−2}
```

The `mass` line is the evaluated output in SI kilograms. A bridge is only as
good as its regime and error record — `upt explain be-63` prints those.

## From the library

The same evaluation from TypeScript, importing only names the package root
exports (`evaluateRelation` and the constant `M_SUN_SI`):

```ts
import { evaluateRelation, M_SUN_SI } from 'universal-physics-tensor';

const result = evaluateRelation('be-63', { mu_e: 2 });
console.log(`Chandrasekhar mass: ${result.value} kg`);
console.log(`in solar masses: ${result.value / M_SUN_SI}`);
```

This prints the mass in kilograms and the same mass divided by the IAU 2015
nominal solar mass, about 1.456 M☉:

```text
Chandrasekhar mass: 2.895722231692708e+30 kg
in solar masses: 1.4558683920023672
```

Both routes evaluate the same record, so the two figures agree by
construction. The test suite couples the CLI `text` fence to the bash
command's stdout, and the library `text` fence to the TypeScript sample's
stdout, so a wrong mass in either fence fails.

## Where to go next

- [Units](units.md) — parse units, convert values, and the radian.
- [Search and explain](search-and-explain.md) — find equations and trace derivations.
- [The API reference](../api.md) — every public export.
