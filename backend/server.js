const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { initDatabase, query, queryOne, run, saveDatabase } = require('./database');
const { JWT_SECRET } = require('./middleware/auth');
const logger = require('./logger');

process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', err.message, { stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', reason?.message || String(reason), { stack: reason?.stack });
});

const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const messageRoutes = require('./routes/messages');
const dmRoutes = require('./routes/dm');
const generateRoutes = require('./routes/generate');
const threadRoutes = require('./routes/threads');
const eventRoutes = require('./routes/events');
const onboardingRoutes = require('./routes/onboarding');
const aiChatRoutes = require('./routes/ai-chats');
const collectionRoutes = require('./routes/collection');
const shopRoutes = require('./routes/shop');
const boostRoutes = require('./routes/boosts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  maxHttpBufferSize: 1e6,
  pingInterval: 25000,
  pingTimeout: 10000,
});

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d', immutable: true }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/ai-chats', aiChatRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/boosts', boostRoutes);

app.post('/api/upload', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}, upload.array('files', 10), (req, res) => {
  try {
    const files = req.files.map(f => ({
      id: uuidv4(),
      filename: f.filename,
      original_name: f.originalname,
      mime_type: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`
    }));
    res.json(files);
  } catch (error) {
    logger.error('upload_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.use((err, req, res, next) => {
  logger.error('express_error', `${req.method} ${req.originalUrl}: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  onlineUsers.set(socket.userId, socket.id);

  try {
    run('UPDATE users SET status = ? WHERE id = ?', ['online', socket.userId]);
  } catch (e) {}

  const userServers = query('SELECT server_id FROM server_members WHERE user_id = ?', [socket.userId]);
  userServers.forEach(s => socket.join(`server:${s.server_id}`));
  socket.join(`user:${socket.userId}`);

  userServers.forEach(s => {
    io.to(`server:${s.server_id}`).emit('user_status', { userId: socket.userId, status: 'online' });
  });

  socket.on('join_server', (serverId) => {
    try { socket.join(`server:${serverId}`); } catch (e) { logger.error('join_server', e.message, { user: socket.userId }); }
  });

  socket.on('leave_server', (serverId) => {
    try { socket.leave(`server:${serverId}`); } catch (e) { logger.error('leave_server', e.message, { user: socket.userId }); }
  });

  socket.on('join_channel', (channelId) => {
    try { socket.join(`channel:${channelId}`); } catch (e) { logger.error('join_channel', e.message, { user: socket.userId }); }
  });

  socket.on('leave_channel', (channelId) => {
    try { socket.leave(`channel:${channelId}`); } catch (e) { logger.error('leave_channel', e.message, { user: socket.userId }); }
  });

  socket.on('typing', (data) => {
    try {
      const { channelId, serverId, username } = data;
      if (serverId) {
        socket.to(`server:${serverId}`).emit('user_typing', { channelId, userId: socket.userId, username });
      }
    } catch (e) { logger.error('typing', e.message, { user: socket.userId }); }
  });

  socket.on('stop_typing', (data) => {
    try {
      const { channelId, serverId } = data;
      if (serverId) {
        socket.to(`server:${serverId}`).emit('user_stop_typing', { channelId, userId: socket.userId });
      }
    } catch (e) { logger.error('stop_typing', e.message, { user: socket.userId }); }
  });

  socket.on('dm_typing', (data) => {
    try {
      const { channelId, username } = data;
      const members = query('SELECT user_id FROM dm_members WHERE dm_channel_id = ?', [channelId]);
      members.forEach(m => {
        if (m.user_id !== socket.userId) {
          io.to(`user:${m.user_id}`).emit('dm_user_typing', { channelId, userId: socket.userId, username });
        }
      });
    } catch (e) {}
  });

  socket.on('dm_stop_typing', (data) => {
    try {
      const { channelId } = data;
      const members = query('SELECT user_id FROM dm_members WHERE dm_channel_id = ?', [channelId]);
      members.forEach(m => {
        if (m.user_id !== socket.userId) {
          io.to(`user:${m.user_id}`).emit('dm_user_stop_typing', { channelId, userId: socket.userId });
        }
      });
    } catch (e) {}
  });

  socket.on('voice_join', (data) => {
    try {
      const { channelId, serverId } = data;
      const existing = queryOne('SELECT * FROM voice_state WHERE user_id = ? AND server_id = ?', [socket.userId, serverId]);
      if (!existing) {
        run('INSERT INTO voice_state (id, user_id, channel_id, server_id) VALUES (?, ?, ?, ?)', [uuidv4(), socket.userId, channelId, serverId]);
      }
      socket.join(`voice:${channelId}`);
      const users = query('SELECT vs.*, u.username, u.tag, u.avatar FROM voice_state vs JOIN users u ON vs.user_id = u.id WHERE vs.channel_id = ?', [channelId]);
      io.to(`server:${serverId}`).emit('voice_users', { channelId, users });
      logger.info('voice_join', `User joined voice channel ${channelId}`, { user: socket.userId });
    } catch (e) { logger.error('voice_join', e.message, { user: socket.userId }); }
  });

  socket.on('voice_leave', (data) => {
    try {
      const { channelId, serverId } = data;
      run('DELETE FROM voice_state WHERE user_id = ? AND channel_id = ?', [socket.userId, channelId]);
      socket.leave(`voice:${channelId}`);
      const users = query('SELECT vs.*, u.username, u.tag, u.avatar FROM voice_state vs JOIN users u ON vs.user_id = u.id WHERE vs.channel_id = ?', [channelId]);
      io.to(`server:${serverId}`).emit('voice_users', { channelId, users });
      logger.info('voice_leave', `User left voice channel ${channelId}`, { user: socket.userId });
    } catch (e) { logger.error('voice_leave', e.message, { user: socket.userId }); }
  });

  socket.on('voice_signal', (data) => {
    try {
      const { to, signal, type } = data;
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('voice_signal', { from: socket.userId, signal, type });
      }
    } catch (e) { logger.error('voice_signal', e.message, { user: socket.userId }); }
  });

  socket.on('join_thread', (threadId) => {
    try { socket.join(`thread:${threadId}`); } catch (e) { logger.error('join_thread', e.message, { user: socket.userId }); }
  });

  socket.on('leave_thread', (threadId) => {
    try { socket.leave(`thread:${threadId}`); } catch (e) { logger.error('leave_thread', e.message, { user: socket.userId }); }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);

    let voiceChannels = [];
    try {
      voiceChannels = query('SELECT DISTINCT channel_id, server_id FROM voice_state WHERE user_id = ?', [socket.userId]);
      run('UPDATE users SET status = ? WHERE id = ?', ['offline', socket.userId]);
      run('DELETE FROM voice_state WHERE user_id = ?', [socket.userId]);
    } catch (e) {
      logger.error('disconnect_cleanup', e.message, { user: socket.userId });
    }

    const servers = query('SELECT DISTINCT server_id FROM server_members WHERE user_id = ?', [socket.userId]);
    servers.forEach(s => io.to(`server:${s.server_id}`).emit('user_status', { userId: socket.userId, status: 'offline' }));

    voiceChannels.forEach(vc => {
      const users = query('SELECT vs.*, u.username, u.tag, u.avatar FROM voice_state vs JOIN users u ON vs.user_id = u.id WHERE vs.channel_id = ?', [vc.channel_id]);
      io.to(`server:${vc.server_id}`).emit('voice_users', { channelId: vc.channel_id, users });
    });
  });
});

const PORT = process.env.PORT || 3001;

initDatabase().then(() => {
  server.listen(PORT, () => {
    logger.info('server_start', `Server running on port ${PORT}`);
  });
}).catch(err => {
  logger.error('database_init_failed', err.message, { stack: err.stack });
  process.exit(1);
});
