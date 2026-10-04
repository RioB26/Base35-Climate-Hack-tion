-- Allow Fiji (FJ) sites, starting with Naboro landfill near Suva.
alter table sites drop constraint if exists sites_state_check;
alter table sites add constraint sites_state_check
  check (state in ('NSW','VIC','QLD','WA','SA','TAS','ACT','NT','NZ','FJ'));
