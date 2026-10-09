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

describe('Task Comments E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let testProjectId: string;
  let testTaskId: string;

  let adminCommentId: string;
  let employeeCommentId: string;

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
        name: `Comments Test Project ${RUN_ID}`,
        key_code: `CMT_${RUN_ID}`,
        status: 'Active',
      });
    testProjectId = proj.body.data?.project_id;

    const task = await request(app)
      .post(`${API}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        project_id: testProjectId,
        title: 'Task for comments',
        status: 'todo',
      });
    testTaskId = task.body.data?.task_id;
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
    it('GET comments without token → 401', async () => {
      const res = await request(app).get(
        `${API}/task-comments/task/${testTaskId}`
      );
      log('LIST COMMENTS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST comment without token → 401', async () => {
      const res = await request(app).post(`${API}/task-comments`).send({
        task_id: testTaskId,
        comment: 'Hack',
      });
      log('CREATE COMMENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('PATCH comment without token → 401', async () => {
      const res = await request(app)
        .patch(`${API}/task-comments/00000000-0000-4000-8000-000000000000`)
        .send({ comment: 'Hack' });
      log('PATCH COMMENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE comment without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/task-comments/00000000-0000-4000-8000-000000000000`
      );
      log('DELETE COMMENT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /task-comments — Create', () => {
    it('Admin creates a comment', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: testTaskId,
          comment: 'Admin comment from E2E test',
        });

      log('CREATE COMMENT — ADMIN', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comment_id).toBeDefined();
      expect(res.body.data.task_id).toBe(testTaskId);
      expect(res.body.data.user_id).toBe(adminUserId);
      expect(res.body.data.comment).toBe('Admin comment from E2E test');

      adminCommentId = res.body.data.comment_id;
    });

    it('Employee creates a comment', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          task_id: testTaskId,
          comment: 'Employee comment from E2E test',
        });

      log('CREATE COMMENT — EMPLOYEE', res);

      expect(res.status).toBe(201);
      expect(res.body.data.user_id).toBe(employeeUserId);

      employeeCommentId = res.body.data.comment_id;
    });

    it('rejects missing task_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'No task id' });

      log('CREATE COMMENT — MISSING TASK_ID', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing comment → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ task_id: testTaskId });

      log('CREATE COMMENT — MISSING COMMENT', res);
      expect(res.status).toBe(400);
    });

    it('rejects empty comment → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ task_id: testTaskId, comment: '' });

      log('CREATE COMMENT — EMPTY COMMENT', res);
      expect(res.status).toBe(400);
    });

    it('rejects non-existent task → 4xx', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: '00000000-0000-4000-8000-000000000000',
          comment: 'Ghost task comment',
        });

      log('CREATE COMMENT — GHOST TASK', res);
      expect([400, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(201);
    });

    it('resists SQL injection in comment', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: testTaskId,
          comment: "'; DROP TABLE task_comments; --",
        });

      log('CREATE COMMENT — SQL INJECTION', res);
      expect([201, 400]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  describe('GET /task-comments/task/:taskId', () => {
    it('Admin lists comments for task', async () => {
      const res = await request(app)
        .get(`${API}/task-comments/task/${testTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST COMMENTS — ADMIN', res);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Employee lists comments for task', async () => {
      const res = await request(app)
        .get(`${API}/task-comments/task/${testTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('LIST COMMENTS — EMPLOYEE', res);
      expect(res.status).toBe(200);
    });

    it('Returns empty array for task with no comments', async () => {
      const newTask = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Task with no comments',
        });

      const res = await request(app)
        .get(`${API}/task-comments/task/${newTask.body.data.task_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST COMMENTS — EMPTY', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('PATCH /task-comments/:id', () => {
    it('Admin updates own comment', async () => {
      const res = await request(app)
        .patch(`${API}/task-comments/${adminCommentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'Admin comment — EDITED' });

      log('UPDATE COMMENT — OWN (ADMIN)', res);
      expect(res.status).toBe(200);
      expect(res.body.data.comment).toBe('Admin comment — EDITED');
    });

    it('Employee updates own comment', async () => {
      const res = await request(app)
        .patch(`${API}/task-comments/${employeeCommentId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ comment: 'Employee comment — EDITED' });

      log('UPDATE COMMENT — OWN (EMPLOYEE)', res);
      expect(res.status).toBe(200);
      expect(res.body.data.comment).toBe('Employee comment — EDITED');
    });

    it('Employee cannot edit Admin comment → 403', async () => {
      const res = await request(app)
        .patch(`${API}/task-comments/${adminCommentId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ comment: 'Employee trying to edit admin comment' });

      log('UPDATE COMMENT — FOREIGN (EMPLOYEE)', res);
      expect(res.status).toBe(403);
    });

    it('Admin CANNOT edit employee comment either (owner-only rule) → 403', async () => {
      const res = await request(app)
        .patch(`${API}/task-comments/${employeeCommentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'Admin trying to edit employee comment' });

      log('UPDATE COMMENT — FOREIGN (ADMIN)', res);
      expect(res.status).toBe(403);
    });

    it('non-existent comment → 404', async () => {
      const res = await request(app)
        .patch(
          `${API}/task-comments/00000000-0000-4000-8000-000000000000`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'Ghost' });

      log('UPDATE COMMENT — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /task-comments/:id', () => {
    let tempCommentId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          task_id: testTaskId,
          comment: 'Temp comment for deletion test',
        });
      tempCommentId = res.body.data?.comment_id;
    });

    it('Admin CAN delete employee comment (privileged override)', async () => {
      const res = await request(app)
        .delete(`${API}/task-comments/${tempCommentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE COMMENT — ADMIN PRIVILEGED', res);
      expect(res.status).toBe(200);
    });

    it('non-existent comment → 404', async () => {
      const res = await request(app)
        .delete(
          `${API}/task-comments/00000000-0000-4000-8000-000000000000`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE COMMENT — GHOST', res);
      expect(res.status).toBe(404);
    });

    it('Employee deletes own comment', async () => {
      const createRes = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          task_id: testTaskId,
          comment: 'Employee own comment to delete',
        });
      const ownId = createRes.body.data?.comment_id;

      const res = await request(app)
        .delete(`${API}/task-comments/${ownId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('DELETE COMMENT — OWN (EMPLOYEE)', res);
      expect(res.status).toBe(200);
    });

    it('Employee cannot delete admin comment → 403 or 404', async () => {
      const createRes = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: testTaskId,
          comment: 'Admin protected comment',
        });
      const adminOwnedId = createRes.body.data?.comment_id;

      const res = await request(app)
        .delete(`${API}/task-comments/${adminOwnedId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('DELETE COMMENT — FOREIGN (EMPLOYEE)', res);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown comment route → 404', async () => {
      const res = await request(app)
        .get(`${API}/task-comments/${adminCommentId}/nonexistent`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN COMMENT ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');

      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});