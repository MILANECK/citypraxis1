-- Citypraxis digital reception: additive changes to the existing request inbox.
-- Run once in Supabase Dashboard > SQL Editor. Existing requests are preserved.
begin;
alter table public.appointment_requests
  add column if not exists intake jsonb,
  add column if not exists submission_key uuid,
  add column if not exists notification_status text not null default 'not_configured';
create unique index if not exists appointment_requests_submission_key_idx
  on public.appointment_requests(submission_key);
alter table public.appointment_requests enable row level security;
-- Website visitors use the Node API, never direct table access.
revoke all on public.appointment_requests from anon, authenticated;
grant select, insert, update, delete on public.appointment_requests to service_role;
notify pgrst, 'reload schema';
commit;
