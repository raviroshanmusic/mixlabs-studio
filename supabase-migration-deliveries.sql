-- MixLabs Studio — Deliverables table migration
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The Delivery tab (final-file handoff to the client) was fully built in the
-- app but its table was never created — hence "Could not find the table
-- 'public.project_deliveries' in the schema cache". We don't host the final
-- files ourselves; deliverables are just titled link drops (Google Drive,
-- WeTransfer, anything the client can download from), stored in `links`.
--
-- RLS mirrors project_milestones exactly: a row is visible/editable by the
-- project owner OR any member of that project.

create table if not exists public.project_deliveries (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  department    text not null,
  title         text not null,
  notes         text,
  links         jsonb not null default '[]'::jsonb,   -- [{ label, url }]
  status        text not null default 'preparing'
                  check (status in ('preparing', 'sent', 'confirmed')),
  delivered_at  timestamptz,
  delivered_by  uuid references auth.users(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists project_deliveries_project_id_idx
  on public.project_deliveries(project_id);

alter table public.project_deliveries enable row level security;

-- owner-or-member access (same shape as project_milestones policies)
drop policy if exists project_deliveries_select on public.project_deliveries;
create policy project_deliveries_select on public.project_deliveries
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_deliveries.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists project_deliveries_insert on public.project_deliveries;
create policy project_deliveries_insert on public.project_deliveries
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_deliveries.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists project_deliveries_update on public.project_deliveries;
create policy project_deliveries_update on public.project_deliveries
  for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_deliveries.project_id
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
      where p.id = project_deliveries.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists project_deliveries_delete on public.project_deliveries;
create policy project_deliveries_delete on public.project_deliveries
  for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_deliveries.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );
