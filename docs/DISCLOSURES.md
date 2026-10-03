# Disclosures

Every external tool, library, dataset, API and AI tool used in this project. Keep this updated the same hour something is added.

## AI tools

| Tool | Used for |
|---|---|
| Claude (Anthropic), via Claude Code | Project research and planning; scaffolding the web app, model, tests, satellite pipeline and these docs. All output reviewed by the team. |

## Datasets and APIs

| Dataset | Used for | Source | Status |
|---|---|---|---|
| Sentinel-5P TROPOMI L3 CH₄ (Copernicus, via Google Earth Engine `COPERNICUS/S5P/OFFL/L3_CH4`) | Satellite screening signal | ESA / Copernicus | Pipeline written, not yet run |
| ERA5-Land hourly wind (`ECMWF/ERA5_LAND/HOURLY`) | Wind direction per overpass | ECMWF / Copernicus Climate Change Service | Pipeline written, not yet run |
| Site inputs for the four illustrative sites (waste accepted, k, L0, existing capture) | Methane model | None | **Placeholder** |
| Redvale and Kate Valley site inputs (tonnage, years, existing capture, coordinates) | Methane model | Operator and press sources listed in each site's `sources` in `sites.json` | Operator-reported, not independently verified. Tonnage is flat per year; capture is the operator's own claim |
| NZ k and L0 for Redvale and Kate Valley | Methane model | NZ ETS Schedule 3 default waste composition and per-component Lo and k (MfE Landfill Gas Capture Management final report), waste-weighted: L0 ≈ 61 m³ CH₄/t, k ≈ 0.067 | Proxy for default composition, not site measurements |

## Parameters and their sources

| Parameter | Value | Source |
|---|---|---|
| GWP100 for methane | 28 | Australian National Greenhouse Accounts (to cite) |
| GWP20 for biogenic methane | 80.8 | IPCC AR6 WG1 (to cite) |
| Methane density | 0.717 kg/m³ | Standard conditions (to cite) |
| Methane lower heating value | 9.97 kWh/m³ | To cite |
| Engine electrical efficiency | 38% default | To cite |
| Collection and engine capex ranges | see `assumptions.ts` | **Placeholder**: benchmark against US EPA LFGcost-Web and Australian project data |
| Opex | see `assumptions.ts` | **Placeholder** |
| Power price | AUD 80/MWh | **Placeholder** |
| ACCU price | AUD 35 | **Placeholder**; method eligibility per DCCEEW landfill gas method |

## Tools and services

| Tool | Used for |
|---|---|
| Google Earth Engine (`earthengine-api`) | Satellite data access |
| GitHub Pages and GitHub Actions | Hosting and CI |

## Libraries

| Library | Licence | Used for |
|---|---|---|
| React, React DOM | MIT | UI |
| Vite, @vitejs/plugin-react | MIT | Build tooling |
| TypeScript | Apache-2.0 | Type checking |
| Vitest | MIT | Tests |
| earthengine-api | Apache-2.0 | Satellite pipeline |
