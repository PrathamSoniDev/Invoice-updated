-- Phase 5: GST CGST/SGST/IGST auto-split.
--
-- Adds per-line-item tax breakdown columns. Whether a line item's tax is
-- split into CGST+SGST (intra-state: company and customer in the same
-- state) or charged entirely as IGST (inter-state) is computed in the
-- application layer (see src/utils/gst.ts) at invoice create/update time
-- and stored here — it is NOT recomputed on every read, so historical
-- invoices keep the breakdown that was correct on the date they were
-- issued even if the company's registered state changes later.

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS "cgstAmount" decimal(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgstAmount" decimal(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "igstAmount" decimal(10,2) NOT NULL DEFAULT 0;
