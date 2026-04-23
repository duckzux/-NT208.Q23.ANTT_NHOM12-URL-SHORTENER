require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDb() {
  await prisma.clickEvent.deleteMany();
  await prisma.url.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => { await cleanDb(); });
afterAll(async () => {
  await cleanDb();
  await prisma.$disconnect();
});

module.exports = { prisma };
