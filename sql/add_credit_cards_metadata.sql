-- Run once in Supabase SQL editor: stores extra fields from JSON imports (AI hints, eligibility JSON, etc.)
alter table public.credit_cards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.credit_cards.metadata is
  'Additional card fields from source JSON (affiliate_link, eligibility, reward_conversion, AI fields, etc.).';
