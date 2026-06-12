const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const base62 = require('../utils/base62');
const cacheService = require('./cacheService');
const { isValidUrl, isValidAlias } = require('../utils/validator');

async function shortenUrl(longUrl, userId, customAlias, expiresAt) {
  if (!longUrl) throw { status: 400, message: 'URL is required' };
  if (!isValidUrl(longUrl)) throw { status: 400, message: 'Invalid URL' };

  let shortCode;

  if (customAlias) {
    if (!isValidAlias(customAlias)) {
      throw { status: 400, message: 'Invalid alias. Use 3-20 alphanumeric characters, hyphens or underscores.' };
    }
    const exists = await prisma.url.findUnique({ where: { shortCode: customAlias } });
    if (exists) throw { status: 409, message: 'Alias already taken' };

    shortCode = customAlias;
    await prisma.url.create({
      data: {
        shortCode,
        longUrl,
        userId: userId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
  } else {
    const tempCode = `__tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = await prisma.url.create({
      data: {
        shortCode: tempCode,
        longUrl,
        userId: userId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    shortCode = base62.encode(url.id);
    await prisma.url.update({ where: { id: url.id }, data: { shortCode } });
  }

  await cacheService.set(shortCode, longUrl);

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return { shortCode, shortUrl: `${appUrl}/${shortCode}`, longUrl, createdAt: new Date() };
}

async function getByShortCode(shortCode) {
  return prisma.url.findUnique({ where: { shortCode } });
}

async function getUserUrls(userId) {
  return prisma.url.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

async function deleteUrl(id, userId) {
  const url = await prisma.url.findUnique({ where: { id } });
  if (!url) throw { status: 404, message: 'URL not found' };
  if (url.userId !== userId) throw { status: 403, message: 'Forbidden' };

  await cacheService.del(url.shortCode);
  await prisma.url.delete({ where: { id } });
}

async function updateUrl(id, userId, data) {
  const url = await prisma.url.findUnique({ where: { id } });
  if (!url) throw { status: 404, message: 'URL not found' };
  if (url.userId !== userId) throw { status: 403, message: 'Forbidden' };

  const updateData = {};
  if (data.expiresAt !== undefined) {
    updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }

  return prisma.url.update({ where: { id }, data: updateData });
}

module.exports = { shortenUrl, getByShortCode, getUserUrls, deleteUrl, updateUrl };
