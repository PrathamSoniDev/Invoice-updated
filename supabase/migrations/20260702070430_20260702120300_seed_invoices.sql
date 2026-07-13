DO $$
DECLARE
  c_rec RECORD;
  i INTEGER;
  inv_id UUID;
  cust_id UUID;
  admin_id UUID;
  inv_number TEXT;
  inv_status TEXT;
  inv_date TIMESTAMPTZ;
  inv_due TIMESTAMPTZ;
  inv_subtotal DECIMAL(10,2);
  inv_tax DECIMAL(10,2);
  inv_total DECIMAL(10,2);
  rand_status INTEGER;
  c_idx INTEGER;
  prefix TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM invoices LIMIT 1) THEN
    RAISE NOTICE 'Demo invoices already seeded — skipping.';
    RETURN;
  END IF;

  c_idx := 0;
  
  FOR c_rec IN SELECT id, name, "createdAt" FROM companies ORDER BY "createdAt" LOOP
    c_idx := c_idx + 1;
    
    -- Set prefix based on company index
    prefix := CASE c_idx
      WHEN 1 THEN 'STI'
      WHEN 2 THEN 'ACM'
      WHEN 3 THEN 'ABC'
      WHEN 4 THEN 'NGS'
      ELSE 'GRI'
    END;
    
    -- Get admin user for this company
    SELECT id INTO admin_id FROM users WHERE "companyId" = c_rec.id AND role = 'ADMIN' LIMIT 1;
    
    FOR i IN 1..100 LOOP
      -- Get a random customer
      SELECT id INTO cust_id FROM customers WHERE "companyId" = c_rec.id ORDER BY random() LIMIT 1;
      
      -- Generate invoice data
      inv_date := now() - (random() * 180 * '1 day'::interval);
      inv_due := inv_date + ((random() * 30 + 15) * '1 day'::interval);
      inv_subtotal := (random() * 50000 + 5000)::DECIMAL(10,2);
      inv_tax := (inv_subtotal * 0.18)::DECIMAL(10,2);
      inv_total := inv_subtotal + inv_tax;
      
      -- Determine status (60% paid, 20% sent, 10% overdue, 10% draft)
      rand_status := (random() * 10)::INTEGER;
      inv_status := CASE
        WHEN rand_status < 6 THEN 'PAID'
        WHEN rand_status < 8 THEN 'SENT'
        WHEN rand_status < 9 THEN 'OVERDUE'
        ELSE 'DRAFT'
      END;
      
      inv_number := prefix || '-' || lpad((1000 + i)::text, 4, '0');
      
      INSERT INTO invoices (
        id, "companyId", "customerId", number, status, "issueDate", "dueDate",
        subtotal, "taxAmount", "discountAmount", total, "amountPaid", balance,
        notes, terms, "sentAt", "viewedAt", "paidAt", "createdById"
      ) VALUES (
        gen_random_uuid(),
        c_rec.id,
        cust_id,
        inv_number,
        inv_status::"InvoiceStatus",
        inv_date,
        inv_due,
        inv_subtotal,
        inv_tax,
        (random() * 1000)::DECIMAL(10,2),
        inv_total,
        CASE WHEN inv_status = 'PAID' THEN inv_total 
             WHEN inv_status = 'SENT' THEN (inv_total * 0.3)::DECIMAL(10,2) 
             ELSE 0 END,
        CASE WHEN inv_status = 'PAID' THEN 0 
             ELSE inv_total - CASE WHEN inv_status = 'PAID' THEN inv_total 
                                   WHEN inv_status = 'SENT' THEN (inv_total * 0.3)::DECIMAL(10,2) 
                                   ELSE 0 END END,
        'Thank you for your business.',
        'Net 30 days from invoice date.',
        CASE WHEN inv_status != 'DRAFT' THEN inv_date + interval '1 hour' ELSE NULL END,
        CASE WHEN inv_status != 'DRAFT' THEN inv_date + interval '2 hours' ELSE NULL END,
        CASE WHEN inv_status = 'PAID' THEN inv_date + (random() * 10) * '1 day'::interval ELSE NULL END,
        admin_id
      ) RETURNING id INTO inv_id;
      
      -- Invoice items
      INSERT INTO invoice_items ("invoiceId", description, "hsnCode", quantity, rate, discount, "taxRate", amount)
      VALUES
      (inv_id, 
       CASE c_idx
         WHEN 1 THEN 'Software Development Services'
         WHEN 2 THEN 'Cloud Hosting Services'
         WHEN 3 THEN 'Industrial Equipment Supply'
         WHEN 4 THEN 'Digital Marketing Services'
         ELSE 'Consumer Electronics Supply'
       END,
       CASE c_idx
         WHEN 1 THEN '998314'
         WHEN 2 THEN '998315'
         WHEN 3 THEN '8414'
         WHEN 4 THEN '9983'
         ELSE '8542'
       END,
       (random() * 50 + 10)::DECIMAL(10,2),
       (random() * 1000 + 500)::DECIMAL(10,2),
       (random() * 100)::DECIMAL(10,2),
       18.00,
       inv_subtotal * 0.6);
      
      INSERT INTO invoice_items ("invoiceId", description, "hsnCode", quantity, rate, discount, "taxRate", amount)
      VALUES
      (inv_id,
       CASE c_idx
         WHEN 1 THEN 'Technical Support & Maintenance'
         WHEN 2 THEN 'API Integration Services'
         WHEN 3 THEN 'Machinery Spare Parts'
         WHEN 4 THEN 'Web Development'
         ELSE 'Home Appliances'
       END,
       CASE c_idx
         WHEN 1 THEN '998313'
         WHEN 2 THEN '998314'
         WHEN 3 THEN '8483'
         WHEN 4 THEN '998314'
         ELSE '8509'
       END,
       (random() * 20 + 5)::DECIMAL(10,2),
       (random() * 500 + 200)::DECIMAL(10,2),
       0,
       18.00,
       inv_subtotal * 0.4);
    END LOOP;
  END LOOP;
  
  -- Update invoice_settings nextNumber
  UPDATE invoice_settings iset
  SET "nextNumber" = (
    SELECT COALESCE(MAX(CAST(SUBSTRING(i.number FROM '[0-9]+$') AS INTEGER)), 1000) + 1
    FROM invoices i
    WHERE i."companyId" = iset."companyId"
  );
  
  -- Update customer stats
  UPDATE customers c
  SET
    "totalInvoices" = (SELECT COUNT(*) FROM invoices i WHERE i."customerId" = c.id),
    "totalRevenue" = (SELECT COALESCE(SUM(total), 0) FROM invoices i WHERE i."customerId" = c.id),
    "outstandingAmount" = (SELECT COALESCE(SUM(balance), 0) FROM invoices i WHERE i."customerId" = c.id AND i.status NOT IN ('PAID', 'CANCELLED', 'DRAFT'));
  
  RAISE NOTICE 'Invoices seeded successfully!';
END $$;