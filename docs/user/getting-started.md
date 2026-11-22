# Getting started with UPT

UPT (Universal Physics Tensor) is a TypeScript library and a command-line tool
(`upt`) for exploring how physical models connect. Its core is a catalog of
**bridge equations** — dimensionally checked relations between models from
different regimes — plus a registry of textbook **canonical equations** they are
validated against, and an **atlas** that records, for selected pairs of models,
the exact transformation between them with its regime, error bound, witnesses
and formal references.

This page gets you from `npm install` to your first evaluated equation in a few
minutes. The equation and constant catalogs themselves are described in the
[equation and constant catalog guide](catalog.md); every command, flag and
example is in the [CLI reference](../CLI.md).

## Install

```bash
npm install universal-physics-tensor
npx upt help
```

The npm package ships `dist/`, `bin/`, `data/`, the README and the licence, so
`npx upt help` works straight after the install and prints every command's
full usage and flags (not a one-line list). `upt help <command>` (or
`upt <command> --help`) prints that one command. An `e.g.` line appears only
when that command's help text has one.
Nothing else is needed: Node >=22.12.0 is the only requirement.

## First five minutes

These are the same five commands as the README's "First five minutes" section.
Run them in order; each one introduces a different part of the tool.

```bash
npx upt eval "2*pi*sqrt(1/9.81)"
npx upt derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"
npx upt explain hawking-temperature mass=1Msun
npx upt evaluate be-63 mu_e=2
npx upt search pendulum
```

`upt eval "2*pi*sqrt(1/9.81)"` prints the small-angle period of a 1-metre
pendulum, in seconds:

```text
2.0060666807106475
```

`upt derive` reads the dimensions you declare for each variable, checks your
formula against them, recovers the dimensionless 2π prefactor, and names the
canonical pendulum period:

```text
  dimensionally determined up to a constant:  period ∝ length^0.5·gravity^-0.5
  formula dimension: [time]  ✓ homogeneous, matches target
  formula MATCHES the dimensional form — recovered prefactor ≈ 6.28318530717959
  ✓ agrees with CE-pendulum-period (Pendulum period), prefactor included: yours/canonical = 1 at 3 fixed points
```

`upt explain hawking-temperature mass=1Msun` prints the Hawking temperature of
a solar-mass black hole through the two recorded derivation routes of bridge
BE-42 (agreement by construction, not an independent check):

```text
  'hawking-temperature' is over-determined from {mass}: 2 derivation routes (be-42, be-42-via-rs) restate ONE bridge (BE-42). They agree (relative spread 0.0e+0) — agreement by construction, not an independent check. Recovered value: 6.16842971641034e-8. Dimensionally, those inputs alone do not fix it — the encoded formula carries dimensionful constants.
  derivations:
    - be-42 (Hawking temperature T_H = ℏc³/(8πGMk_B)) = 6.16842971641034e-8
    - be-42-via-rs (Hawking temperature T_H = ℏc/(4π k_B r_s)) = 6.16842971641034e-8  [from leaves: mass]
```

`upt evaluate be-63 mu_e=2` evaluates the Chandrasekhar mass of an ideal
degenerate gas with mean molecular weight per electron μ_e = 2 (a
carbon/oxygen white dwarf), about 1.456 solar masses:

```text
● be-63  Chandrasekhar mass
  inputs: mu_e=2
    mu_e [dimensionless] mean-molecular-weight-per-electron μ_e — 2 for a carbon/oxygen white dwarf
  mass [kg] = 2.895722231692708e+30 — Chandrasekhar mass M = (ω₃⁰ √(3π)/2) (ℏc/G)^{3/2} (μ_e m_u)^{−2}
```

(Evaluate prints one more line, a note about the exact reduced Planck constant
`hbar` carries — see [the catalog guide's constants section](catalog.md#the-constant-registry).)

The closing line of a search report lists the corpus sizes; the guide leaves
counts to the command itself, since they move whenever the catalog moves.
`upt search pendulum` names the canonical pendulum period, the pendulum model,
and the linear atlas bridge:

```text
upt search pendulum — 3 match(es); every word matched
  matched by words, symbols and genuine aliases; an equal dimension is never a match (a radius is not a wavelength)

canonical equations:
  CE-pendulum-period Pendulum period — target period [time]; inputs: length [length], gravity [acceleration]  [words in: id, name]
      inspect: upt explain period --source=canonical

atlas models:
  model-pendulum [oscillators]  [words in: id]
      inspect: upt regime oscillators · upt path model-pendulum <to-model>

atlas bridges:
  ab-pendulum-linear approximation [oscillators]: model-pendulum → model-spring  [words in: id, models]
      inspect: upt atlas ab-pendulum-linear
```

## Run the CLI from a clone

The npm package is enough for `upt`. To work on the library itself, clone the
repository: the package manager is Bun (`package.json` pins `bun@1.4.2`; Node
does not install it — get it from <https://bun.sh/install>), then

- `bun install` installs the dependencies,
- `bun run build` compiles TypeScript to `dist/`,
- and `node bin/upt.mjs <command>` runs the CLI from the clone exactly as
  `npx upt <command>` runs the installed package.

On a machine that has Node but not Bun, `npm install --no-package-lock` and
`npm run build` also work for a clone (the lockfile is `bun.lock` only).

## Where to go next

- [The equation and constant catalog guide](catalog.md) — what lives in the
  bridge catalog, the canonical registry and the atlas, and how the physical
  constants are named, sourced and used in formulas.
- [The API reference](api.md) — every public export of the package, generated
  from the source TSDoc.
- [`docs/CLI.md`](../CLI.md) — every command, every flag, generated from the
  registry. The reference shows a registry example for each command; that is
  independent of whether `upt help <command>` includes an `e.g.` line.
