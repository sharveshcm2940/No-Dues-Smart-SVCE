const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');
const { generateCertificateToken, computeCertificateHMAC, verifyCertificateHMAC } = require('../src/utils/certificateSigner');
const bcrypt = require('bcryptjs');

describe('Security Task 3: Certificate Integrity & Cryptographic Signatures', () => {
  let certToken;
  let certHmac;
  let requestId;
  let certNumber;
  let hodToken;
  let studentToken;

  const testHod = 'CERT_TEST_HOD';
  const testStudent = 'CERT_TEST_STUDENT';
  const regNo = 'IT2024TEST01';
  const issueDate = '2026-10-02';

  beforeAll(async () => {
    const hash = await bcrypt.hash('StrongPassword123!@#$', 10);
    await query('DELETE FROM users WHERE username IN (?, ?)', [testHod, testStudent]);
    await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES (?, ?, ?, 'hod', 0), (?, ?, ?, 'student', 0)`,
      [testHod, `${testHod}@test.svce.ac.in`, hash, testStudent, `${testStudent}@test.svce.ac.in`, hash]
    );

    // Generate authorized JWT for HOD (bypassing interactive MFA prompt for unit test)
    const hodRows = await query('SELECT id FROM users WHERE username = ?', [testHod]);
    const jwt = require('jsonwebtoken');
    const env = require('../src/config/env');
    hodToken = jwt.sign(
      { id: hodRows[0].id, username: testHod, role: 'hod', email: `${testHod}@test.svce.ac.in`, must_change_password: false },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const studentLogin = await request(app).post('/api/auth/login').send({ username: testStudent, password: 'StrongPassword123!@#$' });
    studentToken = studentLogin.body.token;

    // Create a mock approved request with certificate in DB
    certToken = generateCertificateToken();
    certNumber = 'CERT-SVCE-IT-TEST-0001';

    const reqRes = await query(
      `INSERT INTO nodues_requests (request_number, register_number, student_name, id_card_number, year, overall_status, completion_date, certificate_number)
       VALUES (?, ?, ?, ?, ?, 'Approved', ?, ?)`,
      ['REQ-TEST-CERT-001', regNo, 'Test Cert Student', 'IDC-TEST-001', 'IV', issueDate, certNumber]
    );
    requestId = reqRes.insertId;

    certHmac = computeCertificateHMAC({
      certificateId: certNumber,
      registerNumber: regNo,
      issueDate: issueDate,
      requestId: requestId
    });

    await query(
      `UPDATE nodues_requests
       SET certificate_token = ?, certificate_hmac = ?, certificate_version = 1, certificate_status = 'Valid'
       WHERE id = ?`,
      [certToken, certHmac, requestId]
    );

    // Insert student profile record so name, department, batch are resolved
    await query('DELETE FROM students WHERE register_number = ?', [regNo]);
    await query(
      `INSERT INTO students (register_number, full_name, id_card_number, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone, department, batch, user_id)
       VALUES (?, 'Test Cert Student', 'IDC-TEST-001', 'testcert@test.svce.ac.in', '9876543210', 'Dr. Advisor', 'EMP-ADV-01', 'advisor@test.svce.ac.in', '9876543211', 'Information Technology', '2022-2026', (SELECT id FROM users WHERE username = ?))`,
      [regNo, testStudent]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM nodues_requests WHERE id = ?', [requestId]);
    await query('DELETE FROM students WHERE register_number = ?', [regNo]);
    await query('DELETE FROM users WHERE username IN (?, ?)', [testHod, testStudent]);
  });

  test('should generate a token of at least 128 bits base64url', () => {
    const token = generateCertificateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(22); // 16 bytes base64url is 22 chars
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // Base64URL character set
  });

  test('should correctly compute and verify HMAC-SHA256 signature', () => {
    const valid = verifyCertificateHMAC({
      certificateId: certNumber,
      registerNumber: regNo,
      issueDate: issueDate,
      requestId: requestId
    }, certHmac);
    expect(valid).toBe(true);

    // Tampered parameter must fail verification
    const tampered = verifyCertificateHMAC({
      certificateId: certNumber,
      registerNumber: 'TAMPERED_REG_NO',
      issueDate: issueDate,
      requestId: requestId
    }, certHmac);
    expect(tampered).toBe(false);
  });

  test('public endpoint GET /api/verify/:token returns ONLY authorized public fields', async () => {
    const res = await request(app).get(`/api/verify/${certToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    // Authorized fields
    expect(data.student_name).toBe('Test Cert Student');
    expect(data.register_number).toBe(regNo);
    expect(data.department).toBe('Information Technology');
    expect(data.batch).toBe('2022-2026');
    expect(data.status).toBe('Valid');
    expect(data.version).toBe(1);

    // CRITICAL: Must NEVER expose internal sensitive data
    expect(data).not.toHaveProperty('stages');
    expect(data).not.toHaveProperty('remarks');
    expect(data).not.toHaveProperty('officer_ids');
    expect(data).not.toHaveProperty('officerIds');
    expect(data).not.toHaveProperty('photo_url');
    expect(data).not.toHaveProperty('photos');
    expect(data).not.toHaveProperty('phone');
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('certificate_hmac');
  });

  test('should reject non-existent certificate token on public verify endpoint', async () => {
    const res = await request(app).get('/api/verify/non_existent_fake_token_123456');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('should allow HOD to revoke a certificate with mandatory reason', async () => {
    // 1. Missing reason
    const noReasonRes = await request(app)
      .post('/api/hod/certificate/revoke')
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ requestId });

    expect(noReasonRes.status).toBe(400);

    // 2. Student cannot revoke (Unauthorized role)
    const studentRes = await request(app)
      .post('/api/hod/certificate/revoke')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ requestId, reason: 'Unauthorized attempt' });

    expect(studentRes.status).toBe(403);

    // 3. Valid HOD revocation
    const revokeRes = await request(app)
      .post('/api/hod/certificate/revoke')
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ requestId, reason: 'Pending department project kit return discovered post-issuance.' });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);
    expect(revokeRes.body.status).toBe('Revoked');

    // 4. Verify public endpoint now displays status: 'Revoked'
    const verifyRes = await request(app).get(`/api/verify/${certToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('Revoked');
  });

  test('should allow HOD to re-issue certificate with incremented version number', async () => {
    const reissueRes = await request(app)
      .post('/api/hod/certificate/reissue')
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ requestId });

    expect(reissueRes.status).toBe(200);
    expect(reissueRes.body.success).toBe(true);
    expect(reissueRes.body.version).toBe(2);
    expect(reissueRes.body.token).toBeDefined();

    const newCertToken = reissueRes.body.token;

    // Verify new token resolves to version 2 and status Valid
    const verifyRes = await request(app).get(`/api/verify/${newCertToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('Valid');
    expect(verifyRes.body.data.version).toBe(2);
  });
});
