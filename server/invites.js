import express from 'express';
import crypto from 'crypto';
import { dbRun, dbGet } from './db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Generate invitation token
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    await dbRun(
      'INSERT INTO invitations (token, creator_id) VALUES (?, ?)',
      [token, req.user.id]
    );
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Validate token and get inviter info
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await dbGet(
      `SELECT i.*, u.username FROM invitations i
       JOIN users u ON u.id = i.creator_id
       WHERE i.token = ? AND i.is_used = 0`,
      [token]
    );
    
    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invitation link' });
    }
    
    res.json({ valid: true, inviter: invite.username, creator_id: invite.creator_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

export default router;
