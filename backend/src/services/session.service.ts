import { sessionRepository } from '../repositories/session.repository';
import { hashToken } from '../utils/jwt';

class SessionService {
  async createSession(data: {
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    deviceId?: string;
    expiresAt: Date;
  }): Promise<void> {
    await sessionRepository.create(data);
  }

  async validateSession(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const session = await sessionRepository.findByTokenHash(tokenHash);
    return session !== null;
  }

  async updateActivity(sessionId: string): Promise<void> {
    await sessionRepository.updateActivity(sessionId);
  }

  async getUserSessions(userId: string) {
    return sessionRepository.findByUserId(userId);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const sessions = await sessionRepository.findByUserId(userId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      await sessionRepository.deleteById(sessionId);
    }
  }

  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await sessionRepository.deleteByUserId(userId, currentSessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await sessionRepository.deleteByUserId(userId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    return sessionRepository.deleteExpired();
  }

  async getSessionCount(userId: string): Promise<number> {
    return sessionRepository.countUserSessions(userId);
  }
}

export const sessionService = new SessionService();
