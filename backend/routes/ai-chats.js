const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { query, queryOne, run } = require('../database');
const logger = require('../logger');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const chats = query(
      'SELECT id, title, created_at FROM ai_chats WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const id = uuidv4();
    const { title } = req.body;
    run('INSERT INTO ai_chats (id, user_id, title) VALUES (?, ?, ?)',
      [id, req.userId, title || 'Новый чат']);
    res.json({ id, title: title || 'Новый чат', created_at: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const chat = queryOne('SELECT * FROM ai_chats WHERE id = ? AND user_id = ?',
      [req.params.chatId, req.userId]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    run('UPDATE ai_chats SET title = ? WHERE id = ?', [title, req.params.chatId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:chatId', authMiddleware, async (req, res) => {
  try {
    run('DELETE FROM ai_chats WHERE id = ? AND user_id = ?',
      [req.params.chatId, req.userId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const chat = queryOne('SELECT * FROM ai_chats WHERE id = ? AND user_id = ?',
      [req.params.chatId, req.userId]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const messages = query(
      'SELECT role, content, thinking, error FROM ai_messages WHERE chat_id = ? ORDER BY id ASC',
      [req.params.chatId]
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const chat = queryOne('SELECT * FROM ai_chats WHERE id = ? AND user_id = ?',
      [req.params.chatId, req.userId]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const { role, content, thinking, error: isError } = req.body;
    run('INSERT INTO ai_messages (chat_id, role, content, thinking, error) VALUES (?, ?, ?, ?, ?)',
      [req.params.chatId, role, content, thinking || '', isError ? 1 : 0]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
