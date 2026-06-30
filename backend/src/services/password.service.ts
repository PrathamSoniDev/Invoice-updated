import { hashPassword, verifyPassword, generateRandomToken } from '../utils/hash';
import { userRepository } from '../repositories/user.repository';
import { passwordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { AppError, ErrorCodes } from '../utils/error';
import config from '../config';

class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    const isValid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, ErrorCodes.INVALID_PASSWORD);
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await userRepository.updatePassword(userId, hashedPassword);
  }

  async initiatePasswordReset(email: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return { token: '', expiresAt: new Date() };
    }

    const token = await generateRandomToken(32);
    const expiresAt = new Date(Date.now() + config.security.passwordResetExpiry);

    await passwordResetTokenRepository.deleteByUserId(user.id);
    await passwordResetTokenRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async validateResetToken(token: string, email: string): Promise<string | null> {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;

    const resetToken = await passwordResetTokenRepository.findByToken(token);
    if (!resetToken) return null;

    return resetToken.userId;
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<void> {
    const userId = await this.validateResetToken(token, email);
    if (!userId) {
      throw new AppError('Invalid or expired reset token', 400, ErrorCodes.INVALID_TOKEN);
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await userRepository.updatePassword(userId, hashedPassword);
    await passwordResetTokenRepository.deleteByUserId(userId);
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async validatePasswordStrength(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const passwordService = new PasswordService();
