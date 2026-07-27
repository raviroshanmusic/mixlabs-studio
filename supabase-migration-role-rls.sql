-- MixLabs Studio — Unify RLS on `role` + close member-write holes
-- Run once in the Supabase SQL editor. Safe to re-run. Wrapped in a transaction.
--
-- WHY:
--  1. project_versions write gated on `permission` IN ('admin','owner'), but the
--     app only ever writes permission='view' (members/route.ts:63) and stores the
--     real value in `role`. Net effect: NO member could upload a draft, ever.
--  2. deliveries/documents/exchange/milestones gated on bare membership — so a
--     'viewer' (client) could insert/update/DELETE them.
--  3. milestone UPDATE had WITH CHECK true → a member could rewrite project_id
--     and inject rows into another project entirely.
--
-- MODEL (matches the UI in ProjectClient.tsx):
--   owner  → everything
--   admin  → read + write
--   editor → read + write
--   viewer → read only

begin;

-- ── helpers ──────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so they bypass RLS when called from inside another table's
-- policy (prevents policy A → table B → table A recursion). Mirrors the existing
-- public.is_project_owner() from supabase-migration-isolation.sql.

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
     where id = pid and owner_id = auth.uid()
  ) or exists (
    select 1 from public.project_members
     where project_id = pid
       and (user_id = auth.uid()
            or lower(email) = lower(auth.jwt() ->> 'email'))
       and lower(coalesce(status, 'active')) in ('active','accepted','joined','invited')
  );
$$;

create or replace function public.can_edit_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
     where id = pid and owner_id = auth.uid()
  ) or exists (
    select 1 from public.project_members
     where project_id = pid
       and user_id = auth.uid()                    -- must be a claimed account
       and lower(coalesce(status, 'active')) in ('active','accepted','joined')
       and lower(coalesce(role, 'viewer')) in ('admin','editor')
  );
$$;

-- ── project_versions ─────────────────────────────────────────────────────────
drop policy if exists project_versions_write_owner_or_admin   on public.project_versions;
drop policy if exists project_versions_select_owner_or_member on public.project_versions;

create policy project_versions_select on public.project_versions
  for select to authenticated using (public.is_project_member(project_id));
create policy project_versions_insert on public.project_versions
  for insert to authenticated with check (public.can_edit_project(project_id));
create policy project_versions_update on public.project_versions
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy project_versions_delete on public.project_versions
  for delete to authenticated using (public.can_edit_project(project_id));

-- ── project_milestones ───────────────────────────────────────────────────────
drop policy if exists "project members can view milestones"   on public.project_milestones;
drop policy if exists "project members can insert milestones" on public.project_milestones;
drop policy if exists "project members can update milestones" on public.project_milestones;
drop policy if exists "project members can delete milestones" on public.project_milestones;

create policy project_milestones_select on public.project_milestones
  for select to authenticated using (public.is_project_member(project_id));
create policy project_milestones_insert on public.project_milestones
  for insert to authenticated with check (public.can_edit_project(project_id));
create policy project_milestones_update on public.project_milestones
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));   -- was `true` → cross-project injection
create policy project_milestones_delete on public.project_milestones
  for delete to authenticated using (public.can_edit_project(project_id));

-- ── project_documents ────────────────────────────────────────────────────────
drop policy if exists project_documents_select on public.project_documents;
drop policy if exists project_documents_insert on public.project_documents;
drop policy if exists project_documents_update on public.project_documents;
drop policy if exists project_documents_delete on public.project_documents;

create policy project_documents_select on public.project_documents
  for select to authenticated using (public.is_project_member(project_id));
create policy project_documents_insert on public.project_documents
  for insert to authenticated with check (public.can_edit_project(project_id));
create policy project_documents_update on public.project_documents
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy project_documents_delete on public.project_documents
  for delete to authenticated using (public.can_edit_project(project_id));

-- ── project_deliveries ───────────────────────────────────────────────────────
drop policy if exists project_deliveries_select on public.project_deliveries;
drop policy if exists project_deliveries_insert on public.project_deliveries;
drop policy if exists project_deliveries_update on public.project_deliveries;
drop policy if exists project_deliveries_delete on public.project_deliveries;

create policy project_deliveries_select on public.project_deliveries
  for select to authenticated using (public.is_project_member(project_id));
create policy project_deliveries_insert on public.project_deliveries
  for insert to authenticated with check (public.can_edit_project(project_id));
create policy project_deliveries_update on public.project_deliveries
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy project_deliveries_delete on public.project_deliveries
  for delete to authenticated using (public.can_edit_project(project_id));

-- ── project_exchange ─────────────────────────────────────────────────────────
-- Exchange is the client<->studio file drop, and is DELIBERATELY open to every
-- member: ExchangeTab.tsx renders <B2Upload> unconditionally (not behind
-- canEdit), so viewers/clients are meant to upload source material here.
-- Delete mirrors the UI's `canEdit || f.uploaded_by === currentUserId`.
drop policy if exists project_exchange_select on public.project_exchange;
drop policy if exists project_exchange_insert on public.project_exchange;
drop policy if exists project_exchange_update on public.project_exchange;
drop policy if exists project_exchange_delete on public.project_exchange;

create policy project_exchange_select on public.project_exchange
  for select to authenticated using (public.is_project_member(project_id));
create policy project_exchange_insert on public.project_exchange
  for insert to authenticated
  with check (public.is_project_member(project_id) and uploaded_by = auth.uid());
create policy project_exchange_update on public.project_exchange
  for update to authenticated
  using (public.can_edit_project(project_id) or uploaded_by = auth.uid())
  with check (public.can_edit_project(project_id) or uploaded_by = auth.uid());
create policy project_exchange_delete on public.project_exchange
  for delete to authenticated
  using (public.can_edit_project(project_id) or uploaded_by = auth.uid());

commit;
