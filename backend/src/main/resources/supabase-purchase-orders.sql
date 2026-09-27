-- Apply after Hibernate creates the tables, before inserting data when Supabase's
-- Data API is enabled. Spring Boot uses the existing database-owner connection.
-- No public policies: browser access remains through Spring Boot's REST API.
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
