-- Optional: only if you use scripts/upload_to_cards_table.py (REST /rest/v1/cards).
-- The Next.js app reads `credit_cards` instead.

create extension if not exists pgcrypto;

create or replace function public.set_last_updated_timestamp()
returns trigger as $$
begin
  new.last_updated = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  card_name text not null,
  bank text not null,
  network text not null check (network in ('Visa', 'Mastercard')),
  joining_fee int not null default 0,
  annual_fee int not null default 0,
  reward_type text not null check (reward_type in ('cashback', 'points')),
  reward_rate text,
  lounge_access text,
  best_for text,
  key_benefits text,
  -- Same semantics as public.credit_cards: % of category spend; NULL if unknown.
  dining_reward double precision,
  travel_reward double precision,
  shopping_reward double precision,
  fuel_reward double precision,
  last_updated timestamp not null default now()
);

drop trigger if exists trg_cards_last_updated on public.cards;

create trigger trg_cards_last_updated
before update on public.cards
for each row
execute function public.set_last_updated_timestamp();

comment on column public.cards.dining_reward is
  'Estimated reward on dining spend as a percentage of spend (e.g. 5 means 5%). NULL if not set.';
comment on column public.cards.travel_reward is
  'Estimated reward on travel spend as a percentage of spend. NULL if not set.';
comment on column public.cards.shopping_reward is
  'Estimated reward on shopping spend as a percentage of spend. NULL if not set.';
comment on column public.cards.fuel_reward is
  'Estimated reward on fuel spend as a percentage of spend. NULL if not set.';
