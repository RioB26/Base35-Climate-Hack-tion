-- Sites whose satellite check finds too little usable data are marked 'rejected' (with the reason in
-- `error`) so the app can tell the person who added them, then removed an hour later.
alter table sites drop constraint if exists sites_satellite_status_check;
alter table sites add constraint sites_satellite_status_check
  check (satellite_status in ('pending','running','done','failed','rejected'));

select cron.schedule(
  'delete-rejected-sites',
  '*/10 * * * *',
  $$delete from sites
    where satellite_status = 'rejected'
      and last_dispatch_at < now() - interval '1 hour'$$
);
