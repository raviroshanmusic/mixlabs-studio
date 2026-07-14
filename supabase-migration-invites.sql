-- MixLabs Studio — Pending invites for users who don't have an account yet
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- An owner can now add someone by email even if they've never signed up. That
-- creates a project_members row with user_id = NULL and status = 'pending'.
-- When that person later registers with the SAME email, the trigger below links
-- the row to their new auth user and flips it to 'active', so the project shows
-- up on their dashboard immediately (project RLS matches on user_id).

-- 1. A pending invite has no user yet, so user_id must be nullable.
alter table public.project_members alter column user_id drop not null;

-- 2. Extend the existing new-user trigger: create the profile (as before) AND
--    claim any invitations that were addressed to this email.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  update public.project_members
     set user_id = new.id,
         status  = 'active'
   where user_id is null
     and lower(email) = lower(new.email);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
