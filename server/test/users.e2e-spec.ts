import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';
import { Role } from '../src/entities/role.entity';

const API = '/api/v1';
const RUN_ID = Date.now().toString(36).slice(-6).toUpperCase();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';
const EMPLOYEE_EMAIL = 'cimonabebe2@gmail.com';
const EMPLOYEE_PASSWORD = 'Test@12345';

const TEST_USER_EMAIL = `test-user-${RUN_ID.toLowerCase()}@test.local`;
const TEST_USER_PASSWORD = 'Test@12345';

function log(label: string, res: any) {
  console.log(`\n=== [${label}] ===`);
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('========================\n');
}

describe('Users E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let employeeRoleId: string;
  let managerRoleId: string;
  let adminRoleId: string;

  let testUserId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const [adminRole, managerRole, employeeRole] = await Promise.all([
      roleRepo.findOne({ where: { name: 'Admin' } }),
      roleRepo.findOne({ where: { name: 'Manager' } }),
      roleRepo.findOne({ where: { name: 'Employee' } }),
    ]);

    adminRoleId = adminRole!.role_id;
    managerRoleId = managerRole!.role_id;
    employeeRoleId = employeeRole!.role_id;

    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = adminLogin.body.data?.accessToken;
    adminUserId = adminLogin.body.data?.user?.user_id;
    expect(adminToken).toBeDefined();

    const empLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });
    employeeToken = empLogin.body.data?.accessToken;
    employeeUserId = empLogin.body.data?.user?.user_id;
    expect(employeeToken).toBeDefined();

    const createRes = await request(app)
      .post(`${API}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role_id: employeeRoleId,
        first_name: 'Test',
        last_name: 'User',
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });
    testUserId = createRes.body.data?.user_id;
    expect(testUserId).toBeDefined();
  });

  afterAll(async () => {
    if (testUserId) {
      try {
        await request(app)
          .delete(`${API}/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch {}
    }
  });

  describe('Auth guard', () => {
    it('GET /users without token → 401', async () => {
      const res = await request(app).get(`${API}/users`);
      log('LIST USERS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST /users without token → 401', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .send({
          role_id: employeeRoleId,
          first_name: 'H',
          last_name: 'H',
          email: 'h@h.com',
          password: 'Hacker@123',
        });
      log('CREATE USER — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('PATCH /users/:id/role without token → 401', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/role`)
        .send({ role_id: adminRoleId });
      log('CHANGE ROLE — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /users/:id without token → 401', async () => {
      const res = await request(app).delete(`${API}/users/${testUserId}`);
      log('DELETE USER — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('GET /users/stats as Employee → 403', async () => {
      const res = await request(app)
        .get(`${API}/users/stats`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('STATS — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('GET /users as Employee → 403', async () => {
      const res = await request(app)
        .get(`${API}/users`)
        .set('Authorization', `Bearer ${employeeToken}`);
      log('LIST USERS — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });

    it('POST /users as Employee → 403', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          role_id: employeeRoleId,
          first_name: 'Hack',
          last_name: 'Attempt',
          email: 'hack@hack.com',
          password: 'Hacker@123',
        });
      log('CREATE USER — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /users', () => {
    it('Admin lists users with pagination meta', async () => {
      const res = await request(app)
        .get(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('LIST USERS — ADMIN', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('respects limit param', async () => {
      const res = await request(app)
        .get(`${API}/users?limit=1`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('LIST USERS — LIMIT 1', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /users/search', () => {
    it('Admin searches by query string', async () => {
      const res = await request(app)
        .get(`${API}/users/search?q=test-user`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('SEARCH USERS — BY Q', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Admin filters by status=active', async () => {
      const res = await request(app)
        .get(`${API}/users/search?status=active`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('SEARCH USERS — BY STATUS', res);
      expect(res.status).toBe(200);
    });

    it('Admin filters by role=Employee', async () => {
      const res = await request(app)
        .get(`${API}/users/search?role=Employee`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('SEARCH USERS — BY ROLE', res);
      expect(res.status).toBe(200);
    });

    it('Admin filters by email_verified=true', async () => {
      const res = await request(app)
        .get(`${API}/users/search?email_verified=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('SEARCH USERS — VERIFIED', res);
      expect(res.status).toBe(200);
    });

    it('resists SQL injection in q', async () => {
      const res = await request(app)
        .get(`${API}/users/search?q=%27%20OR%201%3D1--`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('SEARCH USERS — SQLi', res);
      expect(res.status).not.toBe(500);
    });
  });

  describe('GET /users/stats', () => {
    it('Admin gets stats with correct shape', async () => {
      const res = await request(app)
        .get(`${API}/users/stats`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('USER STATS', res);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        total: expect.any(Number),
        active: expect.any(Number),
        inactive: expect.any(Number),
        suspended: expect.any(Number),
        verified: expect.any(Number),
        unverified: expect.any(Number),
        locked: expect.any(Number),
        byRole: expect.any(Object),
        recentlyCreated: expect.any(Number),
      });
    });
  });

  describe('GET /users/:id', () => {
    it('Admin gets user with role', async () => {
      const res = await request(app)
        .get(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET USER — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.user_id).toBe(testUserId);
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.name).toBe('Employee');
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('non-existent user → 404', async () => {
      const res = await request(app)
        .get(`${API}/users/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET USER — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /users — Validation', () => {
    it('missing role_id → 400', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'No',
          last_name: 'Role',
          email: `no-role-${RUN_ID}@test.local`,
          password: 'Test@12345',
        });
      log('CREATE USER — MISSING ROLE', res);
      expect(res.status).toBe(400);
    });

    it('missing first_name → 400', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_id: employeeRoleId,
          last_name: 'X',
          email: `no-first-${RUN_ID}@test.local`,
          password: 'Test@12345',
        });
      log('CREATE USER — MISSING FIRST NAME', res);
      expect(res.status).toBe(400);
    });

    it('invalid email format → 400', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_id: employeeRoleId,
          first_name: 'Bad',
          last_name: 'Email',
          email: 'not-an-email',
          password: 'Test@12345',
        });
      log('CREATE USER — BAD EMAIL', res);
      expect(res.status).toBe(400);
    });

    it('password too short → 400', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_id: employeeRoleId,
          first_name: 'Short',
          last_name: 'Password',
          email: `short-pw-${RUN_ID}@test.local`,
          password: 'short',
        });
      log('CREATE USER — SHORT PASSWORD', res);
      expect(res.status).toBe(400);
    });

    it('duplicate email → 409', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_id: employeeRoleId,
          first_name: 'Dup',
          last_name: 'Email',
          email: TEST_USER_EMAIL,
          password: 'Test@12345',
        });
      log('CREATE USER — DUPLICATE EMAIL', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/email/i);
    });

    it('resists SQL injection in first_name', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_id: employeeRoleId,
          first_name: "'; DROP TABLE users; --",
          last_name: 'Injection',
          email: `sqli-${RUN_ID}@test.local`,
          password: 'Test@12345',
        });
      log('CREATE USER — SQL INJECTION', res);
      expect([201, 400, 409]).toContain(res.status);
      expect(res.status).not.toBe(500);

      const check = await request(app)
        .get(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.status).toBe(200);
    });
  });

  describe('PATCH /users/:id', () => {
    it('Admin updates test user first_name', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'Updated' });
      log('UPDATE USER — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Updated');
    });

    it('invalid email → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-valid' });
      log('UPDATE USER — BAD EMAIL', res);
      expect(res.status).toBe(400);
    });

    it('short password → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'abc' });
      log('UPDATE USER — SHORT PW', res);
      expect(res.status).toBe(400);
    });

    it('non-existent user → 404', async () => {
      const res = await request(app)
        .patch(`${API}/users/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'Ghost' });
      log('UPDATE USER — GHOST', res);
      expect(res.status).toBe(404);
    });

    it('Employee cannot update another user → 403', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ first_name: 'Hacked' });
      log('UPDATE USER — EMPLOYEE BLOCKED', res);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /users/profile', () => {
    it('Employee updates own profile', async () => {
      const res = await request(app)
        .patch(`${API}/users/profile`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ first_name: 'Cimona' });
      log('UPDATE PROFILE — SELF', res);
      expect(res.status).toBe(200);
    });

    it('invalid email → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/profile`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: 'not-valid' });
      log('UPDATE PROFILE — BAD EMAIL', res);
      expect(res.status).toBe(400);
    });

    it('email collision → 409', async () => {
      const res = await request(app)
        .patch(`${API}/users/profile`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: ADMIN_EMAIL });
      log('UPDATE PROFILE — EMAIL COLLISION', res);
      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('Admin cannot change own role → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${adminUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: employeeRoleId });
      log('CHANGE ROLE — SELF BLOCKED', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/own role/i);
    });

    it('missing role_id → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      log('CHANGE ROLE — MISSING ROLE', res);
      expect(res.status).toBe(400);
    });

    it('Admin changes test user role to Manager', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId });
      log('CHANGE ROLE — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.role_id).toBe(managerRoleId);
    });

    it('Admin changes test user role back to Employee', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: employeeRoleId });
      log('CHANGE ROLE — REVERT', res);
      expect(res.status).toBe(200);
      expect(res.body.data.role_id).toBe(employeeRoleId);
    });

    it('non-existent user → 404', async () => {
      const res = await request(app)
        .patch(`${API}/users/00000000-0000-4000-8000-000000000000/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: employeeRoleId });
      log('CHANGE ROLE — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('Admin cannot change own status → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });
      log('STATUS — SELF BLOCKED', res);
      expect(res.status).toBe(400);
    });

    it('invalid status value → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'on-fire' });
      log('STATUS — INVALID VALUE', res);
      expect(res.status).toBe(400);
    });

    it('missing status → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      log('STATUS — MISSING', res);
      expect(res.status).toBe(400);
    });

    it('Admin deactivates test user', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DEACTIVATE — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
    });

    it('Admin activates test user back', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('ACTIVATE — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });

    it('Admin cannot deactivate self → 400', async () => {
      const res = await request(app)
        .patch(`${API}/users/${adminUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DEACTIVATE — SELF BLOCKED', res);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE + Restore', () => {
    it('Admin cannot delete own account → 400', async () => {
      const res = await request(app)
        .delete(`${API}/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DELETE — SELF BLOCKED', res);
      expect(res.status).toBe(400);
    });

    it('Admin soft-deletes test user', async () => {
      const res = await request(app)
        .delete(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DELETE — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('Deleted user can no longer be found', async () => {
      const res = await request(app)
        .get(`${API}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('GET DELETED USER', res);
      expect(res.status).toBe(404);
    });

    it('Admin restores test user', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('RESTORE — SUCCESS', res);
      expect(res.status).toBe(200);
    });

    it('Restore non-deleted user → 404', async () => {
      const res = await request(app)
        .patch(`${API}/users/${testUserId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('RESTORE — NOT DELETED', res);
      expect(res.status).toBe(404);
    });

    it('Delete non-existent → 404', async () => {
      const res = await request(app)
        .delete(`${API}/users/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('DELETE — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown user route → 404', async () => {
      const res = await request(app)
        .get(`${API}/users/${testUserId}/nonexistent`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('UNKNOWN USER ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');
      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});