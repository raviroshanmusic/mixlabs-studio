-- MixLabs Studio — Security audit (read-only)
-- Run each block in the Supabase SQL editor and eyeball the results.
-- This verifies the "crown jewel": Row-Level Security is on everywhere and there
-- are no accidental "allow everything" holes.

-- ── 1. Every public table MUST have RLS enabled ───────────────────────────────
-- Any row where rowsecurity = false is a hole: fix with
--   alter table public.<name> enable row level security;
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by rowsecurity asc, tablename;

-- ── 2. Look for permissive "allow everything" policies ────────────────────────
-- A policy whose USING (qual) or WITH CHECK is literally 'true' lets anyone
-- through. There should be NONE for INSERT/UPDATE/DELETE. (A `true` on SELECT for
-- 'profiles' is intentional — profiles are readable to look people up by email.)
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual = 'true' or with_check = 'true')
order by tablename, cmd;

-- ── 3. Full policy dump — sanity-read the membership tables ───────────────────
-- Pay special attention to project_members: INSERT should require
-- is_project_owner(project_id) (owner adds people) or a valid pending invite —
-- NOT just `user_id = auth.uid()` (that would let anyone join any project).
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- ── 4. Tables that have RLS enabled but ZERO policies ─────────────────────────
-- RLS-on + no policies = table is fully locked (no access). Usually a mistake.
select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and t.rowsecurity = true
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename
  )
order by t.tablename;
