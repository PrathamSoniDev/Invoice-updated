/*
# InvoiceGen Enterprise Demo Data Seed - Part 1: Companies & Users
All demo users use password: Password@123
*/

DO $$
DECLARE
  now_time timestamptz := now();
  
  -- Company IDs
  c1_id uuid;
  c2_id uuid;
  c3_id uuid;
  c4_id uuid;
  c5_id uuid;
  
  -- User IDs
  c1_admin uuid; c1_manager uuid; c1_staff1 uuid; c1_staff2 uuid; c1_viewer uuid;
  c2_admin uuid; c2_manager uuid; c2_staff1 uuid; c2_staff2 uuid; c2_viewer uuid;
  c3_admin uuid; c3_manager uuid; c3_staff1 uuid; c3_staff2 uuid; c3_viewer uuid;
  c4_admin uuid; c4_manager uuid; c4_staff1 uuid; c4_staff2 uuid; c4_viewer uuid;
  c5_admin uuid; c5_manager uuid; c5_staff1 uuid; c5_staff2 uuid; c5_viewer uuid;
BEGIN

-- ============================================
-- COMPANIES
-- ============================================

INSERT INTO companies (id, name, "legalName", "gstNumber", "panNumber", email, phone, website,
  "addressLine1", "addressLine2", city, state, pincode, country,
  logo, signature, "primaryColor", "footerText", "showLogo", "subscriptionStatus", "subscriptionExpiry")
VALUES (
  gen_random_uuid(),
  'Sell Tech IND. Productions',
  'Sell Tech India Productions Private Limited',
  '27AABCS9171P1ZM',
  'AABCS9171P',
  'info@selltechind.com',
  '+91-22-40123456',
  'https://www.selltechind.com',
  '401, Techno Park, Andheri East',
  'Building B, Floor 4',
  'Mumbai',
  'Maharashtra',
  '400069',
  'India',
  'https://ui-avatars.com/api/?name=STIP&background=3B82F6&color=fff&size=128',
  'https://ui-avatars.com/api/?name=STIP&background=10B981&color=fff&size=128',
  '#3B82F6',
  'Thank you for your business! Sell Tech IND. Productions - Innovating Tomorrow.',
  true,
  'ACTIVE',
  now_time + interval '1 year'
) RETURNING id INTO c1_id;

INSERT INTO companies (id, name, "legalName", "gstNumber", "panNumber", email, phone, website,
  "addressLine1", "addressLine2", city, state, pincode, country,
  logo, signature, "primaryColor", "footerText", "showLogo", "subscriptionStatus", "subscriptionExpiry")
VALUES (
  gen_random_uuid(),
  'Acme Technologies',
  'Acme Technologies Private Limited',
  '29AACCA1234A1ZE',
  'AACCA1234A',
  'contact@acmetech.in',
  '+91-80-45678901',
  'https://www.acmetech.in',
  'Plot 45, Electronic City Phase 2',
  'Tower A, 3rd Floor',
  'Bangalore',
  'Karnataka',
  '560100',
  'India',
  'https://ui-avatars.com/api/?name=ACME&background=10B981&color=fff&size=128',
  'https://ui-avatars.com/api/?name=ACME&background=F59E0B&color=fff&size=128',
  '#10B981',
  'Acme Technologies - Technology Simplified.',
  true,
  'ACTIVE',
  now_time + interval '6 months'
) RETURNING id INTO c2_id;

INSERT INTO companies (id, name, "legalName", "gstNumber", "panNumber", email, phone, website,
  "addressLine1", "addressLine2", city, state, pincode, country,
  logo, signature, "primaryColor", "footerText", "showLogo", "subscriptionStatus", "subscriptionExpiry")
VALUES (
  gen_random_uuid(),
  'ABC Manufacturing Pvt Ltd',
  'ABC Manufacturing Private Limited',
  '33AABCM5678B1ZP',
  'AABCM5678B',
  'sales@abcmfg.com',
  '+91-44-23456789',
  'https://www.abcmfg.com',
  'SIPCOT Industrial Area, Plot 78',
  'GUINDY',
  'Chennai',
  'Tamil Nadu',
  '600032',
  'India',
  'https://ui-avatars.com/api/?name=ABC&background=F59E0B&color=fff&size=128',
  'https://ui-avatars.com/api/?name=ABC&background=EF4444&color=fff&size=128',
  '#F59E0B',
  'ABC Manufacturing - Quality First.',
  true,
  'ACTIVE',
  now_time + interval '1 year'
) RETURNING id INTO c3_id;

INSERT INTO companies (id, name, "legalName", "gstNumber", "panNumber", email, phone, website,
  "addressLine1", "addressLine2", city, state, pincode, country,
  logo, signature, "primaryColor", "footerText", "showLogo", "subscriptionStatus", "subscriptionExpiry")
VALUES (
  gen_random_uuid(),
  'NextGen Solutions',
  'NextGen Solutions India Private Limited',
  '06AABCN9012C1ZT',
  'AABCN9012C',
  'hello@nextgensol.in',
  '+91-124-4567890',
  'https://www.nextgensol.in',
  'Cyber Hub, Tower C, 5th Floor',
  'DLF Phase 3',
  'Gurugram',
  'Haryana',
  '122002',
  'India',
  'https://ui-avatars.com/api/?name=NGS&background=EAB308&color=fff&size=128',
  'https://ui-avatars.com/api/?name=NGS&background=3B82F6&color=fff&size=128',
  '#EAB308',
  'NextGen Solutions - Future Ready.',
  true,
  'ACTIVE',
  now_time + interval '9 months'
) RETURNING id INTO c4_id;

INSERT INTO companies (id, name, "legalName", "gstNumber", "panNumber", email, phone, website,
  "addressLine1", "addressLine2", city, state, pincode, country,
  logo, signature, "primaryColor", "footerText", "showLogo", "subscriptionStatus", "subscriptionExpiry")
VALUES (
  gen_random_uuid(),
  'Global Retail India',
  'Global Retail India Private Limited',
  '24AABCG3456D1ZR',
  'AABCG3456D',
  'info@globalretail.in',
  '+91-79-30123456',
  'https://www.globalretail.in',
  'Sunshine Mall, SG Highway',
  'Block A, 2nd Floor',
  'Ahmedabad',
  'Gujarat',
  '380059',
  'India',
  'https://ui-avatars.com/api/?name=GRI&background=EF4444&color=fff&size=128',
  'https://ui-avatars.com/api/?name=GRI&background=10B981&color=fff&size=128',
  '#EF4444',
  'Global Retail India - Shop Smarter.',
  true,
  'ACTIVE',
  now_time + interval '1 year'
) RETURNING id INTO c5_id;

-- ============================================
-- AUTH USERS (Supabase Auth)
-- Password: Password@123 (hashed by Supabase using bcrypt)
-- ============================================

-- Company 1 Users
c1_admin := gen_random_uuid();
c1_manager := gen_random_uuid();
c1_staff1 := gen_random_uuid();
c1_staff2 := gen_random_uuid();
c1_viewer := gen_random_uuid();

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
VALUES
(c1_admin, '00000000-0000-0000-0000-000000000000', 'admin@selltech.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Rajesh Kumar"}', false),
(c1_manager, '00000000-0000-0000-0000-000000000000', 'manager@selltech.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sharma"}', false),
(c1_staff1, '00000000-0000-0000-0000-000000000000', 'staff1@selltech.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Amit Patel"}', false),
(c1_staff2, '00000000-0000-0000-0000-000000000000', 'staff2@selltech.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Neha Gupta"}', false),
(c1_viewer, '00000000-0000-0000-0000-000000000000', 'viewer@selltech.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Suresh Reddy"}', false);

-- Company 2 Users
c2_admin := gen_random_uuid();
c2_manager := gen_random_uuid();
c2_staff1 := gen_random_uuid();
c2_staff2 := gen_random_uuid();
c2_viewer := gen_random_uuid();

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
VALUES
(c2_admin, '00000000-0000-0000-0000-000000000000', 'admin@acmetech.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Vikram Singh"}', false),
(c2_manager, '00000000-0000-0000-0000-000000000000', 'manager@acmetech.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Anita Desai"}', false),
(c2_staff1, '00000000-0000-0000-0000-000000000000', 'staff1@acmetech.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Mehta"}', false),
(c2_staff2, '00000000-0000-0000-0000-000000000000', 'staff2@acmetech.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Divya Nair"}', false),
(c2_viewer, '00000000-0000-0000-0000-000000000000', 'viewer@acmetech.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Karthik Rao"}', false);

-- Company 3 Users
c3_admin := gen_random_uuid();
c3_manager := gen_random_uuid();
c3_staff1 := gen_random_uuid();
c3_staff2 := gen_random_uuid();
c3_viewer := gen_random_uuid();

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
VALUES
(c3_admin, '00000000-0000-0000-0000-000000000000', 'admin@abcmfg.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Srinivasan Iyer"}', false),
(c3_manager, '00000000-0000-0000-0000-000000000000', 'manager@abcmfg.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Lakshmi Venkat"}', false),
(c3_staff1, '00000000-0000-0000-0000-000000000000', 'staff1@abcmfg.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Hari Prasad"}', false),
(c3_staff2, '00000000-0000-0000-0000-000000000000', 'staff2@abcmfg.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Meena Subramanian"}', false),
(c3_viewer, '00000000-0000-0000-0000-000000000000', 'viewer@abcmfg.com', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Ramesh Chandran"}', false);

-- Company 4 Users
c4_admin := gen_random_uuid();
c4_manager := gen_random_uuid();
c4_staff1 := gen_random_uuid();
c4_staff2 := gen_random_uuid();
c4_viewer := gen_random_uuid();

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
VALUES
(c4_admin, '00000000-0000-0000-0000-000000000000', 'admin@nextgensol.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Ankur Mittal"}', false),
(c4_manager, '00000000-0000-0000-0000-000000000000', 'manager@nextgensol.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Pooja Verma"}', false),
(c4_staff1, '00000000-0000-0000-0000-000000000000', 'staff1@nextgensol.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Sanjay Yadav"}', false),
(c4_staff2, '00000000-0000-0000-0000-000000000000', 'staff2@nextgensol.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Kavita Bansal"}', false),
(c4_viewer, '00000000-0000-0000-0000-000000000000', 'viewer@nextgensol.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Deepak Ahlawat"}', false);

-- Company 5 Users
c5_admin := gen_random_uuid();
c5_manager := gen_random_uuid();
c5_staff1 := gen_random_uuid();
c5_staff2 := gen_random_uuid();
c5_viewer := gen_random_uuid();

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
VALUES
(c5_admin, '00000000-0000-0000-0000-000000000000', 'admin@globalretail.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Harsh Patel"}', false),
(c5_manager, '00000000-0000-0000-0000-000000000000', 'manager@globalretail.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Bhakti Joshi"}', false),
(c5_staff1, '00000000-0000-0000-0000-000000000000', 'staff1@globalretail.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Jignesh Shah"}', false),
(c5_staff2, '00000000-0000-0000-0000-000000000000', 'staff2@globalretail.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Komal Mehta"}', false),
(c5_viewer, '00000000-0000-0000-0000-000000000000', 'viewer@globalretail.in', crypt('Password@123', gen_salt('bf')), now_time, now_time, now_time, '{"provider":"email","providers":["email"]}', '{"full_name":"Pratik Gandhi"}', false);

-- ============================================
-- PUBLIC USERS (Profile Data)
-- ============================================

-- Company 1
INSERT INTO users (id, "companyId", name, email, "emailVerified", "emailVerifiedAt", "passwordHash", phone, avatar, role, status, permissions, "lastActiveAt", "lastLoginAt", "loginCount")
VALUES
(c1_admin, c1_id, 'Rajesh Kumar', 'admin@selltech.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-9876543210', 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=3B82F6&color=fff', 'ADMIN', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb, now_time, now_time - interval '1 hour', 47),
(c1_manager, c1_id, 'Priya Sharma', 'manager@selltech.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-9876543211', 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10B981&color=fff', 'MANAGER', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports"]'::jsonb, now_time, now_time - interval '3 hours', 89),
(c1_staff1, c1_id, 'Amit Patel', 'staff1@selltech.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-9876543212', 'https://ui-avatars.com/api/?name=Amit+Patel&background=F59E0B&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices","payment_links"]'::jsonb, now_time, now_time - interval '2 hours', 156),
(c1_staff2, c1_id, 'Neha Gupta', 'staff2@selltech.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-9876543213', 'https://ui-avatars.com/api/?name=Neha+Gupta&background=EF4444&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices"]'::jsonb, now_time, now_time - interval '5 hours', 234),
(c1_viewer, c1_id, 'Suresh Reddy', 'viewer@selltech.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-9876543214', 'https://ui-avatars.com/api/?name=Suresh+Reddy&background=8B5CF6&color=fff', 'VIEWER', 'ACTIVE', '["dashboard","reports"]'::jsonb, now_time, now_time - interval '1 day', 12);

-- Company 2
INSERT INTO users (id, "companyId", name, email, "emailVerified", "emailVerifiedAt", "passwordHash", phone, avatar, role, status, permissions, "lastActiveAt", "lastLoginAt", "loginCount")
VALUES
(c2_admin, c2_id, 'Vikram Singh', 'admin@acmetech.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-8765432100', 'https://ui-avatars.com/api/?name=Vikram+Singh&background=3B82F6&color=fff', 'ADMIN', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb, now_time, now_time - interval '2 hours', 63),
(c2_manager, c2_id, 'Anita Desai', 'manager@acmetech.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-8765432101', 'https://ui-avatars.com/api/?name=Anita+Desai&background=10B981&color=fff', 'MANAGER', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports"]'::jsonb, now_time, now_time - interval '1 hour', 127),
(c2_staff1, c2_id, 'Rohan Mehta', 'staff1@acmetech.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-8765432102', 'https://ui-avatars.com/api/?name=Rohan+Mehta&background=F59E0B&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices","payment_links"]'::jsonb, now_time, now_time - interval '4 hours', 89),
(c2_staff2, c2_id, 'Divya Nair', 'staff2@acmetech.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-8765432103', 'https://ui-avatars.com/api/?name=Divya+Nair&background=EF4444&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices"]'::jsonb, now_time, now_time - interval '6 hours', 145),
(c2_viewer, c2_id, 'Karthik Rao', 'viewer@acmetech.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-8765432104', 'https://ui-avatars.com/api/?name=Karthik+Rao&background=8B5CF6&color=fff', 'VIEWER', 'ACTIVE', '["dashboard","reports"]'::jsonb, now_time, now_time - interval '2 days', 8);

-- Company 3
INSERT INTO users (id, "companyId", name, email, "emailVerified", "emailVerifiedAt", "passwordHash", phone, avatar, role, status, permissions, "lastActiveAt", "lastLoginAt", "loginCount")
VALUES
(c3_admin, c3_id, 'Srinivasan Iyer', 'admin@abcmfg.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-7654321090', 'https://ui-avatars.com/api/?name=Srinivasan+Iyer&background=3B82F6&color=fff', 'ADMIN', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb, now_time, now_time - interval '30 min', 52),
(c3_manager, c3_id, 'Lakshmi Venkat', 'manager@abcmfg.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-7654321091', 'https://ui-avatars.com/api/?name=Lakshmi+Venkat&background=10B981&color=fff', 'MANAGER', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports"]'::jsonb, now_time, now_time - interval '2 hours', 98),
(c3_staff1, c3_id, 'Hari Prasad', 'staff1@abcmfg.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-7654321092', 'https://ui-avatars.com/api/?name=Hari+Prasad&background=F59E0B&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices","payment_links"]'::jsonb, now_time, now_time - interval '1 hour', 167),
(c3_staff2, c3_id, 'Meena Subramanian', 'staff2@abcmfg.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-7654321093', 'https://ui-avatars.com/api/?name=Meena+Subramanian&background=EF4444&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices"]'::jsonb, now_time, now_time - interval '3 hours', 201),
(c3_viewer, c3_id, 'Ramesh Chandran', 'viewer@abcmfg.com', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-7654321094', 'https://ui-avatars.com/api/?name=Ramesh+Chandran&background=8B5CF6&color=fff', 'VIEWER', 'ACTIVE', '["dashboard","reports"]'::jsonb, now_time, now_time - interval '1 day', 15);

-- Company 4
INSERT INTO users (id, "companyId", name, email, "emailVerified", "emailVerifiedAt", "passwordHash", phone, avatar, role, status, permissions, "lastActiveAt", "lastLoginAt", "loginCount")
VALUES
(c4_admin, c4_id, 'Ankur Mittal', 'admin@nextgensol.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-6543210980', 'https://ui-avatars.com/api/?name=Ankur+Mittal&background=3B82F6&color=fff', 'ADMIN', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb, now_time, now_time - interval '15 min', 78),
(c4_manager, c4_id, 'Pooja Verma', 'manager@nextgensol.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-6543210981', 'https://ui-avatars.com/api/?name=Pooja+Verma&background=10B981&color=fff', 'MANAGER', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports"]'::jsonb, now_time, now_time - interval '45 min', 134),
(c4_staff1, c4_id, 'Sanjay Yadav', 'staff1@nextgensol.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-6543210982', 'https://ui-avatars.com/api/?name=Sanjay+Yadav&background=F59E0B&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices","payment_links"]'::jsonb, now_time, now_time - interval '20 min', 189),
(c4_staff2, c4_id, 'Kavita Bansal', 'staff2@nextgensol.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-6543210983', 'https://ui-avatars.com/api/?name=Kavita+Bansal&background=EF4444&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices"]'::jsonb, now_time, now_time - interval '4 hours', 256),
(c4_viewer, c4_id, 'Deepak Ahlawat', 'viewer@nextgensol.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-6543210984', 'https://ui-avatars.com/api/?name=Deepak+Ahlawat&background=8B5CF6&color=fff', 'VIEWER', 'ACTIVE', '["dashboard","reports"]'::jsonb, now_time, now_time - interval '3 days', 21);

-- Company 5
INSERT INTO users (id, "companyId", name, email, "emailVerified", "emailVerifiedAt", "passwordHash", phone, avatar, role, status, permissions, "lastActiveAt", "lastLoginAt", "loginCount")
VALUES
(c5_admin, c5_id, 'Harsh Patel', 'admin@globalretail.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-5432109870', 'https://ui-avatars.com/api/?name=Harsh+Patel&background=3B82F6&color=fff', 'ADMIN', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb, now_time, now_time - interval '10 min', 34),
(c5_manager, c5_id, 'Bhakti Joshi', 'manager@globalretail.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-5432109871', 'https://ui-avatars.com/api/?name=Bhakti+Joshi&background=10B981&color=fff', 'MANAGER', 'ACTIVE', '["dashboard","customers","invoices","payment_links","whatsapp","email","reports"]'::jsonb, now_time, now_time - interval '1 hour', 67),
(c5_staff1, c5_id, 'Jignesh Shah', 'staff1@globalretail.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-5432109872', 'https://ui-avatars.com/api/?name=Jignesh+Shah&background=F59E0B&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices","payment_links"]'::jsonb, now_time, now_time - interval '2 hours', 123),
(c5_staff2, c5_id, 'Komal Mehta', 'staff2@globalretail.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-5432109873', 'https://ui-avatars.com/api/?name=Komal+Mehta&background=EF4444&color=fff', 'STAFF', 'ACTIVE', '["dashboard","customers","invoices"]'::jsonb, now_time, now_time - interval '30 min', 178),
(c5_viewer, c5_id, 'Pratik Gandhi', 'viewer@globalretail.in', true, now_time, crypt('Password@123', gen_salt('bf')), '+91-5432109874', 'https://ui-avatars.com/api/?name=Pratik+Gandhi&background=8B5CF6&color=fff', 'VIEWER', 'ACTIVE', '["dashboard","reports"]'::jsonb, now_time, now_time - interval '5 hours', 9);

-- ============================================
-- IDENTITYS (for Supabase Auth)
-- ============================================

INSERT INTO auth.identities (id, user_id, provider, "identity_data", provider_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  u.id::text,
  now_time,
  now_time
FROM auth.users u;

-- ============================================
-- USER SETTINGS
-- ============================================

INSERT INTO user_settings ("userId", theme, language, timezone, notifications, "dashboardLayout")
SELECT
  u.id,
  CASE (random() * 2)::int WHEN 0 THEN 'light' WHEN 1 THEN 'dark' ELSE 'system' END,
  'en',
  'Asia/Kolkata',
  '{"email":true,"browser":true,"sms":false}'::jsonb,
  '{"widgets":["recentInvoices","revenueChart","activityFeed"],"layout":"grid"}'::jsonb
FROM users u;

-- ============================================
-- ACCOUNT SECURITY
-- ============================================

INSERT INTO account_security ("userId", "loginAttempts", "passwordChangedAt", "twoFactorEnabled")
SELECT
  u.id,
  0,
  u."createdAt",
  false
FROM users u;

-- ============================================
-- TRUSTED DEVICES
-- ============================================

INSERT INTO trusted_devices ("userId", "deviceHash", "deviceName", "deviceType", browser, os, "ipAddress", "userAgent")
SELECT
  u.id,
  md5(u.email || 'device1'),
  'Office Laptop',
  'Desktop',
  CASE (random() * 2)::int WHEN 0 THEN 'Chrome' WHEN 1 THEN 'Firefox' ELSE 'Edge' END,
  CASE (random() * 2)::int WHEN 0 THEN 'Windows 11' WHEN 1 THEN 'macOS Sonoma' ELSE 'Linux' END,
  '192.168.1.' || (random() * 254 + 1)::text,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u;

RAISE NOTICE 'Companies and users seeded successfully!';
END $$;