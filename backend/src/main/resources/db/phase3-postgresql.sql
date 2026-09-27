-- Existing Phase 2 PostgreSQL databases only. Run while the backend is stopped.
-- Hibernate update does not widen an existing enum CHECK constraint.
-- This transaction preserves every existing order and is safe to rerun.
BEGIN;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS received_at timestamp(6) with time zone;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('DRAFT', 'ORDERED', 'CANCELLED', 'RECEIVED'));
COMMIT;
