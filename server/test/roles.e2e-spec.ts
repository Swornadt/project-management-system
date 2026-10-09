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

describe('Roles E2E — Hardened Suite', () => {
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
    it('GET /roles without token → 401', async () => {
      const res = await request(app).get(`${API}/roles`);
      log('LIST ROLES — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('GET /roles with invalid token → 401', async () => {
      const res = await request(app)
        .get(`${API}/roles`)
        .set('Authorization', 'Bearer fake.token.here');
      log('LIST ROLES — BAD TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /roles — List', () => {
    it('Admin lists all roles', async () => {
      const res = await request(app)
        .get(`${API}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST ROLES — ADMIN', res);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Returns the seeded roles (Admin, Manager, Employee)', async () => {
      const res = await request(app)
        .get(`${API}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST ROLES — VERIFY SEED', res);

      const roleNames = res.body.data.map((r: any) => r.name).sort();
      expect(roleNames).toContain('Admin');
      expect(roleNames).toContain('Manager');
      expect(roleNames).toContain('Employee');
    });

    it('Each role has the expected shape', async () => {
      const res = await request(app)
        .get(`${API}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST ROLES — SHAPE CHECK', res);

      const firstRole = res.body.data[0];
      expect(firstRole).toHaveProperty('role_id');
      expect(firstRole).toHaveProperty('name');
      expect(firstRole).toHaveProperty('description');
      expect(typeof firstRole.role_id).toBe('string');
      expect(typeof firstRole.name).toBe('string');
    });

    it('Employee (non-admin) can list roles', async () => {
      const res = await request(app)
        .get(`${API}/roles`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('LIST ROLES — EMPLOYEE', res);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('roles contain no sensitive data', async () => {
      const res = await request(app)
        .get(`${API}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('hash');
      expect(bodyStr).not.toContain('token');
    });
  });

  describe('HTTP protocol', () => {
    it('POST /roles not implemented → 404', async () => {
      const res = await request(app)
        .post(`${API}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Hacker Role', description: 'should not exist' });

      log('POST ROLE — NOT IMPLEMENTED', res);
      expect(res.status).toBe(404);
    });

    it('DELETE /roles/:id not implemented → 404', async () => {
      const res = await request(app)
        .delete(`${API}/roles/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE ROLE — NOT IMPLEMENTED', res);
      expect(res.status).toBe(404);
    });

    it('unknown role route → 404', async () => {
      const res = await request(app)
        .get(`${API}/roles/anything`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN ROLE ROUTE', res);
      expect(res.status).toBe(404);
    });
  });
});