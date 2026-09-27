-- Run after Hibernate creates inventory_transactions and before receiving data
-- when the Supabase Data API is enabled. No public policies are needed.
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
