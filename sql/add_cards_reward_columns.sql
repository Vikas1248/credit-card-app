-- Category reward columns on `credit_cards` (run in Supabase SQL Editor on existing DBs).
-- Each column stores the effective reward as a percentage of category spend (e.g. 5 = 5%).
-- NULL means unknown / not populated yet.
--
-- If you use `upload_to_cards_table.py`, ensure `public.cards` has the same columns
-- (see sql/create_cards_table.sql).

alter table public.credit_cards
  add column if not exists dining_reward double precision;

alter table public.credit_cards
  add column if not exists travel_reward double precision;

alter table public.credit_cards
  add column if not exists shopping_reward double precision;

alter table public.credit_cards
  add column if not exists fuel_reward double precision;

comment on column public.credit_cards.dining_reward is
  'Estimated reward on dining spend as a percentage of spend (e.g. 5 means 5%). NULL if not set.';
comment on column public.credit_cards.travel_reward is
  'Estimated reward on travel spend as a percentage of spend. NULL if not set.';
comment on column public.credit_cards.shopping_reward is
  'Estimated reward on shopping spend as a percentage of spend. NULL if not set.';
comment on column public.credit_cards.fuel_reward is
  'Estimated reward on fuel spend as a percentage of spend. NULL if not set.';
