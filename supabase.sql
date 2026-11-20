-- 회로 시뮬레이터 클라우드 저장 표 (Supabase 프로젝트 magi에 적용됨)
create table public.circuit_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index circuit_saves_user_updated_idx on public.circuit_saves (user_id, updated_at desc);
alter table public.circuit_saves enable row level security;
create policy circuit_saves_select_own on public.circuit_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy circuit_saves_insert_own on public.circuit_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy circuit_saves_update_own on public.circuit_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy circuit_saves_delete_own on public.circuit_saves for delete to authenticated using ((select auth.uid()) = user_id);

-- PC 조립 모드 진행상황 (사용자당 1행)
create table public.pc_build_progress (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.pc_build_progress enable row level security;
create policy pc_build_progress_select_own on public.pc_build_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy pc_build_progress_insert_own on public.pc_build_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy pc_build_progress_update_own on public.pc_build_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy pc_build_progress_delete_own on public.pc_build_progress for delete to authenticated using ((select auth.uid()) = user_id);
