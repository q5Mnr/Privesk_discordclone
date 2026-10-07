const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { getEffectivePermissions, hasPermission, PERMISSIONS, invalidatePermissions } = require('../permissions');
const logger = require('../logger');

const router = express.Router();

function messageWithJoins(id) {
    const msg = queryOne(`
    SELECT m.*, u.username, u.avatar, u.tag, u.name_color as user_name_color, u.level as user_level,
      (SELECT ec.emoji_id FROM user_collection ec WHERE ec.user_id = m.user_id AND ec.equipped = 1 LIMIT 1) as equipped_emoji_id
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `, [id]);
  if (!msg) return null;

  const serverId = queryOne('SELECT server_id FROM channels WHERE id = ?', [msg.channel_id]);
  if (serverId) {
    const memberRole = queryOne(`
      SELECT r.color as role_color, r.name as role_name
      FROM member_roles mr
      JOIN roles r ON mr.role_id = r.id
      WHERE mr.user_id = ? AND mr.server_id = ?
      ORDER BY r.position DESC LIMIT 1
    `, [msg.user_id, serverId.server_id]);
    if (memberRole) {
      msg.role_color = memberRole.role_color;
      msg.role_name = memberRole.role_name;
    } else {
      msg.role_color = null;
      msg.role_name = null;
    }
  } else {
    msg.role_color = null;
    msg.role_name = null;
  }

  msg.attachments = query('SELECT * FROM attachments WHERE message_id = ?', [id]);
  msg.reactions = query(`
    SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
    FROM reactions WHERE message_id = ? GROUP BY emoji
  `, [id]);
  if (msg.reply_to) {
    msg.reply_to_message = queryOne(`
      SELECT m.id, m.content, m.user_id, u.username, u.tag
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `, [msg.reply_to]);
  }
  return msg;
}

// === SEARCH (must be before /:channelId) ===
router.get('/:channelId/search', authMiddleware, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const messages = query(`
      SELECT m.*, u.username, u.avatar, u.tag, u.name_color as user_name_color, u.level as user_level,
        (SELECT ec.emoji_id FROM user_collection ec WHERE ec.user_id = m.user_id AND ec.equipped = 1 LIMIT 1) as equipped_emoji_id
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ? AND m.content LIKE ?
      ORDER BY m.created_at DESC LIMIT 30
    `, [req.params.channelId, `%${q}%`]);

    messages.forEach(msg => {
      msg.attachments = [];
      msg.reactions = [];
    });

    res.json(messages);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === PINS (must be before /:channelId) ===
router.get('/:channelId/pins', authMiddleware, (req, res) => {
  try {
    const pins = query(`
      SELECT m.*, u.username, u.avatar, u.tag, u.name_color as user_name_color, u.level as user_level, pm.created_at as pinned_at,
        (SELECT ec.emoji_id FROM user_collection ec WHERE ec.user_id = m.user_id AND ec.equipped = 1 LIMIT 1) as equipped_emoji_id
      FROM pinned_messages pm
      JOIN messages m ON pm.message_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE pm.channel_id = ?
      ORDER BY pm.created_at DESC
    `, [req.params.channelId]);

    pins.forEach(msg => {
      msg.attachments = query('SELECT * FROM attachments WHERE message_id = ?', [msg.id]);
      msg.reactions = query(`
        SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
        FROM reactions WHERE message_id = ? GROUP BY emoji
      `, [msg.id]);
    });

    res.json(pins);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === ROLE MANAGEMENT (must be before /:channelId) ===

router.get('/roles/:serverId', authMiddleware, (req, res) => {
  try {
    const roles = query('SELECT * FROM roles WHERE server_id = ? ORDER BY position DESC', [req.params.serverId]);
    res.json(roles);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/roles/:serverId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'No permission' });
    }
    const { name, color, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });
    const maxPos = queryOne('SELECT MAX(position) as maxPos FROM roles WHERE server_id = ?', [req.params.serverId]);
    const roleId = uuidv4();
    run('INSERT INTO roles (id, server_id, name, color, permissions, position) VALUES (?, ?, ?, ?, ?, ?)',
      [roleId, req.params.serverId, name, color || '#99aab5', permissions || 0, (maxPos?.maxPos || 0) + 1]);
    const role = queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    res.status(201).json(role);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/roles/:serverId/:roleId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'No permission' });
    }
    const { name, color, permissions, position } = req.body;
    const role = queryOne('SELECT * FROM roles WHERE id = ?', [req.params.roleId]);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.is_default && name !== undefined && name !== role.name) {
      return res.status(400).json({ error: 'Нельзя изменить название стандартной роли' });
    }
    if (name !== undefined) run('UPDATE roles SET name = ? WHERE id = ?', [name, req.params.roleId]);
    if (color !== undefined) run('UPDATE roles SET color = ? WHERE id = ?', [color, req.params.roleId]);
    if (permissions !== undefined) run('UPDATE roles SET permissions = ? WHERE id = ?', [permissions, req.params.roleId]);
    if (position !== undefined) run('UPDATE roles SET position = ? WHERE id = ?', [position, req.params.roleId]);
    const updatedRole = queryOne('SELECT * FROM roles WHERE id = ?', [req.params.roleId]);
    res.json(updatedRole);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/roles/:serverId/:roleId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'No permission' });
    }
    const role = queryOne('SELECT * FROM roles WHERE id = ?', [req.params.roleId]);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.is_default) return res.status(400).json({ error: 'Нельзя удалить стандартную роль' });
    run('DELETE FROM member_roles WHERE role_id = ?', [req.params.roleId]);
    run('DELETE FROM roles WHERE id = ?', [req.params.roleId]);
    res.json({ message: 'Role deleted' });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === MEMBER ROLE MANAGEMENT (must be before /:channelId) ===

router.put('/:serverId/members/:memberId/assign-role', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'moderator')) {
      return res.status(403).json({ error: 'No permission' });
    }
    const { role_id } = req.body;
    if (!role_id) return res.status(400).json({ error: 'role_id is required' });
    const targetMember = queryOne('SELECT * FROM server_members WHERE id = ?', [req.params.memberId]);
    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    const existing = queryOne(
      'SELECT * FROM member_roles WHERE server_id = ? AND user_id = ? AND role_id = ?',
      [req.params.serverId, targetMember.user_id, role_id]
    );
    if (existing) {
      run('DELETE FROM member_roles WHERE id = ?', [existing.id]);
    } else {
      run('INSERT INTO member_roles (id, server_id, user_id, role_id) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.params.serverId, targetMember.user_id, role_id]);
    }
    invalidatePermissions(targetMember.user_id, req.params.serverId);
    const memberRoles = query(`
      SELECT r.* FROM member_roles mr JOIN roles r ON mr.role_id = r.id
      WHERE mr.user_id = ? AND mr.server_id = ? ORDER BY r.position DESC
    `, [targetMember.user_id, req.params.serverId]);
    res.json({ roles: memberRoles, added: !existing });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:serverId/members/:memberId/roles', authMiddleware, (req, res) => {
  try {
    const targetMember = queryOne('SELECT * FROM server_members WHERE id = ?', [req.params.memberId]);
    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    const memberRoles = query(`
      SELECT r.* FROM member_roles mr JOIN roles r ON mr.role_id = r.id
      WHERE mr.user_id = ? AND mr.server_id = ? ORDER BY r.position DESC
    `, [targetMember.user_id, req.params.serverId]);
    res.json(memberRoles);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:serverId/my-permissions', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member) return res.status(404).json({ error: 'Not a member' });
    const permissions = getEffectivePermissions(req.userId, req.params.serverId);
    res.json({ permissions });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === GET messages for channel ===
router.get('/:channelId', authMiddleware, (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    const channelInfo = queryOne('SELECT server_id FROM channels WHERE id = ?', [req.params.channelId]);
    const serverId = channelInfo?.server_id;

    let sql = `
      SELECT m.*, u.username, u.avatar, u.tag, u.name_color as user_name_color, u.level as user_level,
        (SELECT ec.emoji_id FROM user_collection ec WHERE ec.user_id = m.user_id AND ec.equipped = 1 LIMIT 1) as equipped_emoji_id
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ?
    `;
    const params = [req.params.channelId];

    if (before) {
      sql += ' AND m.created_at < ?';
      params.push(before);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = query(sql, params);

    if (serverId && messages.length > 0) {
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const placeholders = userIds.map(() => '?').join(',');
      const memberRoles = query(`
        SELECT mr.user_id, r.color as role_color, r.name as role_name
        FROM member_roles mr
        JOIN roles r ON mr.role_id = r.id
        WHERE mr.user_id IN (${placeholders}) AND mr.server_id = ?
        ORDER BY r.position DESC
      `, [...userIds, serverId]);

      const roleMap = {};
      memberRoles.forEach(mr => {
        if (!roleMap[mr.user_id]) {
          roleMap[mr.user_id] = { role_color: mr.role_color, role_name: mr.role_name };
        }
      });

      messages.forEach(msg => {
        const role = roleMap[msg.user_id];
        msg.role_color = role?.role_color || null;
        msg.role_name = role?.role_name || null;
      });
    } else {
      messages.forEach(msg => {
        msg.role_color = null;
        msg.role_name = null;
      });
    }

    const allIds = messages.map(m => m.id);
    const replyIds = messages.filter(m => m.reply_to).map(m => m.reply_to);
    const fetchIds = [...new Set([...allIds, ...replyIds])];

    const attachments = fetchIds.length > 0
      ? query(`SELECT * FROM attachments WHERE message_id IN (${fetchIds.map(() => '?').join(',')})`, fetchIds)
      : [];

    const reactionsAll = fetchIds.length > 0
      ? query(`SELECT message_id, emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
               FROM reactions WHERE message_id IN (${fetchIds.map(() => '?').join(',')})
               GROUP BY message_id, emoji`, fetchIds)
      : [];

    const replyMessages = replyIds.length > 0
      ? query(`SELECT m.id, m.content, m.user_id, u.username, u.tag
               FROM messages m JOIN users u ON m.user_id = u.id
               WHERE m.id IN (${replyIds.map(() => '?').join(',')})`, replyIds)
      : [];

    messages.forEach(msg => {
      msg.attachments = attachments.filter(a => a.message_id === msg.id);
      msg.reactions = reactionsAll.filter(r => r.message_id === msg.id);
      if (msg.reply_to) {
        msg.reply_to_message = replyMessages.find(rm => rm.id === msg.reply_to) || null;
      }
    });

    res.json(messages.reverse());
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === POST new message ===
router.post('/:channelId', authMiddleware, (req, res) => {
  try {
    const { content, reply_to } = req.body;

    if (!content && !req.files?.length) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const channel = queryOne('SELECT * FROM channels WHERE id = ?', [req.params.channelId]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const server = channel.server_id ? queryOne('SELECT * FROM servers WHERE id = ?', [channel.server_id]) : null;

    if (server) {
      if (!hasPermission(req.userId, server.id, PERMISSIONS.SEND_MESSAGES)) {
        return res.status(403).json({ error: 'У вас нет прав отправлять сообщения в этом канале.' });
      }

      if (req.files?.length && !hasPermission(req.userId, server.id, PERMISSIONS.ATTACH_FILES)) {
        return res.status(403).json({ error: 'У вас нет прав прикреплять файлы.' });
      }
      if (server.lockdown) {
        const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?', [server.id, req.userId]);
        if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'moderator')) {
          return res.status(403).json({ error: 'Сервер в режиме блокировки. Только модераторы могут писать.' });
        }
      }

      const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?', [server.id, req.userId]);
      const userRole = member?.role || 'member';
      if (server.explicit_filter === 2 || (server.explicit_filter === 1 && userRole === 'member')) {
        const urlRegex = /https?:\/\/[^\s]+|(?:www\.)[^\s]+|\.[a-z]{2,}\/[^\s]*/gi;
        if (content && urlRegex.test(content)) {
          return res.status(403).json({ error: 'Ссылки запрещены на этом сервере.' });
        }
      }

      if (server.block_links) {
        const urlRegex = /https?:\/\/[^\s]+|(?:www\.)[^\s]+|\.[a-z]{2,}\/[^\s]*/gi;
        if (content && urlRegex.test(content)) {
          return res.status(403).json({ error: 'Ссылки запрещены на этом сервере.' });
        }
      }

      if (server.anti_spam) {
        const recentMsgs = query(
          'SELECT id FROM messages WHERE user_id = ? AND channel_id = ? AND created_at > datetime("now", ?)',
          [req.userId, req.params.channelId, server.anti_spam === 2 ? '-3 seconds' : '-5 seconds']
        );
        if (recentMsgs.length >= (server.anti_spam === 2 ? 1 : 3)) {
          return res.status(429).json({ error: 'Слишком много сообщений. Подождите немного.' });
        }
      }
    }

    const messageId = uuidv4();
    run('INSERT INTO messages (id, channel_id, user_id, content, reply_to) VALUES (?, ?, ?, ?, ?)',
      [messageId, req.params.channelId, req.userId, content || '', reply_to || null]);

    try { require('./collection').checkAchievements(req.userId); } catch (e) {}

    // XP gain
    try {
      const xpGain = 5 + Math.floor(Math.random() * 6);
      run('UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?', [xpGain, req.userId]);
      const userData = queryOne('SELECT xp, level FROM users WHERE id = ?', [req.userId]);
      const xpForNext = Math.floor(100 * Math.pow(1.5, (userData.level || 1) - 1));
      if ((userData.xp || 0) >= xpForNext) {
        run('UPDATE users SET level = COALESCE(level, 1) + 1 WHERE id = ?', [req.userId]);
        const newLevel = queryOne('SELECT level FROM users WHERE id = ?', [req.userId]);
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${req.userId}`).emit('level_up', { level: newLevel?.level || 1 });
        }
      }
    } catch (e) {}

    if (req.files?.length) {
      req.files.forEach(file => {
        run('INSERT INTO attachments (id, message_id, filename, original_name, mime_type, size, url) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), messageId, file.filename, file.originalname, file.mimetype, file.size, `/uploads/${file.filename}`]);
      });
    }

    const message = messageWithJoins(messageId);

    if (channel) {
      const io = req.app.get('io');
      if (io) {
        io.to(`server:${channel.server_id}`).emit('new_message', {
          ...message,
          server_id: channel.server_id
        });
      }

      if (content && channel.server_id) {
        const mentionRegex = /@(\w+)/g;
        let match;
        const mentionedUsernames = new Set();
        while ((match = mentionRegex.exec(content)) !== null) {
          mentionedUsernames.add(match[1]);
        }
        if (mentionedUsernames.size > 0) {
          const names = [...mentionedUsernames];
          const placeholders = names.map(() => '?').join(',');
          const mentionedUsers = query(
            `SELECT id, username FROM users WHERE username IN (${placeholders})`, names
          );
          mentionedUsers.forEach(mu => {
            if (mu.id !== req.userId) {
              run('INSERT INTO mentions (id, message_id, user_id) VALUES (?, ?, ?)',
                [uuidv4(), messageId, mu.id]);
              if (io) {
                const senderUser = queryOne('SELECT username FROM users WHERE id = ?', [req.userId]);
                io.to(`user:${mu.id}`).emit('mention', {
                  message_id: messageId,
                  channel_id: channel.id,
                  channel_name: channel.name,
                  server_id: channel.server_id,
                  server_name: channel.server_id ? (queryOne('SELECT name FROM servers WHERE id = ?', [channel.server_id])?.name || '') : '',
                  from_username: senderUser?.username || 'Unknown',
                  from_user_id: req.userId,
                  content: content.slice(0, 200),
                  type: 'channel_mention'
                });
              }
            }
          });
        }
      }
    }

    res.status(201).json(message);
  } catch (error) {
    logger.error('message_send_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

// === PUT edit message ===
router.put('/:messageId', authMiddleware, (req, res) => {
  try {
    const { content } = req.body;
    const message = queryOne('SELECT * FROM messages WHERE id = ?', [req.params.messageId]);

    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.user_id !== req.userId) {
      const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [message.channel_id]);
      if (!channel?.server_id || !hasPermission(req.userId, channel.server_id, PERMISSIONS.MANAGE_MESSAGES)) {
        return res.status(403).json({ error: 'Нет прав редактировать чужие сообщения' });
      }
    }

    run('UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, req.params.messageId]);

    const updated = messageWithJoins(req.params.messageId);

    const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [message.channel_id]);
    if (channel) {
      const io = req.app.get('io');
      if (io) io.to(`server:${channel.server_id}`).emit('message_edited', updated);
    }

    logger.info('message_edit', `Message ${req.params.messageId} edited`, { user: req.userId });
    res.json(updated);
  } catch (error) {
    logger.error('message_edit_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

// === DELETE message ===
router.delete('/:messageId', authMiddleware, (req, res) => {
  try {
    const message = queryOne('SELECT * FROM messages WHERE id = ?', [req.params.messageId]);

    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.user_id !== req.userId) {
      const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [message.channel_id]);
      if (!channel?.server_id || !hasPermission(req.userId, channel.server_id, PERMISSIONS.MANAGE_MESSAGES)) {
        return res.status(403).json({ error: 'Нет прав удалять чужие сообщения' });
      }
    }

    const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [message.channel_id]);
    run('DELETE FROM messages WHERE id = ?', [req.params.messageId]);

    if (channel) {
      const io = req.app.get('io');
      if (io) io.to(`server:${channel.server_id}`).emit('message_deleted', {
        id: req.params.messageId,
        channel_id: message.channel_id,
        server_id: channel.server_id
      });
    }

    logger.info('message_delete', `Message ${req.params.messageId} deleted`, { user: req.userId });
    res.json({ message: 'Message deleted' });
  } catch (error) {
    logger.error('message_delete_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

// === POST toggle reaction ===
router.post('/:messageId/reactions', authMiddleware, (req, res) => {
  try {
    const { emoji } = req.body;

    const msg = queryOne('SELECT channel_id FROM messages WHERE id = ?', [req.params.messageId]);
    if (msg) {
      const ch = queryOne('SELECT server_id FROM channels WHERE id = ?', [msg.channel_id]);
      if (ch?.server_id && !hasPermission(req.userId, ch.server_id, PERMISSIONS.ADD_REACTIONS)) {
        return res.status(403).json({ error: 'Нет прав добавлять реакции' });
      }
    }

    const existing = queryOne('SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [req.params.messageId, req.userId, emoji]);

    if (existing) {
      run('DELETE FROM reactions WHERE id = ?', [existing.id]);
    } else {
      run('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.params.messageId, req.userId, emoji]);
    try { require('./collection').checkAchievements(req.userId); } catch (e) {}
    try { run('UPDATE users SET coins = coins + 10 WHERE id = ?', [req.userId]); } catch (e) {}
    }

    const reactions = query(`
      SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
      FROM reactions WHERE message_id = ? GROUP BY emoji
    `, [req.params.messageId]);

    const message = queryOne('SELECT * FROM messages WHERE id = ?', [req.params.messageId]);
    if (message) {
      const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [message.channel_id]);
      if (channel) {
        const io = req.app.get('io');
        if (io) io.to(`server:${channel.server_id}`).emit('reaction_updated', {
          message_id: req.params.messageId,
          channel_id: message.channel_id,
          server_id: channel.server_id,
          reactions
        });
      }
    }

    res.json({ reactions });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// === POST pin / unpin message ===
router.post('/:messageId/pin', authMiddleware, (req, res) => {
  try {
    const message = queryOne('SELECT * FROM messages WHERE id = ?', [req.params.messageId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const ch = queryOne('SELECT server_id FROM channels WHERE id = ?', [message.channel_id]);
    if (ch?.server_id && !hasPermission(req.userId, ch.server_id, PERMISSIONS.PIN_MESSAGES)) {
      return res.status(403).json({ error: 'Нет прав закреплять сообщения' });
    }

    const existingPin = queryOne('SELECT * FROM pinned_messages WHERE message_id = ?',
      [req.params.messageId]);

    if (existingPin) {
      run('DELETE FROM pinned_messages WHERE message_id = ?', [req.params.messageId]);
      logger.info('message_unpin', `Message ${req.params.messageId} unpinned`, { user: req.userId });
      res.json({ pinned: false });
    } else {
      run('INSERT INTO pinned_messages (id, message_id, channel_id, pinned_by) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.params.messageId, message.channel_id, req.userId]);
      logger.info('message_pin', `Message ${req.params.messageId} pinned`, { user: req.userId });
      res.json({ pinned: true });
    }
  } catch (error) {
    logger.error('pin_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
