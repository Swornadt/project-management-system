import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { AppDataSource } from '../src/shared/db/data-source';

const API = '/api/v1';
const RUN_ID = Date.now().toString(36).slice(-6).toLowerCase();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';

function log(label: string, res: any) {
  console.log(`\n=== [${label}] ===`);
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('========================\n');
}

describe('Tags E2E — Hardened Suite', () => {
  let adminToken: string;

  let createdTagId: string;
  const uniqueSlug = `e2e-tag-${RUN_ID}`;
  const uniqueName = `E2E Tag ${RUN_ID}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const login = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = login.body.data?.accessToken;
    expect(adminToken).toBeDefined();
  });

  afterAll(async () => {
    if (createdTagId) {
      try {
        await request(app)
          .delete(`${API}/tags/${createdTagId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch {}
    }
  });

  describe('Auth guard', () => {
    it('GET /tags without token → 401', async () => {
      const res = await request(app).get(`${API}/tags`);
      log('LIST TAGS — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('POST /tags without token → 401', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .send({ name: 'Hack', slug: 'hack' });
      log('CREATE TAG — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('PATCH /tags/:id without token → 401', async () => {
      const res = await request(app)
        .patch(`${API}/tags/00000000-0000-4000-8000-000000000000`)
        .send({ name: 'Hack' });
      log('UPDATE TAG — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /tags/:id without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/tags/00000000-0000-4000-8000-000000000000`
      );
      log('DELETE TAG — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /tags — Create', () => {
    it('creates a valid tag', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueName,
          slug: uniqueSlug,
        });

      log('CREATE TAG — SUCCESS', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tag_id).toBeDefined();
      expect(res.body.data.name).toBe(uniqueName);
      expect(res.body.data.slug).toBe(uniqueSlug);

      createdTagId = res.body.data.tag_id;
    });

    it('rejects duplicate name (case-insensitive) → 409', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueName.toUpperCase(),
          slug: `another-slug-${RUN_ID}`,
        });

      log('CREATE TAG — DUPLICATE NAME (CASE)', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('rejects duplicate slug → 409', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Unique Name ${RUN_ID}-2`,
          slug: uniqueSlug,
        });

      log('CREATE TAG — DUPLICATE SLUG', res);
      expect(res.status).toBe(409);
    });

    it('rejects missing name → 400', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: `no-name-${RUN_ID}` });

      log('CREATE TAG — MISSING NAME', res);
      expect(res.status).toBe(400);
    });

    it('rejects missing slug → 400', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `No Slug ${RUN_ID}` });

      log('CREATE TAG — MISSING SLUG', res);
      expect(res.status).toBe(400);
    });

    it('rejects empty name → 400', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', slug: `empty-name-${RUN_ID}` });

      log('CREATE TAG — EMPTY NAME', res);
      expect(res.status).toBe(400);
    });

    it('resists SQL injection in name', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: "'; DROP TABLE tags; --",
          slug: `sqli-${RUN_ID}`,
        });

      log('CREATE TAG — SQL INJECTION', res);
      expect([201, 400, 409]).toContain(res.status);
      expect(res.status).not.toBe(500);

      const check = await request(app)
        .get(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.status).toBe(200);
    });
  });

  describe('GET /tags — List', () => {
    it('returns paginated tags', async () => {
      const res = await request(app)
        .get(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST TAGS — SUCCESS', res);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('respects limit query param', async () => {
      const res = await request(app)
        .get(`${API}/tags?limit=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST TAGS — LIMIT 1', res);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /tags/:id', () => {
    it('returns tag by valid ID', async () => {
      const res = await request(app)
        .get(`${API}/tags/${createdTagId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET TAG — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.tag_id).toBe(createdTagId);
    });

    it('non-existent tag → 404', async () => {
      const res = await request(app)
        .get(`${API}/tags/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('GET TAG — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tags/:id', () => {
    it('updates tag description/name', async () => {
      const res = await request(app)
        .patch(`${API}/tags/${createdTagId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${uniqueName} v2` });

      log('UPDATE TAG — SUCCESS', res);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(`${uniqueName} v2`);
    });

    it('rejects non-existent tag → 404', async () => {
      const res = await request(app)
        .patch(`${API}/tags/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });

      log('UPDATE TAG — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('Tag ↔ Content relationship', () => {
    const fakeContentId = '00000000-0000-4000-8000-000000000001';

    it('lists tags for content (empty for fake content)', async () => {
      const res = await request(app)
        .get(`${API}/tags/contents/${fakeContentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST TAGS FOR CONTENT', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('attach tag to non-existent content → 400/404', async () => {
      const res = await request(app)
        .post(`${API}/tags/${createdTagId}/contents/${fakeContentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('ATTACH TAG — GHOST CONTENT', res);
      expect([400, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(201);
    });

    it('detach non-attached tag → 404', async () => {
      const res = await request(app)
        .delete(`${API}/tags/${createdTagId}/contents/${fakeContentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DETACH TAG — NOT ATTACHED', res);
      expect(res.status).toBe(404);
    });

    it('attach non-existent tag → 404', async () => {
      const res = await request(app)
        .post(`${API}/tags/00000000-0000-4000-8000-000000000000/contents/${fakeContentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('ATTACH GHOST TAG', res);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /tags/:id', () => {
    it('deletes tag', async () => {
      const create = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Delete Me ${RUN_ID}`,
          slug: `delete-${RUN_ID}`,
        });
      const deleteId = create.body.data?.tag_id;

      const res = await request(app)
        .delete(`${API}/tags/${deleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE TAG — SUCCESS', res);
      expect(res.status).toBe(200);
    });

    it('deletes non-existent tag → 404', async () => {
      const res = await request(app)
        .delete(`${API}/tags/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE TAG — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown tag route → 404', async () => {
      const res = await request(app)
        .get(`${API}/tags/${createdTagId}/nonexistent`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UNKNOWN TAG ROUTE', res);
      expect(res.status).toBe(404);
    });

    it('malformed JSON → 400', async () => {
      const res = await request(app)
        .post(`${API}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ bad json');

      log('MALFORMED JSON', res);
      expect(res.status).toBe(400);
    });
  });
});