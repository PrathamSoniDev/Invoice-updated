// Express router for user-account-related endpoints (currently: sending an
// invite email after an admin creates a new user).

import { Router } from 'express';
import { sendInviteEmail } from '../services/emailService.js';

const router = Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

router.post('/send-invite', async (req, res) => {
  try {
    const { email, name, companyName } = req.body ?? {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    const result = await sendInviteEmail({
      to: email.trim(),
      name: String(name || '').trim(),
      companyName: String(companyName || '').trim(),
      loginUrl,
    });

    return res.status(200).json({ success: true, message: 'Invite sent', messageId: result?.id });
  } catch (error) {
    console.error('[userRoutes] POST /send-invite failed:', error.message);
    const status = error.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to send invite email.' });
  }
});

export default router;
