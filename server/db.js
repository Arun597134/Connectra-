import pkg from 'pg';
const { Pool } = pkg;

const isRender = process.env.RENDER === 'true';

// Connection uses DATABASE_URL environment variable from Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/connectra',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle Postgres client', err);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
  } else {
    console.log('✅ Successfully connected to PostgreSQL database!');
  }
});

function convertQuery(query) {
  let paramIndex = 1;
  let pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
  
  // Convert SQLite specific syntax to Postgres
  pgQuery = pgQuery.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
  
  if (pgQuery.trim().toUpperCase().startsWith('INSERT') && !pgQuery.toUpperCase().includes('RETURNING')) {
    pgQuery += ' RETURNING id';
  }
  return pgQuery;
}

export const dbRun = async (query, params = []) => {
  try {
    const res = await pool.query(convertQuery(query), params);
    // Mimic SQLite lastID and changes
    return { 
      lastID: res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : null, 
      changes: res.rowCount 
    };
  } catch (err) {
    // If it's a unique constraint violation and the original query was INSERT OR IGNORE
    if (err.code === '23505' && query.toUpperCase().includes('IGNORE')) {
      return { lastID: null, changes: 0 };
    }
    throw err;
  }
};

export const dbGet = async (query, params = []) => {
  const res = await pool.query(convertQuery(query), params);
  return res.rows[0];
};

export const dbAll = async (query, params = []) => {
  const res = await pool.query(convertQuery(query), params);
  return res.rows;
};

const initDb = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      about TEXT DEFAULT 'Available',
      profile_picture TEXT,
      custom_wallpaper TEXT,
      last_seen TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      user_id_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id_1, user_id_2)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER DEFAULT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text',
      media_name TEXT,
      view_once INTEGER DEFAULT 0,
      is_viewed INTEGER DEFAULT 0,
      secret_chat INTEGER DEFAULT 0,
      transcript TEXT,
      poll_votes TEXT,
      reply_to_id INTEGER,
      reply_to_content TEXT,
      reply_to_sender TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_used INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text',
      media_name TEXT,
      scheduled_for TEXT NOT NULL,
      is_sent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pinned_contacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_admin INTEGER DEFAULT 0,
      joined_at TEXT NOT NULL,
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS statuses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text',
      mentions TEXT,
      created_at TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS status_views (
      id SERIAL PRIMARY KEY,
      status_id INTEGER NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewed_at TEXT NOT NULL,
      liked INTEGER DEFAULT 0,
      UNIQUE(status_id, user_id)
    );
  `;
  try {
    await pool.query(schema);
    console.log('✅ PostgreSQL Schema initialized successfully.');
    
    try {
      await pool.query(`
        INSERT INTO users (id, username, email, phone, password_hash, about) 
        VALUES (0, 'AI_Assistant', 'ai@assistant.local', '0000000000', 'ai_mock_hash', 'AI Assistant · Online')
        ON CONFLICT (username) DO NOTHING
      `);
    } catch(e) {
      console.error('Failed to insert AI Assistant mock user:', e.message);
    }

  } catch (err) {
    console.error('❌ Failed to initialize schema:', err.message);
  }
};

initDb();

export default pool;
