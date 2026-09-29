# Applied physicist — CLI dogfood, 2026-09-29

Session on master `44e4450` (Tier 10 path already landed), Bun 1.4.2, `bun install` then `bun run build`, invoked as `node bin/upt.mjs`. The formula parser in this clone is MathTS (`upt eval --show-parser` prints `mathts` and exits 0). `upt version` stays a bare semver.

Commands below are what was typed. "Printed" is the output on that master commit. Where this branch changes it, the regression is `tests/cli/dogfood-2026-09-29.test.ts`.

## What worked

- Unbound `e` is refused. `upt eval "e^2/(4*pi*eps0*r^2)" r=1e-10` exits 2 and names `e_charge`. `upt eval e_charge` is the elementary charge.
- Fine-structure constant, with the charge symbol:

  ```
  upt eval "e_charge^2/(4*pi*eps0*hbar*c)"
  ```

  prints `0.007297352569278033` (CODATA α). stderr notes that `hbar` is `H_SI/(2π)`, not the truncated display `1.054571817e-34`.
- `upt eval "mu0*eps0*c^2"` prints `1`.
- Bohr radius `4*pi*eps0*hbar^2/(m_e*e_charge^2)` prints `5.291772109060855e-11`.
- Both Rydberg writings agree and exit 0. `m_e*e_charge^4/(32*pi^2*eps0^2*hbar^2)` prints `2.179872361086218e-18`. The short ħ form `m_e*e_charge^4/(8*eps0^2*hbar^2)` exits 3 with factor `39.4784` (`4π²`). That failure is the check working.
- `upt map --equation-only --equation "compton_wavelength = hbar/(m_e*c)"` already printed the convention line that one entry is λ̄ = ħ/(mc) and the other is λ = h/(mc).
- `upt eval --natural "m*c^2" m=1` prints `1`. `upt eval --geometrized "G*M/r" M=1 r=1` prints `1`.
- `2pi`, `factorial(5)` and `erf(1)` parse under MathTS. `gamma(5)` is `24` (the gamma function, not the Lorentz factor). `sqrt(-1)` says complex. `ln(-1)` says NaN.

## Bugs

### The Euler note names a symbol that does not exist

```
upt eval --allow-euler e
```

Printed, exit 0, value `2.718281828459045`, and a note that elementary charge and eccentricity are `(charge, eccentricity)`. `upt eval charge` exits 2 (missing). The symbol that works is `e_charge`.

Expected: the note names `e_charge`. Fixed on this branch. `upt eval charge` still exits 2.

### `mu0` is dimensionless on `map`, and `eval` rejects the catalog spellings

```
upt map --equation-only --equation "magnetic_field = mu0*current/(2*pi*radius)"
```

Printed exit 0 with `mu0` taken as dimensionless, and a hint toward `mu_0`. The same formula with `mu_0` is the wire field. `upt eval` accepted `mu0` and `eps0` and rejected `mu_0`, `epsilon_0` and `kB` (`k_B` worked).

Expected: `mu0` rewrites to `mu_0` before the dimension check, and the wire formula agrees with `CE-magnetic-field-wire` (sourced prefactor `1/(2π)`). `upt eval mu_0`, `epsilon_0` and `kB` return the same constants as `mu0`, `eps0` and `k_B`. Fixed on this branch. `src/canonical` is unchanged.

### An unbound target is given a dimension, and a declined letter suggests itself

```
upt map --equation-only --equation "B = mu_0*I/(2*pi*r)"
```

Printed, exit 0:

- `RHS dimension: [L M T^-2 I^-2] (target not in the catalog, so no comparison)` — that dimension is permeability, because `I` and `r` were filled in as dimensionless so the expression would parse. It was printed as the dimension of the formula.
- `'B' did not match a catalog quantity — did you mean: B` on the same screen as `'B' matches the catalog quantity B … and is not bound`.

`upt map --equation-only --equation "force = e_charge^2/(4*pi*eps0*r^2)"` printed both `r did not match — did you mean: r` and `r matches … and is not bound`. With `--bind-short` the force is dimensionally consistent and the prefactor is not checked (the target `force` is not Coulomb's `electric_force`). That second part is the catalog, not a parser bug.

Expected: a placeholder dimension is labelled unknown, and a declined one-letter name is not reported as a failed match that suggests itself. `I` is not a one-letter catalog name, so it still gets a real "did not match" hint. Fixed on this branch. Exit stays 0: a placeholder is not a failed check.

### A Compton formula that matches one entry fails on the other

```
upt map --equation-only --equation "compton_wavelength = hbar/(m_e*c)"
```

Printed exit 3. It agreed with `CE-compton-wavelength` and differed from `CE-compton-wavelength-full` by `0.159155` (`1/(2π)`). The `h/(m_e*c)` form agreed with the full entry and differed from the reduced one by `6.28319`, also exit 3.

Expected: agreement with either entry of that pair is that convention, exit 0, and the other factor is still printed. A formula that matches neither still fails: `compton_wavelength = 2*hbar/(m_e*c)` exits 3. Fixed on this branch.

### `--natural` and `--geometrized` still compare at SI c, ħ and G

```
upt map --equation-only --equation "rest_energy = mass"
```

Printed a dimensional mismatch and `yours/canonical = 1.11265e-17` (`1/c²`). That SI failure is right.

```
upt map --natural --equation-only --equation "rest_energy = mass"
```

Printed dimensionally consistent `[mass]`, the note that `c^2` was set to 1, and the same factor `1.11265e-17`. Exit 3. The sentence and the number contradict each other.

```
upt map --geometrized --equation-only --equation "schwarzschild_radius = 2*mass"
```

Printed dimensionally consistent and factor `1.34659e+27` (SI `c²/G`), exit 3.

Expected: `--natural` compares at `c = 1`, `ħ = 1`, `h = 2π`, so `rest_energy = mass` agrees and exits 0. `rest_energy = 2*mass --natural` still exits 3 with factor `2.00000`, not `2/c²`. `--geometrized` compares `schwarzschild_radius = 2*mass` at `G = c = 1` and agrees. The SI command is unchanged. Fixed on this branch.

### `upt eval` hides the unit notes `evaluate` already prints

`evaluate` warns that `myr` is a milliyear, `Msun` is `M_SUN_SI`, bare `G` is the gauss and bare `T` is the tesla. `upt eval` converted the same tokens and said nothing.

```
upt eval "e_charge^2/(4*pi*eps0*r^2)" r=1A
```

Printed `2.3070775523417355e-28` and exit 0. `r=1angstrom` and `r=1Å` print `2.307…e-8`. Bare `A` is the ampere (SI scale 1), so `r=1A` is the Coulomb force at 1 metre, twenty orders away from an angstrom, with no note. `upt eval G G=1G` printed `0.0001` and replaced Newton's `G` for that name. `upt eval t t=1myr` printed `31557.6` with no milliyear note. `upt eval M M=1Msun` printed `1.989e30` with no `M_SUN_SI` note.

Expected: the same notes `evaluate` prints, plus a note that bare `A` is the ampere. The number stays the conversion (`1A` is still 1 ampere; `GPa` is still a gigapascal; `Ts` is still a terasecond). Fixed on this branch. The notes are also on the JSON envelope (`result.notes`), which previously left the ħ truncation note on stderr only.

## Confusing UX and docs

- README Quick Start and `cli/README.md` now say Bun 1.4.2, that `corepack prepare bun@1.4.2` fails, and that a clone install uses MathTS while a published install uses the builtin parser. That split is real: `factorial`, `erf`, juxtaposition `2pi` and bare `e` are MathTS. This clone followed the Bun path and did not re-check a published `npm install`.
- `upt eval --show-parser --json` prints the bare word `mathts`, not an envelope.
- A binding cannot be an expression. `upt eval gamma v=0.6*c` reads `c` as a unit (`unknown unit 'c'`). The Lorentz factor has to be written `v=1.798754748e8`.
- `upt eval` has no Stefan–Boltzmann constant. `sigma` is missing. `map` already hints `sigma_sb`. Adding a bare `sigma` would collide with that hint.

## Suggestions not implemented

- `upt metric` still rejects `M=1Msun` and `theta=pi/2` (`not a finite number`). See the GR report.
- `upt eval --show-parser --json` still prints a bare word.
- A value binding is still not an expression (`v=0.6*c`).
- Do not add a bare `sigma` to `upt eval`.
