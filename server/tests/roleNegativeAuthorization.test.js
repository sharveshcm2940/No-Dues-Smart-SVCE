const request = require('supertest');
const app = require('../src/server');
const { query, ensureReady } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

describe('Task 1: Comprehensive Role Negative Authorization Test Suite', () => {
  let tokenStudent;
  let tokenLib;
  let tokenFA;
  let tokenDPC;
  let tokenFinance;
  let tokenMainLib;
  let tokenHOD;

  beforeAll(async () => {
    await ensureReady();

    const makeToken = (id, username, role) => jwt.sign(
      { id, username, role, must_change_password: 0 },
      env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    tokenStudent = makeToken(10, 'IT2024001', 'student');
    tokenLib = makeToken(3, 'EMP-LIB-IT-01', 'library_staff');
    tokenDPC = makeToken(2, 'EMP-DPC-IT-01', 'dpc');
    tokenMainLib = makeToken(4, 'EMP-MLIB-IT-01', 'main_library_staff');
    tokenFA = makeToken(6, 'EMP-FA-IT-01', 'faculty_advisor');
    tokenFinance = makeToken(5, 'EMP-FIN-IT-01', 'finance');
    tokenHOD = makeToken(1, 'EMP-HOD-IT-01', 'hod');
  });

  // ===========================================================================
  // 1. UNAUTHENTICATED REQUESTS (NO TOKEN) -> 401
  // ===========================================================================
  describe('1. Unauthenticated Requests (No Bearer Token) -> 401', () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'get', path: '/api/student/dashboard' },
      { method: 'get', path: '/api/admin/users' },
      { method: 'get', path: '/api/admin/settings' },
      { method: 'get', path: '/api/hod/dashboard' },
      { method: 'get', path: '/api/fa/dashboard' },
      { method: 'get', path: '/api/library/dashboard' },
      { method: 'get', path: '/api/finance/dashboard' },
      { method: 'get', path: '/api/dpc/dashboard' },
      { method: 'get', path: '/api/main-library/dashboard' },
      { method: 'get', path: '/api/audit-logs' },
      { method: 'post', path: '/api/library/process-nodues' },
      { method: 'post', path: '/api/fa/process-nodues' },
      { method: 'post', path: '/api/nodues/reopen-stage' },
      { method: 'post', path: '/api/fines/mark-paid' },
      { method: 'post', path: '/api/fa/hall-ticket/update' },
      { method: 'post', path: '/api/hod/certificate/revoke' }
    ];

    protectedRoutes.forEach(({ method, path }) => {
      test(`Unauthenticated ${method.toUpperCase()} ${path} returns 401 Unauthorized`, async () => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });
    });
  });

  // ===========================================================================
  // 2. STUDENT ROLE NEGATIVE CHECKS -> 403
  // ===========================================================================
  describe('2. Student Role Negative Authorization Checks -> 403', () => {
    test('Student is forbidden from accessing Admin User Directory', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenStudent}`);
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from modifying System Settings', async () => {
      const res = await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${tokenStudent}`).send({
        settings: [{ setting_key: 'fine_rate_per_day', setting_value: '0' }]
      });
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from accessing HOD Executive Dashboard', async () => {
      const res = await request(app).get('/api/hod/dashboard').set('Authorization', `Bearer ${tokenStudent}`);
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from accessing Faculty Advisor Dashboard', async () => {
      const res = await request(app).get('/api/fa/dashboard').set('Authorization', `Bearer ${tokenStudent}`);
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from approving clearance stages (Library)', async () => {
      const res = await request(app).post('/api/library/process-nodues').set('Authorization', `Bearer ${tokenStudent}`).send({
        requestId: 3,
        action: 'Approve'
      });
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from approving clearance stages (HOD)', async () => {
      const res = await request(app).post('/api/hod/process-nodues').set('Authorization', `Bearer ${tokenStudent}`).send({
        requestId: 3,
        action: 'Approve'
      });
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from updating Hall Tickets', async () => {
      const res = await request(app).post('/api/fa/hall-ticket/update').set('Authorization', `Bearer ${tokenStudent}`).send({
        registerNumber: 'IT2024001',
        hallTicketStatus: 'Issued'
      });
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from marking fines paid', async () => {
      const res = await request(app).post('/api/fines/mark-paid').set('Authorization', `Bearer ${tokenStudent}`).send({
        borrowRecordId: 1,
        receiptNumber: 'REC-MALICIOUS',
        paymentMethod: 'Cash'
      });
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from reopening clearance stages', async () => {
      const res = await request(app).post('/api/nodues/reopen-stage').set('Authorization', `Bearer ${tokenStudent}`).send({
        requestId: 3,
        departmentName: 'Department Library',
        reason: 'Malicious student reopen attempt'
      });
      expect(res.status).toBe(403);
    });

    test('Student is forbidden from revoking certificates', async () => {
      const res = await request(app).post('/api/hod/certificate/revoke').set('Authorization', `Bearer ${tokenStudent}`).send({
        certificateNumber: 'CERT-FAKE-01',
        reason: 'Student unauthorized revoke'
      });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 3. FACULTY ADVISOR ROLE NEGATIVE CHECKS -> 403
  // ===========================================================================
  describe('3. Faculty Advisor Role Negative Authorization Checks -> 403', () => {
    test('Faculty Advisor is forbidden from accessing Admin endpoints', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFA}`);
      expect(res.status).toBe(403);
    });

    test('Faculty Advisor is forbidden from accessing Library dashboard', async () => {
      const res = await request(app).get('/api/library/dashboard').set('Authorization', `Bearer ${tokenFA}`);
      expect(res.status).toBe(403);
    });

    test('Faculty Advisor is forbidden from processing Library clearance', async () => {
      const res = await request(app).post('/api/library/process-nodues').set('Authorization', `Bearer ${tokenFA}`).send({
        requestId: 3,
        action: 'Approve'
      });
      expect(res.status).toBe(403);
    });

    test('Faculty Advisor is forbidden from accessing Finance dashboard', async () => {
      const res = await request(app).get('/api/finance/dashboard').set('Authorization', `Bearer ${tokenFA}`);
      expect(res.status).toBe(403);
    });

    test('Faculty Advisor is forbidden from revoking certificates', async () => {
      const res = await request(app).post('/api/hod/certificate/revoke').set('Authorization', `Bearer ${tokenFA}`).send({
        certificateNumber: 'CERT-001',
        reason: 'FA cannot revoke'
      });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 4. DEPARTMENT LIBRARY STAFF ROLE NEGATIVE CHECKS -> 403
  // ===========================================================================
  describe('4. Department Library Staff Role Negative Authorization Checks -> 403', () => {
    test('Library staff is forbidden from accessing Admin User Management', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenLib}`);
      expect(res.status).toBe(403);
    });

    test('Library staff is forbidden from updating Hall Tickets', async () => {
      const res = await request(app).post('/api/fa/hall-ticket/update').set('Authorization', `Bearer ${tokenLib}`).send({
        registerNumber: 'IT2024001',
        hallTicketStatus: 'Issued'
      });
      expect(res.status).toBe(403);
    });

    test('Library staff is forbidden from accessing Finance dashboard', async () => {
      const res = await request(app).get('/api/finance/dashboard').set('Authorization', `Bearer ${tokenLib}`);
      expect(res.status).toBe(403);
    });

    test('Library staff is forbidden from processing FA clearance', async () => {
      const res = await request(app).post('/api/fa/process-nodues').set('Authorization', `Bearer ${tokenLib}`).send({
        requestId: 3,
        action: 'Approve'
      });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 5. FINANCE SECTION ROLE NEGATIVE CHECKS -> 403
  // ===========================================================================
  describe('5. Finance Section Role Negative Authorization Checks -> 403', () => {
    test('Finance officer is forbidden from updating Hall Tickets', async () => {
      const res = await request(app).post('/api/fa/hall-ticket/update').set('Authorization', `Bearer ${tokenFinance}`).send({
        registerNumber: 'IT2024001',
        hallTicketStatus: 'Issued'
      });
      expect(res.status).toBe(403);
    });

    test('Finance officer is forbidden from accessing Admin System Settings', async () => {
      const res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${tokenFinance}`);
      expect(res.status).toBe(403);
    });

    test('Finance officer is forbidden from processing Library clearance', async () => {
      const res = await request(app).post('/api/library/process-nodues').set('Authorization', `Bearer ${tokenFinance}`).send({
        requestId: 3,
        action: 'Approve'
      });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 6. DPC ROLE NEGATIVE CHECKS -> 403
  // ===========================================================================
  describe('6. DPC Role Negative Authorization Checks -> 403', () => {
    test('DPC officer is forbidden from accessing Admin users', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenDPC}`);
      expect(res.status).toBe(403);
    });

    test('DPC officer is forbidden from updating Hall Tickets', async () => {
      const res = await request(app).post('/api/fa/hall-ticket/update').set('Authorization', `Bearer ${tokenDPC}`).send({
        registerNumber: 'IT2024001',
        hallTicketStatus: 'Issued'
      });
      expect(res.status).toBe(403);
    });

    test('DPC officer is forbidden from marking fines paid', async () => {
      const res = await request(app).post('/api/fines/mark-paid').set('Authorization', `Bearer ${tokenDPC}`).send({
        borrowRecordId: 1,
        receiptNumber: 'REC-DPC',
        paymentMethod: 'Cash'
      });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 7. MAIN LIBRARY ROLE NEGATIVE CHECKS -> 403
  // ===========================================================================
  describe('7. Main Library Role Negative Authorization Checks -> 403', () => {
    test('Main Library staff is forbidden from accessing Admin users', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenMainLib}`);
      expect(res.status).toBe(403);
    });

    test('Main Library staff is forbidden from updating Hall Tickets', async () => {
      const res = await request(app).post('/api/fa/hall-ticket/update').set('Authorization', `Bearer ${tokenMainLib}`).send({
        registerNumber: 'IT2024001',
        hallTicketStatus: 'Issued'
      });
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 8. DEACTIVATED USER LOGIN BLOCK -> 403
  // ===========================================================================
  describe('8. Deactivated Account Login Block -> 403', () => {
    test('Deactivated user account is strictly blocked from logging in with 403', async () => {
      // 1. Temporarily deactivate a test student account
      await query("UPDATE users SET is_active = 0 WHERE username = 'IT2024004'");

      // 2. Attempt login
      const loginRes = await request(app).post('/api/auth/login').send({
        username: 'IT2024004',
        password: 'password123'
      });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.success).toBe(false);
      expect(loginRes.body.message).toMatch(/deactivated|disabled|suspended/i);

      // 3. Restore account activation
      await query("UPDATE users SET is_active = 1 WHERE username = 'IT2024004'");
    });
  });
});
