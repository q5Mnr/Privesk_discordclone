const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

function threadWithInfo(thread) {
  const lastMsg = queryOne(`
    SELECT m.content, m.created_at, u.username
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.thread_id = ?
    ORDER BY m.created_at DESC LIMIT 1
  `, [thread.id]);
  thread.last_message = lastMsg || null;

  const tags = query(`
    SELECT ft.id, ft.name, ft.color, ft.emoji
    FROM thread_tags tt
    JOIN forum_tags ft ON tt.tag_id = ft.id
    WHERE tt.thread_id = ?
  `, [thread.id]);
  thread.tags = tags;

  const creator = queryOne('SELECT username, avatar, tag FROM users WHERE id = ?', [thread.creator_id]);
  thread.creator = creator || null;

  return thread;
}

router.get('/tags/:channelId', authMiddleware, (req, res) => {
  try {
    const tags = query('SELECT * FROM forum_tags WHERE channel_id = ?', [req.params.channelId]);
    res.json(tags);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tags/:channelId', authMiddleware, (req, res) => {
  try {
    const { name, color, emoji } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = uuidv4();
    run('INSERT INTO forum_tags (id, channel_id, name, color, emoji) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.channelId, name, color || '#99aab5', emoji || '']);
    const tag = queryOne('SELECT * FROM forum_tags WHERE id = ?', [id]);
    res.status(201).json(tag);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/tags/:channelId/:tagId', authMiddleware, (req, res) => {
  try {
    run('DELETE FROM forum_tags WHERE id = ? AND channel_id = ?', [req.params.tagId, req.params.channelId]);
    res.json({ deleted: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/channel/:channelId', authMiddleware, (req, res) => {
  try {
    const { archived } = req.query;
    let sql = 'SELECT * FROM threads WHERE channel_id = ?';
    const params = [req.params.channelId];
    if (archived !== undefined) {
      sql += ' AND archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    } else {
      sql += ' AND archived = 0';
    }
    sql += ' ORDER BY created_at DESC';
    const threads = query(sql, params);
    res.json(threads.map(threadWithInfo));
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { channel_id, name, message_id, tags } = req.body;
    if (!channel_id || !name) return res.status(400).json({ error: 'channel_id and name required' });

    const channel = queryOne('SELECT * FROM channels WHERE id = ?', [channel_id]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const threadId = uuidv4();
    run('INSERT INTO threads (id, channel_id, name, creator_id) VALUES (?, ?, ?, ?)',
      [threadId, channel_id, name, req.userId]);

    if (message_id) {
      run('UPDATE messages SET thread_id = ? WHERE id = ?', [threadId, message_id]);
    }

    if (tags && tags.length) {
      tags.forEach(tagId => {
        run('INSERT OR IGNORE INTO thread_tags (thread_id, tag_id) VALUES (?, ?)', [threadId, tagId]);
      });
    }

    const thread = queryOne('SELECT * FROM threads WHERE id = ?', [threadId]);
    const result = threadWithInfo(thread);

    const io = req.app.get('io');
    if (io && channel.server_id) {
      io.to(`server:${channel.server_id}`).emit('thread_created', {
        ...result,
        server_id: channel.server_id
      });
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:threadId', authMiddleware, (req, res) => {
  try {
    const thread = queryOne('SELECT * FROM threads WHERE id = ?', [req.params.threadId]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [thread.channel_id]);
    thread.server_id = channel?.server_id || null;

    res.json(threadWithInfo(thread));
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:threadId/archive', authMiddleware, (req, res) => {
  try {
    const thread = queryOne('SELECT * FROM threads WHERE id = ?', [req.params.threadId]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    run('UPDATE threads SET archived = 1, archived_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.threadId]);
    res.json({ archived: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:threadId/unarchive', authMiddleware, (req, res) => {
  try {
    const thread = queryOne('SELECT * FROM threads WHERE id = ?', [req.params.threadId]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    run('UPDATE threads SET archived = 0, archived_at = NULL WHERE id = ?', [req.params.threadId]);
    res.json({ archived: false });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:threadId', authMiddleware, (req, res) => {
  try {
    const thread = queryOne('SELECT * FROM threads WHERE id = ?', [req.params.threadId]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    run('DELETE FROM thread_tags WHERE thread_id = ?', [req.params.threadId]);
    run('UPDATE messages SET thread_id = NULL WHERE thread_id = ?', [req.params.threadId]);
    run('DELETE FROM threads WHERE id = ?', [req.params.threadId]);
    res.json({ deleted: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:threadId/messages', authMiddleware, (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    let sql = `
      SELECT m.*, u.username, u.avatar, u.tag
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.thread_id = ?
    `;
    const params = [req.params.threadId];
    if (before) { sql += ' AND m.created_at < ?'; params.push(before); }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = query(sql, params);

    const allIds = messages.map(m => m.id);
    const replyIds = messages.filter(m => m.reply_to).map(m => m.reply_to);
    const fetchIds = [...new Set([...allIds, ...replyIds])];

    if (fetchIds.length) {
      const atts = query(`SELECT * FROM attachments WHERE message_id IN (${fetchIds.map(()=>'?').join(',')})`, fetchIds);
      const reacts = query(`SELECT message_id, emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
        FROM reactions WHERE message_id IN (${fetchIds.map(()=>'?').join(',')})
        GROUP BY message_id, emoji`, fetchIds);
      const replies = replyIds.length
        ? query(`SELECT m.id, m.content, m.user_id, u.username, u.tag
            FROM messages m JOIN users u ON m.user_id = u.id
            WHERE m.id IN (${replyIds.map(()=>'?').join(',')})`, replyIds)
        : [];

      messages.forEach(msg => {
        msg.attachments = atts.filter(a => a.message_id === msg.id);
        msg.reactions = reacts.filter(r => r.message_id === msg.id);
        msg.role_color = null;
        msg.role_name = null;
        if (msg.reply_to) msg.reply_to_message = replies.find(r => r.id === msg.reply_to) || null;
      });
    } else {
      messages.forEach(msg => { msg.attachments = []; msg.reactions = []; msg.role_color = null; msg.role_name = null; });
    }

    run('UPDATE threads SET message_count = (SELECT COUNT(*) FROM messages WHERE thread_id = ?) WHERE id = ?',
      [req.params.threadId, req.params.threadId]);

    res.json(messages.reverse());
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:threadId/messages', authMiddleware, (req, res) => {
  try {
    const { content, reply_to } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const thread = queryOne('SELECT * FROM threads WHERE id = ?', [req.params.threadId]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.archived) return res.status(400).json({ error: 'Thread is archived' });

    const messageId = uuidv4();
    run('INSERT INTO messages (id, channel_id, user_id, content, reply_to, thread_id) VALUES (?, ?, ?, ?, ?, ?)',
      [messageId, thread.channel_id, req.userId, content, reply_to || null, req.params.threadId]);

    run('UPDATE threads SET message_count = message_count + 1 WHERE id = ?', [req.params.threadId]);

    const msg = queryOne(`
      SELECT m.*, u.username, u.avatar, u.tag
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `, [messageId]);
    msg.attachments = [];
    msg.reactions = [];
    msg.role_color = null;
    msg.role_name = null;

    if (reply_to) {
      msg.reply_to_message = queryOne(`
        SELECT m.id, m.content, m.user_id, u.username, u.tag
        FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
      `, [reply_to]);
    }

    const channel = queryOne('SELECT server_id FROM channels WHERE id = ?', [thread.channel_id]);
    const io = req.app.get('io');
    if (io && channel?.server_id) {
      io.to(`server:${channel.server_id}`).emit('thread_message', {
        ...msg,
        thread_id: req.params.threadId,
        server_id: channel.server_id
      });
    }

    res.status(201).json(msg);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
