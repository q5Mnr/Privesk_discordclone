const { queryOne, query } = require('./database');

const PERMISSIONS = {
  SEND_MESSAGES:     1,
  MANAGE_MESSAGES:   2,
  ATTACH_FILES:      4,
  ADD_REACTIONS:     8,
  MANAGE_CHANNELS:   16,
  MANAGE_ROLES:      32,
  KICK_MEMBERS:      64,
  BAN_MEMBERS:       128,
  MANAGE_SERVER:     256,
  PIN_MESSAGES:      512,
};

const permCache = new Map();
const CACHE_TTL = 30000;

function getEffectivePermissions(userId, serverId) {
  const key = `${userId}:${serverId}`;
  const cached = permCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.perms;

  const member = queryOne(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?',
    [serverId, userId]
  );
  if (!member) return 0;

  if (member.role === 'owner') return 0xFFFFFFFF;
  if (member.role === 'admin') return 0x7FFFFFFF;

  let permissions = 0;

  const roles = query(
    'SELECT r.permissions FROM member_roles mr JOIN roles r ON mr.role_id = r.id WHERE mr.user_id = ? AND mr.server_id = ?',
    [userId, serverId]
  );

  for (let i = 0; i < roles.length; i++) {
    permissions |= roles[i].permissions;
  }

  if (member.role === 'moderator') {
    permissions |= PERMISSIONS.SEND_MESSAGES | PERMISSIONS.MANAGE_MESSAGES |
      PERMISSIONS.ADD_REACTIONS | PERMISSIONS.PIN_MESSAGES |
      PERMISSIONS.KICK_MEMBERS | PERMISSIONS.BAN_MEMBERS;
  }

  const user = queryOne('SELECT subscription, subscription_expires FROM users WHERE id = ?', [userId]);
  if (user && user.subscription === 'sosiska') {
    const notExpired = !user.subscription_expires || new Date(user.subscription_expires) > new Date();
    if (notExpired) {
      permCache.set(key, { perms: 0x7FFFFFFF, ts: Date.now() });
      return 0x7FFFFFFF;
    }
  }

  permCache.set(key, { perms: permissions, ts: Date.now() });
  return permissions;
}

function invalidatePermissions(userId, serverId) {
  if (serverId) {
    permCache.delete(`${userId}:${serverId}`);
  } else {
    for (const k of permCache.keys()) {
      if (k.startsWith(userId + ':')) permCache.delete(k);
    }
  }
}

function hasPermission(userId, serverId, bit) {
  return (getEffectivePermissions(userId, serverId) & bit) !== 0;
}

module.exports = { PERMISSIONS, getEffectivePermissions, hasPermission, invalidatePermissions };
