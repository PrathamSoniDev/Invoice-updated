import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { socketAuthMiddleware } from './middleware/auth.socket.middleware';
import { setupConnectionHandlers } from './handlers/connection.handler';

let io: Server | null = null;

export function initializeSocketIO(httpServer: HttpServer): Server {
  if (io) {
    return io;
  }

  const pubClient = redisClient;
  const subClient = pubClient.duplicate();

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    setupConnectionHandlers(io!, socket);
  });

  logger.info('Socket.IO initialized');

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function emitToCompany<T>(companyId: string, event: string, data: T): void {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
}

export function emitToUser<T>(userId: string, event: string, data: T): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToAll<T>(event: string, data: T): void {
  if (io) {
    io.emit(event, data);
  }
}

export async function closeSocketIO(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        logger.info('Socket.IO closed');
        resolve();
      });
    });
    io = null;
  }
}
