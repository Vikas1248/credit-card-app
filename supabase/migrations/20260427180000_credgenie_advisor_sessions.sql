-- CredGenie conversational advisor session persistence (optional — route degrades gracefully if missing).
create table if not exists public.credgenie_advisor_sessions (
  session_id text primary key,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists credgenie_advisor_sessions_updated_at_idx
  on public.credgenie_advisor_sessions (updated_at desc);

comment on table public.credgenie_advisor_sessions is 'Server-side merge target for CredGenie chat advisor profiles';
