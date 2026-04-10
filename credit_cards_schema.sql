create extension if not exists pgcrypto;

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  card_name text not null,
  bank text not null,
  network text not null check (network in ('Visa', 'Mastercard', 'Amex')),
  joining_fee int not null default 0,
  annual_fee int not null default 0,
  reward_type text not null check (reward_type in ('cashback', 'points')),
  reward_rate text,
  lounge_access text,
  best_for text,
  key_benefits text,
  -- Category reward rates as % of spend in that category (e.g. 5 = 5%). NULL if unknown.
  dining_reward double precision,
  travel_reward double precision,
  shopping_reward double precision,
  fuel_reward double precision,
  last_updated timestamp not null default now()
);

create or replace function public.set_last_updated_timestamp()
returns trigger as $$
begin
  new.last_updated = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_credit_cards_last_updated on public.credit_cards;

create trigger trg_credit_cards_last_updated
before update on public.credit_cards
for each row
execute function public.set_last_updated_timestamp();

comment on column public.credit_cards.dining_reward is
  'Estimated reward on dining spend as a percentage of spend (e.g. 5 means 5%). NULL if not set.';
comment on column public.credit_cards.travel_reward is
  'Estimated reward on travel spend as a percentage of spend. NULL if not set.';
comment on column public.credit_cards.shopping_reward is
  'Estimated reward on shopping spend as a percentage of spend. NULL if not set.';
comment on column public.credit_cards.fuel_reward is
  'Estimated reward on fuel spend as a percentage of spend. NULL if not set.';

insert into public.credit_cards (
  card_name,
  bank,
  network,
  joining_fee,
  annual_fee,
  reward_type,
  reward_rate,
  lounge_access,
  best_for,
  key_benefits
)
select *
from (
  values
    (
      'HDFC Millennia',
      'HDFC',
      'Visa',
      1000,
      1000,
      'cashback',
      '5% on Amazon, Flipkart, Swiggy; 1% elsewhere',
      'None',
      'Online shopping',
      'High cashback on popular online platforms; quarterly milestone benefits'
    ),
    (
      'Amazon Pay ICICI',
      'ICICI',
      'Visa',
      0,
      0,
      'cashback',
      '5% for Prime users on Amazon; 1-2% elsewhere',
      'None',
      'Amazon shopping',
      'Lifetime free; direct cashback to Amazon Pay balance'
    ),
    (
      'SBI Cashback Card',
      'SBI',
      'Visa',
      999,
      999,
      'cashback',
      '5% on online spends; 1% on offline spends',
      'None',
      'Online spends',
      'Simple high cashback structure with no merchant tie-ins'
    ),
    (
      'Axis ACE',
      'Axis',
      'Visa',
      499,
      499,
      'cashback',
      '5% on bill payments via Google Pay; 4% on Swiggy, Zomato, Ola; 2% elsewhere',
      'None',
      'Utility bills and daily apps',
      'Strong cashback on recurring payments and food delivery'
    ),
    (
      'HDFC Regalia Gold',
      'HDFC',
      'Mastercard',
      2500,
      2500,
      'points',
      '4 reward points per Rs.150 on retail spends',
      '12 per year',
      'Travel and lifestyle',
      'Complimentary lounge access and milestone vouchers'
    ),
    (
      'ICICI Coral',
      'ICICI',
      'Mastercard',
      500,
      500,
      'points',
      '2 reward points per Rs.100 on most spends',
      '4 per year',
      'Entry-level rewards',
      'Fuel surcharge waiver and dining discounts'
    ),
    (
      'Kotak League Platinum',
      'Kotak Mahindra',
      'Visa',
      499,
      499,
      'cashback',
      '4 reward points per Rs.150; accelerated points on select categories',
      'None',
      'General spending',
      'Low fee rewards card with easy redemption options'
    ),
    (
      'Standard Chartered Ultimate',
      'Standard Chartered',
      'Mastercard',
      5000,
      5000,
      'points',
      '5 reward points per Rs.150 on all spends',
      '12 per year',
      'Premium travel',
      'High reward rate with lounge and golf privileges'
    ),
    (
      'IndusInd Legend',
      'IndusInd',
      'Visa',
      0,
      0,
      'points',
      '1 reward point per Rs.100 on weekdays; 2 on weekends',
      '8 per year',
      'Lifetime free benefits',
      'No annual fee with travel and movie related privileges'
    ),
    (
      'RBL ShopRite',
      'RBL',
      'Mastercard',
      500,
      500,
      'cashback',
      '20 reward points per Rs.100 on grocery spends; 1 point elsewhere',
      'None',
      'Grocery shopping',
      'High returns on supermarket spending and monthly groceries'
    ),
    (
      'Yes Bank Prosperity Rewards Plus',
      'Yes Bank',
      'Visa',
      999,
      999,
      'points',
      '8 reward points per Rs.200 on shopping and dining',
      '4 per year',
      'Shopping and dining',
      'Good category rewards with domestic lounge access'
    ),
    (
      'AU Zenith+',
      'AU Small Finance Bank',
      'Visa',
      4999,
      4999,
      'points',
      '2 reward points per Rs.100; accelerated rates on travel and dining',
      '16 per year',
      'Premium lifestyle and travel',
      'Comprehensive lounge coverage, concierge, and travel perks'
    )
) as seed_data(
  card_name,
  bank,
  network,
  joining_fee,
  annual_fee,
  reward_type,
  reward_rate,
  lounge_access,
  best_for,
  key_benefits
)
where not exists (
  select 1
  from public.credit_cards c
  where c.card_name = seed_data.card_name
    and c.bank = seed_data.bank
);
