const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { queryOne, query, run } = require('../database');

const SHOP_ITEMS = [
  { id: 'border_gold', name: 'Золотая рамка', type: 'border', price: 500, emoji: '🖼️', description: 'Золотая рамка аватара', value: '#f59e0b' },
  { id: 'border_neon', name: 'Неоновая рамка', type: 'border', price: 800, emoji: '✨', description: 'Неоновая голубая рамка', value: '#22d3ee' },
  { id: 'border_fire', name: 'Огненная рамка', type: 'border', price: 1200, emoji: '🔥', description: 'Рамка в виде пламени', value: '#f97316' },
  { id: 'border_diamond', name: 'Бриллиантовая рамка', type: 'border', price: 2000, emoji: '💎', description: 'Роскошная бриллиантовая рамка', value: '#93c5fd' },
  { id: 'border_rainbow', name: 'Радужная рамка', type: 'border', price: 3000, emoji: '🌈', description: 'Переливающаяся радужная рамка', value: '#a855f7' },

  { id: 'color_red', name: 'Красное имя', type: 'color', price: 200, emoji: '🔴', description: 'Красный цвет имени', value: '#ef4444' },
  { id: 'color_gold', name: 'Золотое имя', type: 'color', price: 400, emoji: '🟡', description: 'Золотой цвет имени', value: '#f59e0b' },
  { id: 'color_green', name: 'Зелёное имя', type: 'color', price: 300, emoji: '🟢', description: 'Зелёный цвет имени', value: '#22c55e' },
  { id: 'color_purple', name: 'Фиолетовое имя', type: 'color', price: 500, emoji: '🟣', description: 'Фиолетовый цвет имени', value: '#a855f7' },
  { id: 'color_rainbow', name: 'Радужное имя', type: 'color', price: 1000, emoji: '🌈', description: 'Радужный градиент имени', value: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7)' },

  { id: 'theme_space', name: 'Космос', type: 'theme', price: 600, emoji: '🚀', description: 'Космическая тема профиля', value: 'linear-gradient(135deg, #312e81, #581c87, #000000)' },
  { id: 'theme_ocean', name: 'Океан', type: 'theme', price: 600, emoji: '🌊', description: 'Тема океана', value: 'linear-gradient(135deg, #1e3a5f, #164e63, #134e4a)' },
  { id: 'theme_sunset', name: 'Закат', type: 'theme', price: 600, emoji: '🌅', description: 'Тема заката', value: 'linear-gradient(135deg, #ea580c, #dc2626, #6b21a8)' },
  { id: 'theme_forest', name: 'Лес', type: 'theme', price: 600, emoji: '🌲', description: 'Тема леса', value: 'linear-gradient(135deg, #14532d, #065f46, #052e16)' },
  { id: 'theme_neon', name: 'Неон', type: 'theme', price: 1000, emoji: '💜', description: 'Неоновая тема', value: 'linear-gradient(135deg, #581c87, #86198f, #9d174d)' },
];

router.get('/catalog', authMiddleware, (req, res) => {
  try {
    const inventory = query('SELECT item_id FROM user_inventory WHERE user_id = ?', [req.userId]);
    const ownedIds = inventory.map(i => i.item_id);
    const user = queryOne('SELECT coins, profile_border, name_color, profile_theme FROM users WHERE id = ?', [req.userId]);
    const equippedValue = { border: user?.profile_border, color: user?.name_color, theme: user?.profile_theme };
    const items = SHOP_ITEMS.map(item => ({
      ...item,
      owned: ownedIds.includes(item.id),
      equipped: equippedValue[item.type] === item.value,
    }));
    res.json({ items, coins: user?.coins || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/buy', authMiddleware, (req, res) => {
  try {
    const { itemId } = req.body;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Предмет не найден' });

    const user = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = queryOne('SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?', [req.userId, itemId]);
    if (existing) return res.status(400).json({ error: 'Уже куплено' });

    if ((user.coins || 0) < item.price) return res.status(400).json({ error: 'Недостаточно монет', needed: item.price, have: user.coins || 0 });

    run('UPDATE users SET coins = coins - ? WHERE id = ?', [item.price, req.userId]);
    run('INSERT INTO user_inventory (id, user_id, item_id) VALUES (?, ?, ?)', [uuidv4(), req.userId, itemId]);

    const updated = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    res.json({ success: true, coins: updated.coins, item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/equip', authMiddleware, (req, res) => {
  try {
    const { itemId } = req.body;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Предмет не найден' });

    const owned = queryOne('SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?', [req.userId, itemId]);
    if (!owned) return res.status(400).json({ error: 'Предмет не куплен' });

    const field = item.type === 'border' ? 'profile_border' : item.type === 'color' ? 'name_color' : 'profile_theme';

    const current = queryOne(`SELECT ${field} as val FROM users WHERE id = ?`, [req.userId]);
    if (current?.val === item.value) {
      run(`UPDATE users SET ${field} = NULL WHERE id = ?`, [req.userId]);
      return res.json({ success: true, equipped: null });
    }

    run(`UPDATE users SET ${field} = ? WHERE id = ?`, [item.value, req.userId]);
    res.json({ success: true, equipped: item.value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/unequip', authMiddleware, (req, res) => {
  try {
    const { type } = req.body;
    const field = type === 'border' ? 'profile_border' : type === 'color' ? 'name_color' : type === 'theme' ? 'profile_theme' : null;
    if (!field) return res.status(400).json({ error: 'Invalid type' });
    run(`UPDATE users SET ${field} = NULL WHERE id = ?`, [req.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/coins', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    res.json({ coins: user?.coins || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/earn', authMiddleware, (req, res) => {
  try {
    const { amount, reason } = req.body;
    const validReasons = { message: 10, achievement: 50, daily: 100, casino_win: 200 };
    const coins = validReasons[reason] || amount || 0;
    if (coins <= 0 || coins > 500) return res.status(400).json({ error: 'Invalid amount' });
    run('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, req.userId]);
    const user = queryOne('SELECT coins FROM users WHERE id = ?', [req.userId]);
    res.json({ coins: user.coins, earned: coins });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
