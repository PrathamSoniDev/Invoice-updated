import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { success, created } from '../utils/response';
import process from 'process';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;
      const userAgent = req.headers['user-agent'] || undefined;
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;

      const result = await authService.login(email, password, userAgent, ipAddress, rememberMe);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json(created(result));
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.['refreshToken'] || req.body.refreshToken;
      const userId = req.user!.userId;

      await authService.logout(refreshToken, userId);

      res.clearCookie('refreshToken');
      res.status(200).json(success({ message: 'Logged out successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      await authService.logoutAll(userId);

      res.clearCookie('refreshToken');
      res.status(200).json(success({ message: 'All sessions revoked successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.['refreshToken'] || req.body.refreshToken;
      const userAgent = req.headers['user-agent'] || undefined;
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;

      const result = await authService.refreshTokens(refreshToken, userAgent, ipAddress);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await authService.getProfile(userId);
      res.status(200).json(success(profile));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await authService.updateProfile(userId, req.body);
      res.status(200).json(success(profile));
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json(success({ message: 'Password changed successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, email, newPassword } = req.body;

      await authService.resetPassword(token, email, newPassword);

      res.status(200).json(success({ message: 'Password reset successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sessions = await authService.getSessions(userId);
      res.status(200).json(success(sessions));
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sessionId = req.params.sessionId || '';

      await authService.revokeSession(userId, sessionId);

      res.status(200).json(success({ message: 'Session revoked successfully' }));
    } catch (error) {
      next(error);
    }
  }

  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await authService.getProfile(userId);
      res.status(200).json(success({ valid: true, user: profile }));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
