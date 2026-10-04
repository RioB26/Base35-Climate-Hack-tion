# Methodology

Code is the source of truth: `web/src/model/` and `pipeline/sector_analysis.py`. This file explains it in words.

## 1. Methane generation (first-order decay)

For waste `M_i` (tonnes) accepted in year `i`, methane generated in year `t` is

```
Q(t) = Σ_{i ≤ t}  k · L0 · M_i · exp(−k · (t − i + 0.5))      [m³ CH₄/yr]
```

with a mid-year convention. `k` (1/yr) and `L0` (m³ CH₄/t) are per-site inputs. Mass uses 0.717 kg/m³.

The temperate sites use k = 0.05. Naboro (Fiji) uses k = 0.17, the IPCC 2019 Refinement default for bulk waste in tropical moist and wet climates (Vol. 5 Ch. 3, Table 3.3). With 70,000 t/yr from 2005 this gives about 690 m³/h of methane in 2016, against about 800 m³/h estimated by Mani et al. (2016). Fiji has no landfill credit scheme, so no credit revenue is modelled there, and no sourced household electricity figure was found, so the homes-powered card is hidden for Fiji.

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

**Homes powered (Fund step).** `homes = MWh/yr × 1000 / kWh per home per year`, using the first project year's electricity. A typical Australian home is taken as 17 kWh a day (6,205 kWh a year), the midpoint of "11–23 kWh per day" from energy.gov.au ([Size your solar system](https://www.energy.gov.au/solar/solar-system-design/size-your-solar-system)). A New Zealand home is 8,000 kWh a year, the household MBIE models in its Quarterly Survey of Domestic Electricity Prices ([Electricity cost and price monitoring](https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/energy-prices/electricity-cost-and-price-monitoring)). This is an equivalence for scale, not a claim about where the power is sold.

## 4. Costs and cost per tonne

- Plant is sized for the peak year over the project life.
- `capex = (collection AUD per m³/h CH₄ × peak m³/h + engine AUD per kW × peak kW) × capex multiplier`, low and high.
- `opex/yr = engine O&M per MWh × MWh + collection O&M fraction × collection capex`.
- **Net cost per tCO₂-e** is levelised over the project life: `(capex + PV(opex − electricity revenue)) / PV(abatement)`, discounted at the discount rate. It can be negative. ACCU revenue is excluded so the result can be compared against a carbon price. The MACC shows an ACCU reference line.
- Simple payback is `capex / (first-year revenue − opex)`, with ACCU revenue included only when the toggle is on.
- Potential ACCU revenue counts only capture above the higher of existing capture and the landfill gas method's default baseline proportion (0.35, the midpoint of 0.30 to 0.40 in the CER 2025 method guide).

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

## 7. Reported versus satellite (Check step)

Code: `web/src/model/discrepancy.ts`.

1. **Reported emissions.** If a site has a published figure (`reportedEmissions`), use it. Otherwise use the model's methane for the satellite window's year times (1 − the operator's reported capture). None of the five current sites has a published figure, so this is a proxy.
2. **Expected signal.** A simple mass balance: crosswind, a plume carries Q / u of methane per metre. Averaged over the pipeline's downwind sector (10 to 30 km, ±30°), it is spread over an effective width of 2 · tan 30° · 20 km ≈ 23 km. Divide by the moles of air in the column (surface pressure / g / molar mass of dry air) to get ppb. Wind u is the ERA5 mean over usable overpasses once the pipeline exports it (`wind` in satellite.json), otherwise an assumed 5 m/s.
3. **Verdict.** Consistent if the expected signal lies inside the observed 95% interval; "satellite sees more" if it lies below; "sees less" if above. No verdict below 8 usable overpasses.
4. **How big the gap is.** Observed minus expected (ppb), and the emission rate the observed signal would imply if the landfill were the only source. When that rate is more than the landfill's whole modelled generation, the app says other sources or a retrieval artefact must explain most of it.

Limits: one source, no boundary-layer or chemistry modelling, 10 m wind rather than plume-height wind, and Sentinel-5P retrievals differ over land and sea, which matters for coastal sites. It is a screening flag for a closer look.

## 8. High-resolution Tanager evidence

The Check step includes a dated snapshot from the [Carbon Mapper public catalog](https://data.carbonmapper.org/). Tanager records are searched within a 15 km radius of each landfill coordinate and displayed as plume points with the catalogued observation time and, where available, automated emission rate and uncertainty.

This layer is intentionally separate from the model and Sentinel-5P result:

- A Tanager plume is high-resolution observational evidence, not a direct annual landfill emission measurement.
- A missing public record means no catalogued coverage was found in the checked radius, not that the site has no methane.
- A record without an emission estimate remains useful as a detection but cannot be treated as a quantified rate.

The Check page also groups every snapshot record into distance bands from the registered landfill coordinate. This is a
transparent screening profile: the coordinate is not a surveyed landfill boundary, and a catalog point is not
necessarily the physical plume origin. Facility attribution still requires boundary geometry, wind alignment, repeated
source locations, and alternative-source controls. Tanager's metre-scale ground sampling distance describes the
observation product; it does not mean the catalog point itself is a metre-scale plume footprint.
- The current snapshot has records near Lucas Heights and Ravenhall; the other three sites are marked `no_public_coverage`.
- Source points and rates should be revalidated before being used in investment, compliance or public claims.

## 9. COP31 alignment check (Fund step)

Code: `web/src/model/cop31.ts`. Our own rubric, not an official COP31 metric. Four parts, 25 points each:

| Part | Rule |
|---|---|
| Methane cut | Share of currently escaping methane the project stops. 30% (Global Methane Pledge, by 2030) earns 15; 45% (UNEP Global Methane Assessment, 1.5 °C pathway) earns 25; linear in between and below. |
| Speed | 25 if commissioned by 2030, falling linearly to 0 at 2035. |
| Cost per tonne | 25 × (1 − net cost / (2 × ACCU price)), clamped to 0 to 25: full at zero cost, half at the ACCU price. |
| Electricity produced | 25 × (electricity revenue / operating cost), capped at 25: full when power sales pay for running the plant. |

No score is shown when the site has no capture headroom at the chosen target.

## 10. 3D model size classes (Fix step)

Code: `web/src/model/size.ts`. Modelled waste in place to 2025: under 10 Mt is small, 10 to 30 Mt medium, 30 Mt and over large. The model is illustrative, not to scale. Wells shown are the existing capture share (grey) and the extra capture (orange) of a fixed number of well slots per size class.
### Multi-resolution methane evidence

The product separates evidence by what each sensor can support:

- **Sentinel-5P/TROPOMI** is used for regional, multi-pass downwind-versus-upwind screening. Its approximately 5–7 km footprint is not treated as facility attribution.
- **Carbon Mapper/Tanager** is used for facility-scale corroboration where a public catalogue observation exists. A catalogue source point is not presented as a plume polygon.
- **Sentinel-2** is reserved for site context such as landfill boundaries, infrastructure and nearby land use. It does not measure methane directly.
- **GHGSat or plume geometry from a licensed high-resolution product** is required for a stronger attribution assessment: plume footprint, origin, acquisition-time wind and repeated detections.

Until the boundary and plume geometry layers are available, the app reports nearby high-resolution evidence and regional corroboration separately and keeps landfill attribution unresolved.
