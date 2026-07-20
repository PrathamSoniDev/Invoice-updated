

ALTER TABLE gateway_settings
  ADD COLUMN IF NOT EXISTS "razorpayKeySecretEnc" bytea,
  ADD COLUMN IF NOT EXISTS "paytmMerchantKeyEnc" bytea;

ALTER TABLE gateway_settings
  DROP COLUMN IF EXISTS "razorpayKeySecret",
  DROP COLUMN IF EXISTS "paytmMerchantKey";


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
