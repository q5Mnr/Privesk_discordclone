const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

router.get('/check/:serverId', authMiddleware, (req, res) => {
  try {
    const done = queryOne('SELECT * FROM member_onboarding_done WHERE user_id = ? AND server_id = ?',
      [req.userId, req.params.serverId]);
    const config = queryOne('SELECT * FROM onboarding WHERE server_id = ?', [req.params.serverId]);
    res.json({
      completed: !!done,
      onboarding_enabled: config ? !!config.enabled : false
    });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/complete/:serverId', authMiddleware, (req, res) => {
  try {
    const { selected_roles } = req.body;
    run('INSERT OR IGNORE INTO member_onboarding_done (user_id, server_id) VALUES (?, ?)',
      [req.userId, req.params.serverId]);

    if (selected_roles && selected_roles.length) {
      const config = queryOne('SELECT role_options FROM onboarding WHERE server_id = ?', [req.params.serverId]);
      if (config) {
        const options = JSON.parse(config.role_options || '[]');
        selected_roles.forEach(roleId => {
          const opt = options.find(o => o.role_id === roleId);
          if (opt) {
            const existing = queryOne('SELECT * FROM member_roles WHERE server_id = ? AND user_id = ? AND role_id = ?',
              [req.params.serverId, req.userId, roleId]);
            if (!existing) {
              run('INSERT INTO member_roles (id, server_id, user_id, role_id) VALUES (?, ?, ?, ?)',
                [uuidv4(), req.params.serverId, req.userId, roleId]);
            }
          }
        });
      }
    }

    res.json({ completed: true });
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:serverId', authMiddleware, (req, res) => {
  try {
    let config = queryOne('SELECT * FROM onboarding WHERE server_id = ?', [req.params.serverId]);
    if (!config) {
      run('INSERT INTO onboarding (id, server_id) VALUES (?, ?)', [uuidv4(), req.params.serverId]);
      config = queryOne('SELECT * FROM onboarding WHERE server_id = ?', [req.params.serverId]);
    }
    config.rules = JSON.parse(config.rules || '[]');
    config.guide_channels = JSON.parse(config.guide_channels || '[]');
    config.role_options = JSON.parse(config.role_options || '[]');
    res.json(config);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:serverId', authMiddleware, (req, res) => {
  try {
    const member = queryOne('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?',
      [req.params.serverId, req.userId]);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'No permission' });
    }

    let config = queryOne('SELECT * FROM onboarding WHERE server_id = ?', [req.params.serverId]);
    if (!config) {
      run('INSERT INTO onboarding (id, server_id) VALUES (?, ?)', [uuidv4(), req.params.serverId]);
      config = queryOne('SELECT * FROM onboarding WHERE server_id = ?', [req.params.serverId]);
    }

    const { enabled, welcome_message, rules, guide_channels, role_options } = req.body;
    if (enabled !== undefined) run('UPDATE onboarding SET enabled = ? WHERE server_id = ?', [enabled ? 1 : 0, req.params.serverId]);
    if (welcome_message !== undefined) run('UPDATE onboarding SET welcome_message = ? WHERE server_id = ?', [welcome_message, req.params.serverId]);
    if (rules !== undefined) run('UPDATE onboarding SET rules = ? WHERE server_id = ?', [JSON.stringify(rules), req.params.serverId]);
    if (guide_channels !== undefined) run('UPDATE onboarding SET guide_channels = ? WHERE server_id = ?', [JSON.stringify(guide_channels), req.params.serverId]);
    if (role_options !== undefined) run('UPDATE onboarding SET role_options = ? WHERE server_id = ?', [JSON.stringify(role_options), req.params.serverId]);

    const updated = queryOne('SELECT * FROM onboarding WHERE server_id = ?', [req.params.serverId]);
    updated.rules = JSON.parse(updated.rules || '[]');
    updated.guide_channels = JSON.parse(updated.guide_channels || '[]');
    updated.role_options = JSON.parse(updated.role_options || '[]');
    res.json(updated);
  } catch (error) {
    logger.error('route_error', error.message, { stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
