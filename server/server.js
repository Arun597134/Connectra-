import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { dbAll, dbRun, dbGet } from './db.js';
import authRouter, { authenticateToken, JWT_SECRET } from './auth.js';
import uploadRouter from './upload.js';
import invitesRouter from './invites.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// REST Routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/invites', invitesRouter);

// --- AI Chatbot Response Engine ---
function getAiResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  if (msg.includes('hello') || msg.includes('hi ') || msg === 'hi') {
    return "Hello there! 👋 I am your built-in AI Assistant. How can I help you today?";
  }
  if (msg.includes('help')) {
    return "I can help you with multiple tasks! You can ask me to write code, solve math problems, explain concepts, or translate phrases. Just type away!";
  }
  if (msg.includes('weather')) {
    return "I don't have access to real-time weather sensors, but I hope it's sunny and bright wherever you are! ☀️";
  }
  if (msg.includes('time')) {
    return `The current server time is ${new Date().toLocaleTimeString()}. ⏰`;
  }
  if (msg.includes('joke')) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything! ⚛️",
      "Why did the computer go to the doctor? Because it had a virus! 💻",
      "How many programmers does it take to change a light bulb? None, that's a hardware problem! 🔌",
      "What do you call a fake noodle? An impasta! 🍝"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (msg.includes('game') || msg.includes('play')) {
    return "I love games! You can invite your human contacts to play Tic-Tac-Toe or Connect Four from the options menu (⋮) in the chat header! 🎮";
  }
  if (msg.includes('thank')) {
    return "You are very welcome! Let me know if you need anything else. 😊";
  }
  
  return `I hear you! You said: "${userMessage}". As your secure chat assistant, I'm here to help. Is there anything specific you would like to explore or do? 🚀`;
}

// --- Chat History Summarizer Helper ---
function summarizeChatMessages(messages, myUsername, peerUsername) {
  if (!messages || messages.length === 0) {
    return "No messages found in this chat history.";
  }
  
  let countMine = 0;
  let countPeer = 0;
  const keywords = [];
  
  messages.forEach(m => {
    if (m.sender_id === 0 || m.receiver_id === 0) {
      if (!keywords.includes("AI Assistant Queries")) keywords.push("AI Assistant Queries");
    }
    const text = m.content.toLowerCase();
    if (text.includes('meet') || text.includes('schedule') || text.includes('tomorrow') || text.includes('time')) {
      if (!keywords.includes('Scheduling & Coordination')) keywords.push('Scheduling & Coordination');
    }
    if (text.includes('game') || text.includes('play') || text.includes('tic-tac-toe') || text.includes('connect four')) {
      if (!keywords.includes('Gaming sessions')) keywords.push('Gaming sessions');
    }
    if (text.includes('code') || text.includes('bug') || text.includes('test') || text.includes('error') || text.includes('run')) {
      if (!keywords.includes('Development / Coding tasks')) keywords.push('Development / Coding tasks');
    }
    if (text.includes('image') || text.includes('photo') || text.includes('pdf') || text.includes('doc') || text.includes('file')) {
      if (!keywords.includes('Media sharing')) keywords.push('Media sharing');
    }
    if (text.includes('love') || text.includes('heart') || text.includes('react') || text.includes('smile')) {
      if (!keywords.includes('Social chatter')) keywords.push('Social chatter');
    }
  });
  
  if (keywords.length === 0) {
    keywords.push('General conversation and checking in');
  }
  
  const summary = [
    `📊 **Chat Statistics:**`,
    `  • Total messages analyzed: ${messages.length}`,
    `  • Active participants: @${myUsername} and @${peerUsername}`,
    `🔍 **Key Topics Discussed:**`,
    ...keywords.map(kw => `  • ${kw}`),
    `💡 **AI Analysis:**`,
    `  • The conversation is healthy with active participation.`,
    `  • Recommendation: Keep up the collaborative work!`
  ];
  
  return summary.join('\n');
}

// REST Endpoints for AI Summarizer & Translator
app.post('/api/ai/summarize', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.body;
    
    // Fetch last 20 messages between user and contact
    const messages = await dbAll(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?) 
       ORDER BY created_at DESC LIMIT 20`,
      [userId, contactId, contactId, userId]
    );

    // Fetch usernames
    const userRow = await dbGet('SELECT username FROM users WHERE id = ?', [userId]);
    const contactRow = await dbGet('SELECT username FROM users WHERE id = ?', [contactId]);
    
    // Reverse messages to chronological order
    messages.reverse();
    
    const summary = summarizeChatMessages(
      messages, 
      userRow ? userRow.username : 'User', 
      contactRow ? contactRow.username : 'Contact'
    );
    
    res.json({ summary });
  } catch (err) {
    console.error('Failed to summarize chat:', err);
    res.status(500).json({ error: 'Failed to summarize conversation' });
  }
});

app.post('/api/translate', authenticateToken, async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const lang = targetLang || 'es';
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      res.json({ translatedText: data.responseData.translatedText });
    } else {
      res.json({ translatedText: `${text} [Translated to ${lang.toUpperCase()}]` });
    }
  } catch (err) {
    console.error('Translation error:', err);
    res.json({ translatedText: `${req.body.text} [Translation Failed]` });
  }
});
// Publish a new status story (with optional mentions and parentId)
app.post('/api/statuses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const { content, mediaType, mentions, parentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Format mentions as a comma-separated list of IDs like ,2,3,
    let mentionsStr = null;
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      mentionsStr = `,${mentions.map(Number).join(',')},`;
    }
    
    const created_at = new Date().toISOString();
    const parent = parentId ? parseInt(parentId) : null;
    
    const result = await dbRun(
      `INSERT INTO statuses (user_id, username, content, media_type, mentions, created_at, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, content, mediaType || 'text', mentionsStr, created_at, parent]
    );
    
    const newStatus = {
      id: result.lastID,
      user_id: userId,
      username,
      content,
      media_type: mediaType || 'text',
      mentions: mentionsStr,
      created_at,
      parent_id: parent
    };

    // Send Instagram-style DM notifications to all mentioned friends
    if (mentions && Array.isArray(mentions)) {
      for (const mId of mentions) {
        const targetId = Number(mId);
        if (!isNaN(targetId) && targetId !== userId) {
          const mentionMsgContent = JSON.stringify({
            statusId: result.lastID,
            content: content,
            mediaType: mediaType || 'text',
            senderUsername: username
          });
          
          const msgResult = await dbRun(
            `INSERT INTO messages (sender_id, receiver_id, content, media_type, created_at) 
             VALUES (?, ?, ?, 'status_mention', ?)`,
            [userId, targetId, mentionMsgContent, created_at]
          );
          
          const messagePayload = {
            id: msgResult.lastID,
            sender_id: userId,
            receiver_id: targetId,
            content: mentionMsgContent,
            media_type: 'status_mention',
            created_at,
            is_read: 0
          };
          
          // Emit socket receive_message event to the mentioned user's online sockets
          if (activeUsers.has(targetId)) {
            activeUsers.get(targetId).forEach(socketId => {
              io.to(socketId).emit('receive_message', messagePayload);
            });
          }
          
          // Emit socket receive_message event to sender's other sockets (multi-device sync)
          if (activeUsers.has(userId)) {
            activeUsers.get(userId).forEach(socketId => {
              io.to(socketId).emit('receive_message', messagePayload);
            });
          }
        }
      }
    }
    
    // Notify contacts online in real-time
    const contacts = await dbAll(
      `SELECT DISTINCT user_id_1, user_id_2 FROM contacts 
       WHERE user_id_1 = ? OR user_id_2 = ?`,
      [userId, userId]
    );
    
    const notifyIds = new Set();
    contacts.forEach(c => {
      if (c.user_id_1 !== userId) notifyIds.add(c.user_id_1);
      if (c.user_id_2 !== userId) notifyIds.add(c.user_id_2);
    });
    if (mentions && Array.isArray(mentions)) {
      mentions.forEach(m => notifyIds.add(Number(m)));
    }
    
    // If this is a collaborative add-on, notify the parent story owner and their contacts too
    if (parent) {
      const parentRow = await dbGet('SELECT user_id FROM statuses WHERE id = ?', [parent]);
      if (parentRow) {
        const parentOwnerId = parentRow.user_id;
        if (parentOwnerId !== userId) {
          notifyIds.add(parentOwnerId);
        }
        
        const parentContacts = await dbAll(
          `SELECT DISTINCT user_id_1, user_id_2 FROM contacts 
           WHERE user_id_1 = ? OR user_id_2 = ?`,
          [parentOwnerId, parentOwnerId]
        );
        parentContacts.forEach(c => {
          if (c.user_id_1 !== userId) notifyIds.add(c.user_id_1);
          if (c.user_id_2 !== userId) notifyIds.add(c.user_id_2);
        });
      }
    }
    
    // Broadcast status_update socket event to all online contacts
    notifyIds.forEach(contactId => {
      const uKeyNum = Number(contactId);
      const uKeyStr = String(contactId);
      const notifySockets = (key) => {
        if (activeUsers.has(key)) {
          activeUsers.get(key).forEach(sid => {
            io.to(sid).emit('status_update', newStatus);
          });
        }
      };
      notifySockets(uKeyNum);
      notifySockets(uKeyStr);
    });
    
    res.json(newStatus);
  } catch (err) {
    console.error('Failed to create status:', err);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

// Retrieve active statuses (created within last 24 hours) for the user and their contacts
app.get('/api/statuses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const mentionsSearch = `%,${userId},%`;
    
    // Fetch statuses that are either owned by user, owned by user's contacts, where user is mentioned, or are collaborative add-ons to a visible parent status
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const statuses = await dbAll(
      `SELECT DISTINCT s.*, u.profile_picture,
              COALESCE(sv.liked, 0) AS liked_by_me,
              CASE WHEN sv.viewed_at IS NOT NULL THEN 1 ELSE 0 END AS seen
       FROM statuses s 
       JOIN users u ON s.user_id = u.id 
       LEFT JOIN status_views sv ON s.id = sv.status_id AND sv.user_id = ?
       WHERE s.created_at >= ?
         AND (
           s.user_id = ? 
           OR s.user_id IN (
             SELECT user_id_1 FROM contacts WHERE user_id_2 = ?
             UNION
             SELECT user_id_2 FROM contacts WHERE user_id_1 = ?
           )
           OR s.mentions LIKE ?
           OR s.parent_id IN (
             SELECT id FROM statuses 
             WHERE user_id = ?
                OR user_id IN (
                  SELECT user_id_1 FROM contacts WHERE user_id_2 = ?
                  UNION
                  SELECT user_id_2 FROM contacts WHERE user_id_1 = ?
                )
                OR mentions LIKE ?
           )
         )
       ORDER BY s.created_at ASC`,
      [userId, oneDayAgo, userId, userId, userId, mentionsSearch, userId, userId, userId, mentionsSearch]
    );

    // Populate views for the user's own statuses
    for (const s of statuses) {
      if (s.user_id === userId) {
        s.views = await dbAll(
          `SELECT sv.user_id, sv.viewed_at, sv.liked, u.username, u.profile_picture
           FROM status_views sv
           JOIN users u ON sv.user_id = u.id
           WHERE sv.status_id = ?
           ORDER BY sv.viewed_at DESC`,
          [s.id]
        );
      } else {
        s.views = [];
      }
    }
    
    res.json(statuses);
  } catch (err) {
    console.error('Failed to fetch statuses:', err);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// Log a view on a status story
app.post('/api/statuses/:statusId/view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const statusId = parseInt(req.params.statusId);
    if (isNaN(statusId)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }
    
    const status = await dbGet('SELECT * FROM statuses WHERE id = ?', [statusId]);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    const viewed_at = new Date().toISOString();
    await dbRun(
      `INSERT OR IGNORE INTO status_views (status_id, user_id, viewed_at)
       VALUES (?, ?, ?)`,
      [statusId, userId, viewed_at]
    );
    
    // Broadcast real-time update to the status owner
    const sendToUser = (uId, eventName, payload) => {
      const uKeyNum = Number(uId);
      const uKeyStr = String(uId);
      if (activeUsers.has(uKeyNum)) {
        activeUsers.get(uKeyNum).forEach(sid => io.to(sid).emit(eventName, payload));
      }
      if (activeUsers.has(uKeyStr)) {
        activeUsers.get(uKeyStr).forEach(sid => io.to(sid).emit(eventName, payload));
      }
    };
    
    sendToUser(status.user_id, 'status_interaction_updated', {
      statusId,
      userId,
      username: req.user.username,
      profile_picture: req.user.profile_picture || null,
      type: 'view',
      viewed_at
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to log view:', err);
    res.status(500).json({ error: 'Failed to log view' });
  }
});

// Toggle a like on a status story
app.post('/api/statuses/:statusId/like', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const statusId = parseInt(req.params.statusId);
    if (isNaN(statusId)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }
    
    const status = await dbGet('SELECT * FROM statuses WHERE id = ?', [statusId]);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    const view = await dbGet('SELECT * FROM status_views WHERE status_id = ? AND user_id = ?', [statusId, userId]);
    let newLikedState = 1;
    const now = new Date().toISOString();
    
    if (view) {
      newLikedState = view.liked === 1 ? 0 : 1;
      await dbRun(
        'UPDATE status_views SET liked = ?, viewed_at = ? WHERE status_id = ? AND user_id = ?',
        [newLikedState, now, statusId, userId]
      );
    } else {
      await dbRun(
        'INSERT INTO status_views (status_id, user_id, viewed_at, liked) VALUES (?, ?, ?, 1)',
        [statusId, userId, now]
      );
    }
    
    // Broadcast real-time update to the status owner
    const sendToUser = (uId, eventName, payload) => {
      const uKeyNum = Number(uId);
      const uKeyStr = String(uId);
      if (activeUsers.has(uKeyNum)) {
        activeUsers.get(uKeyNum).forEach(sid => io.to(sid).emit(eventName, payload));
      }
      if (activeUsers.has(uKeyStr)) {
        activeUsers.get(uKeyStr).forEach(sid => io.to(sid).emit(eventName, payload));
      }
    };
    
    sendToUser(status.user_id, 'status_interaction_updated', {
      statusId,
      userId,
      username: req.user.username,
      profile_picture: req.user.profile_picture || null,
      type: 'like',
      liked: newLikedState,
      viewed_at: now
    });
    
    res.json({ success: true, liked: newLikedState === 1 });
  } catch (err) {
    console.error('Failed to toggle status like:', err);
    res.status(500).json({ error: 'Failed to toggle status like' });
  }
});

// Helper to delete a status story and its media files, plus collaborative children
async function deleteStatusAndMedia(status, broadcast = false) {
  try {
    // If it has media (image/video), delete from disk
    if (status.media_type !== 'text') {
      let filename = status.content;
      if (status.content && status.content.startsWith('{')) {
        try {
          filename = JSON.parse(status.content).filename;
        } catch (e) {}
      } else if (status.content && status.content.includes('/api/upload/download/')) {
        filename = status.content.split('/api/upload/download/')[1];
      }
      if (filename) {
        const filePath = join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete status file:', err);
          });
        }
      }
    }
    
    // Delete from database
    await dbRun('DELETE FROM statuses WHERE id = ?', [status.id]);
    
    // Broadcast delete to contacts and mentioned users if requested
    if (broadcast) {
      const userId = status.user_id;
      const statusId = status.id;
      
      const contacts = await dbAll(
        `SELECT DISTINCT user_id_1, user_id_2 FROM contacts 
         WHERE user_id_1 = ? OR user_id_2 = ?`,
        [userId, userId]
      );
      
      const notifyIds = new Set();
      contacts.forEach(c => {
        if (c.user_id_1 !== userId) notifyIds.add(c.user_id_1);
        if (c.user_id_2 !== userId) notifyIds.add(c.user_id_2);
      });
      
      if (status.mentions) {
        const mentionsList = status.mentions.split(',').map(Number).filter(id => !isNaN(id) && id > 0);
        mentionsList.forEach(m => notifyIds.add(m));
      }
      
      // Also notify self (for other devices)
      notifyIds.add(userId);
      
      notifyIds.forEach(contactId => {
        const uKeyNum = Number(contactId);
        const uKeyStr = String(contactId);
        const notifySockets = (key) => {
          if (activeUsers.has(key)) {
            activeUsers.get(key).forEach(sid => {
              io.to(sid).emit('status_deleted', { statusId });
            });
          }
        };
        notifySockets(uKeyNum);
        notifySockets(uKeyStr);
      });
    }
    
    // Also delete any child statuses that have this status as parent
    const children = await dbAll('SELECT * FROM statuses WHERE parent_id = ?', [status.id]);
    for (const child of children) {
      await deleteStatusAndMedia(child, broadcast);
    }
  } catch (err) {
    console.error(`Error deleting status ${status.id}:`, err);
  }
}

// Delete a status story by ID
app.delete('/api/statuses/:statusId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const statusId = parseInt(req.params.statusId);
    
    // Check if the status exists and belongs to the user
    const status = await dbGet('SELECT * FROM statuses WHERE id = ?', [statusId]);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    if (status.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this status' });
    }
    
    // Use the helper to delete status, media, children, and broadcast delete event
    await deleteStatusAndMedia(status, true);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete status:', err);
    res.status(500).json({ error: 'Failed to delete status' });
  }
});


// Retrieve message history with a contact
app.get('/api/messages/:contactId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId);
    
    const messages = await dbAll(
      `SELECT * FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?))
          AND group_id IS NULL
       ORDER BY created_at ASC`,
      [userId, contactId, contactId, userId]
    );
    
    // Fetch reactions for all messages
    const messageIds = messages.map(m => m.id);
    let reactions = [];
    if (messageIds.length > 0) {
      reactions = await dbAll(
        `SELECT r.*, u.username FROM reactions r 
         JOIN users u ON r.user_id = u.id
         WHERE r.message_id IN (${messageIds.map(() => '?').join(',')})`,
        messageIds
      );
    }
    
    // Attach reactions to messages
    const messagesWithReactions = messages.map(msg => ({
      ...msg,
      reactions: reactions.filter(r => r.message_id === msg.id)
    }));
    
    res.json(messagesWithReactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message history' });
  }
});

// Clear message history with a contact
app.delete('/api/messages/clear/:contactId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId);
    
    await dbRun(
      `DELETE FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)`,
      [userId, contactId, contactId, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// --- Connectra Group Management REST APIs ---

// Fetch list of all groups user belongs to
app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await dbAll(
      `SELECT g.*, gm.is_admin,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?`,
      [userId]
    );
    
    // Fetch details of all members for each group
    for (const g of groups) {
      g.members = await dbAll(
        `SELECT gm.user_id, gm.is_admin, u.username, u.profile_picture, u.about
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = ?`,
        [g.id]
      );
    }
    
    res.json(groups);
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group
app.post('/api/groups', authenticateToken, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { name, members } = req.body; // members: array of contact user IDs
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    const created_at = new Date().toISOString();
    const result = await dbRun(
      `INSERT INTO groups (name, created_by, created_at) VALUES (?, ?, ?)`,
      [name, creatorId, created_at]
    );
    const groupId = result.lastID;
    
    // Add creator as admin
    await dbRun(
      `INSERT INTO group_members (group_id, user_id, is_admin, joined_at) VALUES (?, ?, 1, ?)`,
      [groupId, creatorId, created_at]
    );
    
    // Add other members
    if (members && Array.isArray(members)) {
      for (const memberId of members) {
        const mId = parseInt(memberId);
        if (!isNaN(mId) && mId !== creatorId) {
          await dbRun(
            `INSERT OR IGNORE INTO group_members (group_id, user_id, is_admin, joined_at) VALUES (?, ?, 0, ?)`,
            [groupId, mId, created_at]
          );
        }
      }
    }
    
    // Fetch the newly created group with members
    const newGroup = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
    newGroup.members = await dbAll(
      `SELECT gm.user_id, gm.is_admin, u.username, u.profile_picture, u.about
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );
    
    // Broadcast new_group socket event to all members online
    newGroup.members.forEach(member => {
      if (activeUsers.has(member.user_id)) {
        activeUsers.get(member.user_id).forEach(socketId => {
          io.to(socketId).emit('new_group', newGroup);
        });
      }
    });
    
    res.json(newGroup);
  } catch (error) {
    console.error('Failed to create group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Add members to a group (Admins only)
app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.groupId);
    const { userIds } = req.body; // array of user IDs
    
    // Check if user is admin
    const membership = await dbGet('SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (!membership || !membership.is_admin) {
      return res.status(403).json({ error: 'Admins only' });
    }
    
    const joined_at = new Date().toISOString();
    if (userIds && Array.isArray(userIds)) {
      for (const uId of userIds) {
        const memberId = parseInt(uId);
        if (!isNaN(memberId)) {
          await dbRun(
            `INSERT OR IGNORE INTO group_members (group_id, user_id, is_admin, joined_at) VALUES (?, ?, 0, ?)`,
            [groupId, memberId, joined_at]
          );
        }
      }
    }
    
    // Fetch updated group members
    const updatedMembers = await dbAll(
      `SELECT gm.user_id, gm.is_admin, u.username, u.profile_picture, u.about
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );
    
    // Broadcast group_update event to all current members
    updatedMembers.forEach(m => {
      if (activeUsers.has(m.user_id)) {
        activeUsers.get(m.user_id).forEach(socketId => {
          io.to(socketId).emit('group_update', { groupId, members: updatedMembers });
        });
      }
    });
    
    res.json({ success: true, members: updatedMembers });
  } catch (error) {
    console.error('Failed to add members:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// Toggle member admin status (Admins only)
app.put('/api/groups/:groupId/admins', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.groupId);
    const { targetUserId, isAdmin } = req.body; // targetUserId: user ID, isAdmin: true/false
    
    // Check if calling user is admin
    const membership = await dbGet('SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (!membership || !membership.is_admin) {
      return res.status(403).json({ error: 'Admins only' });
    }
    
    await dbRun(
      'UPDATE group_members SET is_admin = ? WHERE group_id = ? AND user_id = ?',
      [isAdmin ? 1 : 0, groupId, targetUserId]
    );
    
    // Fetch updated group members
    const updatedMembers = await dbAll(
      `SELECT gm.user_id, gm.is_admin, u.username, u.profile_picture, u.about
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );
    
    // Broadcast group_update event to all current members
    updatedMembers.forEach(m => {
      if (activeUsers.has(m.user_id)) {
        activeUsers.get(m.user_id).forEach(socketId => {
          io.to(socketId).emit('group_update', { groupId, members: updatedMembers });
        });
      }
    });
    
    res.json({ success: true, members: updatedMembers });
  } catch (error) {
    console.error('Failed to update admin role:', error);
    res.status(500).json({ error: 'Failed to update admin role' });
  }
});

// Remove a member from group (Admins only, or self to exit group)
app.delete('/api/groups/:groupId/members/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.groupId);
    const targetUserId = parseInt(req.params.targetUserId);
    
    // If user is removing someone else, verify calling user is admin
    if (userId !== targetUserId) {
      const membership = await dbGet('SELECT is_admin FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
      if (!membership || !membership.is_admin) {
        return res.status(403).json({ error: 'Admins only' });
      }
    }
    
    // Delete the member
    await dbRun('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, targetUserId]);
    
    // Check if the group is now empty
    const memberCount = await dbGet('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?', [groupId]);
    if (memberCount.count === 0) {
      // Delete group entirely
      await dbRun('DELETE FROM groups WHERE id = ?', [groupId]);
      return res.json({ success: true, groupDeleted: true });
    }
    
    // Fetch updated group members
    const updatedMembers = await dbAll(
      `SELECT gm.user_id, gm.is_admin, u.username, u.profile_picture, u.about
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );
    
    // If we deleted an admin, check if there are any admins left. If not, auto promote the oldest member to admin
    const adminCount = await dbGet('SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND is_admin = 1', [groupId]);
    if (adminCount.count === 0) {
      const oldestMember = await dbGet('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY joined_at ASC LIMIT 1', [groupId]);
      if (oldestMember) {
        await dbRun('UPDATE group_members SET is_admin = 1 WHERE group_id = ? AND user_id = ?', [groupId, oldestMember.user_id]);
        // Re-fetch updated members
        const finalMembers = await dbAll(
          `SELECT gm.user_id, gm.is_admin, u.username, u.profile_picture, u.about
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = ?`,
          [groupId]
        );
        updatedMembers.length = 0;
        updatedMembers.push(...finalMembers);
      }
    }
    
    // Broadcast group_update event to all remaining members
    updatedMembers.forEach(m => {
      if (activeUsers.has(m.user_id)) {
        activeUsers.get(m.user_id).forEach(socketId => {
          io.to(socketId).emit('group_update', { groupId, members: updatedMembers });
        });
      }
    });
    
    // Also notify the removed user so their UI cleans up
    if (activeUsers.has(targetUserId)) {
      activeUsers.get(targetUserId).forEach(socketId => {
        io.to(socketId).emit('group_removed', { groupId });
      });
    }
    
    res.json({ success: true, members: updatedMembers });
  } catch (error) {
    console.error('Failed to remove group member:', error);
    res.status(500).json({ error: 'Failed to remove group member' });
  }
});

// Retrieve message history of a group
app.get('/api/messages/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.groupId);
    
    // Verify user is member of the group
    const membership = await dbGet('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }
    
    const messages = await dbAll(
      `SELECT m.*, u.username as sender_name FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.group_id = ?
       ORDER BY m.created_at ASC`,
      [groupId]
    );
    
    // Fetch reactions
    const messageIds = messages.map(m => m.id);
    let reactions = [];
    if (messageIds.length > 0) {
      reactions = await dbAll(
        `SELECT r.*, u.username FROM reactions r 
         JOIN users u ON r.user_id = u.id
         WHERE r.message_id IN (${messageIds.map(() => '?').join(',')})`,
        messageIds
      );
    }
    
    const messagesWithReactions = messages.map(msg => ({
      ...msg,
      reactions: reactions.filter(r => r.message_id === msg.id)
    }));
    
    res.json(messagesWithReactions);
  } catch (error) {
    console.error('Failed to fetch group message history:', error);
    res.status(500).json({ error: 'Failed to fetch group message history' });
  }
});

// Delete a single message by ID
app.delete('/api/messages/delete/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = parseInt(req.params.messageId);
    
    // Check if the user is either the sender or receiver of the message
    const message = await dbGet('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.sender_id !== userId && message.receiver_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }
    
    // Delete the message from database
    await dbRun('DELETE FROM messages WHERE id = ?', [messageId]);
    
    // Also delete reactions associated with it
    await dbRun('DELETE FROM reactions WHERE message_id = ?', [messageId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Mark message as viewed (for View-Once media)
app.put('/api/messages/viewed/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = parseInt(req.params.messageId);
    
    const message = await dbGet('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.sender_id !== userId && message.receiver_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this message' });
    }
    
    await dbRun('UPDATE messages SET is_viewed = 1 WHERE id = ?', [messageId]);
    
    // Physically delete file from server if it is media
    if (message.media_type && message.media_type !== 'text' && message.content) {
      const filename = message.content.split('/').pop();
      if (filename) {
        const filePath = join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete view-once file:', err);
            else console.log('Successfully deleted view-once file:', filePath);
          });
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as viewed:', error);
    res.status(500).json({ error: 'Failed to mark message as viewed' });
  }
});

// Active user connections
const activeUsers = new Map();
const activeWatchParties = new Map();
const activeSoundscapes = new Map();

function getWatchPartyKey(userId, targetId, isGroup) {
  if (isGroup) {
    return `group_${targetId}`;
  }
  const id1 = Math.min(userId, targetId);
  const id2 = Math.max(userId, targetId);
  return `dm_${id1}_${id2}`;
}

const isUserOnline = (userId) => activeUsers.has(userId) && activeUsers.get(userId).size > 0;

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  const username = socket.user.username;

  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
  }
  activeUsers.get(userId).add(socket.id);

  console.log(`User connected: ${username} (${userId}) | Socket: ${socket.id}`);

  // Broadcast "online" status
  socket.broadcast.emit('status_change', { userId, status: 'online' });

  // Handle checking status of multiple users
  socket.on('get_online_statuses', async (userIds, callback) => {
    try {
      const ids = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length === 0) {
        if (typeof callback === 'function') callback({});
        return;
      }
      
      const placeholders = ids.map(() => '?').join(',');
      const users = await dbAll(
        `SELECT id, last_seen FROM users WHERE id IN (${placeholders})`,
        ids
      );
      
      const statuses = {};
      ids.forEach(id => {
        const isOnline = isUserOnline(id);
        const userRow = users.find(u => u.id === id);
        statuses[id] = {
          status: isOnline ? 'online' : 'offline',
          lastSeen: userRow ? userRow.last_seen : null
        };
      });
      
      if (typeof callback === 'function') callback(statuses);
    } catch (err) {
      console.error('Failed to get online statuses:', err);
      if (typeof callback === 'function') callback({});
    }
  });

  // 1. YouTube Watch Party Socket Events
  socket.on('start_watch_party', (data) => {
    const { targetId, isGroup, videoId, senderName } = data;
    const key = getWatchPartyKey(userId, targetId, isGroup);
    const session = {
      targetId,
      isGroup,
      videoId,
      senderName,
      senderId: userId,
      isActive: true
    };
    activeWatchParties.set(key, session);
    console.log(`🎬 Watch Party started: key=${key}, videoId=${videoId} by ${senderName}`);
    if (isGroup) {
      socket.broadcast.emit('watch_party_started', { targetId, isGroup: true, videoId, senderName, senderId: userId });
    } else {
      if (activeUsers.has(targetId)) {
        activeUsers.get(targetId).forEach(socketId => {
          io.to(socketId).emit('watch_party_started', { targetId: userId, isGroup: false, videoId, senderName, senderId: userId });
        });
      }
    }
  });

  socket.on('get_active_watch_party', (data, callback) => {
    const { targetId, isGroup } = data;
    const key = getWatchPartyKey(userId, targetId, isGroup);
    const session = activeWatchParties.get(key);
    if (typeof callback === 'function') {
      callback(session || null);
    }
  });

  socket.on('watch_party_sync', (data) => {
    const { targetId, isGroup, action, time, senderName } = data;
    if (isGroup) {
      socket.broadcast.emit('watch_party_synced', { targetId, isGroup: true, action, time, senderId: userId, senderName });
    } else {
      if (activeUsers.has(targetId)) {
        activeUsers.get(targetId).forEach(socketId => {
          io.to(socketId).emit('watch_party_synced', { targetId: userId, isGroup: false, action, time, senderId: userId, senderName });
        });
      }
    }
  });

  socket.on('close_watch_party', (data) => {
    const { targetId, isGroup } = data;
    const key = getWatchPartyKey(userId, targetId, isGroup);
    activeWatchParties.delete(key);
    console.log(`🎬 Watch Party closed: key=${key}`);
    if (isGroup) {
      socket.broadcast.emit('watch_party_closed', { targetId, isGroup: true, senderId: userId });
    } else {
      if (activeUsers.has(targetId)) {
        activeUsers.get(targetId).forEach(socketId => {
          io.to(socketId).emit('watch_party_closed', { targetId: userId, isGroup: false, senderId: userId });
        });
      }
    }
  });

  // 2. WebRTC Live Subtitles socket event
  socket.on('call_subtitles', (data) => {
    const { roomId, senderName, text, isFinal } = data;
    socket.to(roomId).emit('call_subtitles_received', { senderName, text, isFinal, senderSocketId: socket.id });
  });

  // 3. Shared Ambient Soundscape Socket Events
  socket.on('change_soundscape', (data) => {
    const { targetId, isGroup, soundType } = data;
    const key = getWatchPartyKey(userId, targetId, isGroup);
    
    if (soundType && soundType !== 'none') {
      activeSoundscapes.set(key, soundType);
    } else {
      activeSoundscapes.delete(key);
    }
    console.log(`🎵 Soundscape changed: key=${key}, soundType=${soundType}`);

    if (isGroup) {
      socket.broadcast.emit('soundscape_changed', { targetId, isGroup: true, soundType, senderName: username });
    } else {
      if (activeUsers.has(targetId)) {
        activeUsers.get(targetId).forEach(socketId => {
          io.to(socketId).emit('soundscape_changed', { targetId: userId, isGroup: false, soundType, senderName: username });
        });
      }
    }
  });

  socket.on('get_active_soundscape', (data, callback) => {
    const { targetId, isGroup } = data;
    const key = getWatchPartyKey(userId, targetId, isGroup);
    const soundType = activeSoundscapes.get(key) || 'none';
    if (typeof callback === 'function') {
      callback(soundType);
    }
  });

  // Handle message sending (Plaintext content, no E2EE keys)
  socket.on('send_message', async (data, callback) => {
    const { receiverId, content, mediaType, mediaName, viewOnce, secretChat, transcript, groupId } = data;
    
    // Group Message path
    if (groupId) {
      const gId = parseInt(groupId);
      if (isNaN(gId) || !content) {
        if (typeof callback === 'function') callback({ error: 'Invalid message parameters' });
        return;
      }
      
      try {
        const created_at = new Date().toISOString();
        const result = await dbRun(
          `INSERT INTO messages (sender_id, receiver_id, group_id, content, media_type, media_name, created_at, view_once, secret_chat, transcript) 
           VALUES (?, 0, ?, ?, ?, ?, ?, 0, 0, NULL)`,
          [userId, gId, content, mediaType || 'text', mediaName || null, created_at]
        );
        
        const messagePayload = {
          id: result.lastID,
          sender_id: userId,
          sender_name: username,
          receiver_id: null,
          group_id: gId,
          content,
          media_type: mediaType || 'text',
          media_name: mediaName || null,
          created_at,
          is_read: 0,
          view_once: 0,
          is_viewed: 0,
          secret_chat: 0,
          transcript: null
        };
        
        // Find group members to deliver message
        const members = await dbAll('SELECT user_id FROM group_members WHERE group_id = ?', [gId]);
        members.forEach(member => {
          if (activeUsers.has(member.user_id)) {
            activeUsers.get(member.user_id).forEach(socketId => {
              if (socketId !== socket.id) {
                io.to(socketId).emit('receive_message', messagePayload);
              }
            });
          }
        });
        
        if (typeof callback === 'function') {
          callback({ success: true, message: messagePayload });
        }
      } catch (err) {
        console.error('Failed to process group message:', err);
        if (typeof callback === 'function') callback({ error: 'Failed to process message' });
      }
      return;
    }

    const targetId = parseInt(receiverId);
    
    if (isNaN(targetId) || !content) {
      if (typeof callback === 'function') callback({ error: 'Invalid message parameters' });
      return;
    }

    try {
      // Check if either user blocked the other (only for human connections)
      if (targetId !== 0) {
        const blockCheck = await dbGet(
          `SELECT * FROM blocked_users 
           WHERE (user_id = ? AND blocked_id = ?) 
              OR (user_id = ? AND blocked_id = ?)`,
          [userId, targetId, targetId, userId]
        );
        if (blockCheck) {
          if (typeof callback === 'function') callback({ error: 'You or the recipient has blocked this connection.' });
          return;
        }
      }

      const created_at = new Date().toISOString();
      const view_once = viewOnce ? 1 : 0;
      const secret_chat = secretChat ? 1 : 0;

      // Store plain message in database
      const result = await dbRun(
        `INSERT INTO messages (sender_id, receiver_id, content, media_type, media_name, created_at, view_once, secret_chat, transcript) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, targetId, content, mediaType || 'text', mediaName || null, created_at, view_once, secret_chat, transcript || null]
      );
      
      const messageId = result.lastID;
      
      const messagePayload = {
        id: messageId,
        sender_id: userId,
        receiver_id: targetId,
        content,
        media_type: mediaType || 'text',
        media_name: mediaName || null,
        created_at,
        is_read: targetId === 0 ? 1 : 0,
        view_once,
        is_viewed: 0,
        secret_chat,
        transcript: transcript || null
      };

      // Deliver to recipient if online and not AI bot
      if (targetId !== 0) {
        if (activeUsers.has(targetId)) {
          activeUsers.get(targetId).forEach(socketId => {
            io.to(socketId).emit('receive_message', messagePayload);
          });
        }
      }

      // Confirm back to sender
      if (typeof callback === 'function') {
        callback({ success: true, message: messagePayload });
      }

      // Trigger AI reply if receiver is the AI bot
      if (targetId === 0) {
        setTimeout(async () => {
          try {
            const aiReply = getAiResponse(content);
            const aiCreatedAt = new Date(new Date().getTime() + 100).toISOString();
            
            const aiResult = await dbRun(
              `INSERT INTO messages (sender_id, receiver_id, content, media_type, media_name, created_at, view_once, secret_chat, transcript) 
               VALUES (0, ?, ?, 'text', null, ?, 0, 0, null)`,
              [userId, aiReply, aiCreatedAt]
            );
            
            const aiPayload = {
              id: aiResult.lastID,
              sender_id: 0,
              receiver_id: userId,
              content: aiReply,
              media_type: 'text',
              media_name: null,
              created_at: aiCreatedAt,
              is_read: 0,
              view_once: 0,
              is_viewed: 0,
              secret_chat: 0,
              transcript: null
            };
            
            if (activeUsers.has(userId)) {
              activeUsers.get(userId).forEach(socketId => {
                io.to(socketId).emit('receive_message', aiPayload);
              });
            }
          } catch (aiErr) {
            console.error('Failed to trigger AI response:', aiErr);
          }
        }, 800); // Simulated delay for typing
      }
    } catch (err) {
      console.error('Failed to store/deliver message:', err);
      if (typeof callback === 'function') callback({ error: 'Failed to process message' });
    }
  });

  // Handle adding/toggling a reaction on a message
  socket.on('add_reaction', async (data, callback) => {
    const { messageId, emoji } = data;
    if (!messageId || !emoji) {
      if (typeof callback === 'function') callback({ error: 'Invalid reaction data' });
      return;
    }

    try {
      // Check if user already reacted with this emoji - toggle it off
      const existing = await dbGet(
        'SELECT * FROM reactions WHERE message_id = ? AND user_id = ?',
        [messageId, userId]
      );

      if (existing && existing.emoji === emoji) {
        // Remove reaction (toggle off)
        await dbRun('DELETE FROM reactions WHERE message_id = ? AND user_id = ?', [messageId, userId]);
        
        const reactionPayload = { messageId, userId, username, emoji, action: 'removed' };
        
        // Find the message to know who to notify
        const msg = await dbGet('SELECT sender_id, receiver_id FROM messages WHERE id = ?', [messageId]);
        if (msg) {
          const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
          if (activeUsers.has(otherUserId)) {
            activeUsers.get(otherUserId).forEach(sid => {
              io.to(sid).emit('reaction_update', reactionPayload);
            });
          }
        }
        // Notify sender too
        if (typeof callback === 'function') callback({ success: true, ...reactionPayload });
      } else {
        // Upsert reaction (replace any existing with new emoji)
        await dbRun(
          'INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?) ON CONFLICT(message_id, user_id) DO UPDATE SET emoji = ?',
          [messageId, userId, emoji, emoji]
        );
        
        const reactionPayload = { messageId, userId, username, emoji, action: 'added' };
        
        const msg = await dbGet('SELECT sender_id, receiver_id FROM messages WHERE id = ?', [messageId]);
        if (msg) {
          const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
          if (activeUsers.has(otherUserId)) {
            activeUsers.get(otherUserId).forEach(sid => {
              io.to(sid).emit('reaction_update', reactionPayload);
            });
          }
        }
        if (typeof callback === 'function') callback({ success: true, ...reactionPayload });
      }
    } catch (err) {
      console.error('Failed to handle reaction:', err);
      if (typeof callback === 'function') callback({ error: 'Failed to process reaction' });
    }
  });

  // Handle typing status
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    const targetId = parseInt(receiverId);
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('typing_status', { senderId: userId, isTyping });
      });
    }
  });

  // Handle marking messages as read
  socket.on('mark_read', async (data) => {
    const { contactId } = data;
    const targetId = parseInt(contactId);
    try {
      await dbRun(
        'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
        [targetId, userId]
      );
      
      if (activeUsers.has(targetId)) {
        activeUsers.get(targetId).forEach(socketId => {
          io.to(socketId).emit('messages_read', { readerId: userId });
        });
      }
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  });

  // WebRTC Calling signaling handlers
  socket.on('call_group', async (data) => {
    const { groupId, roomId, signalData, type } = data;
    const gId = parseInt(groupId);
    console.log(`📞 Socket event 'call_group' from ${username} (${userId}) in group ${gId} | type: ${type}`);
    
    try {
      const groupRow = await dbGet('SELECT name FROM groups WHERE id = ?', [gId]);
      const groupName = groupRow ? groupRow.name : 'Group Call';
      const members = await dbAll('SELECT user_id FROM group_members WHERE group_id = ?', [gId]);
      members.forEach(member => {
        const targetId = member.user_id;
        if (targetId !== userId) {
          if (activeUsers.has(targetId)) {
            activeUsers.get(targetId).forEach(socketId => {
              io.to(socketId).emit('incoming_call', {
                signalData,
                from: userId,
                callerName: username,
                type,
                groupId: gId,
                groupName,
                roomId
              });
            });
          }
        }
      });
    } catch (err) {
      console.error('Failed to broadcast group call:', err);
    }
  });

  socket.on('call_user', (data) => {
    const { userToCall, signalData, from, type } = data;
    const targetId = parseInt(userToCall);
    console.log(`📞 Socket event 'call_user' from ${username} (${userId}) to ${targetId} | type: ${type}`);
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('incoming_call', {
          signalData,
          from,
          callerName: username,
          type
        });
      });
    }
  });

  socket.on('accept_call', (data) => {
    const { to, signalData } = data;
    const targetId = parseInt(to);
    console.log(`📞 Socket event 'accept_call' from ${username} (${userId}) to ${targetId}`);
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('call_accepted', {
          signalData
        });
      });
    }
  });

  socket.on('reject_call', (data) => {
    const { to } = data;
    const targetId = parseInt(to);
    console.log(`📞 Socket event 'reject_call' from ${username} (${userId}) to ${targetId}`);
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('call_rejected', {
          from: userId
        });
      });
    }
  });

  socket.on('ice_candidate', (data) => {
    const { to, candidate } = data;
    const targetId = parseInt(to);
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('ice_candidate', {
          candidate,
          from: userId
        });
      });
    }
  });

  socket.on('end_call', (data) => {
    const { to } = data;
    const targetId = parseInt(to);
    console.log(`📞 Socket event 'end_call' from ${username} (${userId}) to ${targetId}`);
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('call_ended', {
          from: userId
        });
      });
    }
  });

  // Handle single message deletion socket relay
  socket.on('delete_message', (data) => {
    const { messageId, receiverId } = data;
    const targetId = parseInt(receiverId);
    
    // Broadcast message_deleted to recipient sockets
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(sid => {
        io.to(sid).emit('message_deleted', { messageId });
      });
    }
    
    // Broadcast message_deleted to sender's other sockets (for multi-device sync)
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).forEach(sid => {
        if (sid !== socket.id) {
          io.to(sid).emit('message_deleted', { messageId });
        }
      });
    }
  });

  // Handle viewed status socket relay (for View-Once media countdown sync)
  socket.on('message_viewed', (data) => {
    const { messageId, receiverId } = data;
    const targetId = parseInt(receiverId);
    
    // Broadcast message_viewed to recipient sockets
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(sid => {
        io.to(sid).emit('message_viewed', { messageId });
      });
    }
    
    // Broadcast message_viewed to sender's other sockets (multi-device)
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).forEach(sid => {
        if (sid !== socket.id) {
          io.to(sid).emit('message_viewed', { messageId });
        }
      });
    }
  });

  // Group Call Room signaling handlers
  socket.on('join_call_room', (data) => {
    const { roomId, userId: joinUserId, username: joinUsername } = data;
    socket.join(roomId);
    socket.callRoomId = roomId; // Store room ID on socket for disconnect cleanup
    
    console.log(`📞 User ${joinUsername} (${joinUserId}) joined call room ${roomId}`);
    
    // Notify others in room
    socket.to(roomId).emit('user_joined_call', {
      userId: joinUserId,
      username: joinUsername,
      socketId: socket.id
    });
  });

  socket.on('room_signal', (data) => {
    const { roomId, targetSocketId, signalData } = data;
    // Route signal to target socket in the room
    io.to(targetSocketId).emit('room_signal', {
      senderSocketId: socket.id,
      senderUserId: userId,
      senderUsername: username,
      signalData
    });
  });

  socket.on('leave_call_room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    socket.callRoomId = null;
    socket.to(roomId).emit('user_left_call', {
      userId: userId,
      socketId: socket.id
    });
    console.log(`📞 User ${username} (${userId}) left call room ${roomId}`);
  });

  // Handle Whiteboard drawing sync
  socket.on('draw_stroke', (data) => {
    const { receiverId, stroke } = data;
    const targetId = parseInt(receiverId);
    if (!targetId || !stroke) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('draw_stroke', { senderId: userId, stroke });
      });
    }
  });

  socket.on('clear_canvas', (data) => {
    const { receiverId } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('clear_canvas', { senderId: userId });
      });
    }
  });

  socket.on('toggle_whiteboard', (data) => {
    const { receiverId, open } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('toggle_whiteboard', { senderId: userId, open });
      });
    }
  });

  // Ephemeral Secret Chat Toggle Relay
  socket.on('toggle_secret_mode', (data) => {
    const { receiverId, active } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('toggle_secret_mode', { senderId: userId, active });
      });
    }
  });

  // Collaborative Socket Game Relays (Tic-Tac-Toe)
  socket.on('game_invite', (data) => {
    console.log(`🎮 game_invite received from ${username} (${userId}) for receiver: ${data?.receiverId}`);
    const { receiverId } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      console.log(`🎮 game_invite relaying to online receiver: ${targetId}`);
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('game_invite', { senderId: userId, username });
      });
    } else {
      console.log(`🎮 game_invite: receiver ${targetId} is offline`);
    }
  });

  socket.on('game_response', (data) => {
    console.log(`🎮 game_response received from ${username} (${userId}) for receiver: ${data?.receiverId}, accept: ${data?.accept}, gameType: ${data?.gameType}`);
    const { receiverId, accept, gameType } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('game_response', { senderId: userId, accept, gameType });
      });
    }
  });

  socket.on('game_move', (data) => {
    const { receiverId, index } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('game_move', { senderId: userId, index });
      });
    }
  });

  socket.on('game_reset', (data) => {
    const { receiverId } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('game_reset', { senderId: userId });
      });
    }
  });

  socket.on('game_quit', (data) => {
    const { receiverId } = data;
    const targetId = parseInt(receiverId);
    if (!targetId) return;
    
    if (activeUsers.has(targetId)) {
      activeUsers.get(targetId).forEach(socketId => {
        io.to(socketId).emit('game_quit', { senderId: userId });
      });
    }
  });

  // Handle in-chat poll voting
  socket.on('vote_poll', async (data) => {
    const { messageId, optionIndex } = data;
    try {
      const msgId = parseInt(messageId);
      const optIdx = parseInt(optionIndex);
      if (isNaN(msgId) || isNaN(optIdx)) return;

      const msgRow = await dbGet('SELECT poll_votes, sender_id, receiver_id FROM messages WHERE id = ?', [msgId]);
      if (!msgRow) return;

      let votes = {};
      if (msgRow.poll_votes) {
        try {
          votes = JSON.parse(msgRow.poll_votes);
        } catch (e) {
          votes = {};
        }
      }

      // Record or update user's vote
      votes[userId] = optIdx;

      await dbRun('UPDATE messages SET poll_votes = ? WHERE id = ?', [JSON.stringify(votes), msgId]);

      const payload = { messageId: msgId, votes };

      // Emit to the voter directly
      socket.emit('poll_updated', payload);

      // Broadcast update to sender and receiver
      const sendToUser = (uId) => {
        const uKeyNum = Number(uId);
        const uKeyStr = String(uId);
        if (activeUsers.has(uKeyNum)) {
          activeUsers.get(uKeyNum).forEach(sid => io.to(sid).emit('poll_updated', payload));
        }
        if (activeUsers.has(uKeyStr)) {
          activeUsers.get(uKeyStr).forEach(sid => io.to(sid).emit('poll_updated', payload));
        }
      };
      
      sendToUser(msgRow.sender_id);
      sendToUser(msgRow.receiver_id);
    } catch (err) {
      console.error('Failed to process poll vote:', err);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${username} (${userId}) | Socket: ${socket.id}`);
    
    // Clean up calling room
    if (socket.callRoomId) {
      socket.to(socket.callRoomId).emit('user_left_call', {
        userId: userId,
        socketId: socket.id
      });
    }

    const userSockets = activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        activeUsers.delete(userId);
        const lastSeenTime = new Date().toISOString();
        try {
          await dbRun('UPDATE users SET last_seen = ? WHERE id = ?', [lastSeenTime, userId]);
        } catch (err) {
          console.error('Failed to update user last_seen status:', err);
        }
        socket.broadcast.emit('status_change', { userId, status: 'offline', lastSeen: lastSeenTime });
      }
    }
  });
});

// Background worker to check and dispatch scheduled messages
setInterval(async () => {
  try {
    const nowISO = new Date().toISOString();
    const dueMessages = await dbAll(
      'SELECT * FROM scheduled_messages WHERE is_sent = 0 AND scheduled_for <= ?',
      [nowISO]
    );
    
    for (const msg of dueMessages) {
      const insertResult = await dbRun(
        `INSERT INTO messages (sender_id, receiver_id, content, media_type, media_name, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [msg.sender_id, msg.receiver_id, msg.content, msg.media_type, msg.media_name, msg.scheduled_for]
      );
      
      const messageId = insertResult.lastID;
      
      await dbRun(
        'UPDATE scheduled_messages SET is_sent = 1 WHERE id = ?',
        [msg.id]
      );
      
      const messagePayload = {
        id: messageId,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        media_type: msg.media_type,
        media_name: msg.media_name,
        created_at: msg.scheduled_for,
        is_read: 0
      };
      
      [msg.sender_id, msg.receiver_id].forEach(uid => {
        if (activeUsers.has(uid)) {
          activeUsers.get(uid).forEach(socketId => {
            io.to(socketId).emit('receive_message', messagePayload);
          });
        }
      });
    }
  } catch (error) {
    console.error('Error in scheduled message worker:', error);
  }
}, 5000);

// Background worker to check and delete expired statuses (older than 24 hours)
const cleanExpiredStatuses = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredStatuses = await dbAll('SELECT * FROM statuses WHERE created_at < ?', [oneDayAgo]);
    for (const status of expiredStatuses) {
      // Delete status, its media files, its collaborative children, and broadcast delete event
      await deleteStatusAndMedia(status, true);
      console.log(`[Auto-Cleanup] Deleted expired status ${status.id} by user: ${status.username}`);
    }
  } catch (err) {
    console.error('[Auto-Cleanup] Failed to clean expired statuses:', err);
  }
};

// Run immediately on start
cleanExpiredStatuses();

// Run every 60 seconds
setInterval(cleanExpiredStatuses, 60000);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Chatting Server running on port ${PORT}`);
});
