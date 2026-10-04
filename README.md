<img src="web/public/brand/lockup-horizontal-light.svg" alt="Sentinel Sniff" width="390" />

# Sentinel Sniff

**Which tip do we fix first?** FIND · CHECK · FIX · FUND


An open pre-feasibility screen for landfill methane capture in Australia and New Zealand, built for Climate Hack-tion 2026 (challenge area: **zero waste and methane reduction**, theme "Build for 2035").

> Existing systems tell you where methane is. Sentinel Sniff helps decide what to fund first, and what it could achieve by 2035.

## The problem and our solution

Organic waste buried in landfills decomposes without oxygen and produces landfill gas, including methane and carbon dioxide. Escaping methane contributes to climate change and loses a potential fuel. Wells and pipes can collect that gas; after treatment, it can fuel electricity generation. Some landfills in our dataset already do this, so we screen opportunities for **additional capture**, rather than treating every site as a new power plant.

Sentinel Sniff is the decision tool: satellite and wind data flag regional signals for investigation, while a separate landfill model estimates additional capture, electricity, costs, potential revenue and payback. It helps compare what to investigate and fund towards 2035. Gas combustion still emits CO₂; the methane reduction estimate is not a complete lifecycle footprint or an estimate of avoided grid emissions. Gas recovery complements keeping organic waste out of landfill.

Background: [US EPA landfill gas overview](https://www.epa.gov/lmop/basic-information-about-landfill-gas) and [landfill gas questions, including waste diversion](https://www.epa.gov/lmop/frequent-questions-about-landfill-gas). The project addresses the waste and methane theme of [Climate Hack-tion's Build for 2035 challenge](https://sustainable.org.nz/learn/events/climate-hack-tion-challenge-build-for-2035/), run ahead of COP31; it is not an official COP31 tool.

The homepage introduces the project, satellite screening and estimated project benefits. **Explore landfills** opens the globe at `#/landfills`; the brand link returns home at `#/`. Homepage components and styles live in `web/src/pages/home/`. Detailed illustrations and decorative foliage live in `web/src/assets/home/`; their generation prompts and intended use are recorded in [docs/HOMEPAGE_ASSETS.md](docs/HOMEPAGE_ASSETS.md). The wind comparison is illustrative, with responsive HTML labels rather than measured data. The shared footer (`web/src/components/SiteFooter.tsx`) appears on every page with project navigation, research and dataset references from the source register, Climate Hack-tion context and the [official COP31 website](https://unfccc.int/cop31). Its How it works link returns to the homepage section from any step.

The homepage separates the methane problem, the investment question and the capture-to-energy solution, with large section headings and the Find → Check → Fix → Fund workflow. Typography, colour roles and card shapes follow the [EU Climate Hacktion Design Brief](<docs/EU Climate Hacktion Design Brief.md>): Fraunces headings, Inter body/UI text, evergreen panels, tangerine emphasis and 18px corners. Find, Check, Fix and Fund share the same typography, content width, warm cards and navigation styling. Home and Find share their workflow copy, and interactive views show a branded fallback if rendering is unavailable. The supplied Sentinel Sniff kit adds its plume-to-leaf mark, roman/italic wordmark, browser favicon and reverse lockup; see [docs/BRAND.md](docs/BRAND.md) for asset provenance. Small tangerine text and the hero emphasis use the darker methane-ramp shade for readability. Sections reveal once as they enter view; reduced-motion preferences, keyboard focus and browsers without intersection observation keep the content immediately visible.

The app is five steps, one landfill at a time:

1. **Find:** a globe with every landfill pinned and a search box. Picking one flies in to it.
2. **Check:** the site's reported figures against an independent Sentinel-5P signal (downwind minus upwind methane over many overpasses), with a map of mean methane and the 10 to 30 km analysis area. If the satellite sees more than the reported capture explains, it shows by how much. This is a screening signal, never a measurement of facility emissions.
3. **Fix:** a short questionnaire (target capture, start year, power price, costs, carbon credits) next to a 3D landfill model in three size classes. Methane comes from a first-order decay model (LandGEM-style, adjustable k and L0).
4. **Fund:** the budget needed, electricity and money the project makes, the levelised **net cost per tCO₂-e abated**, a transparent COP31 alignment check, and a marginal abatement cost curve ranking every site with a budget slider.
5. **Plan:** a printable (PDF) step-by-step plan for the site that compares leaving it, flaring, electricity and biomethane by climate benefit, energy, budget and cost per tonne.

It is a **pre-feasibility screen**, not a business case or feasibility study. It ranks candidates for detailed study.

> **Status:** six real landfills, three in Australia (Mugga Lane, Lucas Heights, Melbourne Regional Landfill), two in New Zealand (Redvale, Kate Valley) and one in Fiji (Naboro, with no methane capture reported), with sourced headline figures, but several inputs per site (waste history, closure year, existing capture) are **proxies**, flagged in the app and in `sites.json`. Costs are benchmarked against US EPA landfill gas project data converted to AUD.

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

The Check step also includes a curated snapshot of the Carbon Mapper public catalog for **Tanager** high-resolution methane observations. The snapshot currently contains plume records near Lucas Heights and Ravenhall; Mugga Lane, Redvale and Kate Valley have an explicit `no_public_coverage` state. Tanager records are corroborating plume evidence, not a replacement for the engineering model or Sentinel-5P screening.

To refresh the high-resolution catalog search for **all five landfills**, run:

```bash
python carbon_mapper.py --radius 15
```

This queries the public Carbon Mapper source catalog, follows nearby Tanager plume IDs, and rewrites `web/src/data/tanager.json`. It cannot create observations where Tanager has not acquired or published a scene. For those sites, the result remains `no_public_coverage`; obtaining guaranteed coverage requires a Carbon Mapper/Planet tasking or research request, or licensed GHGSat/airborne data.

The Sentinel-5P pipeline can also export monthly screening periods from the same timestamped overpasses and ERA5 wind:

```bash
python satellite.py --project YOUR_GCP_PROJECT --start 2024-10-01 --end 2025-10-01
```

Generated `satellite.json` records include a `periods` array. The Check page uses those periods when present and falls back to the annual result when a refreshed time series is unavailable or a selected period has too few usable passes.

## Live site (GitHub Pages)

CI (`.github/workflows/ci.yml`) runs the tests and builds on every push and pull request, and deploys `main` to GitHub Pages. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then appears at https://riob26.github.io/Base35-Climate-Hack-tion/.

## Repository layout

```
web/src/model/      methane generation, project economics, MACC, satellite comparison, COP31 rubric (+ tests)
web/src/data/       sites.json, assumptions.ts, satellite.json (inputs; every value needs a source)
web/src/pages/      the five steps: Find, Check, Fix, Fund, Plan
web/src/components/ globe, site map, 3D landfill, charts, sliders
pipeline/           Sentinel-5P + ERA5 screening pipeline (Earth Engine) and its tests
docs/               METHODOLOGY.md, DISCLOSURES.md
```

## Adding a landfill from the app

The Find page has an **Add a landfill** button. It posts to a Supabase Edge Function, which validates the site, saves it, and starts a GitHub Action that runs the Sentinel-5P screening (`pipeline/run_site.py`) and writes the result back. The page shows progress live. Everything is on free tiers.

One-time setup:

1. **Supabase project:** apply `supabase/migrations/0001_sites.sql`, then `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python pipeline/seed_supabase.py` to load the five existing sites.
2. **Edge Function:** `supabase functions deploy add-site`, then `supabase secrets set ADD_SITE_PASSCODE=... GH_DISPATCH_TOKEN=... GH_REPO=owner/repo`. The token is a fine-grained GitHub token with Actions: write on this repo only.
3. **Earth Engine:** create a service account, register it with Earth Engine, and store its JSON key as the repo secret `EE_SERVICE_ACCOUNT_KEY`. Also set repo secrets `EE_PROJECT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `SUPABASE_ANON_KEY`.
4. **Local dev:** put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `web/.env.local`. Without them the app runs on the bundled data and the button is hidden.

User-added sites are marked as using proxy inputs (default k and L0 unless changed, the waste history as entered). Free Supabase projects pause after a week of inactivity; the bundled data keeps the app working meanwhile. To re-run a failed site, use the **Satellite screening** workflow's "Run workflow" button with the site id.

## Updating data

- **Sites:** add or edit a row in `web/src/data/sites.json`; the globe, search and ranking pick it up. If a site publishes its emissions, add `reportedEmissions` with a source and the Check step uses it instead of the capture claim. Set `illustrative: false` only when every input has a source in `sources`.
- **Costs and prices:** edit `web/src/data/assumptions.ts`. Replace each `PLACEHOLDER` with a sourced value and log it in `docs/DISCLOSURES.md`.
- **Satellite:** run the Sentinel-5P pipeline, or leave a site as `"status": "not_run"`. Never write a status by hand.
- **Tanager:** update `web/src/data/tanager.json` only from a recorded Carbon Mapper catalog query, retaining the observation ID, timestamp, coordinates, emission estimate and uncertainty. Recheck the Carbon Mapper Terms of Use before redistributing records or imagery.
- **High-resolution refresh:** run `python carbon_mapper.py --radius 15` from `pipeline/` after verifying the catalog and licensing terms.

## Honest limits

- Sentinel-5P pixels are about 5.5 × 7 km. ESA states the data cannot attribute an enhancement to a specific facility. Many sites will come back inconclusive.
- Generation estimates depend strongly on waste-in-place, k and L0. Ranges matter more than point values.
- Capex is benchmarked against US EPA LFGcost-Web, which reflects typical US projects, and should be cross-checked with Australian data.
- ACCU revenue is optional and is subject to project eligibility and registration under the current landfill gas method.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and [docs/DISCLOSURES.md](docs/DISCLOSURES.md).
