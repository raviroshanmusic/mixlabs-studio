-- MixLabs Studio — Data isolation hardening migration
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Purpose: remove three permissive "allow everything" RLS policies that let ANY
-- logged-in user insert themselves into any project (and read all profiles/invites),
-- replacing them with owner-scoped policies. Safe to re-run.
--
-- Background: projects/project_versions/review_comments SELECT correctly check
-- owner-or-member, but membership itself was writable by anyone — so a user could
-- self-insert into project_members and unlock another client's project + review room.

-- Recursion-safe owner check. SECURITY DEFINER so it bypasses RLS when called from
-- inside another table's policy (prevents policy A → table B → table A recursion).
create or replace function public.is_project_owner(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.projects where id = pid and owner_id = auth.uid());
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Was: profiles_all_authenticated (ALL, true/true) → anyone could overwrite anyone.
-- Now: still readable by authenticated users (needed to invite people by email),
--      but each user can only modify their own row.
drop policy if exists profiles_all_authenticated on public.profiles;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_modify_own on public.profiles;
create policy profiles_modify_own on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── project_members ──────────────────────────────────────────────────────────
-- Was: project_members_write_authenticated (ALL, true/true) → self-insert into any project.
-- Now: you see only your own membership; only the project owner can add/update/remove members.
--      (project_members_insert_self_invited stays — the legit accept-invite path.)
drop policy if exists project_members_write_authenticated on public.project_members;

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(auth.jwt() ->> 'email')
    or public.is_project_owner(project_id)
  );

drop policy if exists project_members_owner_insert on public.project_members;
create policy project_members_owner_insert on public.project_members
  for insert to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists project_members_owner_update on public.project_members;
create policy project_members_owner_update on public.project_members
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists project_members_owner_delete on public.project_members;
create policy project_members_owner_delete on public.project_members
  for delete to authenticated
  using (public.is_project_owner(project_id) or user_id = auth.uid());

-- ── project_invites ──────────────────────────────────────────────────────────
-- Was: project_invites_write_authenticated (ALL, true/true) → anyone could read all
--      client emails / forge invites.
-- Now: only the project owner manages invites.
--      (project_invites_select_invited / _update_invited stay — invited user sees own invite.)
drop policy if exists project_invites_write_authenticated on public.project_invites;

drop policy if exists project_invites_owner_select on public.project_invites;
create policy project_invites_owner_select on public.project_invites
  for select to authenticated using (public.is_project_owner(project_id));

drop policy if exists project_invites_owner_insert on public.project_invites;
create policy project_invites_owner_insert on public.project_invites
  for insert to authenticated with check (public.is_project_owner(project_id));

drop policy if exists project_invites_owner_update on public.project_invites;
create policy project_invites_owner_update on public.project_invites
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists project_invites_owner_delete on public.project_invites;
create policy project_invites_owner_delete on public.project_invites
  for delete to authenticated using (public.is_project_owner(project_id));
