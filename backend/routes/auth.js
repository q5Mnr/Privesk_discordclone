const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run, generateUniqueTag } = require('../database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      logger.warn('register_duplicate', `email=${email} username=${username}`, { user: '', ip: req.ip });
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const tag = generateUniqueTag();

    run('INSERT INTO users (id, username, email, password, tag) VALUES (?, ?, ?, ?, ?)', [userId, username, email, hashedPassword, tag]);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    const user = queryOne('SELECT id, username, email, tag, avatar, status, custom_status, created_at FROM users WHERE id = ?', [userId]);

    logger.info('register', `New user registered: ${username}#${tag}`, { user: userId, ip: req.ip });
    res.status(201).json({ token, user });
  } catch (error) {
    logger.error('register_error', error.message, { stack: error.stack, ip: req.ip });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      logger.warn('login_failed', `User not found: ${email}`, { ip: req.ip });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('login_failed', `Wrong password: ${email}`, { user: user.id, ip: req.ip });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    run('UPDATE users SET status = ? WHERE id = ?', ['online', user.id]);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;

    logger.info('login', `User logged in: ${user.username}#${user.tag}`, { user: user.id, ip: req.ip });
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    logger.error('login_error', error.message, { stack: error.stack, ip: req.ip });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, email, tag, avatar, status, custom_status, created_at, allow_dm, show_status, allow_friend_req, require_2fa, blocked_users, subscription, subscription_expires, coins, role, profile_border, name_color, profile_theme, profile_bio, xp, level FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check if subscription expired
    if (user.subscription !== 'free' && user.subscription_expires && new Date(user.subscription_expires) < new Date()) {
      user.subscription = 'free';
      user.subscription_expires = null;
      run('UPDATE users SET subscription = "free", subscription_expires = NULL WHERE id = ?', [req.userId]);
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { username, avatar, status, custom_status, tag, allow_dm, show_status, allow_friend_req, require_2fa, blocked_users, email, current_password, new_password, profile_bio } = req.body;

    if (username) {
      const existing = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.userId]);
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    if (tag) {
      const cleanTag = tag.replace(/[^a-z0-9]/g, '').toLowerCase().slice(0, 4);
      if (cleanTag.length !== 4) {
        return res.status(400).json({ error: 'Tag must be 4 characters (a-z, 0-9)' });
      }
      const existing = queryOne('SELECT id FROM users WHERE tag = ? AND id != ?', [cleanTag, req.userId]);
      if (existing) {
        return res.status(400).json({ error: 'Tag already taken' });
      }
      run('UPDATE users SET tag = ? WHERE id = ?', [cleanTag, req.userId]);
    }

    if (username) run('UPDATE users SET username = ? WHERE id = ?', [username, req.userId]);
    if (avatar !== undefined) run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId]);
    if (status) run('UPDATE users SET status = ? WHERE id = ?', [status, req.userId]);
    if (custom_status !== undefined) run('UPDATE users SET custom_status = ? WHERE id = ?', [custom_status, req.userId]);
    if (profile_bio !== undefined) run('UPDATE users SET profile_bio = ? WHERE id = ?', [profile_bio, req.userId]);
    if (allow_dm !== undefined) run('UPDATE users SET allow_dm = ? WHERE id = ?', [allow_dm, req.userId]);
    if (show_status !== undefined) run('UPDATE users SET show_status = ? WHERE id = ?', [show_status, req.userId]);
    if (allow_friend_req !== undefined) run('UPDATE users SET allow_friend_req = ? WHERE id = ?', [allow_friend_req, req.userId]);
    if (require_2fa !== undefined) run('UPDATE users SET require_2fa = ? WHERE id = ?', [require_2fa, req.userId]);
    if (blocked_users !== undefined) run('UPDATE users SET blocked_users = ? WHERE id = ?', [JSON.stringify(blocked_users), req.userId]);

    if (current_password && new_password) {
      const user = queryOne('SELECT password FROM users WHERE id = ?', [req.userId]);
      const valid = bcrypt.compareSync(current_password, user.password);
      if (!valid) return res.status(400).json({ error: 'Неверный текущий пароль' });
      if (new_password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
      const hashed = bcrypt.hashSync(new_password, 10);
      run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.userId]);
    }

    if (status) {
      const io = req.app.get('io');
      if (io) {
        io.emit('user_status', { userId: req.userId, status });
      }
    }

    const user = queryOne('SELECT id, username, email, tag, avatar, status, custom_status, created_at, allow_dm, show_status, allow_friend_req, require_2fa, blocked_users, coins, role, profile_border, name_color, profile_theme, profile_bio FROM users WHERE id = ?', [req.userId]);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/search', authMiddleware, (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    if (!q || q.trim().length < 1) return res.json({ users: [] });

    const users = query(
      'SELECT id, username, tag, avatar, status FROM users WHERE (username LIKE ? OR tag LIKE ?) AND id != ? LIMIT 10',
      [`%${q}%`, `%${q}%`, req.userId]
    );

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/friends', authMiddleware, (req, res) => {
  try {
    const friends = query(`
      SELECT u.id, u.username, u.tag, u.avatar, u.status, f.status as friendship_status, f.id as request_id
      FROM friends f
      JOIN users u ON (u.id = f.friend_id AND f.user_id = ?) OR (u.id = f.user_id AND f.friend_id = ?)
      WHERE f.status = 'accepted'
    `, [req.userId, req.userId]);

    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/friends/pending', authMiddleware, (req, res) => {
  try {
    const incoming = query(`
      SELECT u.id, u.username, u.tag, u.avatar, u.status, f.id as request_id, f.created_at
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [req.userId]);

    const outgoing = query(`
      SELECT u.id, u.username, u.tag, u.avatar, u.status, f.id as request_id, f.created_at
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [req.userId]);

    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/friends/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const targetUser = queryOne('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = queryOne('SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.userId, userId, userId, req.userId]);

    if (existing) {
      if (existing.status === 'pending' && existing.user_id === userId) {
        run('UPDATE friends SET status = ? WHERE id = ?', ['accepted', existing.id]);
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${userId}`).emit('friend_request_accepted', { fromUserId: req.userId });
        }
        return res.json({ message: 'Friend request accepted', status: 'accepted' });
      }
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const id = uuidv4();
    run('INSERT INTO friends (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)', [id, req.userId, userId, 'pending']);

    const sender = queryOne('SELECT id, username, tag, avatar FROM users WHERE id = ?', [req.userId]);
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('friend_request', {
        fromUserId: req.userId,
        fromUsername: sender.username,
        fromTag: sender.tag,
        fromAvatar: sender.avatar
      });
    }

    res.json({ message: 'Friend request sent', status: 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/friends/:userId/accept', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;

    const existing = queryOne('SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = ?',
      [userId, req.userId, 'pending']);

    if (!existing) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    run('UPDATE friends SET status = ? WHERE id = ?', ['accepted', existing.id]);

    try { require('./collection').checkAchievements(req.userId); } catch (e) {}
    try { require('./collection').checkAchievements(userId); } catch (e) {}

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('friend_request_accepted', { fromUserId: req.userId });
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/friends/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;

    const existing = queryOne('SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.userId, userId, userId, req.userId]);

    if (!existing) {
      return res.status(404).json({ error: 'Friend relationship not found' });
    }

    run('DELETE FROM friends WHERE id = ?', [existing.id]);

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET user profile by id
router.get('/profile/:userId', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, tag, avatar, status, custom_status, created_at, subscription, subscription_expires, profile_border, name_color, profile_theme, profile_bio, xp, level FROM users WHERE id = ?',
      [req.params.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const mutualServers = query(`
      SELECT s.id, s.name, s.icon
      FROM servers s
      JOIN server_members sm1 ON s.id = sm1.server_id AND sm1.user_id = ?
      JOIN server_members sm2 ON s.id = sm2.server_id AND sm2.user_id = ?
    `, [req.userId, req.params.userId]);

    const friendship = queryOne(`
      SELECT status FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `, [req.userId, req.params.userId, req.params.userId, req.userId]);

    res.json({ ...user, mutualServers, friendship: friendship?.status || null });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET unread counts for all channels
router.get('/unread', authMiddleware, (req, res) => {
  try {
    const servers = query(`
      SELECT s.id as server_id, s.name
      FROM servers s JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = ?
    `, [req.userId]);

    const result = [];

    for (const srv of servers) {
      const channels = query(`
        SELECT c.id, c.name, c.type,
          (SELECT COUNT(*) FROM messages m
           WHERE m.channel_id = c.id
           AND m.user_id != ?
           AND m.created_at > COALESCE(
             (SELECT last_read_at FROM channel_reads WHERE user_id = ? AND channel_id = c.id),
             '2000-01-01'
           )
          ) as unread_count
        FROM channels c WHERE c.server_id = ?
      `, [req.userId, req.userId, srv.server_id]);

      result.push({ ...srv, channels });
    }

    res.json(result);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mark channel as read
router.post('/read/:channelId', authMiddleware, (req, res) => {
  try {
    run(`INSERT OR REPLACE INTO channel_reads (user_id, channel_id, last_read_at)
         VALUES (?, ?, datetime('now'))`, [req.userId, req.params.channelId]);
    run(`UPDATE mentions SET read = 1 WHERE user_id = ? AND read = 0 AND message_id IN
         (SELECT id FROM messages WHERE channel_id = ?)`, [req.userId, req.params.channelId]);
    res.json({ success: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET mention counts per server
router.get('/mentions', authMiddleware, (req, res) => {
  try {
    const servers = query(`
      SELECT s.id as server_id, s.name,
        (SELECT COUNT(*) FROM mentions m
         JOIN messages msg ON m.message_id = msg.id
         JOIN channels c ON msg.channel_id = c.id
         WHERE m.user_id = ? AND m.read = 0 AND c.server_id = s.id
        ) as mention_count,
        (SELECT COUNT(*) FROM mentions m
         JOIN messages msg ON m.message_id = msg.id
         JOIN channels c ON msg.channel_id = c.id
         WHERE m.user_id = ? AND m.read = 0 AND c.server_id = s.id
        ) as total_mentions
      FROM servers s
      JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = ?
    `, [req.userId, req.userId, req.userId]);

    const channels = query(`
      SELECT c.id, c.server_id,
        (SELECT COUNT(*) FROM mentions m
         JOIN messages msg ON m.message_id = msg.id
         WHERE m.user_id = ? AND m.read = 0 AND msg.channel_id = c.id
        ) as mention_count
      FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE sm.user_id = ?
    `, [req.userId, req.userId]);

    res.json({ servers, channels });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all notifications for user (mentions + events)
router.get('/notifications', authMiddleware, (req, res) => {
  try {
    const mentions = query(`
      SELECT m.*, msg.content as message_content, msg.user_id as sender_id,
        u.username as sender_username, u.avatar as sender_avatar,
        ch.name as channel_name, s.name as server_name, s.id as server_id
      FROM mentions m
      JOIN messages msg ON m.message_id = msg.id
      JOIN users u ON msg.user_id = u.id
      JOIN channels ch ON msg.channel_id = ch.id
      JOIN servers s ON ch.server_id = s.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [req.userId]);

    const events = query(`
      SELECT e.*, s.name as server_name, s.id as server_id
      FROM events e
      JOIN servers s ON e.server_id = s.id
      JOIN server_members sm ON sm.server_id = s.id
      WHERE sm.user_id = ? AND e.start_time > datetime('now')
      ORDER BY e.start_time ASC
      LIMIT 20
    `, [req.userId]);

    res.json({ mentions, events });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mark all mentions as read for a channel
router.post('/mentions/read/:channelId', authMiddleware, (req, res) => {
  try {
    run(`UPDATE mentions SET read = 1 WHERE user_id = ? AND read = 0 AND message_id IN
         (SELECT id FROM messages WHERE channel_id = ?)`, [req.userId, req.params.channelId]);
    res.json({ success: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === CASINO SYSTEM ===

// POST /api/auth/redeem-code
router.post('/redeem-code', authMiddleware, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const userId = req.userId;
    const existing = queryOne('SELECT id FROM redeem_codes WHERE user_id = ? AND code = ?', [userId, code]);
    if (existing) return res.status(400).json({ error: 'Код уже использован' });

    const CODE_MAP = {
      '777': { feature: 'casino', message: '🎰 Казино разблокировано!' },
      'sosisadmon': { feature: 'sosiska', subscription: 'sosiska', days: 30, message: '🌭 Подписка «Сосиска» активирована на 30 дней!' },
    };

    const entry = CODE_MAP[code];
    if (!entry) return res.status(400).json({ error: 'Неверный код' });

    const user = queryOne('SELECT unlocked_features FROM users WHERE id = ?', [userId]);
    let features = [];
    try { features = JSON.parse(user?.unlocked_features || '[]'); } catch (e) {}
    if (!features.includes(entry.feature)) features.push(entry.feature);

    const updates = ['unlocked_features = ?'];
    const params = [JSON.stringify(features)];

    if (entry.feature === 'casino') {
      updates.push('casino_unlocked = 1');
    }

    if (entry.subscription) {
      const expires = new Date(Date.now() + (entry.days || 30) * 86400000).toISOString();
      updates.push('subscription = ?');
      params.push(entry.subscription);
      updates.push('subscription_expires = ?');
      params.push(expires);
    }

    params.push(userId);
    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    run('INSERT INTO redeem_codes (id, user_id, code) VALUES (?, ?, ?)', [uuidv4(), userId, code]);

    return res.json({ success: true, feature: entry.feature, features, message: entry.message });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/casino-status
router.get('/casino-status', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT casino_unlocked FROM users WHERE id = ?', [req.userId]);
    res.json({ unlocked: !!user?.casino_unlocked });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/subscription — get user subscription info
router.get('/subscription', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT subscription, subscription_expires FROM users WHERE id = ?', [req.userId]);
    let tier = user?.subscription || 'free';
    const expires = user?.subscription_expires;
    if (tier !== 'free' && expires && new Date(expires) < new Date()) {
      tier = 'free';
      run('UPDATE users SET subscription = "free", subscription_expires = NULL WHERE id = ?', [req.userId]);
    }
    res.json({ tier, subscription: tier, expires, tiers: SUBSCRIPTION_TIERS });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const SUBSCRIPTION_TIERS = {
  free: { name: 'Free', price: 0, features: ['base_settings', '2gb_files', 'photo_ai', 'text_ai', 'friends_channels'] },
  privet: { name: 'Privet', price: 999, features: ['3gb_files', 'custom_profile', 'badge', 'thanks', 'standard_voice_ai', 'all_free'] },
  privet_plus: { name: 'Privet Plus', price: 1499, features: ['1tb_files', 'unique_badge', 'full_voice_ai', 'full_profile', 'million_thanks', 'all_privet'] },
  sosiska: { name: 'Сосиска', price: 2499, features: ['moderation', 'ban_members', 'kick_members', 'manage_messages', 'moderator_badge', 'all_privet_plus'], description: 'Модератор сервера с правами бана' },
};

// POST /api/auth/grant-subscription — grant subscription (casino prize or admin)
router.post('/grant-subscription', authMiddleware, (req, res) => {
  try {
    const { tier, days } = req.body;
    if (!tier || !days) return res.status(400).json({ error: 'tier and days required' });

    const userId = req.userId;
    const user = queryOne('SELECT subscription, subscription_expires FROM users WHERE id = ?', [userId]);

    const now = new Date();
    let base = now;
    if (user?.subscription !== 'free' && user?.subscription_expires) {
      const existing = new Date(user.subscription_expires);
      if (existing > now) base = existing;
    }
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    run('UPDATE users SET subscription = ?, subscription_expires = ? WHERE id = ?', [tier, newExpiry.toISOString(), userId]);

    logger.info('subscription', `User ${userId} granted ${tier} for ${days} days`);
    return res.json({ success: true, tier, expires: newExpiry.toISOString() });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/buy-subscription — buy subscription (simulated payment)
router.post('/buy-subscription', authMiddleware, (req, res) => {
  try {
    const { tier } = req.body;
    if (!SUBSCRIPTION_TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });
    if (tier === 'free') return res.status(400).json({ error: 'Free tier cannot be bought' });

    const expires = new Date(Date.now() + 30 * 86400000).toISOString();
    run('UPDATE users SET subscription = ?, subscription_expires = ? WHERE id = ?', [tier, expires, req.userId]);

    logger.info('subscription', `User ${req.userId} bought ${tier}`);
    res.json({ success: true, tier, expires, message: `${SUBSCRIPTION_TIERS[tier].name} активирована на 30 дней!` });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/all-subscriptions — get all users subscriptions (for badges)
router.get('/all-subscriptions', authMiddleware, (req, res) => {
  try {
    const users = query('SELECT id, subscription, subscription_expires FROM users WHERE subscription != "free" AND (subscription_expires IS NULL OR subscription_expires > datetime("now"))');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/activate-subscription — activate subscription (casino win or manual)
router.post('/activate-subscription', authMiddleware, (req, res) => {
  try {
    const { plan, days } = req.body;
    const validPlans = ['free', 'privet', 'privet_plus'];
    if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

    const duration = days || 7;
    const expires = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    run('UPDATE users SET subscription = ?, subscription_expires = ? WHERE id = ?', [plan, expires, req.userId]);

    return res.json({ success: true, subscription: plan, expires });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/features — get all unlocked features
router.get('/features', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT unlocked_features FROM users WHERE id = ?', [req.userId]);
    let features = [];
    try { features = JSON.parse(user?.unlocked_features || '[]'); } catch (e) {}
    res.json({ features });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/unlock-feature — unlock a feature by code
router.post('/unlock-feature', authMiddleware, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const userId = req.userId;
    const user = queryOne('SELECT unlocked_features FROM users WHERE id = ?', [userId]);
    let features = [];
    try { features = JSON.parse(user?.unlocked_features || '[]'); } catch (e) {}

    // Check if already redeemed this code
    const existing = queryOne('SELECT id FROM redeem_codes WHERE user_id = ? AND code = ?', [userId, code]);
    if (existing) return res.status(400).json({ error: 'Код уже использован' });

    // Code → feature mapping
    const CODE_MAP = {
      '777': 'casino',
      // Add more codes here later:
      // 'ABC': 'feature_name',
      // 'XYZ': 'another_feature',
    };

    const featureName = CODE_MAP[code];
    if (!featureName) return res.status(400).json({ error: 'Неверный код' });

    if (features.includes(featureName)) {
      return res.status(400).json({ error: 'Эта фича уже разблокирована' });
    }

    features.push(featureName);
    run('UPDATE users SET unlocked_features = ? WHERE id = ?', [JSON.stringify(features), userId]);
    run('INSERT INTO redeem_codes (id, user_id, code) VALUES (?, ?, ?)', [uuidv4(), userId, code]);

    // Also set casino_unlocked for backward compat
    if (featureName === 'casino') {
      run('UPDATE users SET casino_unlocked = 1 WHERE id = ?', [userId]);
    }

    return res.json({ success: true, feature: featureName, features, message: `Фича "${featureName}" разблокирована!` });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/reset-casino (admin only)
router.get('/reset-casino', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    run('DELETE FROM redeem_codes');
    run('UPDATE users SET casino_unlocked = 0, unlocked_features = "[]"');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/casino-win — отключено
router.post('/casino-win', authMiddleware, (req, res) => {
  return res.status(410).json({ error: 'Награда за казино отключена' });
});

// POST /api/auth/casino-win-count — инкремент счётчика побед + монеты + стрик
router.post('/casino-win-count', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT casino_win_streak, last_win_time FROM users WHERE id = ?', [req.userId]);
    let streak = (user?.casino_win_streak || 0);
    const lastWin = user?.last_win_time ? new Date(user.last_win_time).getTime() : 0;
    const now = Date.now();
    if (!lastWin || (now - lastWin) > 3600000) {
      streak = 0;
    }
    streak += 1;
    run('UPDATE users SET casino_wins = COALESCE(casino_wins, 0) + 1, casino_win_streak = ?, last_win_time = datetime(\'now\') WHERE id = ?', [streak, req.userId]);
    run('UPDATE users SET coins = COALESCE(coins, 0) + 200 WHERE id = ?', [req.userId]);
    const updated = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    res.json({ success: true, coins: updated?.coins || 0, streak });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/casino-loss — сброс стрика при проигрыше
router.post('/casino-loss', authMiddleware, (req, res) => {
  try {
    run('UPDATE users SET casino_win_streak = 0, last_win_time = NULL WHERE id = ?', [req.userId]);
    res.json({ success: true, streak: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dev mode: update coins (admin only)
router.post('/update-coins', authMiddleware, (req, res) => {
  try {
    const caller = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
    if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { userId, coins } = req.body;
    const targetId = userId || req.userId;
    run('UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?', [coins || 0, targetId]);
    const user = queryOne('SELECT coins FROM users WHERE id = ?', [targetId]);
    res.json({ success: true, coins: user?.coins || 0 });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dev mode: update role (admin only)
router.post('/update-role', authMiddleware, (req, res) => {
  try {
    const caller = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
    if (!caller || caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { userId, role } = req.body;
    const targetId = userId || req.userId;
    run('UPDATE users SET role = ? WHERE id = ?', [role || 'user', targetId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User statistics
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, coins, role, avatar, created_at, profile_bio, xp, level, casino_wins, daily_bonus_claimed FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const msgCount = queryOne('SELECT COUNT(*) as cnt FROM messages WHERE user_id = ?', [req.userId]);
    const friendCount = queryOne('SELECT COUNT(*) as cnt FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = ?', [req.userId, req.userId, 'accepted']);
    const serverCount = queryOne('SELECT COUNT(*) as cnt FROM server_members WHERE user_id = ?', [req.userId]);
    const achieveCount = queryOne('SELECT COUNT(*) as cnt FROM user_achievements WHERE user_id = ?', [req.userId]);
    const emojiCount = queryOne('SELECT COUNT(*) as cnt FROM user_collection WHERE user_id = ?', [req.userId]);
    const casinoStreak = queryOne('SELECT COALESCE(casino_win_streak, 0) as streak FROM users WHERE id = ?', [req.userId]);

    const equippedEmoji = queryOne('SELECT emoji_id FROM user_collection WHERE user_id = ? AND equipped = 1 LIMIT 1', [req.userId]);

    res.json({
      user: {
        ...user,
        role_name: user.role === 'admin' ? 'Администратор' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'
      },
      stats: {
        messages: msgCount?.cnt || 0,
        friends: friendCount?.cnt || 0,
        servers: serverCount?.cnt || 0,
        achievements: achieveCount?.cnt || 0,
        emojis: emojiCount?.cnt || 0,
        casino_wins: user.casino_wins || 0,
        casino_streak: casinoStreak?.streak || 0,
        daily_claimed: user.daily_bonus_claimed || 0,
        equipped_emoji: equippedEmoji || null,
        account_age_days: Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
      }
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const byCoins = query('SELECT id, username, avatar, coins FROM users ORDER BY coins DESC LIMIT 10');
    const byMessages = query('SELECT u.id, u.username, u.avatar, COUNT(m.id) as msg_count FROM users u LEFT JOIN messages m ON u.id = m.user_id GROUP BY u.id ORDER BY msg_count DESC LIMIT 10');
    const byCasino = query('SELECT id, username, avatar, casino_wins FROM users WHERE casino_wins > 0 ORDER BY casino_wins DESC LIMIT 10');
    const byAchievements = query('SELECT u.id, u.username, u.avatar, COUNT(ua.id) as achieve_count FROM users u LEFT JOIN user_achievements ua ON u.id = ua.user_id GROUP BY u.id ORDER BY achieve_count DESC LIMIT 10');
    const byLevel = query('SELECT id, username, avatar, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT 10');
    res.json({ byCoins, byMessages, byCasino, byAchievements, byLevel });
  } catch (e) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
