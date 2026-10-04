const request = require('supertest');
const app = require('../src/server');
const { query, getOne } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');
const { generateSecret: otpGenerateSecret, generateSync: otpGenerateSync } = require('otplib');

describe('Phase 3 - Task 1: ADMIN Role, User Management & Mandatory MFA', () => {
  let adminUserId;
  let adminToken;
  let studentToken;
  let targetUserId;
  const adminUsername = 'ADM_TEST_SUPER';
  const studentUsername = 'STU_TEST_ADMIN_TEST';
  const targetUsername = 'STAFF_TARGET_TEST';
  let mfaSecret;

  beforeAll(async () => {
    mfaSecret = otpGenerateSecret();
    const passwordHash = await bcrypt.hash('SecureAdminPass123!', 10);

    // Clean up test records
    await query(`DELETE FROM users WHERE username IN (?, ?, ?)`, [adminUsername, studentUsername, targetUsername]);
    await query(`DELETE FROM students WHERE register_number = ?`, [studentUsername]);

    // 1. Create Admin user with MFA secret configured
    const adminRes = await query(
      `INSERT INTO users (username, email, password, role, is_active, mfa_enabled, mfa_secret, must_change_password)
       VALUES (?, 'admin_test@svce.ac.in', ?, 'admin', 1, 1, ?, 0)`,
      [adminUsername, passwordHash, mfaSecret]
    );
    adminUserId = adminRes.insertId;

    // 2. Create Student user (non-admin)
    const stuRes = await query(
      `INSERT INTO users (username, email, password, role, is_active, mfa_enabled, must_change_password)
       VALUES (?, 'student_admin_test@svce.ac.in', ?, 'student', 1, 0, 0)`,
      [studentUsername, passwordHash]
    );
    const stuUserId = stuRes.insertId;

    // 3. Create target staff user for admin actions
    const targetRes = await query(
      `INSERT INTO users (username, email, password, role, is_active, failed_login_attempts, locked_until, must_change_password)
       VALUES (?, 'target_staff@svce.ac.in', ?, 'library_staff', 1, 5, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0)`,
      [targetUsername, passwordHash]
    );
    targetUserId = targetRes.insertId;

    // Issue tokens
    adminToken = jwt.sign({ id: adminUserId, username: adminUsername, role: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
    studentToken = jwt.sign({ id: stuUserId, username: studentUsername, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await query(`DELETE FROM users WHERE username IN (?, ?, ?)`, [adminUsername, studentUsername, targetUsername]);
    await query(`DELETE FROM students WHERE register_number = ?`, [studentUsername]);
  });

  test('Admin login succeeds directly without MFA and returns access token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: adminUsername,
        password: 'SecureAdminPass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  test('Non-admin user cannot access admin user list (Expect 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Admin can list users with pagination and search', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .query({ search: adminUsername })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0].username).toBe(adminUsername);
  });

  test('Admin can unlock a locked user account', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${targetUserId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await getOne('SELECT locked_until, failed_login_attempts FROM users WHERE id = ?', [targetUserId]);
    expect(user.locked_until).toBeNull();
    expect(user.failed_login_attempts).toBe(0);
  });

  test('Admin can force password reset on a user', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${targetUserId}/force-password-reset`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await getOne('SELECT must_change_password FROM users WHERE id = ?', [targetUserId]);
    expect(user.must_change_password).toBe(1);
  });

  test('Admin can deactivate a user and deactivated user cannot log in', async () => {
    // 1. Deactivate
    const deactRes = await request(app)
      .post(`/api/admin/users/${targetUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.success).toBe(true);
    expect(deactRes.body.isActive).toBe(false);

    // 2. Attempt login as deactivated user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: targetUsername,
        password: 'SecureAdminPass123!'
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.message).toMatch(/deactivated|disabled/i);

    // 3. Reactivate user
    const reactRes = await request(app)
      .post(`/api/admin/users/${targetUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.isActive).toBe(true);
  });

  test('Admin can read and update system settings', async () => {
    // 1. Get current settings
    const getRes = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.settings.fine_rate_per_day.value).toBeDefined();

    // 2. Update settings
    const putRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: {
          fine_rate_per_day: '10.00',
          fine_grace_days: '5'
        }
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);

    const settingVal = await getOne(`SELECT setting_value FROM system_settings WHERE setting_key = 'fine_rate_per_day'`);
    expect(settingVal.setting_value).toBe('10.00');
  });
});
