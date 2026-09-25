-- Add the blank, editable Cranial Nerve Disorders specialism without
-- overwriting an existing administrator-edited record.
insert into public.content (collection, id, draft, published)
select
  'symptoms',
  'hirnnervenprobleme',
  jsonb_build_object(
    'id', 'hirnnervenprobleme',
    'title', 'Hirnnervenprobleme',
    'titleEn', 'Cranial Nerve Disorders',
    'subtitle', '',
    'intro', '',
    'body', '',
    'service', 'physiotherapie',
    'icon', 'head',
    'order', coalesce(max((draft->>'order')::integer), -1) + 1
  ),
  jsonb_build_object(
    'id', 'hirnnervenprobleme',
    'title', 'Hirnnervenprobleme',
    'titleEn', 'Cranial Nerve Disorders',
    'subtitle', '',
    'intro', '',
    'body', '',
    'service', 'physiotherapie',
    'icon', 'head',
    'order', coalesce(max((draft->>'order')::integer), -1) + 1
  )
from public.content
where collection = 'symptoms'
on conflict (collection, id) do nothing;
