-- MixLabs Studio — Exchange / Turnover files migration
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A per-project drop zone for editorial turnover / interchange files that clients
-- (or the team) hand over: AAF, OMF, FCPXML/XML, EDL, OTIO, reference MOVs, etc.
-- Kept separate from Drafts (deliverables under review) and Pre-Pro (reference
-- paperwork). Each row is one uploaded file living in Backblaze B2 (file_key).
--
-- RLS mirrors project_documents: visible/editable by the project owner OR any
-- member of that project.

create table if not exists public.project_exchange (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text,                            -- optional label
  kind        text,                            -- AAF / XML / EDL / MOV / ...
  notes       text,
  file_key    text not null,                   -- B2 key
  file_name   text not null,                   -- original filename
  file_size   bigint,                          -- bytes
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists project_exchange_project_id_idx
  on public.project_exchange(project_id);

alter table public.project_exchange enable row level security;

drop policy if exists project_exchange_select on public.project_exchange;
create policy project_exchange_select on public.project_exchange
  for select to authenticated
  using (
    exists (select 1 from public.projects p
      where p.id = project_exchange.project_id
        and (p.owner_id = auth.uid()
          or exists (select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()))));

drop policy if exists project_exchange_insert on public.project_exchange;
create policy project_exchange_insert on public.project_exchange
  for insert to authenticated
  with check (
    exists (select 1 from public.projects p
      where p.id = project_exchange.project_id
        and (p.owner_id = auth.uid()
          or exists (select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()))));

drop policy if exists project_exchange_update on public.project_exchange;
create policy project_exchange_update on public.project_exchange
  for update to authenticated
  using (
    exists (select 1 from public.projects p
      where p.id = project_exchange.project_id
        and (p.owner_id = auth.uid()
          or exists (select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()))));

drop policy if exists project_exchange_delete on public.project_exchange;
create policy project_exchange_delete on public.project_exchange
  for delete to authenticated
  using (
    exists (select 1 from public.projects p
      where p.id = project_exchange.project_id
        and (p.owner_id = auth.uid()
          or exists (select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()))));
