/*
# InvoiceGen Enterprise Demo Data Seed - Part 3: Customers (50 per company)
*/

DO $$
DECLARE
  c_rec RECORD;
  i INTEGER;
  cust_id UUID;
  admin_id UUID;
  c_idx INTEGER;
  base_names TEXT[] := ARRAY[
    'Sharma', 'Patel', 'Gupta', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Joshi', 
    'Mehta', 'Verma', 'Bansal', 'Shah', 'Desai', 'Iyer', 'Rao', 'Naidu',
    'Chauhan', 'Yadav', 'Mittal', 'Agarwal', 'Kapoor', 'Malhotra', 'Chopra',
    'Arora', 'Khanna', 'Bhatia', 'Sethi', 'Kaur', 'Dhillon', 'Brar'
  ];
  cities TEXT[] := ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  states TEXT[] := ARRAY['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Maharashtra', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];
  business_types TEXT[] := ARRAY['Technologies', 'Solutions', 'Industries', 'Enterprises', 'Systems', 'Services', 'Consulting', 'Traders', 'Manufacturing', 'Exports'];
BEGIN
  IF EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
    RAISE NOTICE 'Demo customers already seeded — skipping.';
    RETURN;
  END IF;

  c_idx := 0;
  
  FOR c_rec IN SELECT id, name FROM companies ORDER BY "createdAt" LOOP
    c_idx := c_idx + 1;
    
    -- Get admin user for this company
    SELECT id INTO admin_id FROM users WHERE "companyId" = c_rec.id AND role = 'ADMIN' LIMIT 1;
    
    FOR i IN 1..50 LOOP
      INSERT INTO customers (
        id, "companyId", name, "businessName", "gstNumber", email, mobile, whatsapp, 
        notes, status, "billingLine1", "billingLine2", "billingCity", "billingState", 
        "billingPincode", "billingCountry", "totalInvoices", "totalRevenue", "outstandingAmount", "createdById"
      ) VALUES (
        gen_random_uuid(),
        c_rec.id,
        base_names[((i-1) % 30) + 1] || ' Customer ' || i,
        base_names[((i-1) % 30) + 1] || ' ' || business_types[((i-1) % 10) + 1],
        CASE WHEN i % 2 = 0 THEN 
          CASE c_idx
            WHEN 1 THEN '27AABCU' || lpad(i::text, 4, '0') || '1ZM'
            WHEN 2 THEN '29AACCT' || lpad(i::text, 4, '0') || '1ZE'
            WHEN 3 THEN '33AABCM' || lpad(i::text, 4, '0') || '1ZP'
            WHEN 4 THEN '06AABCN' || lpad(i::text, 4, '0') || '1ZT'
            ELSE '24AABCG' || lpad(i::text, 4, '0') || '1ZR'
          END
        ELSE NULL END,
        'customer' || i || '@company' || c_idx || '.com',
        '+91-98' || lpad((c_idx * 100 + i)::text, 8, '0'),
        '+91-98' || lpad((c_idx * 100 + i)::text, 8, '0'),
        CASE WHEN i % 5 = 0 THEN 'Priority customer - bulk orders' ELSE '' END,
        'ACTIVE',
        'B-' || (100 + i) || ', ' || 
        CASE 
          WHEN i % 4 = 0 THEN 'Tech Park'
          WHEN i % 4 = 1 THEN 'Industrial Area'
          WHEN i % 4 = 2 THEN 'Business Center'
          ELSE 'Commercial Complex'
        END,
        CASE WHEN i % 2 = 0 THEN 'Floor ' || (i % 5 + 1) ELSE '' END,
        cities[c_idx],
        states[c_idx],
        CASE c_idx
          WHEN 1 THEN '400' || lpad((i % 100)::text, 3, '0')
          WHEN 2 THEN '110' || lpad((i % 100)::text, 3, '0')
          WHEN 3 THEN '560' || lpad((i % 100)::text, 3, '0')
          WHEN 4 THEN '600' || lpad((i % 100)::text, 3, '0')
          ELSE '380' || lpad((i % 100)::text, 3, '0')
        END,
        'India',
        (random() * 30)::INTEGER,
        (random() * 500000 + 50000)::DECIMAL(10,2),
        (random() * 80000 + 5000)::DECIMAL(10,2),
        admin_id
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Customers seeded successfully! (%) companies x 50 customers', c_idx;
END $$;