-- Carbon Mapper (Tanager) plume records per site, collected by the same job as the satellite screening.
-- data has the shape of one entry of web/src/data/tanager.json plus catalogCheckedAt and coverageRadiusKm.
create table tanager_results (
  site_id text primary key references sites(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table tanager_results enable row level security;
create policy "public read" on tanager_results for select using (true);
alter publication supabase_realtime add table tanager_results;
