-- Read-only capacity report for the authenticated admin overview.
-- The service role can call this RPC; site visitors and browser clients cannot.
begin;

create or replace function public.citypraxis_capacity()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((
      select sum(
        case when metadata->>'size' ~ '^[0-9]+$'
          then (metadata->>'size')::bigint
          else 0
        end
      )
      from storage.objects
    ), 0),
    'measured_at', now()
  );
$$;

revoke all on function public.citypraxis_capacity() from public, anon, authenticated;
grant execute on function public.citypraxis_capacity() to service_role;
notify pgrst, 'reload schema';

commit;
