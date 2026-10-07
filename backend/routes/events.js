const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.get('/server/:serverId', authMiddleware, (req, res) => {
  try {
    const events = query(`
      SELECT e.*, u.username as creator_name, u.avatar as creator_avatar, u.tag as creator_tag,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'going') as going_count,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'maybe') as maybe_count
      FROM events e
      JOIN users u ON e.creator_id = u.id
      WHERE e.server_id = ?
      ORDER BY e.start_time ASC
    `, [req.params.serverId]);
    res.json(events);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { server_id, channel_id, title, description, start_time, end_time, location } = req.body;
    if (!server_id || !title || !start_time) {
      return res.status(400).json({ error: 'server_id, title, start_time required' });
    }

    const id = uuidv4();
    run('INSERT INTO events (id, server_id, channel_id, creator_id, title, description, start_time, end_time, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, server_id, channel_id || null, req.userId, title, description || '', start_time, end_time || null, location || '']);

    const event = queryOne(`
      SELECT e.*, u.username as creator_name, u.avatar as creator_avatar, u.tag as creator_tag, 0 as going_count, 0 as maybe_count
      FROM events e JOIN users u ON e.creator_id = u.id WHERE e.id = ?
    `, [id]);

    const io = req.app.get('io');
    if (io) {
      io.to(`server:${server_id}`).emit('event_created', event);
    }

    res.status(201).json(event);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:eventId', authMiddleware, (req, res) => {
  try {
    const { title, description, start_time, end_time, location } = req.body;
    const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (title !== undefined) run('UPDATE events SET title = ? WHERE id = ?', [title, req.params.eventId]);
    if (description !== undefined) run('UPDATE events SET description = ? WHERE id = ?', [description, req.params.eventId]);
    if (start_time !== undefined) run('UPDATE events SET start_time = ? WHERE id = ?', [start_time, req.params.eventId]);
    if (end_time !== undefined) run('UPDATE events SET end_time = ? WHERE id = ?', [end_time, req.params.eventId]);
    if (location !== undefined) run('UPDATE events SET location = ? WHERE id = ?', [location, req.params.eventId]);

    const updated = queryOne(`
      SELECT e.*, u.username as creator_name, u.avatar as creator_avatar, u.tag as creator_tag,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'going') as going_count,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'maybe') as maybe_count
      FROM events e JOIN users u ON e.creator_id = u.id WHERE e.id = ?
    `, [req.params.eventId]);

    const io = req.app.get('io');
    if (io) io.to(`server:${event.server_id}`).emit('event_updated', updated);

    res.json(updated);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:eventId', authMiddleware, (req, res) => {
  try {
    const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    run('DELETE FROM event_rsvps WHERE event_id = ?', [req.params.eventId]);
    run('DELETE FROM events WHERE id = ?', [req.params.eventId]);

    const io = req.app.get('io');
    if (io) io.to(`server:${event.server_id}`).emit('event_deleted', { id: req.params.eventId, server_id: event.server_id });

    res.json({ deleted: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:eventId/rsvp', authMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    if (!['going', 'maybe', 'not_going'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = queryOne('SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?',
      [req.params.eventId, req.userId]);

    if (status === 'not_going') {
      if (existing) run('DELETE FROM event_rsvps WHERE id = ?', [existing.id]);
    } else if (existing) {
      run('UPDATE event_rsvps SET status = ? WHERE id = ?', [status, existing.id]);
    } else {
      run('INSERT INTO event_rsvps (id, event_id, user_id, status) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.params.eventId, req.userId, status]);
    }

    const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    const rsvps = query('SELECT user_id, status FROM event_rsvps WHERE event_id = ?', [req.params.eventId]);

    const io = req.app.get('io');
    if (io && event) io.to(`server:${event.server_id}`).emit('event_rsvp', {
      event_id: req.params.eventId,
      rsvps,
      user_id: req.userId,
      status
    });

    res.json({ status });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:eventId/rsvps', authMiddleware, (req, res) => {
  try {
    const rsvps = query(`
      SELECT er.*, u.username, u.avatar, u.tag
      FROM event_rsvps er JOIN users u ON er.user_id = u.id
      WHERE er.event_id = ?
    `, [req.params.eventId]);
    res.json(rsvps);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
