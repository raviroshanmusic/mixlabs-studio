-- MixLabs Studio — Restrict project creation to staff
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Internal tool: only MixLabs staff may create projects; clients are invited
-- into existing ones. The app's API enforces this too, but this RLS policy is
-- the backstop — it holds even against direct Supabase REST calls with a
-- client's own JWT.
--
-- The allowlist here MUST stay in sync with src/lib/staff.ts.

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and lower(auth.jwt() ->> 'email') in (
      'rajputraviroshan@gmail.com',
      'mixlabscreative@gmail.com'
    )
  );
