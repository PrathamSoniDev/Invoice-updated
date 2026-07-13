/**
 * Shared validation utilities.
 *
 * These helpers provide a single source of truth for field validation so the
 * frontend (forms) and the backend (service layer) stay consistent. The email
 * regex intentionally mirrors the behaviour of Zod's `z.string().email()` used
 * elsewhere in the codebase (see `CustomerFormPage.tsx`) so that a value
 * accepted/rejected in one layer is accepted/rejected in the other.
 */

/**
 * Email validation regex.
 *
 * Rules:
 *  - Local part must not start/end with a dot and must not contain consecutive dots.
 *  - Local part allows letters, digits, `+`, `-`, `_`, `.`, and `'`.
 *  - Domain is made of labels separated by dots; each label allows letters,
 *    digits and hyphens (not starting/ending with a hyphen).
 *  - The TLD must be at least two characters (letters only).
 *
 * This accepts the common valid formats requested by the product:
 *   test@example.com, john.doe@company.com, user123@gmail.com,
 *   user@sub.domain.com, user+test@example.com
 */
export const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

/**
 * Validate an email address.
 *
 * @param email - The email string to validate.
 * @returns `true` when the email is a non-empty string matching {@link EMAIL_REGEX}.
 */
export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validate an email address and throw a descriptive error when invalid.
 *
 * Used by the service layer to fail fast with a clear message before the value
 * reaches Supabase (which would otherwise surface a generic
 * "Email address is invalid" error).
 *
 * @param email - The email string to validate.
 * @param field - Optional field name used in the error message.
 * @throws {Error} when the email is empty or malformed.
 */
export function assertValidEmail(email: unknown, field = 'email'): void {
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  if (!isValidEmail(email)) {
    throw new Error(`Invalid email format`);
  }
}
