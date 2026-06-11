const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cacheService = require('../services/cacheService');
const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');

const FRONTEND_DIR = path.join(__dirname, '../../../frontend');

exports.redirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    if (shortCode.includes('.')) return next();

    let longUrl = await cacheService.get(shortCode);

    if (!longUrl) {
      const url = await urlService.getByShortCode(shortCode);

      if (!url) {
        return res.status(404).sendFile('404.html', { root: FRONTEND_DIR });
      }

      if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'This link has expired' });
      }

      longUrl = url.longUrl;
      await cacheService.set(shortCode, longUrl);

      // Fire-and-forget: record click + increment counter
      _recordAsync(url.id, req);
    } else {
      // Cache hit — still record click async
      urlService.getByShortCode(shortCode).then(url => {
        if (url) _recordAsync(url.id, req);
      }).catch(() => {});
    }

    res.redirect(302, longUrl);
  } catch (err) { next(err); }
};

function _recordAsync(urlId, req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const ua = req.headers['user-agent'] || null;
  const referer = req.headers['referer'] || null;

  analyticsService.recordClick(urlId, ip, ua, referer);
  prisma.url.update({ where: { id: urlId }, data: { clicks: { increment: 1 } } }).catch(() => {});
}
