const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPw = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { email: 'demo@example.com', password: hashedPw }
  });
  console.log('Created user:', user.email);

  const url1 = await prisma.url.upsert({
    where: { shortCode: 'google' },
    update: {},
    create: { shortCode: 'google', longUrl: 'https://www.google.com', userId: user.id, clicks: 0 }
  });

  const url2 = await prisma.url.upsert({
    where: { shortCode: 'github' },
    update: {},
    create: { shortCode: 'github', longUrl: 'https://github.com', userId: user.id, clicks: 0 }
  });

  // Sample click events for the last 7 days
  const referers = ['https://twitter.com', 'https://facebook.com', null, null, 'https://reddit.com'];
  for (let i = 0; i < 20; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (i % 7));
    await prisma.clickEvent.create({
      data: {
        urlId: url1.id,
        ipAddress: `192.168.1.${i % 50}`,
        userAgent: 'Mozilla/5.0 (seed)',
        referer: referers[i % referers.length],
        clickedAt: d
      }
    });
  }

  console.log('Seed complete. Demo account: demo@example.com / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
