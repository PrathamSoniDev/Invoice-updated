-- Fixes a bug in 20260712120000_encrypt_gateway_credentials.sql: on
-- Supabase-hosted projects, `CREATE EXTENSION pgcrypto` (with no explicit
-- SCHEMA clause) installs into the `extensions` schema, not `public`. Both
-- SECURITY DEFINER functions added by that migration set
-- `search_path = public, pg_temp`, which doesn't include `extensions` — so
-- `pgp_sym_encrypt`/`pgp_sym_decrypt` can't be resolved and every call fails
-- with "function pgp_sym_encrypt(text, text) does not exist", surfaced to
-- the client as a 500 from save-gateway-credentials/get-gateway-status.
--
-- Re-creating with `extensions` added to the search_path (kept alongside
-- `public` so this also works unmodified on any environment where pgcrypto
-- happens to already live in `public`, e.g. a local `supabase start` setup).

CREATE OR REPLACE FUNCTION set_gateway_secret(
  p_company_id uuid,
  p_gateway text,
  p_secret text,
  p_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

CREATE OR REPLACE FUNCTION get_gateway_secret_preview(
  p_company_id uuid,
  p_gateway text,
  p_key text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

-- CREATE OR REPLACE preserves the existing REVOKE/GRANT from the original
-- migration, but re-asserting them here costs nothing and removes any doubt.
REVOKE ALL ON FUNCTION set_gateway_secret(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_gateway_secret_preview(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_gateway_secret(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_gateway_secret_preview(uuid, text, text) TO service_role;
