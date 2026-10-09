import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';

const API = '/api/v1';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';

function log(label: string, res: any) {
  console.log(`\n=== [${label}] ===`);
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('========================\n');
}

describe('Authentication E2E — Hardened Security Suite', () => {
  let adminToken: string;
  let adminRefreshToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = res.body.data?.accessToken;
    adminRefreshToken = res.body.data?.refreshToken;
  });

  afterAll(async () => {
  });

  describe('POST /auth/login — Basic', () => {
    it('logs in admin with valid credentials', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      log('LOGIN SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
    });

    it('rejects wrong password with 401', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: 'WrongPassword123' });

      log('LOGIN WRONG PASSWORD', res);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('rejects non-existent email with 401', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: 'ghost@nowhere.com', password: 'Anything123' });

      log('LOGIN GHOST EMAIL', res);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/login — Malformed Input', () => {
    it('rejects missing password with 400', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL });

      log('LOGIN MISSING PASSWORD', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password/i);
    });

    it('rejects missing email with 400', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ password: 'Admin@123' });

      log('LOGIN MISSING EMAIL', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it('rejects empty body with 400', async () => {
      const res = await request(app).post(`${API}/auth/login`).send({});

      log('LOGIN EMPTY BODY', res);
      expect(res.status).toBe(400);
    });

    it('rejects null email with 400', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: null, password: 'Admin@123' });

      log('LOGIN NULL EMAIL', res);
      expect(res.status).toBe(400);
    });

    it('rejects null password with 400', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: null });

      log('LOGIN NULL PASSWORD', res);
      expect(res.status).toBe(400);
    });

    it('rejects empty-string password with 400', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: '' });

      log('LOGIN EMPTY PASSWORD', res);
      expect(res.status).toBe(400);
    });

    it('rejects non-string email (number)', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: 12345, password: 'Admin@123' });

      log('LOGIN NUMBER EMAIL', res);
      expect([400, 401]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('rejects non-string password (number)', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: 123456789 });

      log('LOGIN NUMBER PASSWORD', res);
      expect([400, 401]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('rejects object payload in email field', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: { $ne: null }, password: 'Admin@123' });

      log('LOGIN OBJECT INJECTION ATTEMPT', res);
      expect([400, 401]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('rejects array payload', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send([{ email: ADMIN_EMAIL, password: 'Admin@123' }]);

      log('LOGIN ARRAY PAYLOAD', res);
      expect(res.status).not.toBe(500);
    });
  });

  describe('POST /auth/login — Injection Attacks', () => {
    it('resists SQL injection in email (classic)', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({
          email: "' OR '1'='1' --",
          password: 'anything',
        });

      log('LOGIN SQL INJECTION #1', res);
      expect(res.status).toBe(401);
      expect(res.body.data).toBeUndefined();
    });

    it('resists SQL injection with semicolon', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({
          email: "admin@example.com'; DROP TABLE users; --",
          password: 'anything',
        });

      log('LOGIN SQL INJECTION #2', res);
      expect(res.status).toBe(401);

      const check = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      expect(check.status).toBe(200);
    });

    it('resists NoSQL injection pattern', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({
          email: { $gt: '' },
          password: { $gt: '' },
        });

      log('LOGIN NOSQL INJECTION', res);
      expect([400, 401]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('safely handles very long email', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({
          email: 'a'.repeat(10000) + '@test.com',
          password: 'anything',
        });

      log('LOGIN HUGE EMAIL', res);
      expect(res.status).not.toBe(500);
    });

    it('safely handles very long password', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({
          email: ADMIN_EMAIL,
          password: 'x'.repeat(100000),
        });

      log('LOGIN HUGE PASSWORD', res);
      expect(res.status).toBe(401);
    });

    it('handles special characters in email', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({
          email: '<script>alert(1)</script>@test.com',
          password: 'anything',
        });

      log('LOGIN XSS IN EMAIL', res);
      expect([400, 401]).toContain(res.status);
    });
  });

  describe('GET /auth/me — Auth Bypass Attempts', () => {
    it('returns profile with valid token', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('ME SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
    });

    it('rejects without Authorization header', async () => {
      const res = await request(app).get(`${API}/auth/me`);
      log('ME NO HEADER', res);
      expect(res.status).toBe(401);
    });

    it('rejects with empty Authorization', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', '');
      log('ME EMPTY HEADER', res);
      expect(res.status).toBe(401);
    });

    it('rejects with only "Bearer" prefix', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', 'Bearer');
      log('ME BEARER ONLY', res);
      expect(res.status).toBe(401);
    });

    it('rejects with "Bearer " but no token', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', 'Bearer ');
      log('ME BEARER SPACE', res);
      expect(res.status).toBe(401);
    });

    it('rejects with token but no "Bearer" prefix', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', adminToken);
      log('ME NO BEARER PREFIX', res);
      expect(res.status).toBe(401);
    });

    it('rejects with wrong scheme (Basic)', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Basic ${adminToken}`);
      log('ME BASIC SCHEME', res);
      expect(res.status).toBe(401);
    });

    it('rejects with fake JWT', async () => {
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.fake.signature');
      log('ME FAKE JWT', res);
      expect(res.status).toBe(401);
    });

    it('rejects token signed with wrong secret', async () => {
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIn0.wrongsig';
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${fakeToken}`);
      log('ME WRONG SIGNATURE', res);
      expect(res.status).toBe(401);
    });

    it('rejects alg:none JWT attack', async () => {
      const algNoneToken =
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiJ9.';
      const res = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${algNoneToken}`);
      log('ME ALG:NONE ATTACK', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/forgot-password — Enumeration Resistance', () => {
    it('accepts valid email', async () => {
      const res = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: ADMIN_EMAIL });
      log('FORGOT VALID', res);
      expect(res.status).toBe(200);
    });

    it('responds IDENTICALLY for non-existent email', async () => {
      const res = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'ghost@nowhere.com' });
      log('FORGOT GHOST', res);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe(
        'If the email exists, a reset link has been sent'
      );
    });

    it('message is identical for both cases (byte-for-byte)', async () => {
      const realRes = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: ADMIN_EMAIL });
      const ghostRes = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'ghost@nowhere.com' });

      expect(realRes.body).toEqual(ghostRes.body);
    });

    it('rejects missing email with 400', async () => {
      const res = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({});
      log('FORGOT MISSING EMAIL', res);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/refresh — Token Rotation', () => {
    it('returns new tokens with valid refresh token', async () => {
      const loginRes = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken });

      log('REFRESH SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('old refresh token is revoked after rotation', async () => {
      const loginRes = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const oldRefresh = loginRes.body.data.refreshToken;

      await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: oldRefresh });

      const retryRes = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: oldRefresh });

      log('REFRESH OLD TOKEN REUSE', retryRes);
      expect(retryRes.status).toBe(401);
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: 'garbage-token' });
      log('REFRESH GARBAGE', res);
      expect(res.status).toBe(401);
    });

    it('rejects missing refresh token', async () => {
      const res = await request(app)
        .post(`${API}/auth/refresh`)
        .send({});
      log('REFRESH MISSING', res);
      expect(res.status).toBe(400);
    });

    it('rejects access token used as refresh token', async () => {
      const loginRes = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: accessToken });

      log('REFRESH USED ACCESS TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/change-password — Auth Required', () => {
    it('rejects without auth', async () => {
      const res = await request(app)
        .post(`${API}/auth/change-password`)
        .send({
          currentPassword: ADMIN_PASSWORD,
          newPassword: 'NewPass@999',
        });
      log('CHANGE PWD NO AUTH', res);
      expect(res.status).toBe(401);
    });

    it('rejects with wrong current password', async () => {
      const res = await request(app)
        .post(`${API}/auth/change-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'WrongCurrentPass',
          newPassword: 'NewPass@999',
        });
      log('CHANGE PWD WRONG CURRENT', res);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('HTTP Protocol Misuse', () => {
    it('GET on /auth/login returns 404/405', async () => {
      const res = await request(app).get(`${API}/auth/login`);
      log('GET LOGIN', res);
      expect([404, 405]).toContain(res.status);
    });

    it('malformed JSON body returns 4xx not 500', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .set('Content-Type', 'application/json')
        .send('{ this is not valid json }');
      log('MALFORMED JSON', res);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('unknown route returns 404', async () => {
      const res = await request(app).get(`${API}/does-not-exist`);
      log('UNKNOWN ROUTE', res);
      expect(res.status).toBe(404);
    });
  });
});