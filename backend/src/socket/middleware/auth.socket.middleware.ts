import { Socket } from 'socket.io';
import { verifyAccessToken, extractBearerToken } from '../../utils/jwt';
import { userRepository } from '../../repositories/user.repository';
import logger from '../../utils/logger';

interface SocketUser {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  permissions: string[];
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      socket.handshake.query.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    const payload = verifyAccessToken(token);

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new Error('Account is not active'));
    }

    socket.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
      permissions: payload.permissions || [],
    };

    logger.debug('Socket authenticated', {
      socketId: socket.id,
      userId: payload.userId,
      companyId: payload.companyId,
    });

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    logger.warn('Socket authentication failed', { error: message });
    next(new Error(message));
  }
}
