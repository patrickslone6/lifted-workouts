-- Lifted durable cloud storage.
-- Run this once in the Supabase SQL editor for the project used by Lifted.
-- If you later migrate Lifted authentication to Supabase Auth, replace account_key
-- policies with auth.uid()-based policies.

create table if not exists public.lifted_user_data (
  account_key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.lifted_user_data enable row level security;

-- The current Lifted app still authenticates through its Render account endpoint,
-- so the table is intentionally not exposed for anonymous direct reads/writes.
-- The Render server should be the trusted writer/reader once the Supabase project
-- is connected. Do not add anon/authenticated write policies to this table.

create index if not exists lifted_user_data_updated_at_idx
  on public.lifted_user_data (updated_at desc);
