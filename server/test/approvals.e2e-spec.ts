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

describe('Approvals E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let testProjectId: string;

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
        name: `Approvals Test Project ${RUN_ID}`,
        key_code: `APV_${RUN_ID.toUpperCase()}`,
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

  async function createDraftContent(suffix: string, useEmployee = false) {
    const token = useEmployee ? employeeToken : adminToken;
    const res = await request(app)
      .post(`${API}/contents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: testProjectId,
        title: `Approval Test ${suffix}`,
        slug: `apv-test-${suffix}-${RUN_ID}`,
        body: 'Test body',
      });
    return res.body.data?.content_id;
  }

  describe('Auth guard', () => {
    it('POST submit without token → 401', async () => {
      const res = await request(app).post(
        `${API}/approvals/content/00000000-0000-4000-8000-000000000000/submit`
      );
      log('SUBMIT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('GET /pending without token → 401', async () => {
      const res = await request(app).get(`${API}/approvals/pending`);
      log('PENDING — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST approve without token → 401', async () => {
      const res = await request(app)
        .post(`${API}/approvals/00000000-0000-4000-8000-000000000000/approve`)
        .send({ publish: 'immediate' });
      log('APPROVE — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('Employee cannot access /pending (Admin/Manager only) → 403', async () => {
      const res = await request(app)
        .get(`${API}/approvals/pending`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('PENDING — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Employee cannot approve → 403', async () => {
      const res = await request(app)
        .post(`${API}/approvals/00000000-0000-4000-8000-000000000000/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ publish: 'immediate' });
      log('APPROVE — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Employee cannot reject → 403', async () => {
      const res = await request(app)
        .post(`${API}/approvals/00000000-0000-4000-8000-000000000000/reject`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ reason: 'Testing' });
      log('REJECT — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /approvals/content/:contentId/submit', () => {
    let submitContentId: string;

    beforeAll(async () => {
      submitContentId = await createDraftContent('submit', true);
    });

    it('Employee submits own draft content', async () => {
      const res = await request(app)
        .post(`${API}/approvals/content/${submitContentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'Please review' });

      log('SUBMIT — SUCCESS', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content_id).toBe(submitContentId);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.submitted_by).toBe(employeeUserId);
    });

    it('rejects submit when already pending → 409', async () => {
      const res = await request(app)
        .post(`${API}/approvals/content/${submitContentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      log('SUBMIT — ALREADY PENDING', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/pending/i);
    });

    it('rejects submit on non-existent content → 404', async () => {
      const res = await request(app)
        .post(`${API}/approvals/content/00000000-0000-4000-8000-000000000000/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      log('SUBMIT — GHOST CONTENT', res);
      expect(res.status).toBe(404);
    });

    it('rejects submit on non-DRAFT content → 409', async () => {
      const contentId = await createDraftContent('non-draft', true);

      await request(app)
        .post(`${API}/contents/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      await request(app)
        .post(`${API}/contents/${contentId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' });

      const res = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      log('SUBMIT — WRONG STATUS', res);
      expect(res.status).toBe(409);
    });
  });

  describe('GET /approvals/pending', () => {
    it('Admin lists pending approvals', async () => {
      const res = await request(app)
        .get(`${API}/approvals/pending`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PENDING LIST — ADMIN', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('supports limit param', async () => {
      const res = await request(app)
        .get(`${API}/approvals/pending?limit=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('PENDING LIST — LIMIT 1', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /approvals/content/:contentId', () => {
    it('Admin lists approvals for content', async () => {
      const contentId = await createDraftContent('history', true);

      await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);

      const res = await request(app)
        .get(`${API}/approvals/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('CONTENT APPROVALS LIST', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('returns empty array for content with no approvals', async () => {
      const contentId = await createDraftContent('no-history', true);

      const res = await request(app)
        .get(`${API}/approvals/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('CONTENT APPROVALS — EMPTY', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('POST /approvals/:id/approve', () => {
    let approvalId: string;
    let submittedContentId: string;

    beforeAll(async () => {
      submittedContentId = await createDraftContent('approve', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${submittedContentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      approvalId = submitRes.body.data?.approval_id;
    });

    it('Admin approves with immediate publish', async () => {
      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ publish: 'immediate' });

      log('APPROVE — IMMEDIATE', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.publish_mode).toBe('immediate');
    });

    it('rejects approve of non-PENDING → 409', async () => {
      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ publish: 'immediate' });

      log('APPROVE — ALREADY DECIDED', res);
      expect(res.status).toBe(409);
    });

    it('rejects scheduled without scheduled_for → 400', async () => {
      const contentId = await createDraftContent('sched-nodate', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      const newApprovalId = submitRes.body.data?.approval_id;

      const res = await request(app)
        .post(`${API}/approvals/${newApprovalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ publish: 'scheduled' });

      log('APPROVE — SCHEDULED NO DATE', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/scheduled_for/i);
    });

    it('rejects scheduled with past date → 400', async () => {
      const contentId = await createDraftContent('sched-past', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      const newApprovalId = submitRes.body.data?.approval_id;

      const res = await request(app)
        .post(`${API}/approvals/${newApprovalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          publish: 'scheduled',
          scheduled_for: '2020-01-01T00:00:00Z',
        });

      log('APPROVE — SCHEDULED PAST', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/future/i);
    });

    it('Admin approves with valid scheduled date', async () => {
      const contentId = await createDraftContent('sched-valid', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      const newApprovalId = submitRes.body.data?.approval_id;

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post(`${API}/approvals/${newApprovalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          publish: 'scheduled',
          scheduled_for: futureDate,
        });

      log('APPROVE — SCHEDULED VALID', res);
      expect(res.status).toBe(200);
      expect(res.body.data.publish_mode).toBe('scheduled');
    });

    it('non-existent approval → 404', async () => {
      const res = await request(app)
        .post(`${API}/approvals/00000000-0000-4000-8000-000000000000/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ publish: 'immediate' });

      log('APPROVE — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /approvals/:id/reject', () => {
    let approvalId: string;

    beforeAll(async () => {
      const contentId = await createDraftContent('reject', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      approvalId = submitRes.body.data?.approval_id;
    });

    it('rejects short reason → 400', async () => {
      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'bad' });

      log('REJECT — SHORT REASON', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/5 characters/i);
    });

    it('rejects missing reason → 400', async () => {
      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      log('REJECT — MISSING REASON', res);
      expect(res.status).toBe(400);
    });

    it('Admin rejects with valid reason', async () => {
      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Content needs significant revisions' });

      log('REJECT — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.reason).toMatch(/revisions/i);
    });

    it('rejects already-decided approval → 409', async () => {
      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Trying again' });

      log('REJECT — ALREADY DECIDED', res);
      expect(res.status).toBe(409);
    });
  });

  describe('POST /approvals/:id/cancel', () => {
    it('Submitter can cancel own pending submission', async () => {
      const contentId = await createDraftContent('cancel-own', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      const approvalId = submitRes.body.data?.approval_id;

      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('CANCEL — OWN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('non-submitter cannot cancel → 403', async () => {
      const contentId = await createDraftContent('cancel-other', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      const approvalId = submitRes.body.data?.approval_id;

      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('CANCEL — FOREIGN USER', res);
      expect(res.status).toBe(403);
    });

    it('cancel non-pending approval → 409', async () => {
      const contentId = await createDraftContent('cancel-decided', true);
      const submitRes = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`);
      const approvalId = submitRes.body.data?.approval_id;

      await request(app)
        .post(`${API}/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ publish: 'immediate' });

      const res = await request(app)
        .post(`${API}/approvals/${approvalId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('CANCEL — ALREADY DECIDED', res);
      expect(res.status).toBe(409);
    });
  });

  describe('FULL WORKFLOW — Content approval lifecycle', () => {
    it('submit → approve → verify published', async () => {
      const contentId = await createDraftContent('full-flow', true);

      const submit = await request(app)
        .post(`${API}/approvals/content/${contentId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'Ready for review' });
      expect(submit.status).toBe(201);
      const approvalId = submit.body.data.approval_id;

      const approve = await request(app)
        .post(`${API}/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ publish: 'immediate' });
      expect(approve.status).toBe(200);

      const content = await request(app)
        .get(`${API}/contents/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(content.status).toBe(200);
      expect(['approved', 'published']).toContain(content.body.data.status);

      log('FULL APPROVAL FLOW COMPLETE', {
        status: 200,
        body: { finalStatus: content.body.data.status },
      });
    });
  });

  describe('HTTP protocol', () => {
    it('unknown approvals route → 404', async () => {
      const res = await request(app)
        .get(`${API}/approvals/unknown/route`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('UNKNOWN APPROVALS ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/approvals/00000000-0000-4000-8000-000000000000/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');
      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});