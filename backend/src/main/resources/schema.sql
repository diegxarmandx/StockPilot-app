-- Independent business-number sequence; never reset on application restart.
CREATE SEQUENCE IF NOT EXISTS purchase_order_number_seq START WITH 1 INCREMENT BY 1;
