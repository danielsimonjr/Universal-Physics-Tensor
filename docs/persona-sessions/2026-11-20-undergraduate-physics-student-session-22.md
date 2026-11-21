# Undergraduate physics student dogfood, session 22, 2026-11-20

Persona: Undergraduate physics student (outside the rotation)
Area: classical mechanics
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 22 to 26 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #745 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "v^2*sin(2*theta)/g" v=20m/s theta=45deg g=9.81m/s^2` | 40.7747 m | Projectile range. Match. |
| `upt eval "sqrt(G*M/r)" M=5.972e24kg r=6.771e6m` | 7672.49 m/s | Orbital speed. Match. |
| `upt eval "rho*g*h" rho=1000kg/m^3 g=9.81m/s^2 h=2m` | 19620 Pa | Match. |
| `upt eval "r*F" r=0.5m F=10N` | 5 J | Value match. Torque is named as energy (#739 comment). |
| `upt derive I:M.L^2 m:mass L:length --formula "m*L^2/12"` | prefactor 0.08333 | 1/12. Match. |
| `upt explain kinetic-energy mass=2kg speed=3m/s --source=canonical` | Recovered value: 9 | No unit. Issue #748. |
| `upt explain bernoulli-total-pressure ... --source=canonical` | 29120 | 5000 + 4500 + 19620. Match. |
| `upt explain period semi-major-axis=7e6m mass=5.972e24kg --source=canonical` | 5828.59886 | Kepler. Match. |
| `upt search buoyancy` | no entry matches | `buoyant` finds CE-buoyant-force. Issue #756. |
| `upt regime oscillators --at theta0=0.6` | ab-pendulum-linear VIOLATED, exit 3 | Match. |
| `upt path model-pendulum model-spring` | delta = 0.0158525 | T/T0 - 1 at 0.5 rad. Match. |
| `upt evaluate case-kepler-rv` | K = 12.478650981 m/s | Match. |

Each value marked Match agrees with a hand value from CODATA 2018 constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #748 | `explain` prints the recovered value with no unit |
| #756 | `search` misses word forms (buoyancy, orbit) |

## Other findings

No classical-mechanics atlas family. No friction, collision, orbital-speed, escape-speed or vis-viva entry (#741 comment).
