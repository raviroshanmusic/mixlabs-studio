-- MixLabs Studio — review_comments RLS + retire the vestigial `permission` column
-- Run once in the Supabase SQL editor. Safe to re-run. Transaction-wrapped.
--
-- ⚠️  RUN THIS BEFORE DEPLOYING the matching code change. Section 2 gives
--     project_members.permission a default so the API can stop writing it. If
--     the code ships first and the column is still NOT NULL with no default,
--     member invites will fail.
--
-- Follows supabase-migration-role-rls.sql, reusing its two SECURITY DEFINER
-- helpers: is_project_member() for reads, can_edit_project() for writes.

begin;

-- ══ 1. review_comments ═══════════════════════════════════════════════════════
-- The review room is where CLIENTS talk to the studio, so it is deliberately
-- open to every member — ReviewClient.tsx has no viewer gating. This is a
-- different model from the content tables: commenting is NOT can_edit_project().
--
-- Symptom this fixes: comments/[commentId]/route.ts PATCH ships the message
-- "Ask the project owner to run the RLS fix in Supabase" — a workaround for
-- members being unable to resolve comments. That is this bug.
--
-- Existing policy names here are unknown/inconsistent, so drop whatever is
-- present by discovery rather than guessing at names.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'review_comments'
  loop
    execute format('drop policy if exists %I on public.review_comments', pol.policyname);
  end loop;
end $$;

alter table public.review_comments enable row level security;

-- Read: anyone on the project.
create policy review_comments_select on public.review_comments
  for select to authenticated
  using (public.is_project_member(project_id));

-- Comment: anyone on the project, but only as yourself (no forging author_id).
create policy review_comments_insert on public.review_comments
  for insert to authenticated
  with check (public.is_project_member(project_id) and author_id = auth.uid());

-- Resolve/reopen: anyone on the project. WITH CHECK repeats the condition so a
-- member cannot rewrite project_id and move a comment into another project
-- (the hole that `with check true` left on project_milestones).
create policy review_comments_update on public.review_comments
  for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- Delete: your own comment, or a project editor tidying up. Matches the route,
-- which already restricts DELETE to author_id = auth.uid().
create policy review_comments_delete on public.review_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.can_edit_project(project_id));

-- ══ 2. Retire project_members.permission ═════════════════════════════════════
-- Dead column: written once in members/route.ts as the literal 'view', never
-- updated, never read. `role` is the real access level and now drives RLS.
--
-- Giving it a default (and dropping NOT NULL if set) lets the API stop writing
-- it with no ordering risk. The column itself stays for now so this migration
-- is reversible; drop it once the code is deployed — see the note at the end.
alter table public.project_members alter column permission drop not null;
alter table public.project_members alter column permission set default 'view';

commit;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select policyname, cmd from pg_policies
--  where schemaname='public' and tablename='review_comments' order by cmd;
--   → expect exactly 4 rows: DELETE / INSERT / SELECT / UPDATE
--
-- select is_nullable, column_default from information_schema.columns
--  where table_schema='public' and table_name='project_members'
--    and column_name='permission';
--   → expect is_nullable = YES, column_default = 'view'::text

-- ── Later, once the code change is deployed and settled ──────────────────────
-- Removes the column for good. Irreversible — take it at your own pace.
--   alter table public.project_members drop column permission;
