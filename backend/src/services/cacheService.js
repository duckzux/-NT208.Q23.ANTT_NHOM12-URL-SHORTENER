const redis = require('../config/redis');
module.exports = {
  async get(key) { try { return await redis.get(`url:${key}`); } catch { return null; } },
  async set(key, val, ttl = 86400) { try { await redis.setex(`url:${key}`, ttl, val); } catch {} },
  async del(key) { try { await redis.del(`url:${key}`); } catch {} },
};
