const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
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
