-- Run in the Supabase SQL editor. Never put a service-role key in GitHub Pages.
create table if not exists public.study_sync_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null check (app_id in ('os-lab','self-research')),
  storage_key text not null check (length(storage_key) between 1 and 400),
  value text,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id, storage_key)
);
alter table public.study_sync_entries enable row level security;
revoke all on public.study_sync_entries from anon;
grant select on public.study_sync_entries to authenticated;
drop policy if exists study_sync_owner_select on public.study_sync_entries;
create policy study_sync_owner_select on public.study_sync_entries
for select to authenticated using (user_id = (select auth.uid()));

-- Atomic optimistic compare-and-swap. A revision of 0 means the record does not exist.
create or replace function public.study_sync_cas(
  p_app_id text, p_storage_key text, p_value text, p_expected_revision bigint
) returns table(applied boolean, revision bigint, value text)
language plpgsql security definer set search_path = ''
as $$
declare r public.study_sync_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_app_id not in ('os-lab', 'self-research')
     or length(p_storage_key) not between 1 and 400
     or p_expected_revision < 0
     or length(coalesce(p_value, '')) > 1048576 then
    raise exception 'Invalid study sync input';
  end if;
  if p_expected_revision = 0 then
    insert into public.study_sync_entries (user_id, app_id, storage_key, value)
    values (auth.uid(), p_app_id, p_storage_key, p_value)
    on conflict do nothing returning * into r;
    if found then return query select true, r.revision, r.value; return; end if;
  else
    update public.study_sync_entries e
       set value = p_value, revision = e.revision + 1, updated_at = now()
     where e.user_id = auth.uid() and e.app_id = p_app_id
       and e.storage_key = p_storage_key and e.revision = p_expected_revision
     returning * into r;
    if found then return query select true, r.revision, r.value; return; end if;
  end if;
  select * into r from public.study_sync_entries e where e.user_id = auth.uid()
    and e.app_id = p_app_id and e.storage_key = p_storage_key;
  return query select false, coalesce(r.revision, 0), r.value;
end; $$;
revoke all on function public.study_sync_cas(text,text,text,bigint) from public, anon;
grant execute on function public.study_sync_cas(text,text,text,bigint) to authenticated;
