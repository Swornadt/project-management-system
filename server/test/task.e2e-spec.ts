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

describe('Tasks E2E — Full Workflow + Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let testProjectId: string;
  let assignedTaskId: string;
  let unassignedTaskId: string;
  let parentTaskId: string;
  let subtaskId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = adminLogin.body.data?.accessToken;
    adminUserId = adminLogin.body.data?.user?.user_id;
    expect(adminToken).toBeDefined();
    expect(adminUserId).toBeDefined();

    const empLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });
    employeeToken = empLogin.body.data?.accessToken;
    employeeUserId = empLogin.body.data?.user?.user_id;
    expect(employeeToken).toBeDefined();
    expect(employeeUserId).toBeDefined();

    const projectRes = await request(app)
      .post(`${API}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `E2E Tasks Project ${RUN_ID}`,
        key_code: `TASKS_${RUN_ID}`,
        description: 'Automated test project for tasks feature',
        status: 'Active',
        priority: 'High',
      });
    testProjectId = projectRes.body.data?.project_id;
    expect(testProjectId).toBeDefined();

    await request(app)
      .post(`${API}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: employeeUserId, role: 'member' });
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
    it('GET /tasks/project/:id without token → 401', async () => {
      const res = await request(app).get(
        `${API}/tasks/project/${testProjectId}`
      );
      log('LIST TASKS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST /tasks without token → 401', async () => {
      const res = await request(app).post(`${API}/tasks`).send({
        project_id: testProjectId,
        title: 'Hack',
      });
      log('CREATE TASK — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('PATCH /tasks/:id without token → 401', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/00000000-0000-4000-8000-000000000000`)
        .send({ title: 'Hack' });
      log('UPDATE TASK — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /tasks/:id without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/tasks/00000000-0000-4000-8000-000000000000`
      );
      log('DELETE TASK — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /tasks — Permissions', () => {
    it('Employee cannot create task → 403', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: testProjectId,
          title: 'Employee Task Attempt',
        });
      log('CREATE TASK — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Admin creates task assigned to employee', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Task assigned to Cimona',
          description: 'Testing employee permissions',
          status: 'todo',
          priority: 'high',
          assignee_id: employeeUserId,
        });

      log('CREATE TASK — ASSIGNED TO EMPLOYEE', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task_id).toBeDefined();
      expect(res.body.data.title).toBe('Task assigned to Cimona');
      expect(res.body.data.status).toBe('todo');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.assignee_id).toBe(employeeUserId);

      assignedTaskId = res.body.data.task_id;
    });

    it('Admin creates task assigned to admin (not employee)', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Task assigned to Admin',
          status: 'todo',
          priority: 'medium',
          assignee_id: adminUserId,
        });

      log('CREATE TASK — ASSIGNED TO ADMIN', res);

      expect(res.status).toBe(201);
      unassignedTaskId = res.body.data.task_id;
    });

    it('Admin creates task with no assignee', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Unassigned Task',
          priority: 'low',
        });

      log('CREATE TASK — NO ASSIGNEE', res);

      expect(res.status).toBe(201);
      expect(res.body.data.assignee_id).toBeFalsy();
    });
  });

  describe('POST /tasks — Validation', () => {
    it('rejects missing title → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId });
      log('CREATE TASK — MISSING TITLE', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing project_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Project Task' });
      log('CREATE TASK — MISSING PROJECT_ID', res);
      expect(res.status).toBe(400);
    });

    it('rejects empty title → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ project_id: testProjectId, title: '' });
      log('CREATE TASK — EMPTY TITLE', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid status → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Bad Status Task',
          status: 'flying',
        });
      log('CREATE TASK — INVALID STATUS', res);
      expect(res.status).toBe(400);
    });

    it('rejects invalid priority → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Bad Priority Task',
          priority: 'urgentest',
        });
      log('CREATE TASK — INVALID PRIORITY', res);
      expect(res.status).toBe(400);
    });

    it('rejects non-existent parent_task_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Bad Parent Task',
          parent_task_id: '00000000-0000-4000-8000-000000000000',
        });
      log('CREATE TASK — GHOST PARENT', res);
      expect(res.status).toBe(400);
    });

    it('resists SQL injection in title', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: "'; DROP TABLE tasks; --",
        });
      log('CREATE TASK — SQL INJECTION', res);
      expect([201, 400]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('rejects non-UUID project_id (400/500 handled safely)', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: 'not-a-uuid',
          title: 'Bad Project',
        });
      log('CREATE TASK — BAD PROJECT UUID', res);
      expect([400, 500]).toContain(res.status);
      expect(res.status).not.toBe(201);
    });
  });

  describe('GET /tasks', () => {
    it('Admin can list tasks for project', async () => {
      const res = await request(app)
        .get(`${API}/tasks/project/${testProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('LIST TASKS — ADMIN', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('Employee (project member) can list tasks', async () => {
      const res = await request(app)
        .get(`${API}/tasks/project/${testProjectId}`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('LIST TASKS — EMPLOYEE', res);
      expect(res.status).toBe(200);
    });

    it('Admin can get task by ID', async () => {
      const res = await request(app)
        .get(`${API}/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET TASK — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.task_id).toBe(assignedTaskId);
      expect(res.body.data.is_overdue).toBeDefined();
    });

    it('Employee can get task by ID', async () => {
      const res = await request(app)
        .get(`${API}/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('GET TASK — EMPLOYEE', res);
      expect(res.status).toBe(200);
    });

    it('non-existent task → 404', async () => {
      const res = await request(app)
        .get(`${API}/tasks/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET TASK — NON EXISTENT', res);
      expect(res.status).toBe(404);
    });
  });

  describe('Subtasks', () => {
    it('Admin creates a parent task', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Parent Task',
          status: 'todo',
        });
      log('CREATE PARENT TASK', res);
      expect(res.status).toBe(201);
      parentTaskId = res.body.data.task_id;
    });

    it('Admin creates a subtask', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Child Task',
          parent_task_id: parentTaskId,
        });
      log('CREATE SUBTASK', res);
      expect(res.status).toBe(201);
      expect(res.body.data.parent_task_id).toBe(parentTaskId);
      subtaskId = res.body.data.task_id;
    });

    it('GET /tasks/:id/subtasks returns children', async () => {
      const res = await request(app)
        .get(`${API}/tasks/${parentTaskId}/subtasks`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET SUBTASKS', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /tasks/:id — Permissions', () => {
    it('Employee cannot update task → 403', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Employee Rewrite Attempt' });
      log('UPDATE TASK — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Admin can update task title', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task assigned to Cimona (updated)' });
      log('UPDATE TASK — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('updated');
    });

    it('non-existent task → 404', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost' });
      log('UPDATE TASK — NON EXISTENT', res);
      expect(res.status).toBe(404);
    });

    it('invalid priority → 400', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 'super-urgent' });
      log('UPDATE TASK — BAD PRIORITY', res);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /tasks/:id/status — Workflow & Permissions', () => {
    let workflowTaskId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Workflow Task',
          status: 'todo',
          assignee_id: employeeUserId,
        });
      workflowTaskId = res.body.data?.task_id;
    });

    it('Employee updates status of OWN task: todo → in_progress', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${workflowTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' });
      log('STATUS — EMPLOYEE OWN TASK', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('Employee updates status: in_progress → in_review', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${workflowTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_review' });
      log('STATUS — EMPLOYEE IN REVIEW', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_review');
    });

    it('Employee updates status: in_review → done', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${workflowTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'done' });
      log('STATUS — EMPLOYEE DONE', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('done');
    });

    it('Employee CANNOT update task assigned to someone else → 403', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${unassignedTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' });
      log('STATUS — EMPLOYEE ON OTHERS TASK', res);
      expect(res.status).toBe(403);
    });

    it('Invalid status string → 400', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${workflowTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'not-a-real-status' });
      log('STATUS — INVALID STRING', res);
      expect(res.status).toBe(400);
    });

    it('Missing status field → 400', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${workflowTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      log('STATUS — MISSING FIELD', res);
      expect(res.status).toBe(400);
    });

    it('Admin can move done → in_progress (rollback)', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${workflowTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress' });
      log('STATUS — ADMIN ROLLBACK', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('Invalid transition: in_progress → todo is allowed, but backlog → done is NOT', async () => {
      const createRes = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Backlog Skip Test',
          status: 'backlog',
        });
      const backlogTaskId = createRes.body.data?.task_id;

      const res = await request(app)
        .patch(`${API}/tasks/${backlogTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'done' });
      log('STATUS — SKIP TRANSITION', res);
      expect(res.status).toBe(409);
    });

    it('Cancelled task is terminal', async () => {
      const createRes = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Cancel Test',
          status: 'backlog',
        });
      const taskId = createRes.body.data?.task_id;

      await request(app)
        .patch(`${API}/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' });

      const res = await request(app)
        .patch(`${API}/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress' });
      log('STATUS — CANCELLED TERMINAL', res);
      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    let assignTestTaskId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Assign Target Task',
        });
      assignTestTaskId = res.body.data?.task_id;
    });

    it('Employee cannot assign → 403', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignTestTaskId}/assign`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ assignee_id: employeeUserId });
      log('ASSIGN — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Admin assigns to employee', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignTestTaskId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: employeeUserId });
      log('ASSIGN — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.assignee_id).toBe(employeeUserId);
    });

    it('Admin unassigns (null)', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignTestTaskId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: null });
      log('UNASSIGN — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.assignee_id).toBeFalsy();
    });

    it('missing assignee_id field → 400', async () => {
      const res = await request(app)
        .patch(`${API}/tasks/${assignTestTaskId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      log('ASSIGN — MISSING FIELD', res);
      expect(res.status).toBe(400);
    });

    it('non-existent task → 404', async () => {
      const res = await request(app)
        .patch(
          `${API}/tasks/00000000-0000-4000-8000-000000000000/assign`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: employeeUserId });
      log('ASSIGN — GHOST TASK', res);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    let deleteTargetId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: testProjectId,
          title: 'Delete Target',
        });
      deleteTargetId = res.body.data?.task_id;
    });

    it('Employee cannot delete → 403', async () => {
      const res = await request(app)
        .delete(`${API}/tasks/${deleteTargetId}`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('DELETE — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('Admin deletes task', async () => {
      const res = await request(app)
        .delete(`${API}/tasks/${deleteTargetId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DELETE — ADMIN', res);
      expect(res.status).toBe(200);
    });

    it('Verify task is gone (GET returns 404)', async () => {
      const res = await request(app)
        .get(`${API}/tasks/${deleteTargetId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('VERIFY DELETED', res);
      expect(res.status).toBe(404);
    });

    it('Delete non-existent → 404', async () => {
      const res = await request(app)
        .delete(`${API}/tasks/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DELETE — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('FULL WORKFLOW — Admin + Employee collaboration', () => {
    it('creates a real project, adds member, assigns, completes task', async () => {
      const proj = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Workflow Project ${RUN_ID}`,
          key_code: `WF_${RUN_ID}`,
          status: 'Active',
        });
      expect(proj.status).toBe(201);
      const wfProjectId = proj.body.data.project_id;

      const member = await request(app)
        .post(`${API}/projects/${wfProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: employeeUserId, role: 'member' });
      expect(member.status).toBe(201);

      const task = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: wfProjectId,
          title: 'Complete onboarding docs',
          status: 'todo',
          priority: 'high',
          assignee_id: employeeUserId,
        });
      expect(task.status).toBe(201);
      const wfTaskId = task.body.data.task_id;

      const s1 = await request(app)
        .patch(`${API}/tasks/${wfTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' });
      expect(s1.status).toBe(200);

      const s2 = await request(app)
        .patch(`${API}/tasks/${wfTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_review' });
      expect(s2.status).toBe(200);

      const s3 = await request(app)
        .patch(`${API}/tasks/${wfTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'done' });
      expect(s3.status).toBe(200);
      expect(s3.body.data.status).toBe('done');

      const dash = await request(app)
        .get(`${API}/projects/${wfProjectId}/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dash.status).toBe(200);
      expect(dash.body.data.task_counts.total).toBeGreaterThan(0);
      expect(dash.body.data.task_counts.completed).toBeGreaterThan(0);

      const arch = await request(app)
        .patch(`${API}/projects/${wfProjectId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(arch.status).toBe(200);
      expect(arch.body.data.status).toBe('Archived');

      log('FULL WORKFLOW — COMPLETE', {
        status: 200,
        body: { finalStatus: arch.body.data.status },
      });
    });
  });

  describe('HTTP protocol misuse', () => {
    it('unknown task route → 404', async () => {
      const res = await request(app)
        .get(`${API}/tasks/${assignedTaskId}/nonexistent`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('UNKNOWN TASK ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');
      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});