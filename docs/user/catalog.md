# Equation and Constant Catalog Guide

UPT ships three machine-checked catalogs of physical knowledge, plus a registry
of physical constants. This guide explains what lives in each one, how to read
a record with the CLI, and how the constants are named, sourced and used inside
formulas. For the command syntax in full, see [`../CLI.md`](../CLI.md); for a
first walk-through, see [getting-started.md](getting-started.md).

## The equation catalogs

### Bridge records (`BE-<id>`)

The bridge catalog is the versioned, schema-checked JSON file
`data/bridge-catalog.json`. Each record carries an id spelled `BE-<n>` in the
catalog and `be-<n>` on the command line, the relation it asserts between two
quantities of different regimes, its confidence tier, and — where one exists —
a closed form the CLI can evaluate. The TypeScript registry that owns the same
records is projected as the public export `BRIDGE_EQUATIONS` (`src/index.ts`),
so library code and the CLI read one catalog.

Two records can look similar but behave differently: some bridges are
**evaluable** (they carry a closed form and declared inputs, so
`upt evaluate be-63 mu_e=2` returns a number with a unit), and others are
**catalog records without an evaluator** — they still assert a relation, carry
evidence and citations, and appear in `upt search`, `upt map`, `upt audit` and
the atlas, but there is nothing to evaluate yet. That is not a defect: the
catalog records what is claimed and how well it is grounded, not only what is
computable.

`upt evaluate` with no id prints what *is* evaluable, one section per kind:

```bash
upt evaluate
```

```text
Evaluable bridges  (upt evaluate <be-NN> key=value[unit] ...)
  be-16  Landauer energy
      temperature_K [K] temperature T (an absolute temperature; degC adds 273.15; degF is (degF − 32)×5/9 + 273.15) — thermodynamic temperature, ≥ 0
  be-37  Shapiro delay (radial ray)
      M_kg [kg] mass M — mass of the central body, > 0
      R_near_m [m] near-radius R_near — inner radial distance of a radial ray from the centre, > 0; not a closest approach of a passing ray
      R_far_m [m] far-radius R_far — outer radial distance of the same radial ray, ≥ R_near
  be-42  Hawking temperature
      M_kg [kg] mass M — black-hole mass, > 0
```

and continues with the `Applied cases` section, the applied measurement cases
(`case-resistor-noise`, `case-lumped-cooling`, …) that the same command
evaluates. Every input is given as `key=value` with an optional unit, such as
`M_kg=1Msun` or `T_K=25degC`.

### Canonical equations (`CE-<id>`)

The canonical-equation registry (`src/canonical/registry.ts`, exported as
`CANONICAL_EQUATIONS`) is the textbook answer-key layer: standard equations the
bridge equations are validated against. Each entry records its fidelity tier
(`L0` dimensional, `L1` scalar-AST, `L2` field-equation), its domain, and the
bridge ids that restate or recover it.

`upt canonical` prints the registry as a table (one row per entry, with the
fidelity tier, the physics domain, the id and the partner bridges), followed
by a coverage line that counts how many catalog bridges have no canonical
partner yet and does not name those partners:

```bash
upt canonical
```

```text
   fid  domain               id                       partners
   ─────────────────────────────────────────────────────────────────
   L0   mechanics           CE-pendulum-period       —
   L0   gravitation         CE-kepler-third          —
   L0   general-relativity  CE-schwarzschild-radius  —
   L0   mechanics           CE-string-wave-speed     —
   L1   statistical         CE-boltzmann-entropy     —
   L1   statistical         CE-normal-distribution   —

  tip: `upt canonical --vars` lists the variable names formulas must use
```

`upt canonical --vars` adds each entry's target and governing variable names,
which is what `upt derive --formula` must spell variables by.

### Atlas bridges (`ab-…`)

The atlas (`data/atlas/`) records typed relations between *models* — for
example the linearization that connects the exact pendulum to the harmonic
oscillator. An atlas bridge names its source and target models, its
transformation, side conditions, regime inequalities, a bound with its horizon
and uniformity, witnesses, counterexamples, and — where one exists — a reviewed
formal reference in this repository's Lean proofs, from which the
`formally-proved` evidence tag is *derived* (never hand-set).

`upt atlas ab-pendulum-linear` prints the linearization that connects the exact
pendulum to the harmonic oscillator:

```bash
upt atlas ab-pendulum-linear
```

```text
ab-pendulum-linear — approximation [oscillators]
  model-pendulum (oscillators) → model-spring (oscillators)
transformation: sin θ → θ, with x ↔ ℓ θ and ω0² = g/ℓ
inverse: none stated
side conditions:
  - θ0 ≤ 0.5 rad
  - the bound is a PERIOD error and is not uniform in time
regime:
  - theta0 <= 0.5 (θ0 ≤ 0.5 rad)
bound:
  K = 1, delta = 0.015852531101436806 (relative period error, normalized by the value of the reduced model)
  domain: θ0 ≤ 0.5 rad
  horizon: t ≪ 16 T0/θ0²; machine form t < 4 T0/θ0², the π/2-drift time
  limit: regular
  uniformity: one period, for θ0 in the stated domain
```

(The full report continues with what the transformation preserves and loses,
witnesses, counterexamples, the formal reference and the review status — every
section prints, and `upt atlas ab-pendulum-linear --run` also executes the
in-process registered witnesses.)

### Finding records

`upt search pendulum` finds the pendulum records by the words in them, and
prints the command that opens each match:

```bash
upt search pendulum
```

```text
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

`upt explain hawking-temperature mass=1Msun` shows how the graph determines
that quantity from the solar mass — which bridges produced it and what value
came out:

```bash
upt explain hawking-temperature mass=1Msun
```

```text
  'hawking-temperature' is over-determined from {mass}: 2 derivation routes (be-42, be-42-via-rs) restate ONE bridge (BE-42). They agree (relative spread 0.0e+0) — agreement by construction, not an independent check. Recovered value: 6.16842971641034e-8. Dimensionally, those inputs alone do not fix it — the encoded formula carries dimensionful constants.
  derivations:
    - be-42 (Hawking temperature T_H = ℏc³/(8πGMk_B)) = 6.16842971641034e-8
    - be-42-via-rs (Hawking temperature T_H = ℏc/(4π k_B r_s)) = 6.16842971641034e-8  [from leaves: mass]
```

And `upt evaluate be-63 mu_e=2` evaluates a closed-form bridge directly (shown
in [getting-started.md](getting-started.md)).

## The constant registry

Formulas never hardcode a physical constant: every constant is registered in
one place and read by name. The pieces, from the inside out:

- **`src/core/constants.ts`** owns every value. Each constant is one exported
  `*_SI` constant with a doc comment that states its source, and the module is
  the single owner — nothing recomputes or retypes a value.
- **`CONSTANT_ROWS`** (`src/dimensional/constant-rows.ts`, internal) writes
  those values into one row per constant: the formula name, alternative
  spellings, the SI value and unit text, a plain-language meaning, the source,
  and a `canonical` flag (whether a canonical equation may bake it).
- **`PhysicalConstants`** (`src/core/types.ts`, public) is a small projection
  of the same values for library callers: `c`, `h`, `hbar`, `G`, `kB`, `e`,
  the dimensionless fine-structure constant `alpha`, the derived Planck units
  `lP`, `tP`, `mP`, and the cosmological `H0`.
- **`CANONICAL_CONSTANTS`** (`src/composition/canonical-graph.ts`, public)
  maps every spelling of every `canonical`-flagged row to its SI value and
  dimension; the composition graph uses it to tell a baked universal constant
  from a physical variable of the same name.

The CLI fills registered constants into your formulas automatically.
`upt eval "G*M_sun/c^2" M_sun=1Msun` prints the gravitational radius of one
solar mass, in metres:

```bash
upt eval "G*M_sun/c^2" M_sun=1Msun
```

```text
1477.0632775277024 m
```

A binding can also be a plain number, with no unit and no dimension check on
it. `upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665` prints the small-angle pendulum
period with the length in metres and gravity in m/s² given by hand:

```bash
upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665
```

```text
2.0064092925890407
```

(A bare number has no unit, so the result is printed as a bare value.)

### The three provenance tiers

Every registered constant states where its number comes from. There are three
tiers, and the row's `source` field names the tier in words:

1. **Exact 2019-SI definitions.** Constants fixed by definition in the 2019 SI
   redefinition, carried bit-exactly: `C_SI` (speed of light), `H_SI` (Planck
   constant), `E_SI` (elementary charge), `K_B_SI` (Boltzmann constant),
   `N_A_SI` (Avogadro constant), and products or quotients of exact values such
   as `FARADAY_SI = N_A_SI * E_SI`.
2. **CODATA 2022 measured constants**, sourced from the
   `@danielsimonjr/mathts-functions` package so the two libraries agree to the
   last bit: `G_SI` (gravitational constant), `M_E_SI` (electron mass),
   `M_PROTON_SI` (proton mass), `ALPHA` (fine-structure constant),
   `EPS0_SI` (vacuum permittivity), `SIGMA_SB_SI` (Stefan–Boltzmann constant),
   `B_WIEN_SI` (Wien displacement constant), `M_U_SI` (atomic mass constant)
   and the rest of the `codata(...)` rows.
3. **Conventional astrophysical and cosmological constants**, chosen by
   convention and documented as such: `M_SUN_SI` (the nominal solar mass
   1.989e30 kg), `GM_SUN_SI` (the IAU 2015 nominal solar gravitational
   parameter, 1.3271244e20 m³/s²) and `H0_SI` (the Planck 2018 Hubble
   constant). Note that `GM_SUN_SI` is *not* `G_SI * M_SUN_SI` — the measured
   product GM☉ is more precise than either factor, and a confrontation that
   needs GM☉ takes the nominal parameter directly.

### Gotchas worth knowing before you write a formula

**A bare `e` is the elementary charge, not Euler's number.** This follows the
ISO 80000 / CODATA convention, and it matters in a physics formula.
`upt eval "e"` prints the CODATA elementary charge:

```bash
upt eval "e"
```

```text
1.602176634e-19 C
```

Euler's number is only `exp(x)`. `upt eval "exp(1)"` prints it:

```bash
upt eval "exp(1)"
```

```text
2.718281828459045
```

and the name `euler` is refused outright, with a message that says the same
thing (`euler is not Euler's number. Write it as exp(x), for example exp(1). A
bare e is the elementary charge. E is energy.`). The same rule holds inside
bindings: a bare `e` in `e=<number>` is the elementary charge, and an explicit
`e=<number>` binding replaces the CODATA value. `E` is energy and is its own
binding argument (`upt eval E E=1eV`). `e_charge` is the same charge as `e`: a
binding of one spelling fans out to the other, two spellings that disagree are
refused, and a formula that writes both names is twice that charge, so
`upt eval "e + e_charge" e_charge=3C` prints `6 C`, not `3 C`.

**`hbar` is the exact quotient, not the truncated display value.**
`HBAR_SI` is computed as `H_SI / (2π)`, both factors exact in the 2019 SI. The
CODATA *display* value of ħ (`1.054571817e-34`) is that quotient truncated to
ten digits, and the truncated decimal differs from the exact quotient by a
relative 6.127e-10 — enough to show up in a high-precision confrontation. When a formula uses `hbar`, the
CLI prints a one-line note on stderr that says exactly this, so a number you
cross-check against a CODATA table is never silently different at the last
digits.

**Unit conventions are chosen per invocation, with flags.** `upt eval` and
`upt map` take `--natural` (ħ = c = 1, and h = 2π) and `--geometrized` (ħ = c =
G = 1). Without a flag everything is read and printed in SI. `--natural` prints
a bare value because those units drop out of the dimension; k_B stays the SI
Boltzmann constant, so the Hawking formula reduces to `1/(8π G M k_B)` and the
printed number is that combination. `upt eval "hbar*c^3/(8*pi*G*M*k_B)" M=1.989e30 --natural`
prints it:

```bash
upt eval "hbar*c^3/(8*pi*G*M*k_B)" M=1.989e30 --natural
```

```text
21.708826656988485
```

`upt eval "hbar*c/fm" fm=1fm` prints the energy scale of a proton-radius
wavelength (about 197 MeV), keeping the dimension and the SI unit:

```bash
upt eval "hbar*c/fm" fm=1fm
```

```text
3.1615267734966904e-11 J
```

### Reading the registry yourself

`upt eval --help` prints the documented list of registered constant names and
aliases the evaluator fills in (`G`, `c`, `hbar`, `h`, `k_B`, `e`, `ln2`,
`epsilon_0`, `sigma_sb`, `b`, `GM_sun`, `Msun_iau`, and the aliases
`e_charge`, `m_e`, `m_p`, `m_proton`, `N_A`, `F`, `eps0`, `mu0`, `mu_0`,
`kB`, `M_sun` — that parenthetical is the help's own sample, not every
spelling), together
with the parser rules quoted above. Two caveats printed there are worth
repeating: a bare `sigma` is not the Stefan–Boltzmann constant (write
`sigma_sb`), and `T`, `temperature` and `T_K` are kelvin — an energy written on
such a name is read as k_B T.
