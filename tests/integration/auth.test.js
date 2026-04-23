require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

describe('Auth API', () => {
  it('POST /api/auth/register - should create new user (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'auth-test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('auth-test@example.com');
  });

  it('POST /api/auth/register - should reject duplicate email (409)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'auth-test@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/register - should reject short password (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login - should login with correct credentials (200)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('POST /api/auth/login - should reject wrong password (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me - should return 401 without session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/health - should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
