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

describe('Task Dependencies E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;

  let testProjectId: string;
  let taskA: string;
  let taskB: string;
  let taskC: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = adminLogin.body.data?.accessToken;

    const empLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });
    employeeToken = empLogin.body.data?.accessToken;

    const proj = await request(app)
      .post(`${API}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Deps Test Project ${RUN_ID}`,
        key_code: `DEPS_${RUN_ID}`,
        status: 'Active',
      });
    testProjectId = proj.body.data?.project_id;

    const [resA, resB, resC] = await Promise.all([
      request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, title: 'Task A' }),
      request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, title: 'Task B' }),
      request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, title: 'Task C' }),
    ]);

    taskA = resA.body.data?.task_id;
    taskB = resB.body.data?.task_id;
    taskC = resC.body.data?.task_id;

    expect(taskA).toBeDefined();
    expect(taskB).toBeDefined();
    expect(taskC).toBeDefined();
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
    it('GET /task-dependencies/task/:id without token → 401', async () => {
      const res = await request(app).get(`${API}/task-dependencies/task/${taskA}`);
      log('LIST DEPS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST /task-dependencies without token → 401', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .send({ task_id: taskA, depends_on_task_id: taskB });
      log('CREATE DEP — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /task-dependencies/:a/:b without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/task-dependencies/${taskA}/${taskB}`
      );
      log('DELETE DEP — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /task-dependencies — Create', () => {
    it('Admin creates dependency (A depends on B)', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: taskA,
          depends_on_task_id: taskB,
          dependency_type: 'finish_to_start',
        });

      log('CREATE DEP — SUCCESS', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task_id).toBe(taskA);
      expect(res.body.data.depends_on_task_id).toBe(taskB);
      expect(res.body.data.dependency_type).toBe('finish_to_start');
    });

    it('Employee can also create dependency (no role restriction)', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          task_id: taskB,
          depends_on_task_id: taskC,
        });

      log('CREATE DEP — EMPLOYEE', res);
      expect(res.status).toBe(201);
    });

    it('rejects self-dependency → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: taskA,
          depends_on_task_id: taskA,
        });

      log('CREATE DEP — SELF', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itself/i);
    });

    it('rejects cycle (C depends on A) → 409', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: taskC,
          depends_on_task_id: taskA,
        });

      log('CREATE DEP — CYCLE', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/circular/i);
    });

    it('rejects non-existent task_id → 404', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: '00000000-0000-4000-8000-000000000000',
          depends_on_task_id: taskB,
        });

      log('CREATE DEP — GHOST TASK', res);
      expect(res.status).toBe(404);
    });

    it('rejects non-existent depends_on_task_id → 404', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: taskA,
          depends_on_task_id: '00000000-0000-4000-8000-000000000000',
        });

      log('CREATE DEP — GHOST TARGET', res);
      expect(res.status).toBe(404);
    });

    it('rejects missing task_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ depends_on_task_id: taskB });

      log('CREATE DEP — MISSING TASK_ID', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing depends_on_task_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ task_id: taskA });

      log('CREATE DEP — MISSING TARGET', res);
      expect(res.status).toBe(400);
    });

    it('rejects duplicate dependency → 409', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task_id: taskA,
          depends_on_task_id: taskB,
        });

      log('CREATE DEP — DUPLICATE', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });
  });

  describe('GET /task-dependencies/task/:taskId', () => {
    it('Lists dependencies + blocks for task A', async () => {
      const res = await request(app)
        .get(`${API}/task-dependencies/task/${taskA}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST DEPS — TASK A', res);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.depends_on)).toBe(true);
      expect(Array.isArray(res.body.data.blocks)).toBe(true);

      expect(res.body.data.depends_on.length).toBeGreaterThan(0);
      expect(res.body.data.depends_on[0].depends_on_task_id).toBe(taskB);
    });

    it('Task B blocks A (reverse direction)', async () => {
      const res = await request(app)
        .get(`${API}/task-dependencies/task/${taskB}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST DEPS — TASK B', res);

      expect(res.status).toBe(200);
      expect(res.body.data.blocks.length).toBeGreaterThan(0);
    });

    it('Task with no dependencies returns empty arrays', async () => {
      const fresh = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, title: 'Fresh Task No Deps' });

      const res = await request(app)
        .get(`${API}/task-dependencies/task/${fresh.body.data.task_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST DEPS — EMPTY', res);
      expect(res.status).toBe(200);
      expect(res.body.data.depends_on.length).toBe(0);
      expect(res.body.data.blocks.length).toBe(0);
    });

    it('Employee can also list dependencies', async () => {
      const res = await request(app)
        .get(`${API}/task-dependencies/task/${taskA}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('LIST DEPS — EMPLOYEE', res);
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /task-dependencies/:taskId/:dependsOnTaskId', () => {
    it('Admin deletes dependency B→C', async () => {
      const res = await request(app)
        .delete(`${API}/task-dependencies/${taskB}/${taskC}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE DEP — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data).toBe(true);
    });

    it('Verify B no longer depends on C', async () => {
      const res = await request(app)
        .get(`${API}/task-dependencies/task/${taskB}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('VERIFY DEP REMOVED', res);
      expect(res.status).toBe(200);
      expect(res.body.data.depends_on.length).toBe(0);
    });

    it('deletes non-existent dependency → 404', async () => {
      const res = await request(app)
        .delete(`${API}/task-dependencies/${taskB}/${taskC}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE DEP — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown dep route → 404', async () => {
      const res = await request(app)
        .get(`${API}/task-dependencies/unknown/route`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN DEP ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/task-dependencies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');

      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});