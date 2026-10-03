const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');
const { generateSecret: otpGenerateSecret, generateSync: otpGenerateSync } = require('otplib');
const bcrypt = require('bcryptjs');

describe('Security Task 2: JWT, Refresh Tokens, MFA & Password Policy', () => {
  const testStudent = 'TEST_JWT_STUDENT';
  const testHod = 'TEST_JWT_HOD';
  const rawPassword = 'StrongPassword123!@#$';

  beforeAll(async () => {
    const hash = await bcrypt.hash(rawPassword, 10);
    // Create test student (must_change_password = 1)
    await query('DELETE FROM users WHERE username IN (?, ?)', [testStudent, testHod]);
    await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES (?, ?, ?, 'student', 1)`,
      [testStudent, `${testStudent}@test.svce.ac.in`, hash]
    );

    // Create test HOD with MFA enabled
    const mfaSecret = otpGenerateSecret();
    await query(
      `INSERT INTO users (username, email, password, role, must_change_password, mfa_enabled, mfa_secret)
       VALUES (?, ?, ?, 'hod', 0, 1, ?)`,
      [testHod, `${testHod}@test.svce.ac.in`, hash, mfaSecret]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE username IN (?, ?)', [testStudent, testHod]);
  });

  test('should issue 1-2h access token and refresh token on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testStudent, password: rawPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.must_change_password).toBe(true);
  });

  test('should block non-exempt routes with 403 PASSWORD_CHANGE_REQUIRED when must_change_password=1', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testStudent, password: rawPassword });

    const token = loginRes.body.token;

    // Trying to access protected route before changing password
    const res = await request(app)
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  test('should enforce password policy and update password', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testStudent, password: rawPassword });

    const token = loginRes.body.token;

    // 1. Weak password under 10 chars
    const weakRes = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: rawPassword, newPassword: 'Short1!' });

    expect(weakRes.status).toBe(400);
    expect(weakRes.body.message).toMatch(/at least 10 characters/i);

    // 2. Common breached password
    const commonRes = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: rawPassword, newPassword: 'password12345' });

    expect(commonRes.status).toBe(400);
    expect(commonRes.body.message).toMatch(/breached|guessable|too common/i);

    // 3. Compliant strong password
    const successRes = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: rawPassword, newPassword: 'BrandNewSecurePassword2026!@#' });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);

    // Verify must_change_password is now 0
    const rows = await query('SELECT must_change_password FROM users WHERE username = ?', [testStudent]);
    expect(rows[0].must_change_password).toBe(0);
  });

  test('should rotate refresh token and reject revoked refresh token', async () => {
    // Login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testStudent, password: 'BrandNewSecurePassword2026!@#' });

    const initialRefreshToken = loginRes.body.refreshToken;
    expect(initialRefreshToken).toBeDefined();

    // Exchange refresh token for new tokens
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body).toHaveProperty('token');
    expect(refreshRes.body).toHaveProperty('refreshToken');

    const rotatedRefreshToken = refreshRes.body.refreshToken;
    expect(rotatedRefreshToken).not.toBe(initialRefreshToken);

    // Replay attack: trying to use the old initialRefreshToken must fail!
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.success).toBe(false);
  });

  test('should revoke refresh token on logout', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testStudent, password: 'BrandNewSecurePassword2026!@#' });

    const { token, refreshToken } = loginRes.body;

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Using the logged out refresh token should fail
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });

  test('should require TOTP MFA challenge on login for HOD role', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testHod, password: rawPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mfaRequired).toBe(true);
    expect(loginRes.body).toHaveProperty('mfaPendingToken');
    expect(loginRes.body).not.toHaveProperty('token'); // Access token not given yet

    const mfaToken = loginRes.body.mfaPendingToken;

    // Fetch user's secret from DB to generate valid TOTP code
    const rows = await query('SELECT mfa_secret FROM users WHERE username = ?', [testHod]);
    const validTotp = otpGenerateSync({ secret: rows[0].mfa_secret, digits: 6, algorithm: 'SHA1', period: 30, timestamp: Date.now() });

    // 1. Submit invalid TOTP code
    const invalidRes = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ mfaPendingToken: mfaToken, totpCode: '000000' });

    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);

    // 2. Submit valid TOTP code
    const validRes = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ mfaPendingToken: mfaToken, totpCode: validTotp });

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body).toHaveProperty('token');
    expect(validRes.body).toHaveProperty('refreshToken');
    expect(validRes.body.user.username).toBe(testHod);
  });

  test('should process single-use password reset token flow', async () => {
    // 1. Request forgot password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ identifier: testStudent });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    // Extract the hashed token from the DB for testing
    const rows = await query(
      'SELECT token_hash FROM password_resets WHERE user_id = (SELECT id FROM users WHERE username = ?) AND used_at IS NULL ORDER BY id DESC LIMIT 1',
      [testStudent]
    );
    expect(rows.length).toBe(1);

    // In a real flow, rawToken is sent via email and hashed before DB lookup.
    // Let's create a known rawToken and insert its SHA256 into password_resets
    const crypto = require('crypto');
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const testHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    const userRow = await query('SELECT id FROM users WHERE username = ?', [testStudent]);
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [userRow[0].id, testHash]
    );

    // Reset password using raw token
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawResetToken,
        newPassword: 'AnotherStrongPassword2026!@#'
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Replay attack: trying to use the same token again should fail
    const replayRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawResetToken,
        newPassword: 'ThirdPassword2026!@#$'
      });

    expect(replayRes.status).toBe(400);
    expect(replayRes.body.message).toMatch(/invalid|expired/i);
  });
});
