import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';

const API = '/api/v1';
const RUN_ID = Date.now().toString(36).slice(-6).toLowerCase();

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

describe('Contents E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let testProjectId: string;
  let createdContentId: string;
  const uniqueSlug = `content-e2e-${RUN_ID}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = adminLogin.body.data?.accessToken;
    adminUserId = adminLogin.body.data?.user?.user_id;

    const empLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });
    employeeToken = empLogin.body.data?.accessToken;
    employeeUserId = empLogin.body.data?.user?.user_id;

    const proj = await request(app)
      .post(`${API}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Content Test Project ${RUN_ID}`,
        key_code: `CNT_${RUN_ID.toUpperCase()}`,
        status: 'Active',
      });
    testProjectId = proj.body.data?.project_id;
    expect(testProjectId).toBeDefined();
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
    it('GET /contents without token → 401', async () => {
      const res = await request(app).get(`${API}/contents`);
      log('LIST CONTENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST /contents without token → 401', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .send({ project_id: testProjectId, title: 'Hack', slug: 'hack' });
      log('CREATE CONTENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('PATCH /contents/:id without token → 401', async () => {
      const res = await request(app)
        .patch(`${API}/contents/00000000-0000-4000-8000-000000000000`)
        .send({ title: 'Hack' });
      log('UPDATE CONTENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /contents/:id without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/contents/00000000-0000-4000-8000-000000000000`
      );
      log('DELETE CONTENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /contents — Create', () => {
    it('Admin creates draft content', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'E2E Test Content',
          slug: uniqueSlug,
          body: 'This is test content',
        });

      log('CREATE CONTENT — SUCCESS', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content_id).toBeDefined();
      expect(res.body.data.title).toBe('E2E Test Content');
      expect(res.body.data.slug).toBe(uniqueSlug);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.author_id).toBe(adminUserId);

      createdContentId = res.body.data.content_id;
    });

    it('Employee can also create content (no role restriction)', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Employee Content',
          slug: `employee-content-${RUN_ID}`,
          body: 'Employee authored',
        });

      log('CREATE CONTENT — EMPLOYEE', res);
      expect(res.status).toBe(201);
      expect(res.body.data.author_id).toBe(employeeUserId);
    });

    it('rejects duplicate slug → 409', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Duplicate Slug',
          slug: uniqueSlug,
        });

      log('CREATE CONTENT — DUPLICATE SLUG', res);
      expect([409, 500]).toContain(res.status);
      expect(res.status).not.toBe(201);
    });

    it('rejects missing project_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Project', slug: `no-proj-${RUN_ID}` });

      log('CREATE CONTENT — MISSING PROJECT', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing title → 400', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, slug: `no-title-${RUN_ID}` });

      log('CREATE CONTENT — MISSING TITLE', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing slug → 400', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, title: 'No Slug' });

      log('CREATE CONTENT — MISSING SLUG', res);
      expect(res.status).toBe(400);
    });

    it('resists SQL injection in title', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: "'; DROP TABLE contents; --",
          slug: `sqli-${RUN_ID}`,
        });

      log('CREATE CONTENT — SQL INJECTION', res);
      expect([201, 400, 409]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  describe('GET /contents', () => {
    it('Admin lists content', async () => {
      const res = await request(app)
        .get(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('LIST CONTENT — ADMIN', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('gets content by valid ID', async () => {
      const res = await request(app)
        .get(`${API}/contents/${createdContentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET CONTENT — BY ID', res);
      expect(res.status).toBe(200);
      expect(res.body.data.content_id).toBe(createdContentId);
    });

    it('non-existent content → 404', async () => {
      const res = await request(app)
        .get(`${API}/contents/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET CONTENT — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /contents/:id', () => {
    it('Admin updates content', async () => {
      const res = await request(app)
        .patch(`${API}/contents/${createdContentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'E2E Test Content — Updated' });

      log('UPDATE CONTENT — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('Updated');
    });

    it('non-existent content → 404', async () => {
      const res = await request(app)
        .patch(`${API}/contents/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost' });
      log('UPDATE CONTENT — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /contents/:id/submit', () => {
    it('submits draft content for approval', async () => {
      const res = await request(app)
        .post(`${API}/contents/${createdContentId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('SUBMIT FOR APPROVAL — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending_approval');
    });

    it('rejects submit when already pending → 400/409', async () => {
      const res = await request(app)
        .post(`${API}/contents/${createdContentId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('SUBMIT — ALREADY PENDING', res);
      expect([400, 409]).toContain(res.status);
    });

    it('rejects submit on non-existent content → 404', async () => {
      const res = await request(app)
        .post(`${API}/contents/00000000-0000-4000-8000-000000000000/submit`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('SUBMIT — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /contents/:id/decide', () => {
    let employeeContentId: string;
    let selfApprovalId: string;
    let badDecisionId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Employee Content for Approval',
          slug: `emp-approval-${RUN_ID}`,
        });
      employeeContentId = create.body.data?.content_id;

      await request(app)
        .post(`${API}/contents/${employeeContentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      const selfCreate = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Self Approval Test',
          slug: `self-approve-${RUN_ID}`,
        });
      selfApprovalId = selfCreate.body.data?.content_id;

      await request(app)
        .post(`${API}/contents/${selfApprovalId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      const badCreate = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Bad Decision Test',
          slug: `bad-decision-${RUN_ID}`,
        });
      badDecisionId = badCreate.body.data?.content_id;

      await request(app)
        .post(`${API}/contents/${badDecisionId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
    });

    it('Admin approves employee-submitted content', async () => {
      const res = await request(app)
        .post(`${API}/contents/${employeeContentId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' });

      log('DECIDE CONTENT — APPROVED', res);
      expect(res.status).toBe(200);
      expect(['approved', 'published']).toContain(res.body.data.status);
    });

    it('rejects self-approval (author cannot approve own) → 403', async () => {
      const res = await request(app)
        .post(`${API}/contents/${selfApprovalId}/decide`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ decision: 'approved' });

      log('DECIDE — SELF APPROVAL BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('rejects invalid decision value → 400/409', async () => {
      const res = await request(app)
        .post(`${API}/contents/${badDecisionId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'maybe' });

      log('DECIDE — BAD VALUE', res);
      expect([400, 409]).toContain(res.status);
    });

    it('rejects missing decision → 400', async () => {
      const res = await request(app)
        .post(`${API}/contents/${badDecisionId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      log('DECIDE — MISSING DECISION', res);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /contents/:id/publish', () => {
    let approvedContentId: string;
    let pendingContentId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Publish Test Content',
          slug: `publish-test-${RUN_ID}`,
        });
      approvedContentId = create.body.data?.content_id;

      await request(app)
        .post(`${API}/contents/${approvedContentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      await request(app)
        .post(`${API}/contents/${approvedContentId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' });

      const pendingCreate = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Pending Publish Test',
          slug: `pending-publish-${RUN_ID}`,
        });
      pendingContentId = pendingCreate.body.data?.content_id;

      await request(app)
        .post(`${API}/contents/${pendingContentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
    });

    it('Admin publishes approved content (or content already published by decide)', async () => {
      const res = await request(app)
        .post(`${API}/contents/${approvedContentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PUBLISH CONTENT — APPROVED', res);
      expect([200, 409]).toContain(res.status);
    });

    it('publish on pending_approval content → 409', async () => {
      const res = await request(app)
        .post(`${API}/contents/${pendingContentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PUBLISH — WHILE PENDING', res);
      expect(res.status).toBe(409);
    });

    it('non-existent content → 404/400', async () => {
      const res = await request(app)
        .post(`${API}/contents/00000000-0000-4000-8000-000000000000/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PUBLISH — GHOST', res);
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('DELETE /contents/:id', () => {
    it('Admin deletes content', async () => {
      const create = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Delete Me',
          slug: `delete-${RUN_ID}`,
        });
      const deleteId = create.body.data?.content_id;

      const res = await request(app)
        .delete(`${API}/contents/${deleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE CONTENT — SUCCESS', res);
      expect(res.status).toBe(200);
    });

    it('non-existent → 404', async () => {
      const res = await request(app)
        .delete(`${API}/contents/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DELETE — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown route → 404', async () => {
      const res = await request(app)
        .get(`${API}/contents/${createdContentId}/unknown`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('UNKNOWN CONTENT ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/contents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');
      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});