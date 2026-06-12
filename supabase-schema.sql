-- MixLabs Studio OS — Schema Notes
-- Your Supabase already has all required tables. No SQL needed to run.
--
-- Existing tables (confirmed):
--   profiles         (id, email, full_name, company, created_at, updated_at)
--   projects         (id, name, client, status, owner_id, created_at, updated_at)
--   project_members  (id, project_id, user_id, email, full_name, company, role, department, permission, status, invited_by, created_at, updated_at)
--   project_invites  (id, project_id, email, token, full_name, company, role, department, permission, status, expires_at, accepted_at, created_by, created_at)
--   project_versions (id, project_id, department, version_name, drive_url, drive_file_id, status, created_by, created_at, updated_at)
--   review_comments  (id, project_id, version_id, author_id, department, version_name, timecode, status, body, created_at, author_name)
--
-- Auto-create profile on signup (run once if not already set up)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
