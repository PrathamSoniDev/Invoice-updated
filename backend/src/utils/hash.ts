import bcrypt from 'bcryptjs';
import config from '../config';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.security.bcryptSaltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateRandomToken(bytes: number = 32): Promise<string> {
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    crypto.randomBytes(bytes, (err, buf) => {
      if (err) reject(err);
      else resolve(buf);
    });
  });
  return buffer.toString('hex');
}

import crypto from 'crypto';
