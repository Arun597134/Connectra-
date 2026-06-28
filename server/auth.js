import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbRun, dbGet, dbAll } from './db.js';

const router = express.Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'secure-chat-secret-key-12345';

// Middleware to authenticate JWT
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password, inviteToken } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields (username, email, phone, password) are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    let userResult;
    try {
      userResult = await dbRun(
        `INSERT INTO users (username, email, phone, password_hash) 
         VALUES (?, ?, ?, ?)`,
        [username, email, phone, passwordHash]
      );
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        if (err.message.includes('users.username')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        if (err.message.includes('users.email')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        if (err.message.includes('users.phone')) {
          return res.status(400).json({ error: 'Phone number already registered' });
        }
        return res.status(400).json({ error: 'Username, email, or phone number already exists' });
      }
      throw err;
    }

    const newUserId = userResult.lastID;

    // Handle invitation if token is provided
    if (inviteToken) {
      const invite = await dbGet('SELECT * FROM invitations WHERE token = ? AND is_used = 0', [inviteToken]);
      if (invite) {
        const creatorId = invite.creator_id;
        if (creatorId !== newUserId) {
          const firstId = Math.min(creatorId, newUserId);
          const secondId = Math.max(creatorId, newUserId);
          
          try {
            await dbRun(
              'INSERT OR IGNORE INTO contacts (user_id_1, user_id_2) VALUES (?, ?)',
              [firstId, secondId]
            );
          } catch (e) {
            console.error('Failed to link contact via invite:', e);
          }
        }
      }
    }

    const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: newUserId, username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username/Mobile and password are required' });
    }

    const user = await dbGet('SELECT * FROM users WHERE username = ? OR phone = ?', [loginId, loginId]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(400).json({ error: 'Invalid username/mobile or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      about: user.about,
      profile_picture: user.profile_picture,
      custom_wallpaper: user.custom_wallpaper
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get User Profile or Public Keys of Contacts
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await dbAll(
      `SELECT u.id, u.username, u.email, u.phone, u.about, u.profile_picture, u.custom_wallpaper, u.last_seen,
              (SELECT COUNT(*) FROM blocked_users WHERE user_id = ? AND blocked_id = u.id) as is_blocked,
              (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count,
              (SELECT content FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT media_type FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message_type,
              (SELECT created_at FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM pinned_contacts WHERE user_id = ? AND contact_id = u.id) as is_pinned
       FROM users u
       JOIN contacts c ON (c.user_id_1 = u.id OR c.user_id_2 = u.id)
       WHERE (c.user_id_1 = ? OR c.user_id_2 = ?) AND u.id != ?
       ORDER BY is_pinned DESC, last_message_time DESC NULLS LAST`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );

    // Dynamic injection of the AI Assistant bot
    const lastAiMsgRow = await dbGet(
      `SELECT content, media_type, created_at FROM messages 
       WHERE (sender_id = 0 AND receiver_id = ?) OR (sender_id = ? AND receiver_id = 0) 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, userId]
    );

    const isAiPinnedRow = await dbGet(
      `SELECT COUNT(*) as count FROM pinned_contacts WHERE user_id = ? AND contact_id = 0`,
      [userId]
    );

    const aiContact = {
      id: 0,
      username: "AI_Assistant",
      email: "ai@assistant.local",
      phone: "0000000000",
      about: "AI Assistant · Online",
      profile_picture: "ai_avatar.png",
      custom_wallpaper: null,
      last_seen: "Online",
      is_blocked: 0,
      unread_count: 0,
      last_message: lastAiMsgRow ? lastAiMsgRow.content : "Hello! I am your AI assistant. How can I help you today?",
      last_message_type: lastAiMsgRow ? lastAiMsgRow.media_type : "text",
      last_message_time: lastAiMsgRow ? lastAiMsgRow.created_at : "2026-06-25T00:00:00.000Z",
      is_pinned: isAiPinnedRow ? isAiPinnedRow.count : 0
    };

    contacts.push(aiContact);

    // Re-sort the final contacts array
    contacts.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
      const timeA = new Date(a.last_message_time || 0).getTime();
      const timeB = new Date(b.last_message_time || 0).getTime();
      return timeB - timeA;
    });

    res.json(contacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// Search users
router.get('/search-users', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const users = await dbAll(
      'SELECT id, username, email, phone FROM users WHERE (username LIKE ? OR phone LIKE ?) AND id != ? LIMIT 10',
      [`%${query}%`, `%${query}%`, req.user.id]
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Add contact manually
router.post('/add-contact', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId || contactId === userId) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    const firstId = Math.min(userId, contactId);
    const secondId = Math.max(userId, contactId);

    await dbRun(
      'INSERT OR IGNORE INTO contacts (user_id_1, user_id_2) VALUES (?, ?)',
      [firstId, secondId]
    );

    const contactUser = await dbGet('SELECT id, username, email, phone FROM users WHERE id = ?', [contactId]);
    res.json(contactUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// Block user
router.post('/block', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId || contactId === userId) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    await dbRun(
      'INSERT OR IGNORE INTO blocked_users (user_id, blocked_id) VALUES (?, ?)',
      [userId, contactId]
    );

    res.json({ success: true, contactId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to block contact' });
  }
});

// Unblock user
router.post('/unblock', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    await dbRun(
      'DELETE FROM blocked_users WHERE user_id = ? AND blocked_id = ?',
      [userId, contactId]
    );

    res.json({ success: true, contactId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unblock contact' });
  }
});

// Get blocked users list
router.get('/blocked-list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const blockedList = await dbAll(
      `SELECT u.id, u.username, u.email, u.phone 
       FROM users u
       JOIN blocked_users b ON b.blocked_id = u.id
       WHERE b.user_id = ?`,
      [userId]
    );
    res.json(blockedList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve blocked list' });
  }
});

// Get current user profile details
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, username, email, phone, about, profile_picture, custom_wallpaper FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Update current user profile details
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { about, profile_picture, custom_wallpaper } = req.body;
    const userId = req.user.id;

    const updates = [];
    const params = [];

    if (about !== undefined) {
      updates.push('about = ?');
      params.push(about);
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      params.push(profile_picture);
    }
    if (custom_wallpaper !== undefined) {
      updates.push('custom_wallpaper = ?');
      params.push(custom_wallpaper);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    params.push(userId);
    await dbRun(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedUser = await dbGet(
      'SELECT id, username, email, phone, about, profile_picture, custom_wallpaper FROM users WHERE id = ?',
      [userId]
    );
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Fetch public profile details of a user
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await dbGet(
      'SELECT id, username, phone, email, about, profile_picture FROM users WHERE id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});
// Pin contact
router.post('/contacts/pin', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;
    if (!contactId) return res.status(400).json({ error: 'Contact ID required' });
    
    await dbRun(
      'INSERT OR IGNORE INTO pinned_contacts (user_id, contact_id) VALUES (?, ?)',
      [userId, contactId]
    );
    res.json({ success: true, contactId });
  } catch (error) {
    console.error('Failed to pin contact:', error);
    res.status(500).json({ error: 'Failed to pin contact' });
  }
});

// Unpin contact
router.post('/contacts/unpin', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;
    if (!contactId) return res.status(400).json({ error: 'Contact ID required' });
    
    await dbRun(
      'DELETE FROM pinned_contacts WHERE user_id = ? AND contact_id = ?',
      [userId, contactId]
    );
    res.json({ success: true, contactId });
  } catch (error) {
    console.error('Failed to unpin contact:', error);
    res.status(500).json({ error: 'Failed to unpin contact' });
  }
});

// Schedule message
router.post('/messages/schedule', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, mediaType, mediaName, scheduledFor } = req.body;
    const userId = req.user.id;
    
    if (!receiverId || !content || !scheduledFor) {
      return res.status(400).json({ error: 'Receiver ID, message content, and schedule time are required' });
    }
    
    const schedDate = new Date(scheduledFor);
    if (isNaN(schedDate.getTime()) || schedDate.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Schedule time must be in the future' });
    }
    
    await dbRun(
      `INSERT INTO scheduled_messages (sender_id, receiver_id, content, media_type, media_name, scheduled_for) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, receiverId, content, mediaType || 'text', mediaName || null, schedDate.toISOString()]
    );
    
    res.json({ success: true, scheduledFor: schedDate.toISOString() });
  } catch (error) {
    console.error('Failed to schedule message:', error);
    res.status(500).json({ error: 'Failed to schedule message' });
  }
});
export default router;
