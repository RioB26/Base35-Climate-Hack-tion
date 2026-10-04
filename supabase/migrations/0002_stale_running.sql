-- Backstop for satellite jobs that die before reporting back, and support for retries.

alter table sites add column last_dispatch_at timestamptz;

create extension if not exists pg_cron;

select cron.schedule(
  'fail-stale-sites',
  '*/10 * * * *',
  $$update sites
    set satellite_status = 'failed', error = 'Timed out waiting for the satellite job.'
    where satellite_status in ('pending', 'running')
      and created_at < now() - interval '45 minutes'$$
);
