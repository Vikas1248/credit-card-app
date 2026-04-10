-- Remove rows that are not Amex (e.g. legacy imports). Keeps only network = 'Amex'.
-- Run in Supabase SQL Editor after backup if needed.
-- IS DISTINCT FROM treats NULL as "not Amex" and deletes those rows too.

DELETE FROM credit_cards
WHERE network IS DISTINCT FROM 'Amex';
