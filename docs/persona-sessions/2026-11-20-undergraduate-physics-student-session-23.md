# Undergraduate physics student dogfood, session 23, 2026-11-20

Persona: Undergraduate physics student (outside the rotation)
Area: electricity, magnetism and circuits
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 22 to 26 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #745 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "1/(2*pi*sqrt(L*C))" L=1mH C=1uF` | 5032.92 s^-1 | LC resonance. Match. |
| `upt eval "V0*(1-exp(-t/(R*C)))"` at 10 V, 1 ms, 1 kOhm, 1 uF | 6.3212 V | RC charging. Match. |
| `upt eval` RLC impedance at 60 Hz | 18.3221 ohm | Match. |
| `upt eval "1/sqrt(epsilon_0*mu0)"` | 299792457.99999994 m/s | c. Match. |
| `upt evaluate case-resistor-noise` | V_rms 4.0683e-7 V | Match. |
| `upt evaluate be-84 V=1mV I=1uA` | 4532.36 ohm | (pi/ln2) R. Match. |
| `upt explain cyclotron-frequency ... --source=canonical` | 17587001866.29 | qB/m, not qB/(2 pi m) = 2.799e9 Hz. Issue #747. |
| `upt explain magnetic-field current=10A distance=0.05m --source=canonical` | cannot be determined | mu_0 is not supplied. Issue #750. |
| `upt explain field-energy-density ... epsilon_0=8.854e-12F/m` | 4.4271e-6, exit 0 | The user value is replaced silently. Issue #751. |
| `upt derive F:force mu_0:permeability q:charge --formula "q*mu_0"` | NOT a unique monomial, 0 free groups | Misleading reason. Issue #760. |
| `upt derive ... E:electric_field` | unknown base dimension, exit 2 | #740 comment. |
| `upt retrieve --formula="I*R" ...` | CE-ohm-law at index 69 | #737 comment. |

Each value marked Match agrees with a hand value from CODATA 2018 constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #747 | CE-cyclotron-frequency returns the angular frequency |
| #750 | `explain` does not supply mu_0 |
| #751 | `explain` replaces a close epsilon_0 silently |
| #760 | `derive` gives a misleading exit-3 reason |

## Other findings

be-120 (Chapman-Ferraro standoff) gives 4 times the hand value from B^2/(2 mu_0) = rho v^2. The printed formula 2B^2/(mu_0 rho v^2) gives about 10 Earth radii for Earth inputs, which matches observation. The factor depends on a convention, so no issue was filed.
