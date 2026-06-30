import { userRepository } from '../repositories/user.repository';
import { tokenService } from './token.service';
import { sessionService } from './session.service';
import { passwordService } from './password.service';
import { hashToken } from '../utils/jwt';
import { AppError, ErrorCodes } from '../utils/error';
import config from '../config';
import prisma from '../config/database';

interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  companyName: string;
  companyGST?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyPincode?: string;
}

class AuthService {
  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string,
    rememberMe = false
  ): Promise<LoginResult> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 403, ErrorCodes.ACCOUNT_SUSPENDED);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
        423,
        ErrorCodes.ACCOUNT_LOCKED
      );
    }

    const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await userRepository.incrementFailedLogin(user.id);

      if (user.failedLoginCount + 1 >= config.security.maxLoginAttempts) {
        const lockUntil = new Date(Date.now() + config.security.lockoutDuration);
        await userRepository.lockAccount(user.id, lockUntil);
        throw new AppError(
          'Account locked due to too many failed attempts.',
          423,
          ErrorCodes.ACCOUNT_LOCKED
        );
      }

      throw new AppError('Invalid email or password', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    await userRepository.updateLastLogin(user.id);

    const userPermissions = Array.isArray(user.permissions) ? user.permissions as string[] : [];

    const tokenPair = await tokenService.createTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        permissions: userPermissions,
      },
      rememberMe
    );

    if (userAgent || ipAddress) {
      await sessionService.createSession({
        userId: user.id,
        tokenHash: hashToken(tokenPair.accessToken),
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        permissions: userPermissions,
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };
  }

  async register(data: RegisterData): Promise<LoginResult> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email already registered', 409, ErrorCodes.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = await passwordService.hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          legalName: data.companyName,
          gstNumber: data.companyGST,
          phone: data.companyPhone,
          email: data.email,
          addressLine1: data.companyAddress || '',
          city: data.companyCity || '',
          state: data.companyState || '',
          pincode: data.companyPincode || '',
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          name: data.name,
          phone: data.phone,
          role: 'ADMIN',
          companyId: company.id,
          status: 'ACTIVE',
          emailVerified: false,
          permissions: [],
        },
      });

      return { user, company };
    });

    const resultPermissions = Array.isArray(result.user.permissions) ? result.user.permissions as string[] : [];

    const tokenPair = await tokenService.createTokenPair(
      {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        companyId: result.company.id,
        permissions: resultPermissions,
      },
      false
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        companyId: result.company.id,
        permissions: resultPermissions,
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    await tokenService.revokeRefreshToken(refreshToken);
    await sessionService.revokeAllSessions(userId);
  }

  async logoutAll(userId: string): Promise<void> {
    await tokenService.revokeAllUserTokens(userId);
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    return tokenService.refreshAccessToken(refreshToken, userAgent, ipAddress);
  }

  async getProfile(userId: string) {
    const user = await userRepository.findByIdWithCompany(userId);
    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }
    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatar?: string }
  ) {
    return userRepository.update(userId, data);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await passwordService.changePassword(userId, currentPassword, newPassword);
    await tokenService.revokeAllUserTokens(userId);
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const result = await passwordService.initiatePasswordReset(email);

    if (!result.token) {
      return {
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      };
    }

    return {
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    };
  }

  async resetPassword(
    token: string,
    email: string,
    newPassword: string
  ): Promise<void> {
    await passwordService.resetPassword(token, email, newPassword);
  }

  async getSessions(userId: string) {
    return sessionService.getUserSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await sessionService.revokeSession(sessionId, userId);
  }
}

export const authService = new AuthService();
