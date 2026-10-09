import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';

const API = '/api/v1';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';
const EMPLOYEE_EMAIL = 'cimonabebe2@gmail.com';
const EMPLOYEE_PASSWORD = 'Test@12345';

function log(label: string, res: any) {
  console.log(`\n=== [${label}] ===`);
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('========================\n');
}

describe('Admin Dashboard E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = adminLogin.body.data?.accessToken;
    expect(adminToken).toBeDefined();

    const empLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });
    employeeToken = empLogin.body.data?.accessToken;
    expect(employeeToken).toBeDefined();
  });

  afterAll(async () => {
  });

  describe('Auth guard', () => {
    it('without token → 401', async () => {
      const res = await request(app).get(`${API}/admin/dashboard/stats`);
      log('ADMIN STATS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('Employee cannot access admin stats → 403', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('ADMIN STATS — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('invalid token → 401', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', 'Bearer fake.token.here');
      log('ADMIN STATS — BAD TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /admin/dashboard/stats', () => {
    it('Admin fetches dashboard stats', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('ADMIN STATS — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('Response has correct top-level shape', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { data } = res.body;

      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('projects');
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('content');
    });

    it('users stats have correct fields', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { users } = res.body.data;

      expect(users).toMatchObject({
        total: expect.any(Number),
        active: expect.any(Number),
        recentlyCreated: expect.any(Number),
      });

      expect(users.total).toBeGreaterThan(0);
      expect(users.active).toBeLessThanOrEqual(users.total);
    });

    it('projects stats have correct fields + byStatus map', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { projects } = res.body.data;

      expect(projects).toMatchObject({
        total: expect.any(Number),
        active: expect.any(Number),
        recentlyCreated: expect.any(Number),
        byStatus: expect.any(Object),
      });

      Object.values(projects.byStatus).forEach((count) => {
        expect(typeof count).toBe('number');
      });
    });

    it('tasks stats have correct fields + byStatus map', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { tasks } = res.body.data;

      expect(tasks).toMatchObject({
        total: expect.any(Number),
        completed: expect.any(Number),
        inProgress: expect.any(Number),
        byStatus: expect.any(Object),
      });

      expect(tasks.total).toBeGreaterThanOrEqual(tasks.completed);
      expect(tasks.inProgress).toBe(tasks.total - tasks.completed);
    });

    it('content stats have correct fields', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { content } = res.body.data;

      expect(content).toMatchObject({
        total: expect.any(Number),
        published: expect.any(Number),
        draft: expect.any(Number),
      });

      expect(content.total).toBeGreaterThanOrEqual(content.published);
      expect(content.draft).toBe(content.total - content.published);
    });

    it('response contains no sensitive fields', async () => {
      const res = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('password_hash');
      expect(bodyStr).not.toContain('token');
    });

    it('is idempotent (two calls return consistent totals)', async () => {
      const res1 = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);
      const res2 = await request(app)
        .get(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.body.data.users.total).toBe(res2.body.data.users.total);
      expect(res1.body.data.projects.total).toBe(res2.body.data.projects.total);
      expect(res1.body.data.tasks.total).toBe(res2.body.data.tasks.total);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown admin route → 404', async () => {
      const res = await request(app)
        .get(`${API}/admin/unknown/route`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN ADMIN ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('POST to stats endpoint → 404 (only GET registered)', async () => {
      const res = await request(app)
        .post(`${API}/admin/dashboard/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      log('POST STATS', res);
      expect(res.status).toBe(404);
    });
  });
});