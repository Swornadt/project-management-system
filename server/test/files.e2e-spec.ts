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

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
  'base64'
);

const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF',
  'utf-8'
);

const EMPTY_BYTES = Buffer.from('');

const RANDOM_BYTES = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

function log(label: string, res: any) {
  console.log(`\n=== [${label}] ===`);
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('========================\n');
}

describe('Files E2E — Hardened Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUserId: string;
  let employeeUserId: string;

  let testProjectId: string;
  let testTaskId: string;

  let uploadedFileId: string;
  let uploadedProjectFileId: string;

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
        name: `Files Test Project ${RUN_ID}`,
        key_code: `FILE_${RUN_ID.toUpperCase()}`,
        status: 'Active',
      });
    testProjectId = proj.body.data?.project_id;
    expect(testProjectId).toBeDefined();

    const task = await request(app)
      .post(`${API}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        project_id: testProjectId,
        title: 'Task for file upload',
      });
    testTaskId = task.body.data?.task_id;
    expect(testTaskId).toBeDefined();
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
    it('POST /files/upload without token → 401', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .attach('file', PNG_BYTES, { filename: 'test.png', contentType: 'image/png' })
        .field('project_id', testProjectId);
      log('UPLOAD — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('GET /files/project/:id without token → 401', async () => {
      const res = await request(app).get(`${API}/files/project/${testProjectId}`);
      log('LIST PROJECT FILES — NO TOKEN', res);
      expect(res.status).toBe(401);
    });

    it('DELETE /files/:id without token → 401', async () => {
      const res = await request(app).delete(
        `${API}/files/00000000-0000-4000-8000-000000000000`
      );
      log('DELETE — NO TOKEN', res);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /files/upload', () => {
    it('Admin uploads PNG to project', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'test-image.png', contentType: 'image/png' })
        .field('project_id', testProjectId);

      log('UPLOAD PNG — PROJECT', res);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.file_id).toBeDefined();
      expect(res.body.data.original_name).toBe('test-image.png');
      expect(res.body.data.mime_type).toBe('image/png');
      expect(res.body.data.uploaded_by).toBe(adminUserId);

      uploadedFileId = res.body.data.file_id;
    });

    it('Admin uploads PNG to task', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'task-image.png', contentType: 'image/png' })
        .field('task_id', testTaskId);

      log('UPLOAD PNG — TASK', res);
      expect(res.status).toBe(201);
      expect(res.body.data.file_id).toBeDefined();
    });

    it('Admin uploads PDF to project', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BYTES, { filename: 'document.pdf', contentType: 'application/pdf' })
        .field('project_id', testProjectId);

      log('UPLOAD PDF — PROJECT', res);
      expect(res.status).toBe(201);
      uploadedProjectFileId = res.body.data.file_id;
    });

    it('rejects upload with no file', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_id', testProjectId);

      log('UPLOAD — NO FILE', res);
      expect(res.status).toBe(400);
    });

    it('rejects upload with no parent (no project/task/content)', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'orphan.png', contentType: 'image/png' });

      log('UPLOAD — NO PARENT', res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exactly one/i);
    });

    it('rejects upload with MULTIPLE parents (project + task)', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'double.png', contentType: 'image/png' })
        .field('project_id', testProjectId)
        .field('task_id', testTaskId);

      log('UPLOAD — MULTIPLE PARENTS', res);
      expect(res.status).toBe(400);
    });

    it('rejects empty file', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', EMPTY_BYTES, { filename: 'empty.png', contentType: 'image/png' })
        .field('project_id', testProjectId);

      log('UPLOAD — EMPTY FILE', res);
      expect(res.status).toBe(400);
    });

    it('rejects non-existent project_id → 404', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'orphan.png', contentType: 'image/png' })
        .field('project_id', '00000000-0000-4000-8000-000000000000');

      log('UPLOAD — GHOST PROJECT', res);
      expect(res.status).toBe(404);
    });

    it('rejects unknown binary file type → 400', async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', RANDOM_BYTES, { filename: 'random.bin', contentType: 'application/octet-stream' })
        .field('project_id', testProjectId);

      log('UPLOAD — UNKNOWN TYPE', res);
      expect([400, 415]).toContain(res.status);
    });
  });

  describe('GET /files/project/:projectId', () => {
    it('Admin lists project files', async () => {
      const res = await request(app)
        .get(`${API}/files/project/${testProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECT FILES — ADMIN', res);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('non-existent project → 404', async () => {
      const res = await request(app)
        .get(`${API}/files/project/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST PROJECT FILES — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /files/task/:taskId', () => {
    it('Admin lists task files', async () => {
      const res = await request(app)
        .get(`${API}/files/task/${testTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('LIST TASK FILES', res);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /files/:id/raw', () => {
    it('Admin downloads own uploaded file', async () => {
      const res = await request(app)
        .get(`${API}/files/${uploadedFileId}/raw`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DOWNLOAD FILE — ADMIN', res);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
    });

    it('download=1 sets Content-Disposition attachment', async () => {
      const res = await request(app)
        .get(`${API}/files/${uploadedFileId}/raw?download=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('non-existent file → 404', async () => {
      const res = await request(app)
        .get(`${API}/files/00000000-0000-4000-8000-000000000000/raw`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DOWNLOAD — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /files/avatar', () => {
    it('Admin uploads avatar', async () => {
      const res = await request(app)
        .post(`${API}/files/avatar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'avatar.png', contentType: 'image/png' });

      log('UPLOAD AVATAR', res);
      expect(res.status).toBe(201);
      expect(res.body.data.file_id).toBeDefined();
    });

    it('rejects non-image avatar → 415/400', async () => {
      const res = await request(app)
        .post(`${API}/files/avatar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BYTES, { filename: 'not-image.pdf', contentType: 'application/pdf' });

      log('UPLOAD AVATAR — PDF BLOCKED', res);
      expect([400, 415]).toContain(res.status);
    });

    it('rejects no file', async () => {
      const res = await request(app)
        .post(`${API}/files/avatar`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('UPLOAD AVATAR — NO FILE', res);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /files/:id', () => {
    let tempFileId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`${API}/files/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_BYTES, { filename: 'delete-me.png', contentType: 'image/png' })
        .field('project_id', testProjectId);
      tempFileId = res.body.data?.file_id;
    });

    it('non-uploader cannot delete → 403', async () => {
      const res = await request(app)
        .delete(`${API}/files/${tempFileId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      log('DELETE — FOREIGN USER', res);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not your file/i);
    });

    it('uploader (Admin) deletes own file', async () => {
      const res = await request(app)
        .delete(`${API}/files/${tempFileId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE — SUCCESS', res);
      expect(res.status).toBe(200);
    });

    it('non-existent → 404', async () => {
      const res = await request(app)
        .delete(`${API}/files/00000000-0000-4000-8000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);

      log('DELETE — GHOST', res);
      expect(res.status).toBe(404);
    });
  });

  describe('HTTP protocol', () => {
    it('unknown files route → 404', async () => {
      const res = await request(app)
        .get(`${API}/files/unknown/route`)
        .set('Authorization', `Bearer ${adminToken}`);
      log('UNKNOWN FILES ROUTE', res);
      expect(res.status).toBe(404);
    });
  });
});