begin;
alter table public.review_comments
  add column if not exists parent_comment_id uuid references public.review_comments(id) on delete set null;
create index if not exists review_comments_parent_created_idx
  on public.review_comments(parent_comment_id, created_at) where parent_comment_id is not null;

-- Keep replies in the original note's project and media version, including for
-- direct database clients. Existing membership/author RLS policies still apply.
create or replace function public.validate_review_reply()
returns trigger language plpgsql set search_path = public as $$
declare parent public.review_comments%rowtype;
begin
  if new.parent_comment_id is null then return new; end if;
  if new.parent_comment_id = new.id then raise exception 'A comment cannot reply to itself'; end if;
  select * into parent from public.review_comments where id = new.parent_comment_id;
  if not found or parent.project_id <> new.project_id
     or parent.version_id is distinct from new.version_id
     or parent.parent_comment_id is not null then
    raise exception 'Reply must belong to a top-level note in the same project and version';
  end if;
  return new;
end $$;
drop trigger if exists validate_review_reply on public.review_comments;
create trigger validate_review_reply before insert or update of parent_comment_id, project_id, version_id
  on public.review_comments for each row execute function public.validate_review_reply();
commit;
