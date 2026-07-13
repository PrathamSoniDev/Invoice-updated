/*
# InvoiceGen Enterprise Demo Data Seed - Part 5: Payments, Payment Links, Communication
*/

DO $$
DECLARE
  c_rec RECORD;
  i INTEGER;
  cust_id UUID;
  inv_id UUID;
  pl_id UUID;
  admin_id UUID;
  pl_slug TEXT;
  pay_amount DECIMAL(10,2);
  pl_status TEXT;
  c_idx INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM payments LIMIT 1) THEN
    RAISE NOTICE 'Demo payments already seeded — skipping.';
    RETURN;
  END IF;

  c_idx := 0;
  
    
  INSERT INTO payments (id, "companyId", "invoiceId", "customerId", amount, method, status, gateway, "transactionId", date)
  SELECT
    gen_random_uuid(),
    i."companyId",
    i.id,
    i."customerId",
    i.total,
    CASE (random() * 5)::int
      WHEN 0 THEN 'UPI'::"PaymentMethod"
      WHEN 1 THEN 'CARD'::"PaymentMethod"
      WHEN 2 THEN 'NETBANKING'::"PaymentMethod"
      WHEN 3 THEN 'WALLET'::"PaymentMethod"
      WHEN 4 THEN 'CASH'::"PaymentMethod"
      ELSE 'CHEQUE'::"PaymentMethod"
    END,
    CASE WHEN random() < 0.9 THEN 'PAID'::"PaymentStatus"
         WHEN random() < 0.95 THEN 'REFUNDED'::"PaymentStatus"
         ELSE 'FAILED'::"PaymentStatus" END,
    'RAZORPAY'::"GatewayType",
    'TXN' || substr(md5(random()::text), 1, 16),
    i."paidAt"
  FROM invoices i
  WHERE i.status = 'PAID' AND i."paidAt" IS NOT NULL;
  
   
  FOR c_rec IN SELECT id FROM companies ORDER BY "createdAt" LOOP
    c_idx := c_idx + 1;
    SELECT id INTO admin_id FROM users WHERE "companyId" = c_rec.id AND role = 'ADMIN' LIMIT 1;
    
    FOR i IN 1..20 LOOP
      SELECT id INTO cust_id FROM customers WHERE "companyId" = c_rec.id ORDER BY random() LIMIT 1;
      SELECT id INTO inv_id FROM invoices WHERE "companyId" = c_rec.id AND "customerId" = cust_id LIMIT 1;
      pl_slug := 'pl-' || substr(md5(c_rec.id::text || i::text), 1, 12);
      pay_amount := (random() * 25000 + 5000)::DECIMAL(10,2);
      
      pl_status := CASE i % 4
        WHEN 0 THEN 'PAID'
        WHEN 1 THEN 'PENDING'
        WHEN 2 THEN 'EXPIRED'
        ELSE 'FAILED'
      END;
      
      INSERT INTO payment_links (
        id, "companyId", "customerId", "invoiceId", slug, title, description,
        amount, currency, status, "expiresAt", "paymentCount", "gateway", "createdById"
      ) VALUES (
        gen_random_uuid(),
        c_rec.id,
        cust_id,
        inv_id,
        pl_slug,
        'Payment Link - ' || pl_slug,
        'Payment for services',
        pay_amount,
        'INR',
        pl_status::"PaymentLinkStatus",
        now() + interval '30 days',
        CASE WHEN pl_status = 'PAID' THEN 1 ELSE 0 END,
        'RAZORPAY'::"GatewayType",
        admin_id
      );
    END LOOP;
  END LOOP;
  
 
  INSERT INTO message_templates ("companyId", name, channel, subject, body, variables, "isDefault", "isActive")
  SELECT
    c.id,
    t.name,
    t.channel,
    t.subject,
    t.body,
    t.variables,
    t."isDefault",
    true
  FROM companies c
  CROSS JOIN (VALUES
    ('Invoice Created', 'EMAIL'::"CommunicationChannel", 'Your Invoice from Company', 
     '<p>Dear Customer,</p><p>Your invoice is ready.</p><p>Thank you!</p>',
     '["invoice_number","customer_name","amount"]'::jsonb, true),
    ('Payment Reminder', 'EMAIL'::"CommunicationChannel", 'Reminder: Invoice Due Soon',
     '<p>Dear Customer,</p><p>This is a reminder that your invoice is due.</p>',
     '["invoice_number","customer_name","due_date"]'::jsonb, false),
    ('Payment Received', 'EMAIL'::"CommunicationChannel", 'Payment Received',
     '<p>Dear Customer,</p><p>We have received your payment.</p>',
     '["invoice_number","customer_name","amount"]'::jsonb, true),
    ('Invoice WhatsApp', 'WHATSAPP'::"CommunicationChannel", null,
     'Hi Customer, your invoice is ready. View link.',
     '["customer_name","invoice_number","invoice_link"]'::jsonb, true),
    ('Payment Link SMS', 'SMS'::"CommunicationChannel", null,
     'Pay amount using link. Company Name',
     '["amount","payment_link","company_name"]'::jsonb, false)
  ) AS t(name, channel, subject, body, variables, "isDefault");
  
  INSERT INTO communication_logs (
    id, "companyId", channel, recipient, "recipientName", subject, body,
    status, "templateName", "sentAt", "deliveredAt", "readAt", "relatedType", "relatedId", "customerId"
  )
  SELECT
    gen_random_uuid(),
    i."companyId",
    CASE WHEN random() < 0.7 THEN 'EMAIL'::"CommunicationChannel" ELSE 'WHATSAPP'::"CommunicationChannel" END,
    c.email,
    c.name,
    'Invoice ' || i.number,
    'Invoice communication for ' || i.number,
    CASE 
      WHEN random() < 0.8 THEN 'DELIVERED'::"CommunicationStatus"
      WHEN random() < 0.9 THEN 'READ'::"CommunicationStatus"
      ELSE 'FAILED'::"CommunicationStatus"
    END,
    'Invoice Created',
    i."createdAt" + interval '1 hour',
    CASE WHEN random() < 0.9 THEN i."createdAt" + interval '1 hour 5 min' ELSE NULL END,
    CASE WHEN random() < 0.7 THEN i."createdAt" + interval '2 hours' ELSE NULL END,
    'invoice',
    i.id::text,
    i."customerId"
  FROM invoices i
  JOIN customers c ON c.id = i."customerId"
  WHERE i.status != 'DRAFT'
  LIMIT 500;
  
  RAISE NOTICE 'Payments, payment links, and communication seeded successfully!';
END $$;