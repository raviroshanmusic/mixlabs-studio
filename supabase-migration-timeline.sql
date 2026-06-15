-- MixLabs Studio — Timeline rework migration
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Adds milestone progress tracking and an optional link from a milestone to a
-- project version (the deliverable file it represents).

-- Progress 0–100 for the in-bar progress fill and at-a-glance tracking.
alter table public.project_milestones
  add column if not exists progress smallint not null default 0;

-- Optional link to the version/deliverable this milestone is about.
-- on delete set null so removing a version doesn't delete its milestone.
alter table public.project_milestones
  add column if not exists linked_version_id uuid
  references public.project_versions(id) on delete set null;
