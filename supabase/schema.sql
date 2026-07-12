-- ============================================================================
--  Badminton Video Analysis — Database schema
--  Run this in the Supabase Dashboard → SQL Editor (one shot).
--  Re-running RESETS the app tables (safe now — there is no real data yet).
-- ============================================================================

-- Clean slate so re-running always applies the latest schema.
drop table if exists public.findings cascade;
drop table if exists public.analyses cascade;
drop table if exists public.videos   cascade;
drop table if exists public.players  cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- 1. profiles : one row per authenticated coach (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  club       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. players : athletes a coach tracks
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  handedness  text default 'unknown' check (handedness in ('left','right','unknown')),
  skill_level text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists players_coach_id_idx on public.players (coach_id);

-- ---------------------------------------------------------------------------
-- 3. videos : uploaded clips (file lives in Storage bucket 'videos')
-- ---------------------------------------------------------------------------
create table if not exists public.videos (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references auth.users (id) on delete cascade,
  storage_path      text not null,          -- e.g. '<coach_id>/<video_id>.mp4'
  original_filename text,
  duration_seconds  numeric,
  status            text not null default 'uploaded'
                    check (status in ('uploaded','queued','processing','done','failed')),
  error_message     text,
  created_at        timestamptz not null default now()
);
create index if not exists videos_coach_id_idx on public.videos (coach_id);
create index if not exists videos_status_idx   on public.videos (status);

-- ---------------------------------------------------------------------------
-- 4. analyses : one analysis run per video (worker fills this in)
-- ---------------------------------------------------------------------------
create table if not exists public.analyses (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references public.videos (id)   on delete cascade,
  coach_id      uuid not null references auth.users (id) on delete cascade,
  player_id     uuid references public.players (id) on delete set null,
  status        text not null default 'pending'
                check (status in ('pending','processing','done','failed')),
  metrics       jsonb,        -- structured CV output (coverage, movement, ...)
  summary       text,         -- Claude-generated overall narrative
  model_version text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists analyses_video_id_idx on public.analyses (video_id);
create index if not exists analyses_coach_id_idx on public.analyses (coach_id);

-- ---------------------------------------------------------------------------
-- 5. findings : individual weaknesses / strengths within an analysis
-- ---------------------------------------------------------------------------
create table if not exists public.findings (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id)  on delete cascade,
  coach_id    uuid not null references auth.users (id)  on delete cascade,
  side        text,                       -- 'near' / 'far' (or player label)
  category    text not null,              -- footwork, backhand, net_play, defense, ...
  kind        text not null default 'weakness' check (kind in ('weakness','strength')),
  severity    int check (severity between 1 and 5),
  title       text not null,
  detail      text,
  evidence    jsonb,                      -- timestamps, court zones, clip refs
  created_at  timestamptz not null default now()
);
create index if not exists findings_analysis_id_idx on public.findings (analysis_id);

-- ============================================================================
--  Row Level Security  — every table locked to its owning coach.
--  The Python worker uses the SERVICE ROLE key, which bypasses RLS, so it can
--  freely update analyses / insert findings.
--  Note: (select auth.uid()) is wrapped in a subselect so Postgres caches it
--  per-statement instead of re-evaluating per-row (perf best practice).
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.players  enable row level security;
alter table public.videos   enable row level security;
alter table public.analyses enable row level security;
alter table public.findings enable row level security;

-- profiles: a user manages only their own row
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using ((select auth.uid()) = id);
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check ((select auth.uid()) = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- players / videos: full ownership by coach
drop policy if exists "players_owner_all" on public.players;
create policy "players_owner_all" on public.players
  for all using ((select auth.uid()) = coach_id) with check ((select auth.uid()) = coach_id);

drop policy if exists "videos_owner_all" on public.videos;
create policy "videos_owner_all" on public.videos
  for all using ((select auth.uid()) = coach_id) with check ((select auth.uid()) = coach_id);

-- analyses / findings: coach reads (worker writes via service role)
drop policy if exists "analyses_owner_select" on public.analyses;
create policy "analyses_owner_select" on public.analyses
  for select using ((select auth.uid()) = coach_id);

drop policy if exists "findings_owner_select" on public.findings;
create policy "findings_owner_select" on public.findings
  for select using ((select auth.uid()) = coach_id);

-- ============================================================================
--  Auto-create a profile row whenever a new auth user signs up.
--  search_path = '' hardens this SECURITY DEFINER function.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The trigger still fires, but block direct API/RPC calls to this definer function.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ============================================================================
--  Storage : private 'videos' bucket + per-coach access.
--  Files are stored under '<coach_id>/<video_id>.<ext>'.
--  Upsert needs INSERT + SELECT + UPDATE policies (Supabase gotcha).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

drop policy if exists "videos_upload_own" on storage.objects;
create policy "videos_upload_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "videos_read_own" on storage.objects;
create policy "videos_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "videos_update_own" on storage.objects;
create policy "videos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'videos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "videos_delete_own" on storage.objects;
create policy "videos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================================
--  Realtime : let the app receive live status updates as the worker processes.
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.videos;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.analyses;
exception when duplicate_object then null; end $$;
