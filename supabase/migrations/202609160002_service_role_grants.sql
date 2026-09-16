-- Apply this after 202609160001_initial_citypraxis.sql.
-- It authorizes only the trusted Node backend role. RLS remains enabled and
-- no browser/anonymous access is granted.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.staff_profiles,
  public.content,
  public.revisions,
  public.appointment_requests,
  public.audit_log,
  public.media
to service_role;

grant usage, select on all sequences in schema public to service_role;
