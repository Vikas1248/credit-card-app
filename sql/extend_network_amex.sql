-- Allow American Express network on credit_cards (run once in Supabase SQL editor).
-- Required before importing Amex rows with network = 'Amex'.

alter table public.credit_cards
  drop constraint if exists credit_cards_network_check;

alter table public.credit_cards
  add constraint credit_cards_network_check
  check (network in ('Visa', 'Mastercard', 'Amex'));
