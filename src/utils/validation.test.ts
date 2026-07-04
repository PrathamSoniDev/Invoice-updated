import { describe, it, expect } from 'vitest';
import { isValidEmail, assertValidEmail, EMAIL_REGEX } from '@/utils/validation';

describe('EMAIL_REGEX', () => {
  it('is a case-insensitive regex', () => {
    expect(EMAIL_REGEX.flags).toContain('i');
  });
});

describe('isValidEmail', () => {
  describe('valid emails (must be accepted)', () => {
    const validEmails = [
      // Exact cases from the bug report
      'sourabh@example.com',
      'test@example.com',
      'john.doe@gmail.com',
      'user+test@example.com',
      // Exact RFC-compliant emails required by the task (point 8)
      'john@example.com',
      'john1@example.com',
      'john.doe@example.co.uk',
      // Additional RFC-compliant formats
      'john.doe@example.co.in',
      'user+label@gmail.com',
      'first_last@company.org',
      'john.doe@company.com',
      'user123@gmail.com',
      'user@sub.domain.com',
      'first.last@sub.domain.co.in',
      'USER@EXAMPLE.COM',
      'a@b.co',
      "o'reilly@example.org",
      'name+tag+filter@gmail.com',
      'user_name@my-domain.io',
    ];

    it.each(validEmails)('accepts %s', (email) => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  describe('invalid emails (must be rejected)', () => {
    const invalidEmails = [
      // Exact cases from the bug report
      'sourabh@',
      '@example.com',
      'sourabh',
      'sourabh@example',
      // Exact invalid emails required by the task (point 9)
      'abc',
      'john@',
      // Additional malformed formats
      'plainaddress',
      '@no-local-part.com',
      'missing-domain@.com',
      'missing-tld@example',
      'spaces in@example.com',
      'double..dot@example.com',
      '.starts-with-dot@example.com',
      'ends-with-dot.@example.com',
      'no-at-sign.com',
      'two@@at-signs.com',
      'trailing-dot@example.com.',
      'user@',
      'user@.com',
      'user@domain',
      'user@domain.c',
      'user@-domain.com',
      'user@.domain.com',
    ];

    it.each(invalidEmails)('rejects %s', (email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });

  describe('empty / non-string inputs', () => {
    it('rejects empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isValidEmail('   ')).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidEmail(null)).toBe(false);
    });

    it('rejects numbers', () => {
      expect(isValidEmail(12345)).toBe(false);
    });

    it('rejects objects', () => {
      expect(isValidEmail({ email: 'test@example.com' })).toBe(false);
    });
  });

  describe('whitespace handling', () => {
    it('accepts an email with surrounding whitespace (trimmed internally)', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('regression: bug-report emails', () => {
    // These are the exact emails from the bug report. They MUST be accepted.
    it('accepts sourabh@example.com', () => {
      expect(isValidEmail('sourabh@example.com')).toBe(true);
    });

    it('accepts test@example.com', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('accepts john.doe@gmail.com', () => {
      expect(isValidEmail('john.doe@gmail.com')).toBe(true);
    });

    it('accepts user+test@example.com', () => {
      expect(isValidEmail('user+test@example.com')).toBe(true);
    });

    it('accepts john.doe@example.co.in', () => {
      expect(isValidEmail('john.doe@example.co.in')).toBe(true);
    });

    it('accepts user+label@gmail.com', () => {
      expect(isValidEmail('user+label@gmail.com')).toBe(true);
    });

    it('accepts first_last@company.org', () => {
      expect(isValidEmail('first_last@company.org')).toBe(true);
    });

    // These are the exact invalid emails from the bug report. They MUST be rejected.
    it('rejects sourabh@', () => {
      expect(isValidEmail('sourabh@')).toBe(false);
    });

    it('rejects @example.com', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('rejects sourabh', () => {
      expect(isValidEmail('sourabh')).toBe(false);
    });

    it('rejects sourabh@example', () => {
      expect(isValidEmail('sourabh@example')).toBe(false);
    });
  });

  describe('length constraints', () => {
    it('rejects emails longer than 254 characters', () => {
      const longLocal = 'a'.repeat(250);
      expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
    });
  });

  describe('subdomain support', () => {
    it('accepts single subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('accepts multiple nested subdomains', () => {
      expect(isValidEmail('user@a.b.c.example.com')).toBe(true);
    });
  });

  describe('plus alias support', () => {
    it('accepts simple plus alias', () => {
      expect(isValidEmail('user+test@example.com')).toBe(true);
    });

    it('accepts plus alias with dots in the tag', () => {
      expect(isValidEmail('user+tag.filter@example.com')).toBe(true);
    });

    it('accepts plus alias with multiple plus signs', () => {
      expect(isValidEmail('name+tag+filter@gmail.com')).toBe(true);
    });
  });
});

describe('assertValidEmail', () => {
  it('does not throw for a valid email', () => {
    expect(() => assertValidEmail('test@example.com')).not.toThrow();
  });

  it('does not throw for a valid email with surrounding whitespace', () => {
    expect(() => assertValidEmail('  john.doe@company.com  ')).not.toThrow();
  });

  it('throws for an empty string with a "required" message', () => {
    expect(() => assertValidEmail('')).toThrow('email is required');
  });

  it('throws for a whitespace-only string with a "required" message', () => {
    expect(() => assertValidEmail('   ')).toThrow('email is required');
  });

  it('throws for undefined with a "required" message', () => {
    expect(() => assertValidEmail(undefined)).toThrow('email is required');
  });

  it('throws "Invalid email format" for a malformed email', () => {
    expect(() => assertValidEmail('not-an-email')).toThrow('Invalid email format');
  });

  it('throws "Invalid email format" for missing TLD', () => {
    expect(() => assertValidEmail('user@example')).toThrow('Invalid email format');
  });

  it('throws "Invalid email format" for double dots', () => {
    expect(() => assertValidEmail('user..name@example.com')).toThrow('Invalid email format');
  });

  it('uses the custom field name in the required message', () => {
    expect(() => assertValidEmail('', 'userEmail')).toThrow('userEmail is required');
  });

  it('accepts subdomain emails', () => {
    expect(() => assertValidEmail('user@sub.domain.com')).not.toThrow();
  });

  it('accepts plus-alias emails', () => {
    expect(() => assertValidEmail('user+test@example.com')).not.toThrow();
  });
});
