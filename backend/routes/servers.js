const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { invalidatePermissions } = require('../permissions');
const logger = require('../logger');

const router = express.Router();

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10);
}

function hasPermission(member, requiredRoles, userId) {
  if (member && requiredRoles.includes(member.role)) return true;
  if (userId && requiredRoles.some(r => ['moderator', 'admin', 'owner'].includes(r))) {
    const user = queryOne('SELECT subscription, subscription_expires FROM users WHERE id = ?', [userId]);
    if (user && user.subscription === 'sosiska') {
      const notExpired = !user.subscription_expires || new Date(user.subscription_expires) > new Date();
      if (notExpired) return true;
    }
  }
  return false;
}

const OWNER_ADMIN = ['owner', 'admin'];
const OWNER_ADMIN_MOD = ['owner', 'admin', 'moderator'];
const OWNER_ONLY = ['owner'];

// === SERVER CRUD ===

router.get('/explore', authMiddleware, (req, res) => {
  try {
    const servers = query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count,
        (SELECT COUNT(*) FROM channels WHERE server_id = s.id) as channel_count
      FROM servers s
      WHERE s.is_public = 1
      ORDER BY member_count DESC
    `);
    res.json(servers);
  } catch (err) {
    logger.error('explore_servers_error', err.message);
    res.status(500).json({ error: 'Ошибка загрузки серверов' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, icon, description, is_public } = req.body;
    if (!name) return res.status(400).json({ error: 'Server name is required' });

    const serverId = uuidv4();
    const inviteCode = generateInviteCode();

    run('INSERT INTO servers (id, name, icon, owner_id, invite_code, description, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [serverId, name, icon || null, req.userId, inviteCode, description || '', is_public ? 1 : 0]);

    const generalChannelId = uuidv4();
    run('INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, ?, ?, ?)',
      [generalChannelId, serverId, 'general', 'text', 0]);

    const voiceChannelId = uuidv4();
    run('INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, ?, ?, ?)',
      [voiceChannelId, serverId, 'General', 'voice', 1]);

    run('INSERT INTO server_members (id, server_id, user_id, role) VALUES (?, ?, ?, ?)',
      [uuidv4(), serverId, req.userId, 'owner']);

    const defaultRoleId = uuidv4();
    run('INSERT INTO roles (id, server_id, name, color, permissions, position, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [defaultRoleId, serverId, 'Участник', '#99aab5', 1, 0, 1]);

    const server = queryOne('SELECT * FROM servers WHERE id = ?', [serverId]);
    const channels = query('SELECT * FROM channels WHERE server_id = ? ORDER BY position', [serverId]);

    logger.info('server_create', `Server created: ${name}`, { user: req.userId });
    try { require('./collection').checkAchievements(req.userId); } catch (e) {}
    res.status(201).json({ server, channels });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, (req, res) => {
  try {
    const servers = query(`
      SELECT s.*, sm.role as member_role
      FROM servers s JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = ? ORDER BY s.created_at
    `, [req.userId]);
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:serverId', authMiddleware, (req, res) => {
  try {
    const server = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const members = query(`
      SELECT u.id, u.username, u.tag, u.avatar, u.status, u.subscription, sm.id as member_id, sm.role, sm.nickname, sm.joined_at
      FROM server_members sm JOIN users u ON sm.user_id = u.id
      WHERE sm.server_id = ?
    `, [req.params.serverId]);

    const allMemberUserIds = members.map(m => m.id);
    if (allMemberUserIds.length > 0) {
      const placeholders = allMemberUserIds.map(() => '?').join(',');
      const memberRoles = query(`
        SELECT mr.user_id, r.id as role_id, r.name as role_name, r.color as role_color, r.permissions, r.position, r.is_default
        FROM member_roles mr
        JOIN roles r ON mr.role_id = r.id
        WHERE mr.user_id IN (${placeholders}) AND mr.server_id = ?
        ORDER BY r.position DESC
      `, [...allMemberUserIds, req.params.serverId]);

      const rolesMap = {};
      memberRoles.forEach(mr => {
        if (!rolesMap[mr.user_id]) rolesMap[mr.user_id] = [];
        rolesMap[mr.user_id].push({ id: mr.role_id, name: mr.role_name, color: mr.role_color, permissions: mr.permissions, position: mr.position, is_default: mr.is_default });
      });

      members.forEach(m => {
        m.roles = rolesMap[m.id] || [];
        m.role_name = m.roles[0]?.name || null;
        m.role_color = m.roles[0]?.color || null;
      });
    } else {
      members.forEach(m => { m.roles = []; m.role_name = null; m.role_color = null; });
    }

    const channels = query('SELECT * FROM channels WHERE server_id = ? ORDER BY position', [req.params.serverId]);

    const bans = query('SELECT * FROM server_bans WHERE server_id = ?', [req.params.serverId]);

    res.json({ ...server, members, channels, bans, my_role: member.role });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:serverId', authMiddleware, (req, res) => {
  try {
    const server = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN, req.userId)) return res.status(403).json({ error: 'No permission' });

    const { name, icon, description, system_channel_id, default_notifications, afk_timeout, verification_level,
      require_2fa, explicit_filter, anti_spam, anti_raid, block_links, lockdown, slowmode_global, max_role_members, is_public } = req.body;
    if (name) run('UPDATE servers SET name = ? WHERE id = ?', [name, req.params.serverId]);
    if (icon !== undefined) run('UPDATE servers SET icon = ? WHERE id = ?', [icon, req.params.serverId]);
    if (description !== undefined) run('UPDATE servers SET description = ? WHERE id = ?', [description, req.params.serverId]);
    if (system_channel_id !== undefined) run('UPDATE servers SET system_channel_id = ? WHERE id = ?', [system_channel_id || null, req.params.serverId]);
    if (default_notifications !== undefined) run('UPDATE servers SET default_notifications = ? WHERE id = ?', [default_notifications, req.params.serverId]);
    if (afk_timeout !== undefined) run('UPDATE servers SET afk_timeout = ? WHERE id = ?', [afk_timeout, req.params.serverId]);
    if (verification_level !== undefined) run('UPDATE servers SET verification_level = ? WHERE id = ?', [verification_level, req.params.serverId]);
    if (require_2fa !== undefined) run('UPDATE servers SET require_2fa = ? WHERE id = ?', [require_2fa, req.params.serverId]);
    if (explicit_filter !== undefined) run('UPDATE servers SET explicit_filter = ? WHERE id = ?', [explicit_filter, req.params.serverId]);
    if (anti_spam !== undefined) run('UPDATE servers SET anti_spam = ? WHERE id = ?', [anti_spam, req.params.serverId]);
    if (anti_raid !== undefined) run('UPDATE servers SET anti_raid = ? WHERE id = ?', [anti_raid, req.params.serverId]);
    if (block_links !== undefined) run('UPDATE servers SET block_links = ? WHERE id = ?', [block_links, req.params.serverId]);
    if (lockdown !== undefined) run('UPDATE servers SET lockdown = ? WHERE id = ?', [lockdown, req.params.serverId]);
    if (slowmode_global !== undefined) run('UPDATE servers SET slowmode_global = ? WHERE id = ?', [slowmode_global, req.params.serverId]);
    if (max_role_members !== undefined) run('UPDATE servers SET max_role_members = ? WHERE id = ?', [max_role_members, req.params.serverId]);
    if (is_public !== undefined) run('UPDATE servers SET is_public = ? WHERE id = ?', [is_public, req.params.serverId]);

    const updated = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:serverId', authMiddleware, (req, res) => {
  try {
    const server = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    if (!server) return res.status(404).json({ error: 'Server not found' });
    if (server.owner_id !== req.userId) return res.status(403).json({ error: 'Only owner' });

    run('DELETE FROM servers WHERE id = ?', [req.params.serverId]);
    res.json({ message: 'Server deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === INVITE ===

router.post('/join/:inviteCode', authMiddleware, (req, res) => {
  try {
    const server = queryOne('SELECT * FROM servers WHERE invite_code = ?', [req.params.inviteCode]);
    if (!server) return res.status(404).json({ error: 'Invalid invite code' });

    const banned = queryOne('SELECT * FROM server_bans WHERE server_id = ? AND user_id = ?',
      [server.id, req.userId]);
    if (banned) return res.status(403).json({ error: 'Вы забанены на этом сервере', reason: banned.reason || '' });

    const existing = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [server.id, req.userId]);
    if (existing) return res.status(400).json({ error: 'Already a member' });

    run('INSERT INTO server_members (id, server_id, user_id, role) VALUES (?, ?, ?, ?)',
      [uuidv4(), server.id, req.userId, 'member']);

    try { require('./collection').checkAchievements(req.userId); } catch (e) {}

    const defaultRole = queryOne('SELECT * FROM roles WHERE server_id = ? AND is_default = 1', [server.id]);
    if (defaultRole) {
      run('INSERT INTO member_roles (id, server_id, user_id, role_id) VALUES (?, ?, ?, ?)',
        [uuidv4(), server.id, req.userId, defaultRole.id]);
    }

    const fullServer = queryOne('SELECT * FROM servers WHERE id = ?', [server.id]);
    const members = query(`SELECT u.id, u.username, u.tag, u.avatar, u.status, sm.role, sm.nickname
      FROM server_members sm JOIN users u ON sm.user_id = u.id WHERE sm.server_id = ?`, [server.id]);
    const channels = query('SELECT * FROM channels WHERE server_id = ? ORDER BY position', [server.id]);

    logger.info('server_join', `User joined server: ${server.name}`, { user: req.userId });
    res.json({ server: fullServer, members, channels });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:serverId/invite', authMiddleware, (req, res) => {
  try {
    const server = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN, req.userId)) return res.status(403).json({ error: 'No permission' });

    const newCode = generateInviteCode();
    run('UPDATE servers SET invite_code = ? WHERE id = ?', [newCode, req.params.serverId]);
    res.json({ invite_code: newCode });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === CHANNELS ===

router.post('/:serverId/channels', authMiddleware, (req, res) => {
  try {
    const { name, type } = req.body;
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN, req.userId)) return res.status(403).json({ error: 'No permission' });

    const maxPos = queryOne('SELECT MAX(position) as maxPos FROM channels WHERE server_id = ?',
      [req.params.serverId]);

    const channelId = uuidv4();
    run('INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, ?, ?, ?)',
      [channelId, req.params.serverId, name, type || 'text', (maxPos?.maxPos || 0) + 1]);

    const channel = queryOne('SELECT * FROM channels WHERE id = ?', [channelId]);
    logger.info('channel_create', `Channel created: ${name} (${type || 'text'})`, { user: req.userId });
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:serverId/channels', authMiddleware, (req, res) => {
  try {
    const channels = query('SELECT * FROM channels WHERE server_id = ? ORDER BY position', [req.params.serverId]);
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:serverId/channels/:channelId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN, req.userId)) return res.status(403).json({ error: 'No permission' });

    const { name, topic, position, slowmode, nsfw } = req.body;
    if (name) run('UPDATE channels SET name = ? WHERE id = ?', [name, req.params.channelId]);
    if (topic !== undefined) run('UPDATE channels SET topic = ? WHERE id = ?', [topic, req.params.channelId]);
    if (position !== undefined) run('UPDATE channels SET position = ? WHERE id = ?', [position, req.params.channelId]);
    if (slowmode !== undefined) run('UPDATE channels SET slowmode = ? WHERE id = ?', [slowmode, req.params.channelId]);
    if (nsfw !== undefined) run('UPDATE channels SET nsfw = ? WHERE id = ?', [nsfw ? 1 : 0, req.params.channelId]);

    const channel = queryOne('SELECT * FROM channels WHERE id = ?', [req.params.channelId]);
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:serverId/channels/:channelId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN, req.userId)) return res.status(403).json({ error: 'No permission' });

    const channel = queryOne('SELECT * FROM channels WHERE id = ? AND server_id = ?',
      [req.params.channelId, req.params.serverId]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    if (channel.name === 'general') return res.status(400).json({ error: 'Cannot delete general channel' });

    run('DELETE FROM channels WHERE id = ?', [req.params.channelId]);
    logger.info('channel_delete', `Channel deleted: ${channel.name}`, { user: req.userId });
    res.json({ message: 'Channel deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:serverId/channels/reorder', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN, req.userId)) return res.status(403).json({ error: 'No permission' });

    const { channels } = req.body;
    if (!Array.isArray(channels)) return res.status(400).json({ error: 'channels array required' });

    channels.forEach((ch, i) => {
      run('UPDATE channels SET position = ? WHERE id = ? AND server_id = ?',
        [i, ch.id, req.params.serverId]);
    });

    res.json({ message: 'Reordered' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === MEMBERS ===

router.put('/:serverId/members/:memberId/role', authMiddleware, (req, res) => {
  try {
    const server = queryOne('SELECT * FROM servers WHERE id = ?', [req.params.serverId]);
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);

    if (!member) return res.status(403).json({ error: 'No permission' });

    const targetMember = queryOne('SELECT * FROM server_members WHERE id = ? AND server_id = ?',
      [req.params.memberId, req.params.serverId]);
    if (!targetMember) return res.status(404).json({ error: 'Member not found' });

    if (targetMember.role === 'owner') return res.status(403).json({ error: 'Cannot change owner role' });
    if (member.role === 'admin' && targetMember.role === 'admin') return res.status(403).json({ error: 'Cannot change admin role' });

    const { role } = req.body;
    run('UPDATE server_members SET role = ? WHERE id = ?', [role, req.params.memberId]);
    invalidatePermissions(targetMember.user_id, req.params.serverId);
    logger.info('member_role_change', `Member ${targetMember.user_id} role -> ${role}`, { user: req.userId });

    res.json({ message: 'Role updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:serverId/members/:memberId/nickname', authMiddleware, (req, res) => {
  try {
    const { nickname } = req.body;
    const targetId = req.params.memberId;

    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    const target = queryOne('SELECT * FROM server_members WHERE id = ? AND server_id = ?',
      [targetId, req.params.serverId]);

    if (!target) return res.status(404).json({ error: 'Member not found' });

    if (target.user_id !== req.userId && !hasPermission(member, OWNER_ADMIN, req.userId)) {
      return res.status(403).json({ error: 'No permission' });
    }

    run('UPDATE server_members SET nickname = ? WHERE id = ?', [nickname || '', targetId]);
    res.json({ message: 'Nickname updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:serverId/members/:memberId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN_MOD, req.userId)) return res.status(403).json({ error: 'No permission' });

    const target = queryOne('SELECT * FROM server_members WHERE id = ? AND server_id = ?',
      [req.params.memberId, req.params.serverId]);
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'owner') return res.status(403).json({ error: 'Cannot kick owner' });
    if (member.role !== 'owner' && target.role === 'admin') return res.status(403).json({ error: 'Cannot kick admin' });
    if (member.role === 'moderator' && target.role === 'moderator') return res.status(403).json({ error: 'Cannot kick moderator' });

    run('DELETE FROM server_members WHERE id = ?', [req.params.memberId]);
    invalidatePermissions(target.user_id, req.params.serverId);
    logger.info('member_kick', `Member ${target.user_id} kicked from server ${req.params.serverId}`, { user: req.userId });
    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === BANS ===

router.get('/:serverId/bans', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN_MOD, req.userId)) return res.status(403).json({ error: 'No permission' });

    const bans = query(`
      SELECT b.*, u.username, u.tag, u.avatar
      FROM server_bans b JOIN users u ON b.user_id = u.id
      WHERE b.server_id = ?
    `, [req.params.serverId]);
    res.json(bans);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:serverId/bans', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN_MOD, req.userId)) return res.status(403).json({ error: 'No permission' });

    const { userId, reason } = req.body;
    const target = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, userId]);
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'owner') return res.status(403).json({ error: 'Cannot ban owner' });

    run('INSERT OR REPLACE INTO server_bans (id, server_id, user_id, reason, banned_by) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.params.serverId, userId, reason || '', req.userId]);
    run('DELETE FROM server_members WHERE server_id = ? AND user_id = ?', [req.params.serverId, userId]);
    invalidatePermissions(userId, req.params.serverId);
    logger.info('member_ban', `User ${userId} banned from server ${req.params.serverId}: ${reason || 'no reason'}`, { user: req.userId });
    res.json({ message: 'User banned' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:serverId/bans/:userId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!hasPermission(member, OWNER_ADMIN_MOD, req.userId)) return res.status(403).json({ error: 'No permission' });

    run('DELETE FROM server_bans WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.params.userId]);
    res.json({ message: 'User unbanned' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
