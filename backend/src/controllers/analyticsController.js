const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const analyticsService = require('../services/analyticsService');

exports.getAnalytics = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const urlRecord = await prisma.url.findUnique({ where: { id } });

    if (!urlRecord) return res.status(404).json({ error: 'URL not found' });
    if (urlRecord.userId && urlRecord.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await analyticsService.getAnalytics(id);
    res.json({ ...analytics, url: urlRecord });
  } catch (err) { next(err); }
};
