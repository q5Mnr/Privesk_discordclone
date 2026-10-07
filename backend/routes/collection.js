const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, queryOne, run } = require('../database');

const EMOJI_CATALOG = [
  // COMMON
  { id: 'star', emoji: '⭐', name: 'Звезда', rarity: 'common', description: 'Базовая награда' },
  { id: 'fire', emoji: '🔥', name: 'Огонь', rarity: 'common', description: 'Горячий игрок' },
  { id: 'thumbsup', emoji: '👍', name: 'Лайк', rarity: 'common', description: 'Одобрение' },
  { id: 'heart', emoji: '❤️', name: 'Сердце', rarity: 'common', description: 'Любовь' },
  { id: 'moon', emoji: '🌙', name: 'Луна', rarity: 'common', description: 'Ночная сова' },
  { id: 'sun', emoji: '☀️', name: 'Солнце', rarity: 'common', description: 'Дневной свет' },
  { id: 'butterfly', emoji: '🦋', name: 'Бабочка', rarity: 'common', description: 'Красота природы' },
  { id: 'paw', emoji: '🐾', name: 'Лапка', rarity: 'common', description: 'Дружелюбие' },
  // RARE
  { id: 'rocket', emoji: '🚀', name: 'Ракета', rarity: 'rare', description: 'Быстрый старт' },
  { id: 'gem', emoji: '💎', name: 'Бриллиант', rarity: 'rare', description: 'Редкая жемчужина' },
  { id: 'skull', emoji: '💀', name: 'Череп', rarity: 'rare', description: 'Опасный игрок' },
  { id: 'lightning', emoji: '⚡', name: 'Молния', rarity: 'rare', description: 'Молниеносный' },
  { id: 'ice', emoji: '🧊', name: 'Лёд', rarity: 'rare', description: 'Холодная голова' },
  { id: 'sword', emoji: '⚔️', name: 'Мечи', rarity: 'rare', description: 'Боевой дух' },
  { id: 'shield', emoji: '🛡️', name: 'Щит', rarity: 'rare', description: 'Защитник' },
  { id: 'diamond', emoji: '💠', name: 'Ромб', rarity: 'rare', description: 'Чистый алмаз' },
  { id: 'eye', emoji: '👁️', name: 'Глаз', rarity: 'rare', description: 'Всевидящее око' },
  // EPIC
  { id: 'crown', emoji: '👑', name: 'Корона', rarity: 'epic', description: 'Король сервера' },
  { id: 'trophy', emoji: '🏆', name: 'Трофей', rarity: 'epic', description: 'Победитель турнира' },
  { id: 'ghost', emoji: '👻', name: 'Призрак', rarity: 'epic', description: 'Невидимый призрак' },
  { id: 'rainbow', emoji: '🌈', name: 'Радуга', rarity: 'epic', description: 'Радуга эмоций' },
  { id: 'volcano', emoji: '🌋', name: 'Вулкан', rarity: 'epic', description: 'Извержение' },
  { id: 'crystal', emoji: '🔮', name: 'Хрустальный шар', rarity: 'epic', description: 'Предсказывает будущее' },
  { id: 'brain', emoji: '🧠', name: 'Мозг', rarity: 'epic', description: 'Гений' },
  // LEGENDARY
  { id: 'dragon', emoji: '🐉', name: 'Дракон', rarity: 'legendary', description: 'Легендарный дракон' },
  { id: 'unicorn', emoji: '🦄', name: 'Единорог', rarity: 'legendary', description: 'Мифическое создание' },
  { id: 'alien', emoji: '👽', name: 'Инопланетянин', rarity: 'legendary', description: 'Из глубин космоса' },
  { id: 'blackhole', emoji: '🕳️', name: 'Чёрная дыра', rarity: 'legendary', description: 'Поглощает всё' },
  { id: 'shooting_star', emoji: '🌠', name: 'Падающая звезда', rarity: 'legendary', description: 'Загадай желание' },
  // SECRET (ultra-rare, nearly impossible)
  { id: 'phoenix', emoji: '🔥', name: 'Феникс', rarity: 'secret', description: '50 побед в казино' },
  { id: 'void', emoji: '🌑', name: 'Пустота', rarity: 'secret', description: '100 друзей одновременно' },
  { id: 'time', emoji: '⏳', name: 'Время', rarity: 'secret', description: '30 дней + 500 сообщений' },
  { id: 'universe', emoji: '🌌', name: 'Вселенная', rarity: 'secret', description: '10000 сообщений' },
  { id: 'infinity', emoji: '♾️', name: 'Бесконечность', rarity: 'secret', description: 'Собери ВСЕ эмодзи коллекции' },
  // ADMIN (only for admins/devmode)
  { id: 'admin_crown', emoji: '👑', name: 'Админ-корона', rarity: 'admin', description: 'Доступ только для администрации' },
  { id: 'devmode', emoji: '🔧', name: 'Режим разработчика', rarity: 'admin', description: 'Активирован режим разработчика' },
  { id: 'hacker', emoji: '💻', name: 'Хакер', rarity: 'admin', description: 'Безграничные возможности' },
  { id: 'godmode', emoji: '⚡', name: 'Гудмод', rarity: 'admin', description: 'Бог-режим' },
  { id: 'sosiska', emoji: '🌭', name: 'Сосиска', rarity: 'admin', description: 'Модератор-сосиска' },
];

const ACHIEVEMENTS = [
  // Regular
  { id: 'first_message', name: 'Первое сообщение', description: 'Отправьте первое сообщение', emoji: 'star', icon: '💬' },
  { id: 'send_100', name: 'Болтун', description: 'Отправьте 100 сообщений', emoji: 'fire', icon: '🗣️' },
  { id: 'send_1000', name: 'Мастер слов', description: 'Отправьте 1000 сообщений', emoji: 'crown', icon: '📝' },
  { id: 'win_casino', name: 'Везунчик', description: 'Выиграйте в казино', emoji: 'gem', icon: '🎰' },
  { id: 'win_10_casino', name: 'Игрок', description: 'Выиграйте 10 раз в казино', emoji: 'trophy', icon: '🎲' },
  { id: 'win_streak_5', name: 'На волне', description: '5 побед подряд в казино', emoji: 'lightning', icon: '⚡' },
  { id: 'first_friend', name: 'Дружелюбный', description: 'Добавьте первого друга', emoji: 'heart', icon: '🤝' },
  { id: 'have_10_friends', name: 'Социальная бабочка', description: 'Имейте 10 друзей', emoji: 'butterfly', icon: '👥' },
  { id: 'join_server', name: 'Исследователь', description: 'Вступите в сервер', emoji: 'rocket', icon: '🌍' },
  { id: 'join_5_servers', name: 'Путешественник', description: 'Вступите в 5 серверов', emoji: 'rainbow', icon: '🗺️' },
  { id: 'create_server', name: 'Архитектор', description: 'Создайте сервер', emoji: 'shield', icon: '🏗️' },
  { id: 'voice_1_hour', name: 'Голосовой чат', description: 'Проведите 1 час в голосовом канале', emoji: 'lightning', icon: '🎙️' },
  { id: 'collector_5', name: 'Коллекционер', description: 'Соберите 5 эмодзи', emoji: 'paw', icon: '📦' },
  { id: 'collector_10', name: 'Собиратель', description: 'Соберите 10 эмодзи', emoji: 'brain', icon: '🗄️' },
  { id: 'collector_20', name: 'Мастер коллекций', description: 'Соберите 20 эмодзи', emoji: 'dragon', icon: '👑' },
  { id: 'rich', name: 'Богач', description: 'Накопите 10000 монет', emoji: 'blackhole', icon: '💰' },
  { id: 'reaction_giver', name: 'Реакции', description: 'Поставьте 50 реакций', emoji: 'eye', icon: '😍' },
  { id: 'night_owl', name: 'Ночная сова', description: 'Отправьте сообщение после полуночи', emoji: 'moon', icon: '🦉' },
  { id: 'early_bird', name: 'Ранняя пташка', description: 'Отправьте сообщение до 7 утра', emoji: 'sun', icon: '🐦' },
  // SECRET (ultra-rare)
  { id: 'phoenix_achievement', name: 'Восрождение Феникса', description: 'Выиграйте 50 раз в казино', emoji: 'phoenix', icon: '🔥' },
  { id: 'void_achievement', name: 'Хозяин Пустоты', description: 'Имейте 100 друзей одновременно', emoji: 'void', icon: '🌑' },
  { id: 'time_achievement', name: 'Повелитель времени', description: '30 дней аккаунта + 500 сообщений', emoji: 'time', icon: '⏳' },
  { id: 'universe_achievement', name: 'Познание Вселенной', description: 'Отправьте 10000 сообщений', emoji: 'universe', icon: '🌌' },
  { id: 'infinity_achievement', name: 'Бесконечность', description: 'Соберите ВСЕ эмодзи коллекции', emoji: 'infinity', icon: '♾️' },
  // ADMIN
  { id: 'admin_role', name: 'Власть', description: 'Вы — администратор', emoji: 'admin_crown', icon: '👑' },
  { id: 'devmode_achievement', name: 'Режим разработчика', description: 'Активирован devmode', emoji: 'devmode', icon: '🔧' },
  { id: 'hacker_achievement', name: 'Хакер системы', description: 'Админ с полным доступом', emoji: 'hacker', icon: '💻' },
  { id: 'godmode_achievement', name: 'Бог-режим', description: 'Владыка сервера', emoji: 'godmode', icon: '⚡' },
  // SOSISKA
  { id: 'sosiska_achievement', name: 'Сосиска-модератор', description: 'Имеете подписку «Сосиска»', emoji: 'sosiska', icon: '🌭' },
];

function grantEmoji(userId, emojiId) {
  try {
    run('INSERT OR IGNORE INTO user_collection (user_id, emoji_id) VALUES (?, ?)', [userId, emojiId]);
  } catch (e) { console.warn('[ACH] grantEmoji error:', e.message); }
}

function grantAchievement(userId, achievementId) {
  const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!ach) return;
  try {
    run('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)', [userId, achievementId]);
    grantEmoji(userId, ach.emoji);
    try { run('UPDATE users SET coins = COALESCE(coins, 0) + 50 WHERE id = ?', [userId]); } catch (e) {}
    console.log(`[ACH] Granted achievement "${achievementId}" to user ${userId}`);
  } catch (e) { console.warn('[ACH] grantAchievement error:', e.message); }
}

function checkAchievements(userId) {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return [];

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn('[ACH]', e.message); return null; } };

  const msgs = safe(() => queryOne('SELECT COUNT(*) as cnt FROM messages WHERE user_id = ?', [userId]));
  const friends = safe(() => queryOne('SELECT COUNT(*) as cnt FROM friends WHERE user_id = ? AND status = ?', [userId, 'accepted']));
  const servers = safe(() => queryOne('SELECT COUNT(*) as cnt FROM server_members WHERE user_id = ?', [userId]));
  const created = safe(() => queryOne('SELECT COUNT(*) as cnt FROM servers WHERE owner_id = ?', [userId]));
  const collCount = safe(() => queryOne('SELECT COUNT(*) as cnt FROM user_collection WHERE user_id = ?', [userId]));
  const reactions = safe(() => queryOne('SELECT COUNT(*) as cnt FROM reactions WHERE user_id = ?', [userId]));
  const casinoWins = safe(() => queryOne('SELECT casino_wins as cnt FROM users WHERE id = ?', [userId]));
  const coinsData = safe(() => queryOne('SELECT coins as cnt FROM users WHERE id = ?', [userId]));
  const totalEmojis = safe(() => queryOne('SELECT COUNT(DISTINCT emoji_id) as cnt FROM user_collection WHERE user_id = ?', [userId]));
  const accountAge = safe(() => queryOne('SELECT CAST((julianday("now") - julianday(created_at)) AS INTEGER) as days FROM users WHERE id = ?', [userId]));

  const earned = safe(() => query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]));
  const earnedIds = earned ? earned.map(r => r.achievement_id) : [];
  const newAchievements = [];

  const isSosiska = user.subscription === 'sosiska' && (!user.subscription_expires || new Date(user.subscription_expires) > new Date());

  if (isSosiska) {
    for (const ach of ACHIEVEMENTS) {
      if (!earnedIds.includes(ach.id)) {
        grantAchievement(userId, ach.id);
        newAchievements.push(ach.id);
      }
    }
    for (const emoji of EMOJI_CATALOG) {
      grantEmoji(userId, emoji.id);
    }
    if (newAchievements.length > 0) console.log(`[ACH] Sosiska user ${userId} earned ALL achievements:`, newAchievements);
    return newAchievements;
  }

  const checks = [
    // Regular
    ['first_message', (msgs?.cnt || 0) >= 1],
    ['send_100', (msgs?.cnt || 0) >= 100],
    ['send_1000', (msgs?.cnt || 0) >= 1000],
    ['first_friend', (friends?.cnt || 0) >= 1],
    ['have_10_friends', (friends?.cnt || 0) >= 10],
    ['join_server', (servers?.cnt || 0) >= 1],
    ['join_5_servers', (servers?.cnt || 0) >= 5],
    ['create_server', (created?.cnt || 0) >= 1],
    ['collector_5', (collCount?.cnt || 0) >= 5],
    ['collector_10', (collCount?.cnt || 0) >= 10],
    ['collector_20', (collCount?.cnt || 0) >= 20],
    ['reaction_giver', (reactions?.cnt || 0) >= 50],
    ['win_casino', (casinoWins?.cnt || 0) >= 1],
    ['win_10_casino', (casinoWins?.cnt || 0) >= 10],
    ['win_streak_5', (user.casino_win_streak || 0) >= 5],
    ['rich', (coinsData?.cnt || 0) >= 10000],
    ['night_owl', (() => { const h = new Date().getUTCHours() + 3; return h >= 0 && h < 7; })()],
    ['early_bird', (() => { const h = new Date().getUTCHours() + 3; return h >= 4 && h < 7; })()],
    // SECRET (ultra-rare)
    ['phoenix_achievement', (casinoWins?.cnt || 0) >= 50],
    ['void_achievement', (friends?.cnt || 0) >= 100],
    ['time_achievement', (accountAge?.days || 0) >= 30 && (msgs?.cnt || 0) >= 500],
    ['universe_achievement', (msgs?.cnt || 0) >= 10000],
    ['infinity_achievement', (totalEmojis?.cnt || 0) >= 29],
    // ADMIN
    ['admin_role', user.role === 'admin'],
    ['devmode_achievement', user.role === 'admin'],
    ['hacker_achievement', user.role === 'admin'],
    ['godmode_achievement', user.role === 'admin'],
    ['sosiska_achievement', user.subscription === 'sosiska'],
  ];

  for (const [id, condition] of checks) {
    if (condition && !earnedIds.includes(id)) {
      grantAchievement(userId, id);
      newAchievements.push(id);
    }
  }
  if (newAchievements.length > 0) console.log(`[ACH] User ${userId} earned:`, newAchievements);
  return newAchievements;
}

router.get('/catalog', authMiddleware, (req, res) => {
  res.json({ emojis: EMOJI_CATALOG, achievements: ACHIEVEMENTS });
});

router.get('/my', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT subscription, subscription_expires FROM users WHERE id = ?', [req.userId]);
    const isSosiska = user && user.subscription === 'sosiska' && (!user.subscription_expires || new Date(user.subscription_expires) > new Date());

    if (isSosiska) {
      const existing = queryOne('SELECT COUNT(*) as cnt FROM user_collection WHERE user_id = ?', [req.userId]);
      if (existing && existing.cnt < EMOJI_CATALOG.length) {
        for (const emoji of EMOJI_CATALOG) {
          grantEmoji(req.userId, emoji.id);
        }
      }
      const achExisting = queryOne('SELECT COUNT(*) as cnt FROM user_achievements WHERE user_id = ?', [req.userId]);
      if (achExisting && achExisting.cnt < ACHIEVEMENTS.length) {
        for (const ach of ACHIEVEMENTS) {
          grantAchievement(req.userId, ach.id);
        }
      }
    }

    const collection = query('SELECT emoji_id, earned_at, equipped FROM user_collection WHERE user_id = ?', [req.userId]);
    const achievements = query('SELECT achievement_id, earned_at FROM user_achievements WHERE user_id = ?', [req.userId]);
    const equipped = collection.filter(c => Number(c.equipped) === 1).map(c => c.emoji_id);

    const enrichedCollection = collection.map(c => {
      const info = EMOJI_CATALOG.find(e => e.id === c.emoji_id);
      return { emoji_id: c.emoji_id, earned_at: c.earned_at, equipped: Number(c.equipped) === 1, ...(info || {}) };
    });

    const enrichedAchievements = achievements.map(a => {
      const info = ACHIEVEMENTS.find(ac => ac.id === a.achievement_id);
      const emojiInfo = info ? EMOJI_CATALOG.find(e => e.id === info.emoji) : null;
      return { achievement_id: a.achievement_id, earned_at: a.earned_at, name: info?.name, description: info?.description, icon: info?.icon, emojiInfo };
    });

    let common = 0, rare = 0, epic = 0, legendary = 0, secret = 0, admin = 0;
    for (const c of collection) {
      const info = EMOJI_CATALOG.find(e => e.id === c.emoji_id);
      if (!info) continue;
      if (info.rarity === 'common') common++;
      else if (info.rarity === 'rare') rare++;
      else if (info.rarity === 'epic') epic++;
      else if (info.rarity === 'legendary') legendary++;
      else if (info.rarity === 'secret') secret++;
      else if (info.rarity === 'admin') admin++;
    }

    res.json({
      collection: enrichedCollection,
      achievements: enrichedAchievements,
      equipped,
      stats: { total: collection.length, common, rare, epic, legendary, secret, admin }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/equip', authMiddleware, (req, res) => {
  try {
    const { emoji_id } = req.body;
    const owned = queryOne('SELECT id FROM user_collection WHERE user_id = ? AND emoji_id = ?', [req.userId, emoji_id]);
    if (!owned) return res.status(400).json({ error: 'Emoji not owned' });

    run('UPDATE user_collection SET equipped = 0 WHERE user_id = ?', [req.userId]);
    run('UPDATE user_collection SET equipped = 1 WHERE user_id = ? AND emoji_id = ?', [req.userId, emoji_id]);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/unequip', authMiddleware, (req, res) => {
  try {
    run('UPDATE user_collection SET equipped = 0 WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/grant', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { userId, emojiId } = req.body;
    grantEmoji(userId, emojiId);
    checkAchievements(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/check-achievements', authMiddleware, (req, res) => {
  try {
    const newAch = checkAchievements(req.userId);
    res.json({ newAchievements: newAch });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/profile/:userId', (req, res) => {
  try {
    const targetUser = queryOne('SELECT collection_hidden FROM users WHERE id = ?', [req.params.userId]);
    const hidden = targetUser && Number(targetUser.collection_hidden) === 1;

    const collection = query('SELECT emoji_id, equipped FROM user_collection WHERE user_id = ?', [req.params.userId]);
    const equipped = collection.filter(c => Number(c.equipped) === 1).map(c => {
      const info = EMOJI_CATALOG.find(e => e.id === c.emoji_id);
      return info ? { emoji: info.emoji, name: info.name, rarity: info.rarity } : null;
    }).filter(Boolean);

    const achievements = query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [req.params.userId]);

    if (hidden) {
      return res.json({ equipped, totalEmoji: collection.length, totalAchievements: achievements.length, hidden: true, collection: [], achievementsList: [] });
    }

    const enrichedCollection = collection.map(c => {
      const info = EMOJI_CATALOG.find(e => e.id === c.emoji_id);
      return { emoji_id: c.emoji_id, ...(info || {}) };
    });

    const achievementsList = achievements.map(a => {
      const info = ACHIEVEMENTS.find(ac => ac.id === a.achievement_id);
      return { achievement_id: a.achievement_id, ...(info || {}) };
    });

    res.json({ equipped, totalEmoji: collection.length, totalAchievements: achievements.length, hidden: false, collection: enrichedCollection, achievementsList });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/toggle-privacy', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT collection_hidden FROM users WHERE id = ?', [req.userId]);
    const newVal = Number(user?.collection_hidden) === 1 ? 0 : 1;
    run('UPDATE users SET collection_hidden = ? WHERE id = ?', [newVal, req.userId]);
    res.json({ hidden: newVal === 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/debug/:userId', authMiddleware, (req, res) => {
  try {
    const userId = req.params.userId;
    const msgs = queryOne('SELECT COUNT(*) as cnt FROM messages WHERE user_id = ?', [userId]);
    const friends = queryOne('SELECT COUNT(*) as cnt FROM friends WHERE user_id = ? AND status = ?', [userId, 'accepted']);
    const servers = queryOne('SELECT COUNT(*) as cnt FROM server_members WHERE user_id = ?', [userId]);
    const created = queryOne('SELECT COUNT(*) as cnt FROM servers WHERE owner_id = ?', [userId]);
    const collCount = queryOne('SELECT COUNT(*) as cnt FROM user_collection WHERE user_id = ?', [userId]);
    const reactions = queryOne('SELECT COUNT(*) as cnt FROM reactions WHERE user_id = ?', [userId]);
    const casinoWins = queryOne('SELECT casino_wins as cnt FROM users WHERE id = ?', [userId]);
    const coinsData = queryOne('SELECT coins as cnt FROM users WHERE id = ?', [userId]);
    const earned = query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);
    res.json({ msgs, friends, servers, created, collCount, reactions, casinoWins, coinsData, earned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.checkAchievements = checkAchievements;
module.exports.grantEmoji = grantEmoji;
module.exports.grantAchievement = grantAchievement;
