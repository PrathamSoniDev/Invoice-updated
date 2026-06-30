import { PrismaClient } from '@prisma/client';
import config from './index';

const prisma = new PrismaClient({
  log: config.app.env === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: 'pretty',
});

export default prisma;

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('✓ Database disconnected');
}
