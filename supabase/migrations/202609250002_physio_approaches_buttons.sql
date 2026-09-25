-- Move the last treatment-approaches list into the Physiotherapy page buttons.
-- Keep a revision before removing this old copy from stored content.
insert into public.revisions (collection, entity_id, snapshot, actor_email)
select collection, id, draft, 'content migration'
from public.content
where collection = 'services'
  and id = 'physiotherapie'
  and (
    coalesce(draft->>'body', '') like '%## Behandlungskonzepte in der Physiotherapie%'
    or coalesce(draft->>'bodyEn', '') like '%## Treatment approaches in physiotherapy%'
  );

update public.content
set draft = case
      when coalesce(draft->>'body', '') like '%## Behandlungskonzepte in der Physiotherapie%'
        then jsonb_set(draft, '{body}', to_jsonb(split_part(draft->>'body', E'\n\n## Behandlungskonzepte in der Physiotherapie', 1)))
      else draft
    end,
    published = case
      when coalesce(published->>'body', '') like '%## Behandlungskonzepte in der Physiotherapie%'
        then jsonb_set(published, '{body}', to_jsonb(split_part(published->>'body', E'\n\n## Behandlungskonzepte in der Physiotherapie', 1)))
      else published
    end,
    updated_at = now()
where collection = 'services' and id = 'physiotherapie'
  and (coalesce(draft->>'body', '') like '%## Behandlungskonzepte in der Physiotherapie%'
    or coalesce(published->>'body', '') like '%## Behandlungskonzepte in der Physiotherapie%');

update public.content
set draft = case
      when coalesce(draft->>'bodyEn', '') like '%## Treatment approaches in physiotherapy%'
        then jsonb_set(draft, '{bodyEn}', to_jsonb(split_part(draft->>'bodyEn', E'\n\n## Treatment approaches in physiotherapy', 1)))
      else draft
    end,
    published = case
      when coalesce(published->>'bodyEn', '') like '%## Treatment approaches in physiotherapy%'
        then jsonb_set(published, '{bodyEn}', to_jsonb(split_part(published->>'bodyEn', E'\n\n## Treatment approaches in physiotherapy', 1)))
      else published
    end,
    updated_at = now()
where collection = 'services' and id = 'physiotherapie'
  and (coalesce(draft->>'bodyEn', '') like '%## Treatment approaches in physiotherapy%'
    or coalesce(published->>'bodyEn', '') like '%## Treatment approaches in physiotherapy%');
