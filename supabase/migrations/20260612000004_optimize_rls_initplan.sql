-- Wrap auth.uid() in a subselect so Postgres evaluates it once per query
-- instead of once per row (advisor: auth_rls_initplan).
drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy "identifications_own" on public.identifications;
create policy "identifications_own" on public.identifications
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
