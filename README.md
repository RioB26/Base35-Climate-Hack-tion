# Methane Payback

An open pre-feasibility screen for landfill methane capture in Australia and New Zealand, built for Climate Hack-tion 2026 (challenge area: **zero waste and methane reduction**, theme "Build for 2035").

> Existing systems tell you where methane is. Methane Payback helps decide what to fund first, and what it could achieve by 2035.

The app is four steps, one landfill at a time:

1. **Find:** a globe with every landfill pinned and a search box. Picking one flies in to it.
2. **Check:** the site's reported figures against an independent Sentinel-5P signal (downwind minus upwind methane over many overpasses), with a map of mean methane and the 10 to 30 km analysis area. If the satellite sees more than the reported capture explains, it shows by how much. This is a screening signal, never a measurement of facility emissions.
3. **Fix:** a short questionnaire (target capture, start year, power price, costs, carbon credits) next to a 3D landfill model in three size classes. Methane comes from a first-order decay model (LandGEM-style, adjustable k and L0).
4. **Fund:** the budget needed, electricity and money the project makes, the levelised **net cost per tCO₂-e abated**, a transparent COP31 alignment check, and a marginal abatement cost curve ranking every site with a budget slider.

It is a **pre-feasibility screen**, not a business case or feasibility study. It ranks candidates for detailed study.

> **Status:** five real landfills, three in Australia (Mugga Lane, Lucas Heights, Melbourne Regional Landfill) and two in New Zealand (Redvale, Kate Valley), with sourced headline figures, but several inputs per site (waste history, closure year, existing capture) are **proxies**, flagged in the app and in `sites.json`. Costs are benchmarked against US EPA landfill gas project data converted to AUD.

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
python satellite.py --project YOUR_GCP_PROJECT --start 2024-10-01 --end 2025-10-01   # writes satellite.json and methaneGrid.json
python -m unittest -v   # tests for the downwind/upwind statistic, no Earth Engine needed
```

## Live site (GitHub Pages)

CI (`.github/workflows/ci.yml`) runs the tests and builds on every push and pull request, and deploys `main` to GitHub Pages. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then appears at https://riob26.github.io/Base35-Climate-Hack-tion/.

## Repository layout

```
web/src/model/      methane generation, project economics, MACC, satellite comparison, COP31 rubric (+ tests)
web/src/data/       sites.json, assumptions.ts, satellite.json (inputs; every value needs a source)
web/src/pages/      the four steps: Find, Check, Fix, Fund
web/src/components/ globe, site map, 3D landfill, charts, sliders
pipeline/           Sentinel-5P + ERA5 screening pipeline (Earth Engine) and its tests
docs/               METHODOLOGY.md, DISCLOSURES.md
```

## Updating data

- **Sites:** add or edit a row in `web/src/data/sites.json`; the globe, search and ranking pick it up. If a site publishes its emissions, add `reportedEmissions` with a source and the Check step uses it instead of the capture claim. Set `illustrative: false` only when every input has a source in `sources`.
- **Costs and prices:** edit `web/src/data/assumptions.ts`. Replace each `PLACEHOLDER` with a sourced value and log it in `docs/DISCLOSURES.md`.
- **Satellite:** run the pipeline, or leave a site as `"status": "not_run"`. Never write a status by hand.

## Honest limits

- Sentinel-5P pixels are about 5.5 × 7 km. ESA states the data cannot attribute an enhancement to a specific facility. Many sites will come back inconclusive.
- Generation estimates depend strongly on waste-in-place, k and L0. Ranges matter more than point values.
- Capex is benchmarked against US EPA LFGcost-Web, which reflects typical US projects, and should be cross-checked with Australian data.
- ACCU revenue is optional and is subject to project eligibility and registration under the current landfill gas method.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and [docs/DISCLOSURES.md](docs/DISCLOSURES.md).
