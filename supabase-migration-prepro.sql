-- MixLabs Studio - Pre-Production / Reference Documents migration
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Post houses constantly reach back for pre-production and turnover paperwork:
-- the locked script, mood boards, sound/camera reports, the editor's conform
-- (EDL/XML/AAF), spotting notes, the music cue sheet, deliverable specs, etc.
-- This adds a per-project "Pre-Pro" section with two parts:
--
--   1. A short inline brief on the project row (logline, synopsis, and a small
--      jsonb bag of creative/technical specs - format, frame rate, aspect ratio,
--      runtime, language, audio deliverable).
--   2. A project_documents table - one row per reference doc. Each doc is either
--      an uploaded file (B2, file_key) OR an external link (Drive/Dropbox/etc,
--      link_url), filed under a film-industry category and optionally tagged to a
--      department.
--
-- RLS mirrors project_deliveries exactly: a row is visible/editable by the
-- project owner OR any member of that project.

-- 1. Inline brief fields on the project ----------------------------------------
alter table public.projects add column if not exists logline  text;
alter table public.projects add column if not exists synopsis text;
alter table public.projects add column if not exists brief    jsonb not null default '{}'::jsonb;

-- 2. Reference documents --------------------------------------------------------
create table if not exists public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  category    text not null,                 -- e.g. 'script', 'mood_board', 'cue_sheet'
  title       text not null,
  notes       text,
  department  text,                          -- optional: Sound / Score / Color / ...
  file_key    text,                          -- B2 key when uploaded
  file_name   text,                          -- original filename for display/download
  file_size   bigint,                        -- bytes, for display
  link_url    text,                          -- external link when not uploaded
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx
  on public.project_documents(project_id);

alter table public.project_documents enable row level security;

-- owner-or-member access (same shape as project_deliveries policies)
drop policy if exists project_documents_select on public.project_documents;
create policy project_documents_select on public.project_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists project_documents_insert on public.project_documents;
create policy project_documents_insert on public.project_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists project_documents_update on public.project_documents;
create policy project_documents_update on public.project_documents
  for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists project_documents_delete on public.project_documents;
create policy project_documents_delete on public.project_documents
  for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );
