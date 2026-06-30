import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import invoiceRoutes from './invoice.routes';
import paymentRoutes from './payment.routes';
import dashboardRoutes from './dashboard.routes';
import reportsRoutes from './reports.routes';
import exportRoutes from './export.routes';
import analyticsRoutes from './analytics.routes';
import settingsRoutes from './settings.routes';
import communicationRoutes from './communication.routes';
import integrationRoutes from './integration.routes';
import templateRoutes from './template.routes';
import adminRoutes from './admin.routes';
import config from '../config';
import prisma from '../config/database';
import { redisClient } from '../config/redis';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.app.env,
    },
  });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redisClient.ping();

    res.status(200).json({
      success: true,
      data: {
        status: 'ready',
        services: {
          database: 'connected',
          redis: 'connected',
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);
router.use('/exports', exportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/communication', communicationRoutes);
router.use('/integrations', integrationRoutes);
router.use('/templates', templateRoutes);
router.use('/admin', adminRoutes);

export default router;
