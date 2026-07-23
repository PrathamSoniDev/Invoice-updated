-- Keep customers.totalInvoices / totalRevenue / outstandingAmount
-- in sync with the invoices table automatically.



CREATE OR REPLACE FUNCTION recalc_customer_invoice_stats(p_customer_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE customers c
  SET
    "totalInvoices" = COALESCE((
      SELECT COUNT(*) FROM invoices i
      WHERE i."customerId" = p_customer_id AND i."deletedAt" IS NULL
    ), 0),
    "totalRevenue" = COALESCE((
      SELECT SUM(i."amountPaid") FROM invoices i
      WHERE i."customerId" = p_customer_id AND i."deletedAt" IS NULL
    ), 0),
    "outstandingAmount" = COALESCE((
      SELECT SUM(i.balance) FROM invoices i
      WHERE i."customerId" = p_customer_id AND i."deletedAt" IS NULL
        AND i.status NOT IN ('CANCELLED', 'PAID')
    ), 0),
    "updatedAt" = now()
  WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_invoices_sync_customer_stats()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_customer_invoice_stats(OLD."customerId");
    RETURN OLD;
  END IF;

  PERFORM recalc_customer_invoice_stats(NEW."customerId");

  -- If the invoice was reassigned to a different customer, also fix the old one.
  IF TG_OP = 'UPDATE' AND OLD."customerId" IS DISTINCT FROM NEW."customerId" THEN
    PERFORM recalc_customer_invoice_stats(OLD."customerId");
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_sync_customer_stats ON invoices;
CREATE TRIGGER invoices_sync_customer_stats
AFTER INSERT OR UPDATE OF "amountPaid", balance, status, "customerId", "deletedAt" OR DELETE
ON invoices
FOR EACH ROW EXECUTE FUNCTION trg_invoices_sync_customer_stats();

-- One-time backfill so existing customers show correct numbers immediately.
DO $$
DECLARE
  cust RECORD;
BEGIN
  FOR cust IN SELECT id FROM customers LOOP
    PERFORM recalc_customer_invoice_stats(cust.id);
  END LOOP;
END $$;
