

ALTER TABLE gateway_settings
  ADD COLUMN IF NOT EXISTS "razorpayOauthAccessTokenEnc" bytea,
  ADD COLUMN IF NOT EXISTS "razorpayOauthRefreshTokenEnc" bytea,
  ADD COLUMN IF NOT EXISTS "razorpayOauthAccessTokenExpiresAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "razorpayOauthAccountId" text,
  ADD COLUMN IF NOT EXISTS "razorpayConnectionMethod" text NOT NULL DEFAULT 'manual';

ALTER TABLE gateway_settings
  DROP CONSTRAINT IF EXISTS "gateway_settings_razorpayConnectionMethod_check";
ALTER TABLE gateway_settings
  ADD CONSTRAINT "gateway_settings_razorpayConnectionMethod_check"
  CHECK ("razorpayConnectionMethod" IN ('manual', 'oauth'));


CREATE OR REPLACE FUNCTION set_razorpay_oauth_tokens(
  p_company_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_account_id text,
  p_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  UPDATE gateway_settings
  SET "razorpayOauthAccessTokenEnc" = pgp_sym_encrypt(p_access_token, p_key),
      "razorpayOauthRefreshTokenEnc" = pgp_sym_encrypt(p_refresh_token, p_key),
      "razorpayOauthAccessTokenExpiresAt" = p_expires_at,
      "razorpayOauthAccountId" = COALESCE(p_account_id, "razorpayOauthAccountId"),
      "updatedAt" = now()
  WHERE "companyId" = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No gateway_settings row for company %', p_company_id;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION get_razorpay_oauth_token(
  p_company_id uuid,
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
  SELECT "razorpayOauthAccessTokenEnc" INTO v_enc
  FROM gateway_settings
  WHERE "companyId" = p_company_id;

  IF v_enc IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_plain := pgp_sym_decrypt(v_enc, p_key);
  EXCEPTION WHEN OTHERS THEN
    -- Wrong key / corrupted ciphertext — don't leak details.
    RETURN NULL;
  END;

  RETURN v_plain;
END;
$$;


CREATE OR REPLACE FUNCTION get_razorpay_oauth_refresh_token(
  p_company_id uuid,
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
  SELECT "razorpayOauthRefreshTokenEnc" INTO v_enc
  FROM gateway_settings
  WHERE "companyId" = p_company_id;

  IF v_enc IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_plain := pgp_sym_decrypt(v_enc, p_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  RETURN v_plain;
END;
$$;

CREATE OR REPLACE FUNCTION clear_razorpay_oauth_tokens(
  p_company_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  UPDATE gateway_settings
  SET "razorpayOauthAccessTokenEnc" = NULL,
      "razorpayOauthRefreshTokenEnc" = NULL,
      "razorpayOauthAccessTokenExpiresAt" = NULL,
      "razorpayOauthAccountId" = NULL,
      "razorpayConnectionMethod" = 'manual',
      "razorpayEnabled" = false,
      "updatedAt" = now()
  WHERE "companyId" = p_company_id;
END;
$$;

REVOKE ALL ON FUNCTION set_razorpay_oauth_tokens(uuid, text, text, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_razorpay_oauth_token(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_razorpay_oauth_refresh_token(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION clear_razorpay_oauth_tokens(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION set_razorpay_oauth_tokens(uuid, text, text, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_razorpay_oauth_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_razorpay_oauth_refresh_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION clear_razorpay_oauth_tokens(uuid) TO service_role;


REVOKE SELECT ("razorpayOauthAccessTokenEnc", "razorpayOauthRefreshTokenEnc") ON gateway_settings FROM anon, authenticated;
REVOKE INSERT ("razorpayOauthAccessTokenEnc", "razorpayOauthRefreshTokenEnc") ON gateway_settings FROM anon, authenticated;
REVOKE UPDATE ("razorpayOauthAccessTokenEnc", "razorpayOauthRefreshTokenEnc") ON gateway_settings FROM anon, authenticated;
