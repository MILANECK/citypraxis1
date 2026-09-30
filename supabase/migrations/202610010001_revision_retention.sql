-- Keep only the ten most recent editor versions for each content entry.
create index if not exists revisions_entry_latest on public.revisions (collection, entity_id, id desc);

with ranked as (
  select id, row_number() over (partition by collection, entity_id order by id desc) as position
  from public.revisions
)
delete from public.revisions as revision
using ranked
where revision.id = ranked.id and ranked.position > 10;

create or replace function public.keep_recent_editor_versions()
returns trigger
language plpgsql
as $$
begin
  delete from public.revisions
  where collection = new.collection
    and entity_id = new.entity_id
    and id < (
      select min(id) from (
        select id from public.revisions
        where collection = new.collection and entity_id = new.entity_id
        order by id desc limit 10
      ) as recent
    );
  return null;
end;
$$;

drop trigger if exists revisions_keep_ten on public.revisions;
create trigger revisions_keep_ten
after insert on public.revisions
for each row execute function public.keep_recent_editor_versions();
