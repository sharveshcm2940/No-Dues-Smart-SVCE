const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');
const { verifyAuditChain, appendNoDuesAuditLog, appendSystemAuditLog } = require('../src/utils/auditChain');
const { maskPhone, maskEmail, maskCTC, sanitizeRequest, sanitizeStudentProfile } = require('../src/utils/dataMasking');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');

describe('Task 3 & 4: DPDP Act 2023 Privacy, Data Masking & Append-Only Audit Hash Chaining', () => {
  let tokenStudent;
  let tokenHOD;
  let tokenLibrary;
  let testUserId;
  let studentUserId;

  const testStudent = 'DPDP_TEST_STUDENT';
  const testHOD = 'DPDP_TEST_HOD';
  const testLibrary = 'DPDP_TEST_LIB';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!@#', 10);

    // Clean up
    await query(`DELETE FROM consent_records WHERE user_id IN (SELECT id FROM users WHERE username IN (?, ?, ?))`, [testStudent, testHOD, testLibrary]);
    await query(`DELETE FROM users WHERE username IN (?, ?, ?)`, [testStudent, testHOD, testLibrary]);

    // Insert test users
    const resStudent = await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES (?, 'dpdp_student@test.svce.ac.in', ?, 'student', 0)`,
      [testStudent, passwordHash]
    );
    studentUserId = resStudent.insertId;

    const resHOD = await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES (?, 'dpdp_hod@test.svce.ac.in', ?, 'hod', 0)`,
      [testHOD, passwordHash]
    );

    const resLib = await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES (?, 'dpdp_lib@test.svce.ac.in', ?, 'library_staff', 0)`,
      [testLibrary, passwordHash]
    );

    tokenStudent = jwt.sign({ id: studentUserId, username: testStudent, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenHOD = jwt.sign({ id: resHOD.insertId, username: testHOD, role: 'hod' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenLibrary = jwt.sign({ id: resLib.insertId, username: testLibrary, role: 'library_staff' }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await query(`DELETE FROM consent_records WHERE user_id IN (SELECT id FROM users WHERE username IN (?, ?, ?))`, [testStudent, testHOD, testLibrary]);
    await query(`DELETE FROM users WHERE username IN (?, ?, ?)`, [testStudent, testHOD, testLibrary]);
  });

  describe('DPDP Act 2023: Consent Recording & Privacy Notice', () => {
    test('Student records consent for GPS telemetry (Opt-in with explicit purpose and policy version)', async () => {
      const res = await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${tokenStudent}`)
        .send({
          purpose: 'geolocation_telemetry',
          status: 'Granted',
          policyVersion: '1.0'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const records = await query(
        `SELECT * FROM consent_records WHERE user_id = ? AND purpose = 'geolocation_telemetry'`,
        [studentUserId]
      );
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].status).toBe('Granted');
      expect(records[0].policy_version).toBe('1.0');
    });

    test('Student can retrieve their active consent records', async () => {
      const res = await request(app)
        .get('/api/consent')
        .set('Authorization', `Bearer ${tokenStudent}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.consents)).toBe(true);
      const geoConsent = res.body.consents.find(c => c.purpose === 'geolocation_telemetry');
      expect(geoConsent).toBeDefined();
      expect(geoConsent.status).toBe('Granted');
    });

    test('Student can opt-out (one-click disable)', async () => {
      const res = await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${tokenStudent}`)
        .send({
          purpose: 'geolocation_telemetry',
          status: 'Revoked',
          policyVersion: '1.0'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const resGet = await request(app)
        .get('/api/consent')
        .set('Authorization', `Bearer ${tokenStudent}`);

      const geoConsent = resGet.body.consents.find(c => c.purpose === 'geolocation_telemetry');
      expect(geoConsent.status).toBe('Revoked');
    });

    test('Configurable log retention cleanup job runs successfully', async () => {
      const res = await request(app)
        .post('/api/admin/audit-logs/purge')
        .set('Authorization', `Bearer ${tokenHOD}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.retentionDays).toBeDefined();
    });
  });

  describe('DPDP Act 2023: Sensitive Field Masking', () => {
    test('maskPhone redacts middle digits preserving first 2 and last 3', () => {
      expect(maskPhone('9876543210')).toBe('98*****210');
      expect(maskPhone('12345')).toBe('12345');
    });

    test('maskEmail redacts username portion', () => {
      expect(maskEmail('sharvesh@svce.ac.in')).toBe('s******h@svce.ac.in');
    });

    test('maskCTC masks package compensation details', () => {
      expect(maskCTC('14 LPA')).toBe('[Confidential - Placement/Student Only]');
    });

    test('sanitizeRequest conceals CTC and contact details from unauthorized roles (library_staff)', () => {
      const mockRequest = {
        id: 999,
        student_name: 'Test Student',
        ctc_package: '18 LPA',
        student_phone: '9876543210',
        student_email: 'student@svce.ac.in',
        higher_contact: '9123456780'
      };

      const sanitizedForLib = sanitizeRequest(mockRequest, 'library_staff', false);
      expect(sanitizedForLib.ctc_package).toBe('[Confidential - Placement/Student Only]');
      expect(sanitizedForLib.student_phone).toBe('98*****210');
      expect(sanitizedForLib.student_email).toBe('s*****t@svce.ac.in');

      // Owning student or DPC sees full CTC
      const forDpc = sanitizeRequest(mockRequest, 'dpc', false);
      expect(forDpc.ctc_package).toBe('18 LPA');
    });
  });

  describe('Task 4: Cryptographic Hash Chaining & Tamper Detection', () => {
    test('Audit log chain is cryptographically intact and passes verification', async () => {
      const res = await request(app)
        .get('/api/audit-logs/verify')
        .set('Authorization', `Bearer ${tokenHOD}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.valid).toBe(true);
      expect(res.body.systemLogsVerified).toBeGreaterThanOrEqual(0);
      expect(res.body.noduesLogsVerified).toBeGreaterThanOrEqual(0);
    });

    test('Direct DB tampering of an audit record is immediately detected', async () => {
      // 1. Create a test audit row with valid hash in system_audit_logs
      await appendSystemAuditLog({
        userId: testUserId,
        username: testStudent,
        fullName: 'Test Student',
        role: 'student',
        action: 'TEST_AUDIT_INTEGRITY',
        ipAddress: '127.0.0.1',
        userAgent: 'JestSecurityRunner',
        details: 'Original uncorrupted remark',
        module: 'DPDP Security Test'
      });

      // 2. Verify chain is valid initially
      const initialCheck = await verifyAuditChain();
      expect(initialCheck.valid).toBe(true);

      // 3. Directly tamper with the database row (simulate malicious insider / attacker)
      const lastRows = await query(
        `SELECT id FROM system_audit_logs WHERE action = 'TEST_AUDIT_INTEGRITY' ORDER BY id DESC LIMIT 1`
      );
      const tamperedId = lastRows[0].id;

      await query(
        `UPDATE system_audit_logs SET details = 'TAMPERED REMARK CORRUPTED' WHERE id = ?`,
        [tamperedId]
      );

      // 4. Run verification - it MUST detect the tampering
      const tamperedCheck = await verifyAuditChain();
      expect(tamperedCheck.valid).toBe(false);
      expect(tamperedCheck.tamperedTable).toBe('system_audit_logs');
      expect(tamperedCheck.tamperedLogId).toBe(tamperedId);

      // 5. Clean up test record and restore integrity
      await query(`DELETE FROM system_audit_logs WHERE id = ?`, [tamperedId]);
      const restoredCheck = await verifyAuditChain();
      expect(restoredCheck.valid).toBe(true);
    });
  });
});
