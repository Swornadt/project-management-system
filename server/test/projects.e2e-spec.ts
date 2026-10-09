import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';

const API = '/api/v1';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';

const RUN_ID = Date.now().toString(36).slice(-5);
const UNIQUE_KEY = `TEST_${RUN_ID}`;

function log(label: string, res: any) {
  console.log(`\n=== [${label}] ===`);
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('========================\n');
}

describe('Projects E2E — Hardened Suite', () => {
  let adminToken: string;
  let createdProjectId: string;
  let createdKeyCode: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = res.body.data?.accessToken;
    expect(adminToken).toBeDefined();
  });

  afterAll(async () => {
    if (createdProjectId) {
      try {
        await request(app)
          .patch(`${API}/projects/${createdProjectId}/archive`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch {}
    }
  });

  describe('Auth required on all routes', () => {
    it('rejects GET /projects without token', async () => {
      const res = await request(app).get(`${API}/projects`);
      log('LIST PROJECTS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('rejects POST /projects without token', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .send({ name: 'Hack', key_code: 'HACK' });
      log('CREATE PROJECT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('rejects with invalid token', async () => {
      const res = await request(app)
        .get(`${API}/projects`)
        .set('Authorization', 'Bearer fake.token.here');
      log('LIST PROJECTS — BAD TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /projects — Create', () => {
    it('creates a valid project (admin)', async () => {
      createdKeyCode = UNIQUE_KEY;
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Project',
          key_code: createdKeyCode,
          description: 'Created by automated test',
          status: 'Planned',
          priority: 'High',
        });

      log('CREATE PROJECT — SUCCESS', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('project_id');
      expect(res.body.data.name).toBe('E2E Test Project');
      expect(res.body.data.key_code).toBe(createdKeyCode);
      expect(res.body.data.status).toBe('Planned');
      expect(res.body.data.priority).toBe('High');

      createdProjectId = res.body.data.project_id;
    });

    it('rejects duplicate key_code with 409', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dupe Attempt',
          key_code: createdKeyCode,
        });

      log('CREATE PROJECT — DUPLICATE KEY', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/key|code/i);
    });

    it('rejects missing name (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key_code: `NO_NAME_${RUN_ID}` });

      log('CREATE PROJECT — MISSING NAME', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing key_code (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'No Key Project' });

      log('CREATE PROJECT — MISSING KEY', res);
      expect(res.status).toBe(400);
    });

    it('rejects name too short (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'ab', key_code: `SHORT_${RUN_ID}` });

      log('CREATE PROJECT — SHORT NAME', res);
      expect(res.status).toBe(400);
    });

    it('rejects key_code with invalid characters (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad Key Project', key_code: 'bad key!!' });

      log('CREATE PROJECT — BAD KEY CHARS', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid status (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Status Project',
          key_code: `BADSTAT_${RUN_ID}`,
          status: 'InvalidStatus',
        });

      log('CREATE PROJECT — INVALID STATUS', res);
      expect(res.status).toBe(400);
    });

    it('rejects due_date before start_date (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Date Validation Test',
          key_code: `DATES_${RUN_ID}`,
          start_date: '2026-12-31',
          due_date: '2026-01-01',
        });

      log('CREATE PROJECT — BAD DATES', res);
      expect(res.status).toBe(400);
    });

    it('resists SQL injection in name', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: "'; DROP TABLE projects; --",
          key_code: `SQLI_${RUN_ID}`,
        });

      log('CREATE PROJECT — SQL INJECTION', res);
      expect([201, 400]).toContain(res.status);
      expect(res.status).not.toBe(500);

      const check = await request(app)
        .get(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.status).toBe(200);
    });
  });

  describe('GET /projects — List', () => {
    it('returns paginated projects', async () => {
      const res = await request(app)
        .get(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECTS — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('projects');
      expect(Array.isArray(res.body.data.projects)).toBe(true);
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        per_page: expect.any(Number),
        total: expect.any(Number),
        total_pages: expect.any(Number),
      });
    });

    it('respects per_page limit', async () => {
      const res = await request(app)
        .get(`${API}/projects?per_page=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECTS — PER_PAGE=1', res);
      expect(res.status).toBe(200);
      expect(res.body.data.pagination.per_page).toBe(1);
      expect(res.body.data.projects.length).toBeLessThanOrEqual(1);
    });

    it('rejects invalid per_page > 100', async () => {
      const res = await request(app)
        .get(`${API}/projects?per_page=999`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECTS — BAD PER_PAGE', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid sort field', async () => {
      const res = await request(app)
        .get(`${API}/projects?sort=drop_table`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECTS — BAD SORT', res);
      expect(res.status).toBe(400);
    });

    it('supports search query', async () => {
      const res = await request(app)
        .get(`${API}/projects?q=E2E`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECTS — SEARCH', res);
      expect(res.status).toBe(200);
    });

    it('resists SQL injection in query', async () => {
      const res = await request(app)
        .get(`${API}/projects?q=%27%20OR%201%3D1--`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECTS — SQLi IN QUERY', res);
      expect(res.status).not.toBe(500);
    });
  });

  describe('GET /projects/:id', () => {
    it('returns project by valid ID', async () => {
      const res = await request(app)
        .get(`${API}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET PROJECT — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.data.project_id).toBe(createdProjectId);
    });

    it('rejects malformed UUID (400)', async () => {
      const res = await request(app)
        .get(`${API}/projects/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET PROJECT — BAD UUID', res);
      expect(res.status).toBe(400);
    });

    it('rejects non-existent UUID (403 or 404)', async () => {
      const fakeUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .get(`${API}/projects/${fakeUuid}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET PROJECT — NON-EXISTENT', res);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('updates project fields', async () => {
      const res = await request(app)
        .patch(`${API}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Project — Updated',
          priority: 'Critical',
        });

      log('UPDATE PROJECT — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('E2E Test Project — Updated');
      expect(res.body.data.priority).toBe('Critical');
    });

    it('rejects update with invalid status (400)', async () => {
      const res = await request(app)
        .patch(`${API}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'TotallyFake' });

      log('UPDATE PROJECT — BAD STATUS', res);
      expect(res.status).toBe(400);
    });

    it('rejects update with due_date < start_date (400)', async () => {
      const res = await request(app)
        .patch(`${API}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          start_date: '2026-06-01',
          due_date: '2026-01-01',
        });

      log('UPDATE PROJECT — BAD DATES', res);
      expect(res.status).toBe(400);
    });

    it('rejects update on non-existent project (403 or 404)', async () => {
      const fakeUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .patch(`${API}/projects/${fakeUuid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Update' });

      log('UPDATE PROJECT — NON-EXISTENT', res);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /projects/:id/members', () => {
    it('rejects missing user_id (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'member' });

      log('ADD MEMBER — MISSING USER_ID', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid UUID for user_id (400)', async () => {
      const res = await request(app)
        .post(`${API}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: 'not-a-uuid', role: 'member' });

      log('ADD MEMBER — BAD UUID', res);
      expect(res.status).toBe(400);
    });

    it('rejects non-existent user (404)', async () => {
      const fakeUser = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .post(`${API}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: fakeUser, role: 'member' });

      log('ADD MEMBER — GHOST USER', res);
      expect(res.status).toBe(404);
    });

    it('rejects invalid role (400)', async () => {
      const fakeUser = '00000000-0000-4000-8000-000000000001';
      const res = await request(app)
        .post(`${API}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: fakeUser, role: 'superadmin' });

      log('ADD MEMBER — BAD ROLE', res);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /projects/:id/dashboard', () => {
    it('returns dashboard with expected shape', async () => {
      const res = await request(app)
        .get(`${API}/projects/${createdProjectId}/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DASHBOARD — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('project');
      expect(res.body.data).toHaveProperty('progress');
      expect(res.body.data).toHaveProperty('task_counts');
      expect(res.body.data.task_counts).toMatchObject({
        total: expect.any(Number),
        completed: expect.any(Number),
        in_progress: expect.any(Number),
        todo: expect.any(Number),
      });
    });

    it('rejects malformed UUID', async () => {
      const res = await request(app)
        .get(`${API}/projects/not-a-uuid/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DASHBOARD — BAD UUID', res);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /projects/:id/archive', () => {
    let archiveTargetId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Archive Target Project',
          key_code: `ARCH_${RUN_ID}`,
        });
      archiveTargetId = res.body.data?.project_id;
    });

    it('archives project successfully', async () => {
      const res = await request(app)
        .patch(`${API}/projects/${archiveTargetId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('ARCHIVE — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Archived');
    });

    it('rejects update to archived project (400)', async () => {
      const res = await request(app)
        .patch(`${API}/projects/${archiveTargetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cannot Modify' });

      log('UPDATE ARCHIVED — BLOCKED', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/archived/i);
    });
  });

  describe('HTTP protocol misuse', () => {
    it('unknown project route → 404', async () => {
      const res = await request(app)
        .get(`${API}/projects/${createdProjectId}/nonexistent-endpoint`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN PROJECT ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});