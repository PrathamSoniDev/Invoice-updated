// Signed, stateless "state" parameter for the Razorpay OAuth authorize/
// callback round trip (Phase B). Encodes the caller's companyId + a CSRF
// nonce + an expiry, HMAC-signed with RAZORPAY_OAUTH_STATE_SECRET so the
// callback can trust the companyId it carries without needing a server-side
// session store — the signature is what prevents a third party from forging
// or tampering with a state value, and the expiry bounds how long a leaked/
// intercepted state value would remain usable.
//
// This mirrors, in spirit, the "sign a short-lived claim, verify it
// stateless-ly on the way back" shape already used elsewhere in this app
// (Supabase JWTs), just scoped to this one OAuth handshake instead of a full
// session.

import crypto from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a redirect round trip, short enough to bound risk.

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * @param {{ companyId: string }} payload
 * @returns {string} signed state token, safe to place in a URL query string
 */
export function signOauthState({ companyId }) {
  const secret = process.env.RAZORPAY_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_OAUTH_STATE_SECRET is not configured');
  }

  const claims = {
    companyId,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
    exp: Date.now() + STATE_TTL_MS,
  };

  const encodedClaims = base64url(JSON.stringify(claims));
  const signature = crypto.createHmac('sha256', secret).update(encodedClaims).digest('base64url');
  return `${encodedClaims}.${signature}`;
}

/**
 * @param {string} state
 * @returns {{ companyId: string, nonce: string, iat: number, exp: number }}
 * @throws if the state is missing, malformed, has an invalid signature, or has expired
 */
export function verifyOauthState(state) {
  const secret = process.env.RAZORPAY_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_OAUTH_STATE_SECRET is not configured');
  }
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    throw new Error('Malformed state parameter');
  }

  const [encodedClaims, signature] = state.split('.');
  const expectedSignature = crypto.createHmac('sha256', secret).update(encodedClaims).digest('base64url');

  const signatureBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expectedSignature);
  const isValid =
    signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    throw new Error('Invalid state signature');
  }

  let claims;
  try {
    claims = JSON.parse(fromBase64url(encodedClaims));
  } catch {
    throw new Error('Malformed state payload');
  }

  if (!claims.companyId || !claims.exp) {
    throw new Error('Malformed state payload');
  }
  if (Date.now() > claims.exp) {
    throw new Error('State parameter has expired — please retry connecting Razorpay');
  }

  return claims;
}
