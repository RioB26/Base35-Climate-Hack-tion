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
| Mugga Lane factsheet, ACT City Services (Aug 2025) | Mugga Lane tonnage, existing 4.24 MW / 37,000 MWh plant | https://www.cityservices.act.gov.au/__data/assets/pdf_file/0003/1653393/Mugga-Lane-Gas-to-Energy-factsheet-August2025-acc.pdf | Used; history and closure are proxies |
| ABC News, 20 Nov 2023 | ~300,000 t/yr to ACT landfills | https://www.abc.net.au/news/2023-11-20/energy-generated-from-landfill-gas-to-power-canberra-homes/103124726 | Used |
| Cleanaway Lucas Heights AEMR 2024 | 2024 tonnage, approved cap, 2037 closure | https://cleanaway2stor.blob.core.windows.net/cleanaway2-blob-container/2025/03/AEMR-SSD-6835-2024-Lucas-Heights-Landfill.pdf | Used; opening year, earlier tonnage, existing capture are proxies |
| NZ Herald on Redvale extension | Redvale opening 1993, ~600,000 t/yr, consent to Dec 2028, ~95% capture (operator claim) | https://www.nzherald.co.nz/business/landfill-proposal-aucklands-biggest-landfill-set-to-stay-open-for-seven-to-eight-years-longer-than-expected-after-delays-for-new-facility/KPBOPWAYUFAKTAEYY553PFXZGQ/ | Used; tonnage history is a proxy |
| Transwaste Canterbury Annual Report 2020 and renewable energy factsheet | Kate Valley 332,000 t (2019/20), >90% capture (operator claim), 4 MW, opened 2005, consented to 2040 | https://transwastecanterbury.co.nz/wp-content/uploads/2020/09/TCL-2020-Annual-Report-FINAL-240920_signed.pdf | Used; tonnage history is a proxy |
| OpenFreeMap basemap tiles (OpenStreetMap data, ODbL) | Map background | https://openfreemap.org | Used at runtime |
| Cleanaway Ravenhall site page | >2 Mt/yr processed, >200 ha | https://www.cleanaway.com.au/location/ravenhall | Used; history, closure, existing capture are proxies |
| US EPA LMOP, LFG Energy Project Development Handbook ch. 4 (2021) | Collection/flare and engine capex and O&M (2020 USD) | https://www.epa.gov/system/files/documents/2021-07/pdh_chapter4.pdf | Used, converted to AUD |
| AEMO Quarterly Energy Dynamics Q2 2026 | Default power price (NEM average AUD 74/MWh) | https://www.aemo.com.au/newsroom/media-release/qed-q2-2026 | Used |
| CER Quarterly Carbon Market Report March quarter 2026 | Generic ACCU spot AUD 36.28 | https://cer.gov.au/markets/reports-and-data/quarterly-carbon-market-reports/quarterly-carbon-market-report-march-quarter-2026/australian-environmental-markets | Used |

## Parameters and their sources

| Parameter | Value | Source |
|---|---|---|
| GWP100 for methane | 28 | Australian National Greenhouse Accounts (to cite) |
| GWP20 for biogenic methane | 80.8 | IPCC AR6 WG1 (to cite) |
| Methane density | 0.717 kg/m³ | Standard conditions (to cite) |
| Methane lower heating value | 9.97 kWh/m³ | To cite |
| Engine electrical efficiency | 38% default | To cite |
| Collection and flare capex | AUD ~4,800 to 6,800 per m³/h of methane | US EPA handbook ch. 4: USD 1,313,000 for a 600 scfm system (~510 m³/h CH₄), 2020 USD |
| Engine capex | AUD 3,750 to 5,250 per kW | US EPA handbook table 4-3: large IC engine USD 2,000/kW, 2020 USD |
| Engine O&M | AUD ~71/MWh | US EPA handbook table 4-3: USD 300/kW-yr at 90% availability |
| Collection O&M | ~17% of collection capex per year | US EPA handbook ch. 4: USD 221,000/yr on USD 1,313,000 |
| USD to AUD | 1.5 | **Team assumption**, not a sourced rate |
| 2020 to 2026 cost escalation | × 1.25 | **Team assumption** |
| Australian cost premium (top of range) | up to × 1.4 | **Team assumption** |
| Power price | AUD 75/MWh | AEMO QED Q2 2026 |
| ACCU price | AUD 36 | CER QCMR March quarter 2026; method eligibility per DCCEEW landfill gas method |
| ACCU baseline proportion | 0.35 | CER simple method guide, landfill gas method 2025 (default 0.30 to 0.40, rising 0.5%/yr): https://cer.gov.au/document/simple-method-guide-landfill-gas-method-2025-pdf |
| k, L0 | 0.05 /yr, 100 m³/t | Screening defaults, to verify against NGA / LandGEM |

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
| MapLibre GL JS | BSD-3-Clause | Interactive map |
| Fraunces and Inter fonts (Google Fonts) | SIL Open Font License | Typography |
| earthengine-api | Apache-2.0 | Satellite pipeline |
