-- Citypraxis Supabase schema
-- Run once in a new Supabase project using Dashboard > SQL Editor.
-- After this first setup, keep future schema changes as new migration files.

create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('owner', 'editor', 'reception')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content (
  collection text not null,
  id text not null,
  draft jsonb not null,
  published jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id),
  constraint content_collection_check check (
    collection in ('settings','pages','symptoms','services','faqs','team','reviews','prices','reimbursements')
  ),
  constraint content_id_check check (id ~ '^[a-z0-9-]+$')
);

create table if not exists public.revisions (
  id bigint generated always as identity primary key,
  collection text not null,
  entity_id text not null,
  snapshot jsonb not null,
  actor uuid references auth.users(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  preference text not null default '' check (char_length(preference) <= 300),
  acute boolean not null default false,
  status text not null default 'new' check (status in ('new','contacted','confirmed','closed')),
  assignee uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.media (
  id text primary key,
  path text not null unique,
  storage_path text unique,
  name text not null,
  alt text not null check (char_length(alt) <= 300),
  mime_type text check (mime_type in ('image/png','image/jpeg','image/webp','video/mp4')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists revisions_entity_idx
  on public.revisions(collection, entity_id, created_at desc);
create index if not exists appointment_requests_status_idx
  on public.appointment_requests(status, created_at desc);
create index if not exists audit_log_created_idx
  on public.audit_log(created_at desc);

alter table public.staff_profiles enable row level security;
alter table public.content enable row level security;
alter table public.revisions enable row level security;
alter table public.appointment_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.media enable row level security;

-- The backend uses the secret/service_role key. Explicit grants are required
-- for projects where custom table privileges are not inherited automatically.
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

-- The current application accesses these tables only through its Node server.
-- No anon/authenticated table policies are intentionally created. The server's
-- Supabase secret key performs trusted operations and the server enforces roles.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website-media',
  'website-media',
  true,
  62914560,
  array['image/png','image/jpeg','image/webp','video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- There are no browser upload policies. Uploads go through the authenticated
-- Node API using the server-side secret key. Public bucket files remain readable.
