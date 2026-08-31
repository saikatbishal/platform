-- Platform — auth backend
-- Run AFTER schema.sql. Paste into the Supabase SQL editor, or: supabase db push
--
-- Google handles identity and Supabase Auth stores the user in the private
-- auth.users table. This file adds the one piece of auth backend the app owns:
-- a public "profiles" row per user, created automatically at first sign-in,
-- so the app never has to read auth.users directly (it can't — that schema is
-- locked) and other features have a place to hang user-visible fields.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Traveller',
  avatar_url   text,
  -- Room to grow without another migration: home station, preferred livery
  -- theme, language. Nullable on purpose; absence means "default".
  home_station text,
  theme        text check (theme in ('icf-night', 'rajdhani', 'vande-bharat')),
  locale       text check (locale in ('en', 'hi')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone may read profiles (needed if journeys are ever shared); only the
-- owner may change theirs; nobody inserts directly — the trigger below does.
drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles
  for select using (true);

drop policy if exists "own profile is editable" on public.profiles;
create policy "own profile is editable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- First sign-in: copy the name and picture Google supplied into the profile.
-- SECURITY DEFINER because the trigger runs during Supabase's own insert into
-- auth.users, where the anonymous role has no rights on public tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1),
             'Traveller'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
