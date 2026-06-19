-- MixLabs Studio — Team visibility fix
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Problem: project_members_select only let you see your OWN membership row
-- (or everything, if you were the project owner). So a regular member opening
-- the Team section saw only themselves instead of the whole team.
--
-- Fix: any member of a project may see all member rows for that project.
-- We add a recursion-safe SECURITY DEFINER helper (mirrors is_project_owner) so
-- the policy can ask "is the caller a member of this project?" without the
-- project_members policy recursing into itself.

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid
      and (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'))
  );
$$;

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select to authenticated
  using (
    public.is_project_owner(project_id)
    or public.is_project_member(project_id)
  );
