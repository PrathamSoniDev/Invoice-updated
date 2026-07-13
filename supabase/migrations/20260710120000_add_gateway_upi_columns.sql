-- Add settlement UPI ID columns to gateway_settings so merchants can
-- specify the UPI ID payouts should be settled to for each gateway.
ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS "razorpayUpiId" text;
ALTER TABLE gateway_settings ADD COLUMN IF NOT EXISTS "paytmUpiId" text;
