import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Integration tests for `adminService.createUser` email validation.
 *
 * These verify that the service layer rejects invalid emails with a clear
 * message BEFORE the request reaches the Edge Function (which would otherwise
 * surface a generic "Email address is invalid" error). The Supabase client,
 * database helpers, and global `fetch` are mocked so we can assert they are
 * never called for invalid input.
 *
 * NOTE: `createUser` no longer calls `supabase.auth.signUp()` directly. It
 * delegates auth-user creation to a secure Supabase Edge Function
 * (`admin-create-user`) that uses the Admin API (`auth.admin.createUser`) with
 * the service role key. This bypasses the per-IP/email rate limit (429) and
 * sets `email_confirm: true` so no confirmation email is sent.
 */

// Track whether the mocked global fetch (Edge Function call) was invoked.
const fetchMock = vi.fn();
const getSessionMock = vi.fn();
const insertMock = vi.fn();
// The duplicate-check query: supabase.from('users').select('id').eq(...).eq(...).is(...).maybeSingle()
const duplicateCheckMock = vi.fn();

// Mock the supabase client so importing adminService does not require env vars.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
    // `createUser` calls `from('users')` twice:
    //   1. duplicate-check: .select('id').eq().eq().is().maybeSingle()
    //   2. profile insert: .insert({...}).select('*, companies...').maybeSingle()
    // The returned builder therefore exposes BOTH `select` and `insert` so each
    // call path resolves correctly regardless of order.
    from: vi.fn(() => {
      const builder = {
        // Duplicate-check path.
        select: vi.fn(() => {
          const chain = {
            eq: vi.fn(() => chain),
            is: vi.fn(() => chain),
            maybeSingle: vi.fn().mockResolvedValue(duplicateCheckMock()),
          };
          return chain;
        }),
        // Profile-insert path.
        insert: (...args: unknown[]) => insertMock(...args),
      };
      return builder;
    }),
  },
}));

// Mock the database helpers used by createUser.
vi.mock('@/lib/database', () => ({
  getCurrentCompanyId: vi.fn().mockResolvedValue('company-123'),
  paginate: vi.fn(),
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock permissions helpers (pure functions, but keep import lightweight).
vi.mock('@/utils/permissions', () => ({
  normalizeModuleKey: (k: string) => k,
  normalizePermissions: (p: string[] = []) => p,
  normalizeRoles: (r: string[] = []) => r,
  toDbModuleKey: (k: string) => k,
}));

import { adminService } from '@/services/adminService';

/**
 * Helper that wires up a successful Edge Function response returning the given
 * auth user id, plus a successful profile insert chain. Tests that exercise the
 * happy path only need to call this and focus on the behaviour under assertion.
 */
function mockSuccessfulCreateUser(authUserId: string, returnedUser: Record<string, unknown>) {
  getSessionMock.mockResolvedValue({
    data: { session: { access_token: 'test-access-token' } },
  });
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ userId: authUserId }),
  });
  insertMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: returnedUser,
        error: null,
      }),
    }),
  });
}

describe('adminService.createUser — email validation (integration)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getSessionMock.mockReset();
    insertMock.mockReset();
    // By default no existing user is found (duplicate check returns null).
    duplicateCheckMock.mockReset().mockResolvedValue({ data: null });
    // Stub global fetch so adminService.createUser calls our mock.
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws "Invalid email format" and never calls the Edge Function for a malformed email', async () => {
    await expect(
      adminService.createUser({
        name: 'Jane Doe',
        email: 'not-an-email',
        role: 'staff',
      }),
    ).rejects.toThrow('Invalid email format');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws "email is required" for an empty email and never calls the Edge Function', async () => {
    await expect(
      adminService.createUser({
        name: 'Jane Doe',
        email: '',
        role: 'staff',
      }),
    ).rejects.toThrow('email is required');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws "email is required" for a whitespace-only email', async () => {
    await expect(
      adminService.createUser({
        name: 'Jane Doe',
        email: '   ',
        role: 'staff',
      }),
    ).rejects.toThrow('email is required');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an email missing the TLD', async () => {
    await expect(
      adminService.createUser({
        name: 'Jane Doe',
        email: 'user@example',
        role: 'staff',
      }),
    ).rejects.toThrow('Invalid email format');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an email with consecutive dots', async () => {
    await expect(
      adminService.createUser({
        name: 'Jane Doe',
        email: 'user..name@example.com',
        role: 'staff',
      }),
    ).rejects.toThrow('Invalid email format');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proceeds to the Edge Function for a valid email (test@example.com)', async () => {
    mockSuccessfulCreateUser('auth-user-1', {
      id: 'auth-user-1',
      name: 'Jane Doe',
      email: 'test@example.com',
      role: 'STAFF',
      status: 'INVITED',
      permissions: [],
      companies: { id: 'company-123', name: 'Acme' },
    });

    const user = await adminService.createUser({
      name: 'Jane Doe',
      email: 'test@example.com',
      role: 'staff',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(user.email).toBe('test@example.com');
  });

  it('proceeds to the Edge Function for a valid email with subdomain', async () => {
    mockSuccessfulCreateUser('auth-user-2', {
      id: 'auth-user-2',
      name: 'Jane Doe',
      email: 'user@sub.domain.com',
      role: 'STAFF',
      status: 'INVITED',
      permissions: [],
      companies: { id: 'company-123', name: 'Acme' },
    });

    const user = await adminService.createUser({
      name: 'Jane Doe',
      email: 'user@sub.domain.com',
      role: 'staff',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(user.email).toBe('user@sub.domain.com');
  });

  it('proceeds to the Edge Function for a valid email with a plus alias', async () => {
    mockSuccessfulCreateUser('auth-user-3', {
      id: 'auth-user-3',
      name: 'Jane Doe',
      email: 'user+test@example.com',
      role: 'STAFF',
      status: 'INVITED',
      permissions: [],
      companies: { id: 'company-123', name: 'Acme' },
    });

    const user = await adminService.createUser({
      name: 'Jane Doe',
      email: 'user+test@example.com',
      role: 'staff',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(user.email).toBe('user+test@example.com');
  });

  it('creates a user successfully with sourabh@example.com (regression)', async () => {
    mockSuccessfulCreateUser('auth-user-sourabh', {
      id: 'auth-user-sourabh',
      name: 'Sourabh',
      email: 'sourabh@example.com',
      role: 'STAFF',
      status: 'INVITED',
      permissions: [],
      companies: { id: 'company-123', name: 'Acme' },
    });

    const user = await adminService.createUser({
      name: 'Sourabh',
      email: 'sourabh@example.com',
      role: 'staff',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(user.email).toBe('sourabh@example.com');
    expect(user.name).toBe('Sourabh');
  });

  // ---------------------------------------------------------------------
  // Task point 8: the schema must accept these exact RFC-compliant emails.
  // ---------------------------------------------------------------------
  describe('accepts the exact RFC-compliant emails required by the task', () => {
    const validEmails = [
      'john@example.com',
      'john2@example.com',
      'john.smith@example.com',
      'john+test@example.co.uk',
      'user_123@test.io',
    ];

    validEmails.forEach((email) => {
      it(`creates a user successfully with ${email}`, async () => {
        mockSuccessfulCreateUser(`auth-${email}`, {
          id: `auth-${email}`,
          name: 'John',
          email,
          role: 'STAFF',
          status: 'INVITED',
          permissions: [],
          companies: { id: 'company-123', name: 'Acme' },
        });

        const user = await adminService.createUser({
          name: 'John',
          email,
          role: 'staff',
        });

        // The email passed to the Edge Function must be the exact value (trimmed).
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const fetchBody = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(fetchBody.email).toBe(email);
        expect(user.email).toBe(email);
      });
    });
  });

  // ---------------------------------------------------------------------
  // Task point 9: duplicate emails must produce "Email already exists".
  // ---------------------------------------------------------------------
  describe('duplicate email handling', () => {
    it('throws "Email already exists" when a user with the email already exists (pre-check)', async () => {
      // Simulate the duplicate-check finding an existing row.
      duplicateCheckMock.mockResolvedValue({
        data: { id: 'existing-user-id' },
      });

      await expect(
        adminService.createUser({
          name: 'Jane Doe',
          email: 'john1@example.com',
          role: 'staff',
        }),
      ).rejects.toThrow('Email already exists');

      // Must never reach the Edge Function when the email is a duplicate.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws "User already exists. Please reuse or reset password." when the Edge Function reports the email is already registered', async () => {
      duplicateCheckMock.mockResolvedValue({ data: null });
      getSessionMock.mockResolvedValue({
        data: { session: { access_token: 'test-access-token' } },
      });
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Email already exists' }),
      });

      await expect(
        adminService.createUser({
          name: 'Jane Doe',
          email: 'john1@example.com',
          role: 'staff',
        }),
      ).rejects.toThrow('User already exists. Please reuse or reset password.');
    });

    it('throws "Email already exists" when the profile insert hits the unique constraint (race condition)', async () => {
      duplicateCheckMock.mockResolvedValue({ data: null });
      getSessionMock.mockResolvedValue({
        data: { session: { access_token: 'test-access-token' } },
      });
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ userId: 'auth-user-race' }),
      });
      // Simulate the UNIQUE(companyId, email) constraint firing on insert.
      insertMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'duplicate key value violates unique constraint "users_companyId_email_key"' },
          }),
        }),
      });

      await expect(
        adminService.createUser({
          name: 'Jane Doe',
          email: 'john1@example.com',
          role: 'staff',
        }),
      ).rejects.toThrow('Email already exists');
    });
  });

  // ---------------------------------------------------------------------
  // Task point 9: invalid emails are still rejected.
  // ---------------------------------------------------------------------
  describe('still rejects invalid emails', () => {
    const invalidEmails = ['abc', 'john@', '@example.com'];

    invalidEmails.forEach((email) => {
      it(`rejects ${email} before calling the Edge Function`, async () => {
        await expect(
          adminService.createUser({
            name: 'Jane Doe',
            email,
            role: 'staff',
          }),
        ).rejects.toThrow();

        expect(fetchMock).not.toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------
  // Whitespace handling: surrounding whitespace must not cause a mismatch
  // between the duplicate-check, the Edge Function and the profile insert.
  // ---------------------------------------------------------------------
  it('trims surrounding whitespace before checking duplicates and calling the Edge Function', async () => {
    mockSuccessfulCreateUser('auth-user-trim', {
      id: 'auth-user-trim',
      name: 'John',
      email: 'john1@example.com',
      role: 'STAFF',
      status: 'INVITED',
      permissions: [],
      companies: { id: 'company-123', name: 'Acme' },
    });

    const user = await adminService.createUser({
      name: 'John',
      email: '  john1@example.com  ',
      role: 'staff',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The trimmed value is what should reach the Edge Function.
    const fetchBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchBody.email).toBe('john1@example.com');
    expect(user.email).toBe('john1@example.com');
  });
});
