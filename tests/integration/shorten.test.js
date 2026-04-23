require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

describe('URL Shortener API', () => {
  const agent = request.agent(app);
  let createdShortCode;

  beforeAll(async () => {
    await agent.post('/api/auth/register').send({ email: 'shorten-test@example.com', password: 'password123' });
    await agent.post('/api/auth/login').send({ email: 'shorten-test@example.com', password: 'password123' });
  });

  it('POST /api/shorten - should create short URL (201)', async () => {
    const res = await agent
      .post('/api/shorten')
      .send({ longUrl: 'https://www.example.com/test-page' });
    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBeDefined();
    expect(res.body.shortUrl).toContain(res.body.shortCode);
    createdShortCode = res.body.shortCode;
  });

  it('POST /api/shorten - should reject invalid URL (400)', async () => {
    const res = await agent.post('/api/shorten').send({ longUrl: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('POST /api/shorten - should reject missing URL (400)', async () => {
    const res = await agent.post('/api/shorten').send({});
    expect(res.status).toBe(400);
  });

  it('GET /:shortCode - should redirect (302)', async () => {
    const res = await request(app).get('/' + createdShortCode).redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://www.example.com/test-page');
  });

  it('GET /:shortCode - should return 404 for unknown code', async () => {
    const res = await request(app).get('/XXXXXX').redirects(0);
    expect(res.status).toBe(404);
  });

  it('GET /api/urls - should list user URLs (200)', async () => {
    const res = await agent.get('/api/urls');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.urls)).toBe(true);
    expect(res.body.urls.length).toBeGreaterThan(0);
  });

  it('GET /api/urls - should return 401 without auth', async () => {
    const res = await request(app).get('/api/urls');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/urls/:id - should delete URL (200)', async () => {
    const listRes = await agent.get('/api/urls');
    const urlId = listRes.body.urls[0].id;
    const res = await agent.delete('/api/urls/' + urlId);
    expect(res.status).toBe(200);
  });
});
