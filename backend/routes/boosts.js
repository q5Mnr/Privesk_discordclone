const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const BOOST_TIERS = [
  { tier: 1, name: 'Базовый буст', cost: 500, duration_days: 7, color: '#3b82f6', perks: ['+10% монет за сообщения', 'Буст-значок в профиле'] },
  { tier: 2, name: 'Продвинутый буст', cost: 1500, duration_days: 14, color: '#8b5cf6', perks: ['+25% монет за сообщения', 'Буст-значок', 'Приоритет в голосовых'] },
  { tier: 3, name: 'Максимальный буст', cost: 3000, duration_days: 30, color: '#f59e0b', perks: ['+50% монет за сообщения', 'Буст-значок', 'Приоритет в голосовых', 'Эксклюзивный буст-эмодзи'] },
];

const BOOST_COSTS = { 1: 500, 2: 1500, 3: 3000 };

// Get boost tiers info
router.get('/tiers', (req, res) => {
  res.json({ tiers: BOOST_TIERS });
});

// Get boosts for a server
router.get('/server/:serverId', (req, res) => {
  try {
    const boosts = query(`
      SELECT sb.*, u.username, u.avatar FROM server_boosts sb
      JOIN users u ON sb.user_id = u.id
      WHERE sb.server_id = ? AND sb.expires_at > datetime('now')
      ORDER BY sb.purchased_at DESC
    `, [req.params.serverId]);
    const total = boosts.length;
    const tier = total >= 10 ? 3 : total >= 5 ? 2 : total >= 1 ? 1 : 0;
    res.json({ boosts, total, tier });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get boost status for user in a server
router.get('/server/:serverId/me', authMiddleware, (req, res) => {
  try {
    const boost = queryOne(
      'SELECT * FROM server_boosts WHERE server_id = ? AND user_id = ? AND expires_at > datetime(\'now\')',
      [req.params.serverId, req.userId]
    );
    res.json({ boost: boost || null });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Buy a boost
router.post('/server/:serverId', authMiddleware, (req, res) => {
  try {
    const { tier } = req.body;
    if (![1, 2, 3].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

    const server = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const existing = queryOne(
      'SELECT * FROM server_boosts WHERE server_id = ? AND user_id = ? AND expires_at > datetime(\'now\')',
      [req.params.serverId, req.userId]
    );
    if (existing) return res.status(400).json({ error: 'Вы уже бустите этот сервер' });

    const cost = BOOST_COSTS[tier];
    const user = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    if ((user?.coins || 0) < cost) return res.status(400).json({ error: 'Недостаточно монет' });

    run('UPDATE users SET coins = coins - ? WHERE id = ?', [cost, req.userId]);
    const expiresAt = new Date(Date.now() + BOOST_TIERS[tier - 1].duration_days * 86400000).toISOString();
    run('INSERT INTO server_boosts (id, server_id, user_id, tier, expires_at) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.params.serverId, req.userId, tier, expiresAt]);

    const updatedUser = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    const allBoosts = query('SELECT * FROM server_boosts WHERE server_id = ? AND expires_at > datetime(\'now\')', [req.params.serverId]);

    res.json({ success: true, coins: updatedUser?.coins || 0, boostCount: allBoosts.length, tier: allBoosts.length >= 10 ? 3 : allBoosts.length >= 5 ? 2 : allBoosts.length >= 1 ? 1 : 0 });
  } catch (e) {
    console.error('Boost error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's active boosts across all servers
router.get('/my', authMiddleware, (req, res) => {
  try {
    const boosts = query(`
      SELECT sb.*, s.name as server_name, s.icon as server_icon
      FROM server_boosts sb JOIN servers s ON sb.server_id = s.id
      WHERE sb.user_id = ? AND sb.expires_at > datetime('now')
      ORDER BY sb.expires_at DESC
    `, [req.userId]);
    res.json({ boosts });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
