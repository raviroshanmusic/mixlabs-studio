-- V1: all active project members may invite teammates into their own project.
-- Existing update/delete policies and content permissions remain unchanged.
begin;
create or replace function public.can_invite_project(pid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects where id = pid and owner_id = auth.uid()
  ) or exists (
    select 1 from public.project_members
    where project_id = pid and user_id = auth.uid()
      and lower(coalesce(status, 'active')) in ('active', 'accepted', 'joined')
  );
$$;
revoke all on function public.can_invite_project(uuid) from public;
grant execute on function public.can_invite_project(uuid) to authenticated;
drop policy if exists project_members_owner_insert on public.project_members;
drop policy if exists project_members_member_insert on public.project_members;
create policy project_members_member_insert on public.project_members
for insert to authenticated with check (
  public.can_invite_project(project_id)
  and invited_by = auth.uid()
  and role in ('viewer', 'editor', 'admin')
);
commit;
