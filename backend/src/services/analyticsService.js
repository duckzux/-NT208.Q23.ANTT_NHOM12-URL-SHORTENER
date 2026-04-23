const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recordClick(urlId, ip, userAgent, referer) {
  try {
    await prisma.clickEvent.create({
      data: {
        urlId,
        ipAddress: ip ? String(ip).substring(0, 45) : null,
        userAgent: userAgent || null,
        referer: referer || null
      }
    });
  } catch (err) {
    console.error('Failed to record click:', err.message);
  }
}

async function getAnalytics(urlId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.clickEvent.findMany({
    where: { urlId, clickedAt: { gte: since } },
    select: { clickedAt: true, referer: true, country: true }
  });

  // Build day-by-day map for the last N days
  const byDayMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDayMap[d.toISOString().split('T')[0]] = 0;
  }
  events.forEach(e => {
    const key = e.clickedAt.toISOString().split('T')[0];
    if (byDayMap[key] !== undefined) byDayMap[key]++;
  });
  const clicksByDay = Object.entries(byDayMap).map(([date, count]) => ({ date, count }));

  // Top referers
  const refererMap = {};
  events.forEach(e => {
    const r = e.referer || 'Direct';
    const label = r.length > 100 ? r.substring(0, 100) : r;
    refererMap[label] = (refererMap[label] || 0) + 1;
  });
  const topReferers = Object.entries(refererMap)
    .map(([referer, count]) => ({ referer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top countries
  const countryMap = {};
  events.forEach(e => {
    const c = e.country || 'Unknown';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const topCountries = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalClicks: events.length, clicksByDay, topReferers, topCountries };
}

module.exports = { recordClick, getAnalytics };
