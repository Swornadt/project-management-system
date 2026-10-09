import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';

const API = '/api/v1';
const RUN_ID = Date.now().toString(36).slice(-6).toUpperCase();

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

describe('Audit Logs E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;

  let testProjectId: string;
  let testAuditLogId: string;

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

    const proj = await request(app)
      .post(`${API}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Audit Test Project ${RUN_ID}`,
        key_code: `AUDIT_${RUN_ID}`,
        status: 'Active',
      });
    testProjectId = proj.body.data?.project_id;
  });

  afterAll(async () => {
    if (testProjectId) {
      try {
        await request(app)
          .patch(`${API}/projects/${testProjectId}/archive`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch {}
    }
  });

  describe('Auth guard', () => {
    it('GET /audit-logs without token → 401', async () => {
      const res = await request(app).get(`${API}/audit-logs`);
      log('LIST LOGS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('Employee (non-Admin) cannot list audit logs → 403', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('LIST LOGS — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Employee cannot get audit log detail → 403', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('LOG DETAIL — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /audit-logs — List', () => {
    it('Admin lists audit logs', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: expect.any(Boolean),
      });
    });

    it('Pagination works (limit=1)', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?limit=1&page=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — LIMIT 1', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.limit).toBe(1);
    });

    it('rejects invalid page → 400', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?page=0`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — BAD PAGE', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid limit → 400', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?limit=999`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — BAD LIMIT', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid order → 400', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?order=random`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — BAD ORDER', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid severity → 400', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?severity=meltdown`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — BAD SEVERITY', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid from date → 400', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?from=not-a-date`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — BAD FROM DATE', res);
      expect(res.status).toBe(400);
    });

    it('Filters by projectId', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?projectId=${testProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — FILTER BY PROJECT', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        testAuditLogId = res.body.data[0].activity_id;
      }
    });

    it('Filters by action=created', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?action=created`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — FILTER BY ACTION', res);
      expect(res.status).toBe(200);
    });

    it('resists SQL injection in q', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?q=%27%20OR%201%3D1--`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — SQLi', res);
      expect(res.status).not.toBe(500);
    });

    it('sorts by created_at asc', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs?sort=created_at&order=asc`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST LOGS — SORT ASC', res);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /audit-logs/:id', () => {
    it('Admin fetches log by ID', async () => {
      if (!testAuditLogId) {
        const list = await request(app)
          .get(`${API}/audit-logs?limit=1`)
          .set('Authorization', `Bearer ${adminToken}`);
        testAuditLogId = list.body.data[0]?.activity_id;
      }

      const res = await request(app)
        .get(`${API}/audit-logs/${testAuditLogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET LOG BY ID', res);
      expect(res.status).toBe(200);
      expect(res.body.activity_id).toBe(testAuditLogId);
    });

    it('non-existent log → 404', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET LOG — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /audit-logs/project/:projectId/feed', () => {
    it('Admin fetches project feed', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/project/${testProjectId}/feed`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PROJECT FEED — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('Employee can access project feed (currently no role restriction)', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/project/${testProjectId}/feed`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('PROJECT FEED — EMPLOYEE', res);
      expect(res.status).toBe(200);
    });

    it('non-existent project → empty feed (200 with empty data)', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/project/00000000-0000-4000-8000-000000000000/feed`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PROJECT FEED — GHOST PROJECT', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('supports page/limit query params', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/project/${testProjectId}/feed?page=1&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PROJECT FEED — WITH PAGINATION', res);
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown audit-logs route → 404', async () => {
      const res = await request(app)
        .get(`${API}/audit-logs/unknown/path`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN AUDIT ROUTE', res);
      expect([404]).toContain(res.status);
    });
  });
});