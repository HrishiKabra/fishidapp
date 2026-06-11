-- handle_new_user is trigger-only; nobody should call it via the API
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- leftover event trigger + function from this project's previous life
drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();
