const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'discord.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      tag TEXT UNIQUE NOT NULL,
      avatar TEXT DEFAULT NULL,
      status TEXT DEFAULT 'online',
      custom_status TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT NULL,
      description TEXT DEFAULT '',
      owner_id TEXT NOT NULL,
      invite_code TEXT UNIQUE,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS server_bans (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT DEFAULT '',
      banned_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(server_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS server_members (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      role_id TEXT DEFAULT NULL,
      nickname TEXT DEFAULT '',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(server_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#99aab5',
      permissions INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      topic TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      type TEXT DEFAULT 'default',
      reply_to TEXT DEFAULT NULL,
      edited_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id, emoji)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS voice_state (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      muted INTEGER DEFAULT 0,
      deafened INTEGER DEFAULT 0,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      server_id TEXT DEFAULT NULL,
      channel_id TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dm_channels (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'dm',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dm_members (
      id TEXT PRIMARY KEY,
      dm_channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      FOREIGN KEY (dm_channel_id) REFERENCES dm_channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(dm_channel_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id TEXT PRIMARY KEY,
      dm_channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME DEFAULT NULL,
      FOREIGN KEY (dm_channel_id) REFERENCES dm_channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pinned_messages (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      channel_id TEXT NOT NULL,
      pinned_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (pinned_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS channel_reads (
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, channel_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS member_roles (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE(server_id, user_id, role_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mentions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      archived_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS forum_tags (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#99aab5',
      emoji TEXT DEFAULT '',
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS thread_tags (
      thread_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (thread_id, tag_id),
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES forum_tags(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      channel_id TEXT,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_time DATETIME NOT NULL,
      end_time DATETIME DEFAULT NULL,
      location TEXT DEFAULT '',
      recurring TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'going',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(event_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS onboarding (
      id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE NOT NULL,
      enabled INTEGER DEFAULT 0,
      welcome_message TEXT DEFAULT '',
      rules TEXT DEFAULT '[]',
      guide_channels TEXT DEFAULT '[]',
      role_options TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS member_onboarding_done (
      user_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, server_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'Новый чат',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      thinking TEXT DEFAULT '',
      error INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
    )
  `);

  // Migration: add tag column for existing databases
  try {
    db.run('ALTER TABLE users ADD COLUMN tag TEXT');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.warn('[DB] Migration tag:', e.message);
  }

  // Migration: add description column to servers
  try {
    db.run('ALTER TABLE servers ADD COLUMN description TEXT DEFAULT ""');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.warn('[DB] Migration description:', e.message);
  }

  // Migration: add extra server settings
  try { db.run('ALTER TABLE servers ADD COLUMN system_channel_id TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration system_channel_id:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN default_notifications TEXT DEFAULT "all"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration default_notifications:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN afk_timeout INTEGER DEFAULT 300'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration afk_timeout:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN verification_level INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration verification_level:', e.message); }
  try { db.run('ALTER TABLE channels ADD COLUMN slowmode INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration slowmode:', e.message); }
  try { db.run('ALTER TABLE channels ADD COLUMN nsfw INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration nsfw:', e.message); }

  // Migration: add is_default to roles
  try { db.run('ALTER TABLE roles ADD COLUMN is_default INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration is_default:', e.message); }

  // Migration: security settings
  try { db.run('ALTER TABLE servers ADD COLUMN require_2fa INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration require_2fa:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN explicit_filter INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration explicit_filter:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN anti_spam INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration anti_spam:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN anti_raid INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration anti_raid:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN block_links INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration block_links:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN lockdown INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration lockdown:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN slowmode_global INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration slowmode_global:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN max_role_members INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration max_role_members:', e.message); }
  try { db.run('ALTER TABLE servers ADD COLUMN is_public INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration is_public:', e.message); }

  // Migration: user security settings
  try { db.run('ALTER TABLE users ADD COLUMN allow_dm INTEGER DEFAULT 1'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration allow_dm:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN show_status INTEGER DEFAULT 1'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration show_status:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN allow_friend_req INTEGER DEFAULT 1'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration allow_friend_req:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN require_2fa INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration users_require_2fa:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN blocked_users TEXT DEFAULT "[]"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration blocked_users:', e.message); }

  // Migration: casino fields
  try { db.run('ALTER TABLE users ADD COLUMN casino_unlocked INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration casino_unlocked:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN math_test_passed INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration math_test_passed:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN unlocked_features TEXT DEFAULT "[]"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration unlocked_features:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT "free"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration subscription:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN subscription_expires DATETIME DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration subscription_expires:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT "free"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration subscription:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN subscription_expires DATETIME DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration subscription_expires:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT "free"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration subscription:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN subscription_expires DATETIME DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration subscription_expires:', e.message); }

  // Migration: redeem codes table
  db.run(`
    CREATE TABLE IF NOT EXISTS redeem_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User emoji collection
  db.run(`
    CREATE TABLE IF NOT EXISTS user_collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      emoji_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      equipped INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, emoji_id)
    )
  `);

  // User achievements
  db.run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, achievement_id)
    )
  `);

  // Migration: thread_id on messages
  try { db.run('ALTER TABLE messages ADD COLUMN thread_id TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration thread_id:', e.message); }

  // Migration: edited_at on dm_messages
  try { db.run('ALTER TABLE dm_messages ADD COLUMN edited_at DATETIME DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration dm_edited_at:', e.message); }

  // Migration: casino_wins on users
  try { db.run('ALTER TABLE users ADD COLUMN casino_wins INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration casino_wins:', e.message); }

  // Migration: coins on users
  try { db.run('ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration coins:', e.message); }

  // Migration: role on users
  try { db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration role:', e.message); }

  // Migration: profile customizations on users
  try { db.run('ALTER TABLE users ADD COLUMN profile_border TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration profile_border:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN name_color TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration name_color:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN profile_theme TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration profile_theme:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN profile_bio TEXT DEFAULT ""'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration profile_bio:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN collection_hidden INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration collection_hidden:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN casino_win_streak INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration casino_win_streak:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN last_win_time TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration last_win_time:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration xp:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration level:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN daily_bonus_claimed INTEGER DEFAULT 0'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration daily_bonus_claimed:', e.message); }
  try { db.run('ALTER TABLE users ADD COLUMN last_daily TEXT DEFAULT NULL'); } catch (e) { if (!e.message.includes('duplicate column')) console.warn('[DB] Migration last_daily:', e.message); }

  // Table: server_boosts
  db.run(`CREATE TABLE IF NOT EXISTS server_boosts (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    tier INTEGER DEFAULT 1,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(server_id, user_id)
  )`);

  // Table: user_inventory (purchased shop items)
  db.run(`CREATE TABLE IF NOT EXISTS user_inventory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Generate tags for existing users without one
  const usersWithoutTag = query('SELECT id FROM users WHERE tag IS NULL OR tag = ""');
  usersWithoutTag.forEach(u => {
    const tag = generateUniqueTag();
    run('UPDATE users SET tag = ? WHERE id = ?', [tag, u.id]);
  });

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id)',
    'CREATE INDEX IF NOT EXISTS idx_server_members_user ON server_members(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_server_members_server ON server_members(server_id)',
    'CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(server_id)',
    'CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id)',
    'CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id)',
    'CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel ON pinned_messages(channel_id)',
    'CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(user_id, read)',
    'CREATE INDEX IF NOT EXISTS idx_voice_state_channel ON voice_state(channel_id)',
    'CREATE INDEX IF NOT EXISTS idx_voice_state_user ON voice_state(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_friends_users ON friends(user_id, friend_id)',
    'CREATE INDEX IF NOT EXISTS idx_dm_messages_channel ON dm_messages(dm_channel_id)',
    'CREATE INDEX IF NOT EXISTS idx_dm_members_user ON dm_members(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_threads_channel ON threads(channel_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_server ON events(server_id)',
    'CREATE INDEX IF NOT EXISTS idx_channel_reads_user ON channel_reads(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_member_roles_user ON member_roles(user_id, server_id)',
    'CREATE INDEX IF NOT EXISTS idx_server_bans_server ON server_bans(server_id, user_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_chats_user ON ai_chats(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_messages_chat ON ai_messages(chat_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_tag ON users(tag)',
  ];
  indexes.forEach(sql => { try { db.run(sql); } catch (e) {} });

  dirty = true;
  flushIfDirty();

  return db;
}

function generateUniqueTag() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let tag;
  let attempts = 0;
  do {
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    tag = result;
    attempts++;
  } while (queryOne('SELECT id FROM users WHERE tag = ?', [tag]) && attempts < 100);
  return tag;
}

let dirty = false;
let saving = false;

function saveDatabase() {
  if (db && !saving) {
    saving = true;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFile(dbPath, buffer, (err) => {
      saving = false;
      if (err) console.error('[DB] Write error:', err.message);
    });
  }
}

function flushIfDirty() {
  if (dirty && !saving) {
    saving = true;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFile(dbPath, buffer, (err) => {
      saving = false;
      if (err) {
        console.error('[DB] Write error:', err.message);
      } else {
        dirty = false;
      }
    });
  }
}

setInterval(flushIfDirty, 5000);

process.on('SIGINT', () => { saveDatabaseSync(); process.exit(0); });
process.on('SIGTERM', () => { saveDatabaseSync(); process.exit(0); });
process.on('exit', saveDatabaseSync);

function saveDatabaseSync() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {}
  }
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result = undefined;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function run(sql, params = []) {
  db.run(sql, params);
  dirty = true;
}

module.exports = { initDatabase, query, queryOne, run, saveDatabase, generateUniqueTag };
