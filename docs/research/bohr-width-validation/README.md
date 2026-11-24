# Bohr-width review for gas-phase malonaldehyde

**The physical width substitution remains unresolved.** The published action supports a quantitative comparison within a simplified potential. A physically calibrated width and an independent comparable kinetic rate are still missing. This review keeps the candidate's existing evidence status.

## Source selection

- Wang, Braams, Bowman, Carter and Tew report an electronic saddle height of 4.1 kcal/mol on a full-dimensional ab initio surface. The open archive contains geometries and energies. The saddle height is relative to the potential minimum. This review did not establish a one-dimensional physical coordinate, turning points at the selected state energy, or joint width-height uncertainties on that surface. The review input therefore supplies only the saddle height as metadata. [2008 paper](https://doi.org/10.1063/1.2937732) · [QM-22 archive](https://doi.org/10.60732/e77ca63e)
- Eraković et al. report an action of $8.11\hbar$ and an along-path peak of $4756\,\mathrm{cm}^{-1}$ for a simplified modified Guo surface. Section III.A and Figure 1 document this case. The zero-energy convention uses the minima as the potential zero. The same surface has a $3497\,\mathrm{cm}^{-1}$ saddle. Using the saddle instead of the along-path peak would change the width convention. [2020 paper](https://doi.org/10.1063/1.5145278)
- Lawrence, Dušek and Richardson show H and D paths on a different, modern surface in mass-weighted coordinates. They also report a separate fluctuation prefactor and splitting calculation. This review keeps those paths and their $1411\,\mathrm{cm}^{-1}$ saddle out of the modified Guo comparison. [2023 paper](https://doi.org/10.1063/5.0155579)
- The independent ground-state spectroscopy finds a splitting of $21.583208818(133)\,\mathrm{cm}^{-1}$. The simplified 2020 model reports $50.7\,\mathrm{cm}^{-1}$ before the proposed width change. The spectroscopy measures an energy difference, so the input leaves the kinetic rate blank. The height inferred from the same spectroscopy is also excluded from the validation inputs. [Primary spectroscopy](https://doi.org/10.1063/5.0278646)

## Paired comparison

Use $\Delta=hc(100\,\mathrm{m}^{-1})\,4756$ and $I/\hbar=8.11$. Use the catalog reference proton mass of $1.67262192369\times10^{-27}\,\mathrm{kg}$. Then $L_{\mathrm{eff}}=I/\sqrt{2m_p\Delta}=48.11\,\mathrm{pm}$. This is an action-equivalent reference length. Its value depends on the specified mass and peak convention, while the original instanton action already incorporates collective motion.

Replacing it with $a_0\approx52.92\,\mathrm{pm}$ changes the exponent $2I/\hbar$ from 16.22 to 17.84. Both equivalent rectangular descriptions pass the encoded opacity guard at ten. Their exponential transmission factors have a Bohr-to-baseline ratio of about 0.198. This comparison holds the height and reference mass fixed and reports no kinetic rate.

The four supplied sensitivity points cross the endpoints of ±0.005 in the printed $I/\hbar$ ratio and ±0.5 cm⁻¹ in the printed peak. These limits assume rounding to the displayed precision. They do not describe a sampling distribution or uncertainty in the potential, path, or coordinate. Every point passes the guard in both arms, with transmission ratios from 0.1955 to 0.1998. Validation against spectroscopy would require splitting predictions for both arms under the same dynamical model, including its prefactor, followed by comparison to the independent measurement.

## Reproduce

Run from the repository root.

```sh
bun run build
node tools/bohr-width-review.mjs docs/research/bohr-width-validation/malonaldehyde-input.json
```

The tool runs the existing catalog guard for each arm, suppresses comparisons where either arm is refused, and distinguishes dimensionless transmission factors from rates. The [plan](../../planning/bohr-width-validation.md) defines the evidence and tabulated-profile input contracts.
