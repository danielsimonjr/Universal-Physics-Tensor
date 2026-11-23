# Tutorial: search, explain and evaluate

Three commands cover the daily loop: find an equation, see how a value is
derived, and evaluate an arithmetic expression.

Prerequisites: `npm install universal-physics-tensor` (see
[getting started](../getting-started.md)).

## Search

`upt search pendulum` finds everything whose id, name, symbols or genuine
aliases mention the word:

```bash
upt search pendulum
```

```text
upt search pendulum — 3 match(es); every word matched
  matched by words, symbols and genuine aliases; an equal dimension is never a match (a radius is not a wavelength)

canonical equations:
  CE-pendulum-period Pendulum period — target period [time]; inputs: length [length], gravity [acceleration]  [words in: id, name]
```

## Explain

`upt explain hawking-temperature mass=1Msun` traces how the Hawking
temperature of a solar-mass black hole is derived from the recorded input.
The Hawking temperature is over-determined: two derivation routes restate
one bridge, and they agree by construction, not as an independent check —
`upt explain` says so rather than dressing the agreement up as a validation:

```bash
upt explain hawking-temperature mass=1Msun
```

```text
  'hawking-temperature' is over-determined from {mass}: 2 derivation routes (be-42, be-42-via-rs) restate ONE bridge (BE-42). They agree (relative spread 0.0e+0) — agreement by construction, not an independent check. Recovered value: 6.16842971641034e-8 K [highly-speculative]. Dimensionally, those inputs alone do not fix it — the encoded formula carries dimensionful constants.
```

## Evaluate an expression

`upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665` evaluates an arithmetic
expression with numeric variable bindings (variables can also carry units,
such as `L=1m "g=9.80665m/s^2"`, in which case `upt eval` prints
`2.0064092925890407 s`):

```bash
upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665
```

```text
2.0064092925890407
```

```bash
upt eval "2*pi*sqrt(L/g)" L=1m "g=9.80665m/s^2"
```

```text
2.0064092925890407 s
```

That is the small-angle period, in seconds, of a 1-metre pendulum under
standard gravity (9.80665 m/s²). The first command binds bare numbers; the
second carries metres and metres-per-second-squared, so the CLI prints the
unit `s`.

## Where to go next

- [Evaluate a bridge equation](evaluate-a-bridge.md) — the same loop for a catalog record.
- [Units](units.md) — the registry behind the values above.
- [The equation and constant catalog guide](../catalog.md) — what the search and explain commands read.
