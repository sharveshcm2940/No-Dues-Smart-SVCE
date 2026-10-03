const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');

describe('Security Task 2: Rate Limiting & Account Lockout', () => {
  const testUser = 'TEST_LOCKOUT_USER';
  const correctPassword = 'Password123!@#$';

  beforeAll(async () => {
    // Create dedicated test user in database
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(correctPassword, 10);
    await query('DELETE FROM users WHERE username = ?', [testUser]);
    await query(
      `INSERT INTO users (username, email, password, role, must_change_password, failed_login_attempts, locked_until)
       VALUES (?, ?, ?, 'student', 0, 0, NULL)`,
      [testUser, `${testUser}@test.svce.ac.in`, hash]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE username = ?', [testUser]);
  });

  test('should return RateLimit standard headers on requests', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  test('should increment failed attempts and lock out account after 5 failed logins', async () => {
    // Attempt 1 to 4: Failures with generic error
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: testUser, password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid|locked|credentials/i);
    }

    // Check failed attempts count in DB
    const rows = await query('SELECT failed_login_attempts, locked_until FROM users WHERE username = ?', [testUser]);
    expect(rows[0].failed_login_attempts).toBe(4);
    expect(rows[0].locked_until).toBeNull();

    // Attempt 5: Triggers lockout
    const res5 = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser, password: 'WrongPassword999!' });

    expect([401, 423]).toContain(res5.status);
    expect(res5.body.success).toBe(false);
    expect(res5.body.message).toMatch(/invalid|locked|credentials/i);

    // Verify locked_until is set in DB (~15 minutes into future)
    const lockedRows = await query('SELECT failed_login_attempts, locked_until FROM users WHERE username = ?', [testUser]);
    expect(lockedRows[0].failed_login_attempts).toBe(5);
    expect(lockedRows[0].locked_until).not.toBeNull();
    const lockedUntil = new Date(lockedRows[0].locked_until);
    expect(lockedUntil.getTime()).toBeGreaterThan(Date.now() + 10 * 60 * 1000);

    // Attempt 6 with CORRECT password: Must still be locked out!
    const resLocked = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser, password: correctPassword });

    expect([401, 423]).toContain(resLocked.status);
    expect(resLocked.body.success).toBe(false);
    expect(resLocked.body.message).toMatch(/invalid|locked|credentials/i);
  });

  test('should reset failed_login_attempts on successful login after unlocking', async () => {
    // Manually unlock user for test
    await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = ?', [testUser]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser, password: correctPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const rows = await query('SELECT failed_login_attempts FROM users WHERE username = ?', [testUser]);
    expect(rows[0].failed_login_attempts).toBe(0);
  });

  test('should not enumerate non-existent users (returns same generic message)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'TOTALLY_NON_EXISTENT_USER_99999', password: 'SomePassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid|locked|credentials/i);
  });
});
