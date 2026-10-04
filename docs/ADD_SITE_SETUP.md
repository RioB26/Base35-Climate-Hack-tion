# Add-a-landfill: one-time repo setup

The Find page's **Add a landfill** button saves a site to Supabase and starts the
`Satellite screening` GitHub Action, which fetches the Sentinel-5P data without anyone
touching it. These steps need repo-admin rights, so they have to be done by the repo owner.

## 1. Merge to `main`

`repository_dispatch` and "Run workflow" only work for workflow files on the default branch,
so the Action cannot fire until `.github/workflows/satellite.yml` is merged.

## 2. Create the dispatch token (owner account)

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate:

- Resource owner: the owner of this repo
- Repository access: only `Base35-Climate-Hack-tion`
- Repository permissions: **Contents: Read and write** (the `repository_dispatch` API requires it; Metadata: Read is added automatically)
- Expiry: 90 days. Set a reminder, because adding a site stops working when it expires.

Send the token to whoever owns the Supabase project. They store it with
`supabase secrets set GH_DISPATCH_TOKEN=... GH_REPO=<owner>/Base35-Climate-Hack-tion`.

## 3. Earth Engine service account

1. In the Google Cloud project registered for Earth Engine: IAM & Admin → Service Accounts → create one (any name).
2. Grant it **Service Usage Consumer** and **Earth Engine Resource Writer** (check Google's current Earth Engine access docs if a role name has changed).
3. Register the service account for Earth Engine at https://code.earthengine.google.com/register (service account option). Without this, calls fail with a permission error even when IAM looks right.
4. Create a JSON key for it (Keys → Add key → JSON).

## 4. Repository secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `EE_PROJECT` | The Google Cloud project id registered for Earth Engine |
| `EE_SERVICE_ACCOUNT_KEY` | The whole JSON key file contents |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (Project Settings → API). Never expose it in the browser. |
| `SUPABASE_ANON_KEY` | Supabase anon key. Public by design; used so the Pages build can read the database |

## 5. Check it works

Actions → **Satellite screening** → Run workflow → site id `mugga-lane` (an existing site; its row in
Supabase is overwritten with a fresh run). It should finish green and the site's `satellite_status`
should read `done`.

---

## What is automatic and what is not

| Part of a site | Source | Automatic? |
|---|---|---|
| Satellite signal (downwind minus upwind, 95% range, passes used) | Sentinel-5P via Earth Engine | Yes, from coordinates alone |
| Wind at overpass | ERA5-Land via Earth Engine | Yes |
| Methane map grid | Sentinel-5P | Yes |
| Waste history (tonnes per year, by period) | Landfill operator / regulator reports | **No.** Entered in the form. There is no public API. |
| k, L0 | Screening defaults (0.05, 100) | Defaults, editable in the form |
| Existing capture | Operator reports | **No.** Defaults to 0 unless entered |
| Published emissions (`reportedEmissions`) | Facility reporting, if any | **No.** Without it the Check page uses the capture claim |

So a user supplies the waste history; everything satellite-derived arrives on its own. User-added
sites are flagged `illustrative` because their inputs are proxies. The model, ranking and
economics run immediately, and the satellite panel fills in a few minutes later.

If the job fails for any reason (bad key, Earth Engine quota, timeout), the site is marked
`failed` with a message instead of staying on "running". Re-run it from the Actions tab.

---

## Admin housekeeping

- **Remove a bad or spam site** (results cascade): `supabase db query "delete from sites where id = '<id>'" --linked`
- **Rotate the passcode** (no redeploy needed): `supabase secrets set ADD_SITE_PASSCODE=<new>`
- **Dispatch token expiry:** `GH_DISPATCH_TOKEN` expires about 90 days after 2026-10-04, around **2027-01-02**.
  Create a new fine-grained token (Actions: write on this repo) and run `supabase secrets set GH_DISPATCH_TOKEN=<new>`.
- **Retry a failed site:** the Check page shows a Retry button (passcode required), backed by the `retry-site`
  function (`supabase functions deploy retry-site`). Retries are limited to one per 5 minutes per site.
- **Stuck jobs:** migration `0002_stale_running.sql` adds a `pg_cron` job that marks sites `failed` after 45 minutes
  in `pending`/`running`. Apply the migration (`supabase db push`) before deploying the updated `add-site`, which
  now writes the `last_dispatch_at` column.
