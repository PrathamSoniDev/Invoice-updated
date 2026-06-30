import { Server, Socket } from 'socket.io';
import logger from '../../utils/logger';

export function setupConnectionHandlers(io: Server, socket: Socket): void {
  const user = socket.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  socket.join(`company:${user.companyId}`);
  socket.join(`user:${user.userId}`);

  if (user.role === 'ADMIN') {
    socket.join(`admin:${user.companyId}`);
  }

  logger.info('Client connected', {
    socketId: socket.id,
    userId: user.userId,
    companyId: user.companyId,
  });

  socket.on('join-room', (room: string) => {
    if (room.startsWith(`invoice:`) || room.startsWith(`customer:`) || room.startsWith(`payment:`)) {
      socket.join(room);
      logger.debug('Socket joined room', { socketId: socket.id, room });
    }
  });

  socket.on('leave-room', (room: string) => {
    socket.leave(room);
    logger.debug('Socket left room', { socketId: socket.id, room });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: user.userId,
      reason,
    });

    socket.leave(`company:${user.companyId}`);
    socket.leave(`user:${user.userId}`);

    if (user.role === 'ADMIN') {
      socket.leave(`admin:${user.companyId}`);
    }
  });

  socket.on('error', (error) => {
    logger.error('Socket error', {
      socketId: socket.id,
      userId: user.userId,
      error: error.message || error,
    });
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.emit('connected', {
    message: 'Successfully connected to InvoiceGen',
    userId: user.userId,
    companyId: user.companyId,
  });
}

export function setupNotificationHandler(socket: Socket): void {
  socket.on('subscribe-notifications', () => {
    if (socket.user) {
      socket.join(`notifications:${socket.user.userId}`);
    }
  });

  socket.on('unsubscribe-notifications', () => {
    if (socket.user) {
      socket.leave(`notifications:${socket.user.userId}`);
    }
  });
}

export function setupActivityHandler(io: Server, socket: Socket): void {
  socket.on('typing-start', (data: { resource: string; resourceId: string }) => {
    if (socket.user) {
      socket.to(`${data.resource}:${data.resourceId}`).emit('user-typing', {
        userId: socket.user.userId,
        userName: socket.user.email,
        resource: data.resource,
        resourceId: data.resourceId,
      });
    }
  });

  socket.on('typing-stop', (data: { resource: string; resourceId: string }) => {
    if (socket.user) {
      socket.to(`${data.resource}:${data.resourceId}`).emit('user-stopped-typing', {
        userId: socket.user.userId,
        resource: data.resource,
        resourceId: data.resourceId,
      });
    }
  });
}
