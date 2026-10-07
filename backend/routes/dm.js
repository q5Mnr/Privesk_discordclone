const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

function loadReactions(messageIds) {
  if (messageIds.length === 0) return {};
  const rows = query(
    `SELECT message_id, emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
     FROM reactions WHERE message_id IN (${messageIds.map(() => '?').join(',')})
     GROUP BY message_id, emoji`,
    messageIds
  );
  const map = {};
  rows.forEach(r => {
    if (!map[r.message_id]) map[r.message_id] = [];
    map[r.message_id].push({ emoji: r.emoji, count: r.count, user_ids: r.user_ids || '' });
  });
  return map;
}

function emitDm(io, channelId, event, data) {
  if (!io) return;
  const members = query('SELECT user_id FROM dm_members WHERE dm_channel_id = ?', [channelId]);
  members.forEach(m => {
    io.to(`user:${m.user_id}`).emit(event, data);
  });
}

router.get('/', authMiddleware, (req, res) => {
  try {
    const channels = query(`
      SELECT dc.*,
        (SELECT content FROM dm_messages WHERE dm_channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM dm_messages WHERE dm_channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id
      WHERE dm1.user_id = ?
      ORDER BY last_message_at DESC
    `, [req.userId]);

    channels.forEach(ch => {
      ch.members = query(`
        SELECT u.id, u.username, u.tag, u.avatar, u.status
        FROM dm_members dm
        JOIN users u ON dm.user_id = u.id
        WHERE dm.dm_channel_id = ? AND dm.user_id != ?
      `, [ch.id, req.userId]);
    });

    res.json(channels);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;

    const existingChannel = queryOne(`
      SELECT dc.id FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id AND dm1.user_id = ?
      JOIN dm_members dm2 ON dc.id = dm2.dm_channel_id AND dm2.user_id = ?
      WHERE dc.type = 'dm'
    `, [req.userId, userId]);

    if (existingChannel) {
      const channel = queryOne('SELECT * FROM dm_channels WHERE id = ?', [existingChannel.id]);
      const members = query(`
        SELECT u.id, u.username, u.tag, u.avatar, u.status
        FROM dm_members dm
        JOIN users u ON dm.user_id = u.id
        WHERE dm.dm_channel_id = ?
      `, [existingChannel.id]);
      return res.json({ ...channel, members });
    }

    const channelId = uuidv4();
    run('INSERT INTO dm_channels (id, type) VALUES (?, ?)', [channelId, 'dm']);

    run('INSERT INTO dm_members (id, dm_channel_id, user_id) VALUES (?, ?, ?)', [uuidv4(), channelId, req.userId]);
    run('INSERT INTO dm_members (id, dm_channel_id, user_id) VALUES (?, ?, ?)', [uuidv4(), channelId, userId]);

    const channel = queryOne('SELECT * FROM dm_channels WHERE id = ?', [channelId]);
    const members = query(`
      SELECT u.id, u.username, u.tag, u.avatar, u.status
      FROM dm_members dm
      JOIN users u ON dm.user_id = u.id
      WHERE dm.dm_channel_id = ?
    `, [channelId]);

    res.status(201).json({ ...channel, members });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:channelId/messages', authMiddleware, (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    let sql = `
      SELECT m.*, u.username, u.avatar, u.tag
      FROM dm_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.dm_channel_id = ?
    `;
    const params = [req.params.channelId];

    if (before) {
      sql += ' AND m.created_at < ?';
      params.push(before);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = query(sql, params);
    const reversed = messages.reverse();

    const reactionsMap = loadReactions(reversed.map(m => m.id));
    reversed.forEach(m => { m.reactions = reactionsMap[m.id] || []; });

    res.json(reversed);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:channelId/messages', authMiddleware, (req, res) => {
  try {
    const { content } = req.body;

    const member = queryOne('SELECT id FROM dm_members WHERE dm_channel_id = ? AND user_id = ?',
      [req.params.channelId, req.userId]);
    if (!member) return res.status(403).json({ error: 'Not a member of this DM channel' });

    const messageId = uuidv4();
    run('INSERT INTO dm_messages (id, dm_channel_id, user_id, content) VALUES (?, ?, ?, ?)',
      [messageId, req.params.channelId, req.userId, content]);

    const message = queryOne('SELECT m.*, u.username, u.avatar, u.tag FROM dm_messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?',
      [messageId]);
    message.reactions = [];

    const io = req.app.get('io');
    emitDm(io, req.params.channelId, 'dm_message', {
      ...message,
      dm_channel_id: req.params.channelId
    });

    res.status(201).json(message);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:channelId/messages/:messageId', authMiddleware, (req, res) => {
  try {
    const msg = queryOne('SELECT * FROM dm_messages WHERE id = ? AND dm_channel_id = ?',
      [req.params.messageId, req.params.channelId]);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.user_id !== req.userId) return res.status(403).json({ error: 'No permission' });

    const { content } = req.body;
    run('UPDATE dm_messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, req.params.messageId]);

    const updated = queryOne('SELECT m.*, u.username, u.avatar, u.tag FROM dm_messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?',
      [req.params.messageId]);
    updated.reactions = loadReactions([updated.id])[updated.id] || [];

    const io = req.app.get('io');
    emitDm(io, req.params.channelId, 'dm_message_edited', {
      ...updated,
      dm_channel_id: req.params.channelId
    });

    res.json(updated);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:channelId/messages/:messageId', authMiddleware, (req, res) => {
  try {
    const msg = queryOne('SELECT * FROM dm_messages WHERE id = ? AND dm_channel_id = ?',
      [req.params.messageId, req.params.channelId]);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.user_id !== req.userId) return res.status(403).json({ error: 'No permission' });

    run('DELETE FROM reactions WHERE message_id = ?', [req.params.messageId]);
    run('DELETE FROM dm_messages WHERE id = ?', [req.params.messageId]);

    const io = req.app.get('io');
    emitDm(io, req.params.channelId, 'dm_message_deleted', {
      message_id: req.params.messageId,
      dm_channel_id: req.params.channelId
    });

    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:channelId/messages/:messageId/reactions', authMiddleware, (req, res) => {
  try {
    const { emoji } = req.body;

    const existing = queryOne('SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [req.params.messageId, req.userId, emoji]);

    if (existing) {
      run('DELETE FROM reactions WHERE id = ?', [existing.id]);
    } else {
      run('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.params.messageId, req.userId, emoji]);
    }

    const reactions = query(
      `SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
       FROM reactions WHERE message_id = ? GROUP BY emoji`,
      [req.params.messageId]
    );

    const io = req.app.get('io');
    emitDm(io, req.params.channelId, 'dm_reaction_updated', {
      message_id: req.params.messageId,
      dm_channel_id: req.params.channelId,
      reactions
    });

    res.json({ reactions });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
