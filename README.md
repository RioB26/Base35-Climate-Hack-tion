# Methane Payback

An open pre-feasibility screen for landfill methane capture in Australia and New Zealand, built for Climate Hack-tion 2026 (challenge area: **zero waste and methane reduction**, theme "Build for 2035").

> Existing systems tell you where methane is. Methane Payback helps decide what to fund first, and what it could achieve by 2035.

For a handful of landfills it:

1. **Models** methane generation with a first-order decay model (LandGEM-style, adjustable k and L0).
2. **Costs** a capture-plus-electricity project as a range and computes the levelised **net cost per tCO₂-e abated**.
3. **Ranks** sites on a marginal abatement cost curve. A budget slider shows which sites get funded and how much they abate by 2035.
4. **Screens** each site with an independent Sentinel-5P signal (downwind minus upwind methane over many overpasses). This is a screening signal, never a measurement of facility emissions.

It is a **pre-feasibility screen**, not a business case or feasibility study. It ranks candidates for detailed study.

> **Status:** the site and cost data in `web/src/data/` are **placeholders** until replaced with sourced inputs. The app shows a banner while any placeholder remains.

## Run it

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # model tests, including the hand-calculated worked example
npm run build    # static site in web/dist
```

Satellite pipeline (needs a Google Earth Engine account and a Cloud project):

```bash
cd pipeline
pip install -r requirements.txt
earthengine authenticate
python satellite.py --project YOUR_GCP_PROJECT --start 2024-10-01 --end 2025-10-01
python -m unittest -v   # tests for the downwind/upwind statistic, no Earth Engine needed
```

## Live site (GitHub Pages)

CI (`.github/workflows/ci.yml`) runs the tests and builds on every push and pull request, and deploys `main` to GitHub Pages. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then appears at https://riob26.github.io/Base35-Climate-Hack-tion/.

## Repository layout

```
web/src/model/      methane generation, project economics, MACC and budget logic (+ tests)
web/src/data/       sites.json, assumptions.ts, satellite.json (inputs; every value needs a source)
web/src/components/ UI: headline, MACC, site table, See / Model / Act panels, sliders
pipeline/           Sentinel-5P + ERA5 screening pipeline (Earth Engine) and its tests
docs/               METHODOLOGY.md, DISCLOSURES.md
```

## Updating data

- **Sites:** edit `web/src/data/sites.json`. Set `illustrative: false` only when every input has a source in `sources`.
- **Costs and prices:** edit `web/src/data/assumptions.ts`. Replace each `PLACEHOLDER` with a sourced value and log it in `docs/DISCLOSURES.md`.
- **Satellite:** run the pipeline, or leave a site as `"status": "not_run"`. Never write a status by hand.

## Honest limits

- Sentinel-5P pixels are about 5.5 × 7 km. ESA states the data cannot attribute an enhancement to a specific facility. Many sites will come back inconclusive.
- Generation estimates depend strongly on waste-in-place, k and L0. Ranges matter more than point values.
- Capex is benchmarked against US EPA LFGcost-Web, which reflects typical US projects, and should be cross-checked with Australian data.
- ACCU revenue is optional and is subject to project eligibility and registration under the current landfill gas method.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and [docs/DISCLOSURES.md](docs/DISCLOSURES.md).
