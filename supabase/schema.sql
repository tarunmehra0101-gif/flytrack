-- Ryoko Supabase schema.
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text,
  home_city_name text,
  home_airport_iata text,
  home_country_code text,
  work_city_name text,
  travel_profile_type text default 'frequent_flyer',
  onboarding_completed boolean default false,
  theme_preference text default 'dark',
  units_preference text default 'metric',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_parsed_segment_id text,
  source_type text,
  airline_iata text,
  airline_name text,
  flight_number text,
  passenger_name text,
  booking_reference text,
  pnr text,
  ticket_number text,
  departure_airport_iata text,
  arrival_airport_iata text,
  departure_city_name text,
  arrival_city_name text,
  departure_country_code text,
  arrival_country_code text,
  departure_lat double precision,
  departure_lng double precision,
  arrival_lat double precision,
  arrival_lng double precision,
  departure_time_utc timestamptz,
  arrival_time_utc timestamptz,
  departure_time_local text,
  arrival_time_local text,
  flight_date date,
  flight_duration_minutes integer,
  duration_source text,
  time_confidence text,
  distance_km numeric,
  aircraft_type text,
  cabin_class text,
  seat_number text,
  terminal_departure text,
  terminal_arrival text,
  gate text,
  route text,
  confidence text,
  confidence_score numeric,
  parser_rule text,
  missing_fields text[] default '{}',
  canonical_hash text,
  status text default 'confirmed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists flights_user_canonical_hash_idx
  on public.flights(user_id, canonical_hash)
  where canonical_hash is not null;

create table if not exists public.ticket_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  original_filename text,
  display_title text,
  parser_status text,
  parse_confidence numeric,
  parser_method text,
  parser_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  dashboard jsonb not null default '{}'::jsonb,
  wrapped jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year)
);

create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  scopes text,
  status text default 'connected',
  last_scan_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.gmail_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  years integer not null default 3,
  query text,
  page_token text,
  processed_count integer not null default 0,
  found_count integer not null default 0,
  saved_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_count integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.flights enable row level security;
alter table public.ticket_artifacts enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.gmail_connections enable row level security;
alter table public.gmail_import_jobs enable row level security;

create policy "Profiles are owned by user" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Flights are owned by user" on public.flights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Artifacts are owned by user" on public.ticket_artifacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Analytics are owned by user" on public.analytics_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Gmail connections are owned by user" on public.gmail_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Gmail import jobs are owned by user" on public.gmail_import_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, preferred_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
