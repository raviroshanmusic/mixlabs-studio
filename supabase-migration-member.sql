-- MixLabs Studio — Member page upgrade migration
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: every statement is guarded with "if not exists".

-- Profile photo: stores the B2 object key (served through /api/media), null = use initials avatar.
alter table public.profiles add column if not exists avatar_url text;

-- Notification preferences. Sensible defaults so existing users opt-in to the important ones.
alter table public.profiles add column if not exists notify_new_comment  boolean not null default true;
alter table public.profiles add column if not exists notify_new_version  boolean not null default true;
alter table public.profiles add column if not exists notify_mention      boolean not null default true;
alter table public.profiles add column if not exists notify_email_digest boolean not null default false;
