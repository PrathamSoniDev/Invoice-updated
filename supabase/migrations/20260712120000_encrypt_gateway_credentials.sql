-- Phase 1: Encrypt gateway credentials at rest.
--
-- Previously `razorpayKeySecret` and `paytmMerchantKey` were stored as plain
-- text in `gateway_settings` and were readable/writable directly by the
-- frontend via PostgREST (RLS policy "gateway_crud" allows anon/authenticated
-- full access to the row). This migration:
--
--   1. Adds new `bytea` columns to hold `pgp_sym_encrypt()` ciphertext.
--   2. Adds two SECURITY DEFINER helper functions, callable only by
--      `service_role`, that encrypt/decrypt using a passphrase supplied at
--      call time (never stored in the database) — the two new
--      `save-gateway-credentials` / `get-gateway-status` Edge Functions pass
--      this passphrase in from their own environment secrets.
--   3. Drops the old plaintext columns.
--   4. Revokes column-level access to the new encrypted columns from
--      anon/authenticated as defense in depth, on top of routing all reads/
--      writes through the Edge Functions.
--
-- NOTE: because the encryption passphrase lives only in Edge Function
-- environment secrets (never in SQL), this migration cannot re-encrypt any
-- pre-existing plaintext secrets — that data is dropped with the plaintext
-- columns. Once `save-gateway-credentials` is deployed with
-- GATEWAY_CREDENTIALS_ENCRYPTION_KEY set, reconnect Razorpay/Paytm once from
-- the Settings page to repopulate the encrypted columns.

ALTER TABLE gateway_settings
  ADD COLUMN IF NOT EXISTS "razorpayKeySecretEnc" bytea,
  ADD COLUMN IF NOT EXISTS "paytmMerchantKeyEnc" bytea;

ALTER TABLE gateway_settings
  DROP COLUMN IF EXISTS "razorpayKeySecret",
  DROP COLUMN IF EXISTS "paytmMerchantKey";

-- ---------------------------------------------------------------------------
-- set_gateway_secret: encrypts p_secret with p_key and stores it in the
-- correct *Enc column for the given company + gateway. Returns nothing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_gateway_secret(
  p_company_id uuid,
  p_gateway text,
  p_secret text,
  p_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_gateway = 'razorpay' THEN
    UPDATE gateway_settings
    SET "razorpayKeySecretEnc" = pgp_sym_encrypt(p_secret, p_key),
        "updatedAt" = now()
    WHERE "companyId" = p_company_id;
  ELSIF p_gateway = 'paytm' THEN
    UPDATE gateway_settings
    SET "paytmMerchantKeyEnc" = pgp_sym_encrypt(p_secret, p_key),
        "updatedAt" = now()
    WHERE "companyId" = p_company_id;
  ELSE
    RAISE EXCEPTION 'Unknown gateway: %', p_gateway;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No gateway_settings row for company %', p_company_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- get_gateway_secret_preview: decrypts the stored ciphertext internally but
-- only ever RETURNS a masked preview (last 4 chars). The full plaintext
-- never leaves this function, and this function is only reachable by
-- service_role (i.e. from within an Edge Function), never PostgREST clients.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_gateway_secret_preview(
  p_company_id uuid,
  p_gateway text,
  p_key text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enc bytea;
  v_plain text;
BEGIN
  IF p_gateway = 'razorpay' THEN
    SELECT "razorpayKeySecretEnc" INTO v_enc FROM gateway_settings WHERE "companyId" = p_company_id;
  ELSIF p_gateway = 'paytm' THEN
    SELECT "paytmMerchantKeyEnc" INTO v_enc FROM gateway_settings WHERE "companyId" = p_company_id;
  ELSE
    RAISE EXCEPTION 'Unknown gateway: %', p_gateway;
  END IF;

  IF v_enc IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_plain := pgp_sym_decrypt(v_enc, p_key);
  EXCEPTION WHEN OTHERS THEN
    -- Wrong key / corrupted ciphertext — don't leak details, just report
    -- "unavailable" so the frontend can show a generic warning.
    RETURN NULL;
  END;

  IF v_plain IS NULL OR length(v_plain) = 0 THEN
    RETURN NULL;
  END IF;

  IF length(v_plain) <= 4 THEN
    RETURN repeat('•', length(v_plain));
  END IF;

  RETURN repeat('•', length(v_plain) - 4) || right(v_plain, 4);
END;
$$;

REVOKE ALL ON FUNCTION set_gateway_secret(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_gateway_secret_preview(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_gateway_secret(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_gateway_secret_preview(uuid, text, text) TO service_role;

-- Defense in depth: even though the app will no longer query
-- gateway_settings' encrypted columns directly from the client, make sure
-- PostgREST (anon/authenticated) cannot select/insert/update them at all.
-- service_role bypasses grants/RLS entirely, so the Edge Functions are
-- unaffected.
REVOKE SELECT ("razorpayKeySecretEnc", "paytmMerchantKeyEnc") ON gateway_settings FROM anon, authenticated;
REVOKE INSERT ("razorpayKeySecretEnc", "paytmMerchantKeyEnc") ON gateway_settings FROM anon, authenticated;
REVOKE UPDATE ("razorpayKeySecretEnc", "paytmMerchantKeyEnc") ON gateway_settings FROM anon, authenticated;
