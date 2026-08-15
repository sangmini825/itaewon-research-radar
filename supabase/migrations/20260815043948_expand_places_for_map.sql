alter table public.places
  add column if not exists url text,
  add column if not exists instagram_url text,
  add column if not exists short_summary text,
  add column if not exists opening_hours text,
  add column if not exists tags text[] default '{}',
  add column if not exists verified boolean default false,
  add column if not exists updated_at timestamptz default now();

alter table public.places alter column status set default 'active';
update public.places set status = 'active' where status is null;

alter table public.places drop constraint if exists places_place_type_check;
alter table public.places add constraint places_place_type_check
  check (place_type is null or place_type in ('bar','restaurant','club','gallery','museum','performance','shop','cafe','other'));

alter table public.places drop constraint if exists places_coordinates_check;
alter table public.places add constraint places_coordinates_check
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180));

create index if not exists places_type_status_idx on public.places(place_type,status);
create index if not exists places_coordinates_idx on public.places(latitude,longitude);

alter table public.places enable row level security;
revoke all on public.places from anon, authenticated;
