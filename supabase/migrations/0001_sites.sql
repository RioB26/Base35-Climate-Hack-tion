-- Sites added through the app, plus their satellite screening results.
-- The five original sites are loaded by pipeline/seed_supabase.py; the web app also
-- ships them as JSON so it still renders if this database is unreachable or paused.

create table sites (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  state text not null check (state in ('NSW','VIC','QLD','WA','SA','TAS','ACT','NT','NZ')),
  lat double precision not null check (lat between -48 and -9),
  lon double precision not null check (lon between 112 and 179),
  acceptance jsonb not null,
  k double precision not null check (k > 0 and k < 1),
  l0 double precision not null check (l0 > 0),
  existing_capture double precision not null check (existing_capture between 0 and 1),
  illustrative boolean not null default true,
  reported_emissions jsonb,
  notes text not null default '',
  sources jsonb not null default '[]',
  satellite_status text not null default 'pending' check (satellite_status in ('pending','running','done','failed')),
  error text,
  created_at timestamptz not null default now()
);

create table satellite_results (
  site_id text primary key references sites(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table methane_grid (
  site_id text primary key references sites(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Browsers (anon key) can read everything and write nothing. Writes go through the
-- add-site Edge Function and the satellite Action, both of which use the service key.
alter table sites enable row level security;
alter table satellite_results enable row level security;
alter table methane_grid enable row level security;

create policy "public read" on sites for select using (true);
create policy "public read" on satellite_results for select using (true);
create policy "public read" on methane_grid for select using (true);

alter publication supabase_realtime add table sites, satellite_results, methane_grid;
