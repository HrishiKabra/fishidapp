-- profiles: one row per auth user, created by trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  fish_icon text not null default '/images/fish-icons/001-gold-fish.png',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, fish_icon)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'fish_icon', '/images/fish-icons/001-gold-fish.png')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- species: public catalog (column order must match supabase/seed/species_rows.sql)
create table public.species (
  id text primary key,
  scientific_name text not null,
  common_name text not null,
  image_url text,
  habitat text,
  location text,
  size text,
  iucn_status text,
  description text,
  created_at timestamptz not null default now()
);
alter table public.species enable row level security;
create policy "species_public_read" on public.species
  for select to anon, authenticated using (true);

-- identifications: the fish log
create table public.identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scientific_name text not null,
  common_name text,
  confidence numeric,
  candidates jsonb not null,
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.identifications enable row level security;
create policy "identifications_own" on public.identifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index identifications_user_created_idx
  on public.identifications (user_id, created_at desc);

-- identify_events: server-only rate limiting (RLS on, no policies)
create table public.identify_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.identify_events enable row level security;
create index identify_events_user_created_idx
  on public.identify_events (user_id, created_at desc);

-- enrichment_cache: server-only (RLS on, no policies)
create table public.enrichment_cache (
  scientific_name text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.enrichment_cache enable row level security;
