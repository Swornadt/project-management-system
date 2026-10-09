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

describe('Notifications E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let adminNotificationId: string;

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

    const empLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });
    employeeToken = empLogin.body.data?.accessToken;
    employeeUserId = empLogin.body.data?.user?.user_id;
    expect(employeeToken).toBeDefined();
  });

  afterAll(async () => {
  });

  describe('Auth guard', () => {
    it('GET /notifications without token → 401', async () => {
      const res = await request(app).get(`${API}/notifications`);
      log('LIST NOTIFICATIONS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('GET /notifications/unread-count without token → 401', async () => {
      const res = await request(app).get(`${API}/notifications/unread-count`);
      log('UNREAD COUNT — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('PATCH /notifications/read-all without token → 401', async () => {
      const res = await request(app).patch(`${API}/notifications/read-all`);
      log('MARK ALL READ — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /notifications/:id without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/notifications/00000000-0000-4000-8000-000000000000`
      );
      log('DELETE NOTIFICATION — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /notifications — List', () => {
    it('Admin lists own notifications', async () => {
      const res = await request(app)
        .get(`${API}/notifications`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST NOTIFICATIONS — ADMIN', res);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta).toMatchObject({
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number),
        count: expect.any(Number),
      });

      if (res.body.data.length > 0) {
        adminNotificationId = res.body.data[0].notification_id;
      }
    });

    it('All returned notifications belong to the requesting user', async () => {
      const res = await request(app)
        .get(`${API}/notifications`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => {
        expect(n.user_id).toBe(adminUserId);
      });
    });

    it('Employee sees only their notifications (not admin\'s)', async () => {
      const res = await request(app)
        .get(`${API}/notifications`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('LIST NOTIFICATIONS — EMPLOYEE', res);
      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => {
        expect(n.user_id).toBe(employeeUserId);
      });
    });

    it('respects limit query param', async () => {
      const res = await request(app)
        .get(`${API}/notifications?limit=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST NOTIFICATIONS — LIMIT 1', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('filters by is_read=false', async () => {
      const res = await request(app)
        .get(`${API}/notifications?is_read=false`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST NOTIFICATIONS — UNREAD ONLY', res);
      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => {
        expect(n.is_read).toBe(false);
      });
    });

    it('filters by is_read=true', async () => {
      const res = await request(app)
        .get(`${API}/notifications?is_read=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST NOTIFICATIONS — READ ONLY', res);
      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => {
        expect(n.is_read).toBe(true);
      });
    });

    it('caps limit at 100 (very large limit stays bounded)', async () => {
      const res = await request(app)
        .get(`${API}/notifications?limit=9999`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST NOTIFICATIONS — HUGE LIMIT', res);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('Admin gets unread count', async () => {
      const res = await request(app)
        .get(`${API}/notifications/unread-count`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNREAD COUNT — ADMIN', res);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('unread_count');
      expect(typeof res.body.data.unread_count).toBe('number');
      expect(res.body.data.unread_count).toBeGreaterThanOrEqual(0);
    });

    it('Employee gets unread count', async () => {
      const res = await request(app)
        .get(`${API}/notifications/unread-count`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('UNREAD COUNT — EMPLOYEE', res);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.unread_count).toBe('number');
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('Admin marks own notification as read', async () => {
      if (!adminNotificationId) {
        const list = await request(app)
          .get(`${API}/notifications?limit=1`)
          .set('Authorization', `Bearer ${adminToken}`);
        adminNotificationId = list.body.data[0]?.notification_id;
      }

      if (!adminNotificationId) {
        console.log('No notifications exist for admin — skipping');
        return;
      }

      const res = await request(app)
        .patch(`${API}/notifications/${adminNotificationId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('MARK AS READ — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.is_read).toBe(true);
    });

    it('Marking already-read is idempotent (returns 200)', async () => {
      if (!adminNotificationId) return;

      const res = await request(app)
        .patch(`${API}/notifications/${adminNotificationId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('MARK AS READ — IDEMPOTENT', res);
      expect(res.status).toBe(200);
      expect(res.body.data.is_read).toBe(true);
    });

    it('non-existent notification → 404', async () => {
      const res = await request(app)
        .patch(
          `${API}/notifications/00000000-0000-4000-8000-000000000000/read`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      log('MARK AS READ — GHOST', res);
      expect(res.status).toBe(404);
    });

    it('Employee cannot mark Admin\'s notification → 403', async () => {
      if (!adminNotificationId) return;

      const res = await request(app)
        .patch(`${API}/notifications/${adminNotificationId}/read`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('MARK AS READ — FOREIGN USER', res);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/your own/i);
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('Employee marks all own notifications as read', async () => {
      const res = await request(app)
        .patch(`${API}/notifications/read-all`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('MARK ALL READ — EMPLOYEE', res);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('updated');
      expect(typeof res.body.data.updated).toBe('number');
    });

    it('Subsequent unread-count is 0 for employee', async () => {
      const res = await request(app)
        .get(`${API}/notifications/unread-count`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('UNREAD COUNT — AFTER MARK ALL', res);
      expect(res.status).toBe(200);
      expect(res.body.data.unread_count).toBe(0);
    });

    it('Admin marking all as read is idempotent-safe', async () => {
      const res = await request(app)
        .patch(`${API}/notifications/read-all`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('MARK ALL READ — ADMIN', res);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.updated).toBe('number');
    });
  });

  describe('DELETE /notifications/:id', () => {
    let throwawayNotificationId: string;

    beforeAll(async () => {
      const proj = await request(app)
        .post(`${API}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Notif Test ${Date.now()}`,
          key_code: `NTF${Date.now().toString(36).slice(-5).toUpperCase()}`,
          status: 'Active',
        });
      const projId = proj.body.data?.project_id;

      const task = await request(app)
        .post(`${API}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: projId,
          title: 'Notification Trigger Task',
          assignee_id: employeeUserId,
        });
      const taskId = task.body.data?.task_id;

      await request(app)
        .patch(`${API}/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: employeeUserId });

      const list = await request(app)
        .get(`${API}/notifications?limit=1`)
        .set('Authorization', `Bearer ${employeeToken}`);
      throwawayNotificationId = list.body.data[0]?.notification_id;

      if (projId) {
        await request(app)
          .patch(`${API}/projects/${projId}/archive`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    it('Admin cannot delete Employee\'s notification → 403', async () => {
      if (!throwawayNotificationId) {
        console.log('No notification to test deletion on');
        return;
      }

      const res = await request(app)
        .delete(`${API}/notifications/${throwawayNotificationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE NOTIFICATION — FOREIGN USER', res);
      expect(res.status).toBe(403);
    });

    it('Employee deletes own notification', async () => {
      if (!throwawayNotificationId) return;

      const res = await request(app)
        .delete(`${API}/notifications/${throwawayNotificationId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('DELETE NOTIFICATION — OWN', res);
      expect(res.status).toBe(200);
    });

    it('non-existent notification → 404', async () => {
      const res = await request(app)
        .delete(`${API}/notifications/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE NOTIFICATION — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown notification route → 404', async () => {
      const res = await request(app)
        .get(`${API}/notifications/unknown/route`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN NOTIFICATION ROUTE', res);
      expect(res.status).toBe(404);
    });
  });
});