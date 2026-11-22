# Tutorial: units, conversion and the radian

UPT carries a unit registry with affine scales (temperatures), logarithmic
scales (the bit), and dimensionless radian conversions (hertz to radians per
second). This tutorial touches one of each through two root exports,
`parseUnit` and `convertValue`.

Prerequisites: `npm install universal-physics-tensor` (see
[getting started](../getting-started.md)).

## The bit is a logarithmic scale

The bit's scale is the natural logarithm of 2, not 1, so a bit count
converts into nats honestly:

```ts
import { parseUnit, convertValue } from 'universal-physics-tensor';

const bit = parseUnit('bit');
const degC = convertValue('25 degC', 'K', 'difference');
const hz = convertValue('1 Hz', 'rad/s');
console.log(`bit scale: ${bit.scale}`);
console.log(`25 degC -> K (difference): ${degC.value}`);
console.log(`1 Hz -> rad/s: ${hz.value}`);
console.log(`1 Hz -> rad/s cycles: ${hz.cycles}`);
```

Four lines, four facts:

- `bit scale: 0.6931471805599453` — `Math.LN2`. The bit converts into nats by
  a factor of ln 2.
- `25 degC -> K (difference): 25` — a temperature *difference* of 25 °C is
  25 K. With the third argument omitted the conversion is absolute (298.15 K),
  which is the affine distinction `convertValue` makes.
- `1 Hz -> rad/s: 1` — `convertValue` returns the *cycle count* (1 cycle/s),
  not the angular rate. One hertz of angular rate is 2π rad/s; that 2π is
  not applied here.
- `1 Hz -> rad/s cycles: 1` — `cycles: 1` marks that angular evaluator paths
  multiply by 2π. The radian does not hide the cycles factor; the flag is
  how the evaluator knows to apply it.

```text
bit scale: 0.6931471805599453
25 degC -> K (difference): 25
1 Hz -> rad/s: 1
1 Hz -> rad/s cycles: 1
```

`parseUnit` parses a unit expression and rejects a value with it; for
unit errors, see the [API reference](../api.md)'s `UnitError` family.

## Where to go next

- [Evaluate a bridge equation](evaluate-a-bridge.md) — evaluate a catalog record.
- [Search and explain](search-and-explain.md) — find equations and trace derivations.
