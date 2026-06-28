import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (!err) {
    db.run("PRAGMA journal_mode=WAL;");
    db.run("PRAGMA busy_timeout=5000;");
  }
});

// Helper functions for promise-based operations
export const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize tables in order
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id_1 INTEGER NOT NULL,
      user_id_2 INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id_1, user_id_2),
      FOREIGN KEY(user_id_1) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id_2) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text',
      media_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      creator_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_used INTEGER DEFAULT 0,
      FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, blocked_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id),
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Add columns to users table if they don't exist
  db.run("ALTER TABLE users ADD COLUMN about TEXT DEFAULT 'Available'", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE users ADD COLUMN profile_picture TEXT", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE users ADD COLUMN custom_wallpaper TEXT", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE users ADD COLUMN last_seen TEXT", (err) => {
    // Ignore error if column already exists
  });

  // Add columns to messages table if they don't exist
  db.run("ALTER TABLE messages ADD COLUMN view_once INTEGER DEFAULT 0", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE messages ADD COLUMN is_viewed INTEGER DEFAULT 0", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE messages ADD COLUMN secret_chat INTEGER DEFAULT 0", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE messages ADD COLUMN transcript TEXT", (err) => {
    // Ignore error if column already exists
  });
  db.run("ALTER TABLE messages ADD COLUMN poll_votes TEXT", (err) => {
    // Ignore error if column already exists
  });

  // Create scheduled_messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text',
      media_name TEXT,
      scheduled_for TEXT NOT NULL,
      is_sent INTEGER DEFAULT 0,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create pinned_contacts table
  db.run(`
    CREATE TABLE IF NOT EXISTS pinned_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, contact_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(contact_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  // Create groups table
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      avatar TEXT,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create group_members table
  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_admin INTEGER DEFAULT 0,
      joined_at TEXT NOT NULL,
      UNIQUE(group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Alter messages table to add group_id column
  db.run("ALTER TABLE messages ADD COLUMN group_id INTEGER DEFAULT NULL", (err) => {
    // Ignore error if column already exists
  });

  // Create statuses table
  db.run(`
    CREATE TABLE IF NOT EXISTS statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text',
      mentions TEXT,
      created_at TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create status_views table
  db.run(`
    CREATE TABLE IF NOT EXISTS status_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      viewed_at TEXT NOT NULL,
      liked INTEGER DEFAULT 0,
      UNIQUE(status_id, user_id),
      FOREIGN KEY(status_id) REFERENCES statuses(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO users (id, username, email, phone, password_hash, about)
    VALUES (0, 'AI_Assistant', 'ai@assistant.local', '0000000000', 'ai_mock_hash', 'AI Assistant · Online')
  `);
});

export default db;
