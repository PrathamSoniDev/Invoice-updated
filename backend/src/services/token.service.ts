import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  hashToken,
  getTokenExpiry,
  AccessTokenPayload,
} from '../utils/jwt';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { sessionRepository } from '../repositories/session.repository';
import { userRepository } from '../repositories/user.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  permissions: string[];
}

class TokenService {
  async createTokenPair(payload: TokenPayload, rememberMe = false): Promise<TokenPair> {
    const accessTokenPayload: AccessTokenPayload = {
      userId: payload.userId,
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
      permissions: payload.permissions,
    };

    const tokens = generateTokenPair(accessTokenPayload, rememberMe);

    const refreshTokenHash = hashToken(tokens.refreshToken);
    const expiresAt = getTokenExpiry(rememberMe);

    await refreshTokenRepository.create({
      userId: payload.userId,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async refreshAccessToken(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<TokenPair> {
    const refreshTokenHash = hashToken(refreshToken);
    const storedToken = await refreshTokenRepository.findByTokenHash(refreshTokenHash);

    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await refreshTokenRepository.revokeWithReplacement(refreshTokenHash, newRefreshTokenHash);

    const expiresAt = getTokenExpiry(false);
    await refreshTokenRepository.create({
      userId: storedToken.userId,
      tokenHash: newRefreshTokenHash,
      expiresAt,
    });

    const userPayload = await this.getUserPayload(storedToken.userId);
    if (!userPayload) {
      throw new Error('User not found');
    }

    const accessTokenPayload: AccessTokenPayload = {
      userId: userPayload.userId,
      id: userPayload.userId,
      email: userPayload.email,
      role: userPayload.role,
      companyId: userPayload.companyId,
      permissions: userPayload.permissions,
    };

    const accessToken = generateAccessToken(accessTokenPayload);

    if (userAgent || ipAddress) {
      const sessionTokenHash = hashToken(accessToken);
      await sessionRepository.create({
        userId: storedToken.userId,
        tokenHash: sessionTokenHash,
        userAgent: userAgent || undefined,
        ipAddress: ipAddress || undefined,
        expiresAt: getTokenExpiry(false),
      });
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const refreshTokenHash = hashToken(refreshToken);
    await refreshTokenRepository.revoke(refreshTokenHash);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
    await sessionRepository.deleteByUserId(userId);
  }

  private async getUserPayload(userId: string): Promise<TokenPayload | null> {
    const user = await userRepository.findByIdWithPermissions(userId);
    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
    };
  }
}

export const tokenService = new TokenService();
