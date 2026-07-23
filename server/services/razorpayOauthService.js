// Server-to-server calls against Razorpay's Technology Partner OAuth
// endpoints. Endpoints/params confirmed directly against Razorpay's docs
// (https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/integration-steps/)
// rather than assumed — see that page for the authoritative spec if these
// ever need re-checking.
//
// NOTE: this app has not yet been approved as a Razorpay Technology Partner
// (KYC pending — see repo root notes). RAZORPAY_OAUTH_CLIENT_ID/
// RAZORPAY_OAUTH_CLIENT_SECRET are unset until that approval lands and a
// real application is created on the Partner Dashboard. Every function here
// throws a clear "not configured" error until then; nothing here is mocked
// or faked, so the feature activates for real the moment those env vars are
// supplied — no code changes needed.

const RAZORPAY_OAUTH_AUTHORIZE_URL = 'https://auth.razorpay.com/authorize';
const RAZORPAY_OAUTH_TOKEN_URL = 'https://auth.razorpay.com/token';
const RAZORPAY_OAUTH_REVOKE_URL = 'https://auth.razorpay.com/revoke';

export function isRazorpayOauthConfigured() {
  return Boolean(
    process.env.RAZORPAY_OAUTH_CLIENT_ID &&
      process.env.RAZORPAY_OAUTH_CLIENT_SECRET &&
      process.env.RAZORPAY_OAUTH_REDIRECT_URI &&
      process.env.RAZORPAY_OAUTH_STATE_SECRET,
  );
}

/**
 * Builds the URL to redirect the merchant's browser to so they can
 * authorise this app against their Razorpay account.
 * @param {string} state signed state value from oauthState.js
 */
export function buildAuthorizeUrl(state) {
  const url = new URL(RAZORPAY_OAUTH_AUTHORIZE_URL);
  url.searchParams.set('client_id', process.env.RAZORPAY_OAUTH_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', process.env.RAZORPAY_OAUTH_REDIRECT_URI);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('state', state);
  return url.toString();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error_description || data?.error || `Razorpay OAuth request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Exchanges an authorisation `code` (from the callback redirect) for an
 * access/refresh token pair.
 * @param {string} code decoded authorisation code
 * @returns {Promise<{ access_token: string, refresh_token: string, public_token: string, expires_in: number, razorpay_account_id: string, token_type: string }>}
 */
export async function exchangeCodeForTokens(code) {
  return postJson(RAZORPAY_OAUTH_TOKEN_URL, {
    client_id: process.env.RAZORPAY_OAUTH_CLIENT_ID,
    client_secret: process.env.RAZORPAY_OAUTH_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.RAZORPAY_OAUTH_REDIRECT_URI,
    code,
    // Optional per Razorpay's docs (defaults to "live"); lets a
    // development-client integration be tested end-to-end before the
    // production application is approved/live.
    ...(process.env.RAZORPAY_OAUTH_MODE ? { mode: process.env.RAZORPAY_OAUTH_MODE } : {}),
  });
}

/**
 * Exchanges a refresh token for a new access/refresh token pair. Per
 * Razorpay's docs, the OLD refresh token is invalidated the moment this
 * succeeds — the caller MUST persist the new refresh_token returned here.
 * @param {string} refreshToken
 */
export async function refreshAccessToken(refreshToken) {
  return postJson(RAZORPAY_OAUTH_TOKEN_URL, {
    client_id: process.env.RAZORPAY_OAUTH_CLIENT_ID,
    client_secret: process.env.RAZORPAY_OAUTH_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

/**
 * Best-effort: if this fails (e.g. token already invalid), the
 * caller should still clear the locally-stored tokens.
 * @param {string} token
 * @param {'access_token' | 'refresh_token'} tokenTypeHint
 */
export async function revokeToken(token, tokenTypeHint = 'access_token') {
  return postJson(RAZORPAY_OAUTH_REVOKE_URL, {
    client_id: process.env.RAZORPAY_OAUTH_CLIENT_ID,
    client_secret: process.env.RAZORPAY_OAUTH_CLIENT_SECRET,
    token_type_hint: tokenTypeHint,
    token,
  });
}
