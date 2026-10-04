# Disclosures

Every external tool, library, dataset, API and AI tool used in this project. Keep this updated the same hour something is added.

## AI tools

| Tool | Used for |
|---|---|
| Claude (Anthropic), via Claude Code | Project research and planning; scaffolding the web app, model, tests, satellite pipeline and these docs. All output reviewed by the team. |
| Codex (OpenAI) | Currency selector and homepage implementation, responsive layout and verification; reviewed against the app styling and existing model. |
| OpenAI image generation, built-in imagegen tool | Detailed homepage landfill scene, conceptual wind comparison, landscape background and decorative foliage. Optimized as WebP; illustrations are not site photographs or measured data. Prompts recorded in [HOMEPAGE_ASSETS.md](HOMEPAGE_ASSETS.md). |
| User-supplied Sentinel Sniff brand kit | Plume-to-leaf SVG marks and favicon, live wordmark styling and homepage brand refinements. Supplied SVG provenance metadata retained. Integration recorded in [BRAND.md](BRAND.md). |

## Datasets and APIs

| Dataset | Used for | Source | Status |
|---|---|---|---|
| US EPA, Basic Information about Landfill Gas and Frequent Questions | Homepage explanation of methane formation, capture-to-electricity, combustion and waste diversion | https://www.epa.gov/lmop/basic-information-about-landfill-gas ; https://www.epa.gov/lmop/frequent-questions-about-landfill-gas | Background verified 4 Oct 2026 |
| Sustainable Business Network, Climate Hack-tion: Build for 2035 | Event and COP31 context | https://sustainable.org.nz/learn/events/climate-hack-tion-challenge-build-for-2035/ | Event brief checked 4 Oct 2026 |
| UNFCCC, official COP31 conference page | Homepage footer link to the UN climate summit; this project is not an official COP31 tool | https://unfccc.int/cop31 | Link checked 4 Oct 2026 |
| Google Earth Engine Data Catalog, Sentinel-5P methane and ERA5-Land hourly | Footer links to documentation for the satellite and wind datasets already used in the pipeline | https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_CH4 ; https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_HOURLY | Documentation links checked 4 Oct 2026 |
| Sentinel-5P TROPOMI L3 CH₄ (Copernicus, via Google Earth Engine `COPERNICUS/S5P/OFFL/L3_CH4`) | Satellite screening signal | ESA / Copernicus | Run for all five sites, 2024-10-01 to 2025-10-01 |
| Frankfurter daily reference exchange rates | Display conversion from AUD to NZD, USD, EUR, GBP, CAD, CHF and JPY; rate dates shown in the selector | https://frankfurter.dev/ | Fetched at runtime; AUD remains available if rates fail |
| ISO 4217 currency codes (SIX maintenance agency) | Currency identifiers and names | https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html | Eight current currency codes used |
| ERA5-Land hourly wind (`ECMWF/ERA5_LAND/HOURLY`) | Wind direction per overpass | ECMWF / Copernicus Climate Change Service | Run for all five sites, 2024-10-01 to 2025-10-01 |
| Mugga Lane factsheet, ACT City Services (Aug 2025) | Mugga Lane tonnage, existing 4.24 MW / 37,000 MWh plant | https://www.cityservices.act.gov.au/__data/assets/pdf_file/0003/1653393/Mugga-Lane-Gas-to-Energy-factsheet-August2025-acc.pdf | Used; history and closure are proxies |
| ABC News, 20 Nov 2023 | ~300,000 t/yr to ACT landfills | https://www.abc.net.au/news/2023-11-20/energy-generated-from-landfill-gas-to-power-canberra-homes/103124726 | Used |
| Cleanaway Lucas Heights AEMR 2024 | 2024 tonnage, approved cap, 2037 closure | https://cleanaway2stor.blob.core.windows.net/cleanaway2-blob-container/2025/03/AEMR-SSD-6835-2024-Lucas-Heights-Landfill.pdf | Used; opening year, earlier tonnage, existing capture are proxies |
| NZ Herald on Redvale extension | Redvale opening 1993, ~600,000 t/yr, consent to Dec 2028, ~95% capture (operator claim) | https://www.nzherald.co.nz/business/landfill-proposal-aucklands-biggest-landfill-set-to-stay-open-for-seven-to-eight-years-longer-than-expected-after-delays-for-new-facility/KPBOPWAYUFAKTAEYY553PFXZGQ/ | Used; tonnage history is a proxy |
| Transwaste Canterbury Annual Report 2020 and renewable energy factsheet | Kate Valley 332,000 t (2019/20), opened 2005, consented to 2040; capture of about 96% is an operator claim (North Canterbury News, 8 Aug 2024); 4.3 MW commissioned 2014 | https://transwastecanterbury.co.nz/wp-content/uploads/2020/09/TCL-2020-Annual-Report-FINAL-240920_signed.pdf | Used; tonnage history is a proxy |
| OpenFreeMap basemap tiles (OpenStreetMap data, ODbL) | Site map background | https://openfreemap.org | Used at runtime |
| Natural Earth 1:50m land, via the world-atlas package | Globe on the Find step, and site map fallback | https://www.naturalearthdata.com | Public domain; bundled |
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
| k, L0 for Redvale and Kate Valley | 0.067 /yr, 61 m³/t | Waste-weighted from the NZ ETS Schedule 3 default composition and per-component Lo and k, as reproduced in the MfE Landfill Gas Capture Management final report: https://environment.govt.nz/assets/publications/Waste/landfill-gas-management-final-report-.pdf. Proxy, not site measurements |

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
| MapLibre GL JS | BSD-3-Clause | Interactive map and globe |
| three.js | MIT | 3D landfill model |
| world-atlas, topojson-client | ISC | Bundled coastline for the globe |
| Fraunces and Inter fonts (Google Fonts) | SIL Open Font License | Typography |
| earthengine-api | Apache-2.0 | Satellite pipeline |
