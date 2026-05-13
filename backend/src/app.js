const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const redis = require('./config/redis');

// Redis-backed session store using ioredis (no extra dependency)
class RedisStore extends session.Store {
  get(sid, cb) {
    redis.get(`sess:${sid}`)
      .then(data => cb(null, data ? JSON.parse(data) : null))
      .catch(cb);
  }
  set(sid, sess, cb) {
    const ttl = Math.floor((sess.cookie?.maxAge || 86400000) / 1000);
    redis.setex(`sess:${sid}`, ttl, JSON.stringify(sess))
      .then(() => cb(null))
      .catch(cb);
  }
  destroy(sid, cb) {
    redis.del(`sess:${sid}`).then(() => cb(null)).catch(cb);
  }
}

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  store: new RedisStore(),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax'
  }
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const redis = require('./config/redis');
  const prisma = new PrismaClient();

  let dbStatus = 'ok';
  let redisStatus = 'ok';

  try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'error'; }
  try { await redis.ping(); } catch { redisStatus = 'error'; }

  res.json({
    status: 'ok',
    db: dbStatus,
    redis: redisStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API routes (must be before redirect catch-all)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/urlRoutes'));
app.use('/api', require('./routes/analyticsRoutes'));

// Redirect catch-all — MUST be last
app.use('/', require('./routes/redirectRoutes'));

// Error handler
app.use(require('./middleware/errorHandler'));

module.exports = app;
