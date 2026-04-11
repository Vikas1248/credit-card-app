-- Remove SBI Card rows before re-importing data/credit_cards_sbi_refined.json
DELETE FROM credit_cards
WHERE bank ILIKE '%sbi%';
