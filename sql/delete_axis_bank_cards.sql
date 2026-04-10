-- Remove existing Axis Bank rows before re-importing data/credit_cards_axis_refined.json
-- Run in Supabase SQL Editor, then: import_cards_to_supabase.py --input data/credit_cards_axis_refined.json

DELETE FROM credit_cards
WHERE bank ILIKE '%axis%';
