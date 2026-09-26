-- Anonymous usage metadata only; no patient messages or contact information.
create table if not exists public.chat_ai_usage (
  event_id text primary key,
  conversation_id uuid not null,
  kind text not null check (kind in ('conversation','usage')),
  created_at timestamptz not null default now(),
  model text,
  input_tokens bigint check (input_tokens >= 0),
  output_tokens bigint check (output_tokens >= 0),
  total_tokens bigint check (total_tokens >= 0),
  cached_input_tokens bigint check (cached_input_tokens >= 0),
  estimated_cost_usd numeric check (estimated_cost_usd >= 0)
);
create index if not exists chat_ai_usage_created on public.chat_ai_usage(created_at);
alter table public.chat_ai_usage enable row level security;
revoke all on public.chat_ai_usage from public,anon,authenticated;
grant select,insert on public.chat_ai_usage to service_role;

create or replace function public.citypraxis_ai_usage(month_start timestamptz,month_end timestamptz)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
  select jsonb_build_object(
    'cost',coalesce(sum(estimated_cost_usd),0),
    'conversations',count(*) filter (where kind='conversation'),
    'unpriced',count(*) filter (where kind='usage' and estimated_cost_usd is null),
    'tracking_since',(select min(created_at) from public.chat_ai_usage)
  ) from public.chat_ai_usage where created_at>=month_start and created_at<month_end;
$$;
revoke all on function public.citypraxis_ai_usage(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.citypraxis_ai_usage(timestamptz,timestamptz) to service_role;
notify pgrst,'reload schema';
