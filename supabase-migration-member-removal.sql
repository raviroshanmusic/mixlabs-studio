-- V1: project owner and active project admins may remove members.
-- Membership removal never deletes accounts, files, comments, or other projects.
begin;
create or replace function public.can_manage_project_members(pid uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.projects where id=pid and owner_id=auth.uid())
  or exists(select 1 from public.project_members where project_id=pid and user_id=auth.uid()
    and lower(coalesce(status,'active')) in ('active','accepted','joined')
    and lower(coalesce(role,'viewer'))='admin');
$$;
revoke all on function public.can_manage_project_members(uuid) from public;
grant execute on function public.can_manage_project_members(uuid) to authenticated;

create or replace function public.remove_project_member(pid uuid,mid uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare target public.project_members%rowtype; project_owner uuid;
begin
  if auth.uid() is null or not public.can_manage_project_members(pid) then
    raise exception 'Project admin access required' using errcode='42501';
  end if;
  -- Serialize removals within the project; recheck after acquiring the lock.
  select owner_id into project_owner from public.projects where id=pid for update;
  if not found or not public.can_manage_project_members(pid) then
    raise exception 'Project admin access required' using errcode='42501';
  end if;
  select * into target from public.project_members where id=mid and project_id=pid for update;
  if not found then return false; end if;
  if target.user_id=project_owner then
    raise exception 'Project owner cannot be removed' using errcode='23514';
  end if;
  -- Cancel legacy pending invitations so they cannot restore removed access.
  delete from public.project_invites where project_id=pid and lower(email)=lower(target.email);
  -- Remove duplicate membership rows for this person within this project only.
  delete from public.project_members where project_id=pid and user_id is distinct from project_owner and
    (id=mid or (target.user_id is not null and user_id=target.user_id)
      or (target.email is not null and lower(email)=lower(target.email)));
  return true;
end;
$$;
revoke all on function public.remove_project_member(uuid,uuid) from public;
grant execute on function public.remove_project_member(uuid,uuid) to authenticated;

drop policy if exists project_members_owner_delete on public.project_members;
drop policy if exists project_members_admin_delete on public.project_members;
-- All app removals use the atomic RPC above, including invite cancellation.
-- No direct table DELETE is allowed; this also removes the old viewer-self-delete path.
commit;
