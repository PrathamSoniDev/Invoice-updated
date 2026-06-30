import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateWithRefine } from '../middleware/validation.middleware';
import { loginRateLimiter, passwordResetRateLimiter, generalRateLimiter } from '../middleware/rate-limit.middleware';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from '../validators/auth.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/register',
  generalRateLimiter,
  validateBody(registerSchema),
  authController.register.bind(authController)
);

router.post(
  '/logout',
  authMiddleware,
  authController.logout.bind(authController)
);

router.post(
  '/logout-all',
  authMiddleware,
  authController.logoutAll.bind(authController)
);

router.post(
  '/refresh',
  generalRateLimiter,
  validateBody(refreshTokenSchema),
  authController.refresh.bind(authController)
);

router.get(
  '/me',
  authMiddleware,
  authController.getProfile.bind(authController)
);

router.patch(
  '/me',
  authMiddleware,
  validateBody(updateProfileSchema),
  authController.updateProfile.bind(authController)
);

router.post(
  '/change-password',
  authMiddleware,
  validateWithRefine(changePasswordSchema),
  authController.changePassword.bind(authController)
);

router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword.bind(authController)
);

router.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateWithRefine(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

router.get(
  '/sessions',
  authMiddleware,
  authController.getSessions.bind(authController)
);

router.delete(
  '/sessions/:sessionId',
  authMiddleware,
  validateParams(idParamSchema),
  authController.revokeSession.bind(authController)
);

router.get(
  '/verify',
  authMiddleware,
  authController.verifyToken.bind(authController)
);

export default router;
