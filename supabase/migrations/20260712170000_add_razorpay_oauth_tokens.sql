-- Adds encrypted OAuth token columns to `gateway_settings`, following the
-- exact same at-rest-encryption pattern as the manual credentials added in
-- 20260712120000_encrypt_gateway_credentials.sql (pgp_sym_encrypt/decrypt,
-- SECURITY DEFINER helper functions restricted to service_role, column-level
-- REVOKE from anon/authenticated as defense in depth). Tokens are never
-- stored in plaintext and never leave the database except as a decrypted
-- value returned to a service_role caller for internal server-side use
-- (Express OAuth routes / the refresh-tokens cron function) — never to the
-- frontend.
--
-- `razorpayConnectionMethod` lets the app know, per company, whether the
-- active Razorpay credential path is the original manual Key ID/Key Secret
-- flow ('manual', the default — no behavior change for existing companies)
-- or the new OAuth flow ('oauth').

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

-- ---------------------------------------------------------------------------
-- set_razorpay_oauth_tokens: encrypts and stores the access/refresh tokens
-- returned by Razorpay's OAuth token endpoint (used by both the initial
-- authorize/callback exchange in Phase B and the daily refresh cron in
-- Phase C). Does NOT flip razorpayConnectionMethod/razorpayEnabled itself —
-- callers do that explicitly so this function stays a pure "store tokens"
-- primitive reusable by both the callback (which does want those flipped)
-- and the refresh cron (which does not touch connection method/enabled,
-- since a refresh doesn't change either).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- get_razorpay_oauth_token: decrypts and returns the ACCESS token in full,
-- for internal server-side use only (attaching it as a Bearer token on
-- outgoing Razorpay API calls made on the company's behalf). Restricted to
-- service_role — never callable by anon/authenticated, and never invoked
-- from the frontend. Unlike get_gateway_secret_preview (Phase 1), this
-- intentionally returns the full plaintext, because unlike a merchant-typed
-- password there is no "preview" use case for an opaque bearer token; the
-- access-control boundary here is entirely the service_role restriction.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- get_razorpay_oauth_refresh_token: same shape as get_razorpay_oauth_token
-- but for the refresh token, used only by the Phase C refresh cron.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- clear_razorpay_oauth_tokens: wipes the OAuth token columns and resets the
-- connection method, used by the revocation webhook (Phase D) and by the
-- refresh cron (Phase C) when a refresh token turns out to be invalid.
-- ---------------------------------------------------------------------------
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

-- Defense in depth: same as the Phase 1 encrypted columns, block PostgREST
-- (anon/authenticated) from touching the new encrypted columns directly,
-- even though `service_all_gs` otherwise grants full row access. service_role
-- bypasses grants/RLS entirely, so the Edge Functions/Express server are
-- unaffected.
REVOKE SELECT ("razorpayOauthAccessTokenEnc", "razorpayOauthRefreshTokenEnc") ON gateway_settings FROM anon, authenticated;
REVOKE INSERT ("razorpayOauthAccessTokenEnc", "razorpayOauthRefreshTokenEnc") ON gateway_settings FROM anon, authenticated;
REVOKE UPDATE ("razorpayOauthAccessTokenEnc", "razorpayOauthRefreshTokenEnc") ON gateway_settings FROM anon, authenticated;
