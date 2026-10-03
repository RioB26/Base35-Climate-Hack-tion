# Methodology

Code is the source of truth: `web/src/model/` and `pipeline/sector_analysis.py`. This file explains it in words.

## 1. Methane generation (first-order decay)

For waste `M_i` (tonnes) accepted in year `i`, methane generated in year `t` is

```
Q(t) = Σ_{i ≤ t}  k · L0 · M_i · exp(−k · (t − i + 0.5))      [m³ CH₄/yr]
```

with a mid-year convention. `k` (1/yr) and `L0` (m³ CH₄/t) are per-site inputs. Mass uses 0.717 kg/m³.

## 2. Capture and emissions avoided

```
incremental capture = max(0, capture efficiency − existing capture)
captured CH₄        = generation × incremental capture
emissions avoided   = captured CH₄ × 28        (GWP100, Australia's national accounting factor)
```

Only capture on top of what the site already captures counts, so sites with existing gas collection are not double counted. A secondary 20-year view uses GWP20 = 80.8 (IPCC AR6, biogenic methane). We report "estimated emissions avoided", not avoided warming.

## 3. Electricity

Only the captured methane reaches the engine (one convention throughout):

```
thermal kW  = captured m³/h × 9.97 kWh/m³
electric kW = thermal kW × engine efficiency
MWh/yr      = electric kW × 8,760 × availability / 1000
```

Worked example (tested in `model.test.ts`): 1,000 m³/h landfill gas at 50% CH₄ gives about 3,140 t CH₄/yr. At 75% capture, about 2,355 t is captured, which avoids about 65,950 tCO₂-e/yr. That gas gives about 3.74 MW thermal, 1.42 MW electric and 11.2 GWh/yr.

## 4. Costs and cost per tonne

- Plant is sized for the peak year over the project life.
- `capex = (collection AUD per m³/h CH₄ × peak m³/h + engine AUD per kW × peak kW) × capex multiplier`, low and high.
- `opex/yr = engine O&M per MWh × MWh + collection O&M fraction × collection capex`.
- **Net cost per tCO₂-e** is levelised over the project life: `(capex + PV(opex − electricity revenue)) / PV(abatement)`, discounted at the discount rate. It can be negative. ACCU revenue is excluded so the result can be compared against a carbon price. The MACC shows an ACCU reference line.
- Simple payback is `capex / (first-year revenue − opex)`, with ACCU revenue included only when the toggle is on.

## 5. Portfolio (MACC and budget)

Sites are sorted by net cost per tonne. Bar width is average annual abatement over the project life. The budget slider funds sites in that order until the next site's mid capex no longer fits. The headline sums the funded sites' abatement from commissioning to 2035.

## 6. Satellite screening signal

Independent of the model; it never changes the tonnes.

1. Sentinel-5P L3 CH₄ (bias-corrected XCH₄), each overpass separately, over a 12 to 24 month window.
2. ERA5-Land 10 m wind at the site for the overpass hour.
3. Downwind sector: pixels 10 to 30 km from the site within ±30° of the direction the wind blows towards. Upwind sector: the opposite ±30°.
4. An overpass is usable if wind ≥ 2 m/s and each sector has ≥ 5 pixels. Delta = mean downwind − mean upwind (ppb).
5. Aggregate: mean delta with a bootstrap 95% interval (1,000 resamples).
6. Classify: **Elevated** if the interval is above zero and ≥ 8 usable overpasses; **Neutral** if the interval spans zero with half-width < 10 ppb; otherwise **Inconclusive**.

These thresholds are a team choice and should be revisited on real data. Other sources within 30 km (other landfills, agriculture, coal, wetlands) can produce enhancements; the signal cannot attribute them to the landfill.
