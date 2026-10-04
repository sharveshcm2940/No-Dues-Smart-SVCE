const request = require('supertest');
const app = require('../src/server');
const { query, getOne } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');
const { verifyAuditChain } = require('../src/utils/auditChain');

describe('Phase 3 - Task 3: Stage Reopening Workflow & Cascading Resets', () => {
  let studentToken;
  let libOfficerToken;
  let dpcOfficerToken;
  let hodToken;
  let requestId;

  const regStudent = 'STU_REOPEN_001';
  const libOfficer = 'LIB_REOPEN_001';
  const dpcOfficer = 'DPC_REOPEN_001';
  const hodOfficer = 'HOD_REOPEN_001';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecureReopen123!', 10);

    // Clean up
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?)`, [regStudent, libOfficer, dpcOfficer, hodOfficer]);
    await query(`DELETE FROM students WHERE register_number = ?`, [regStudent]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [libOfficer]);
    await query(`DELETE FROM dpc_profile WHERE employee_id = ?`, [dpcOfficer]);
    await query(`DELETE FROM hod_profile WHERE employee_id = ?`, [hodOfficer]);

    // Create users
    const uStu = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'stu_reopen@svce.ac.in', ?, 'student', 1)`,
      [regStudent, passwordHash]
    );
    const uLib = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'lib_reopen@svce.ac.in', ?, 'library_staff', 1)`,
      [libOfficer, passwordHash]
    );
    const uDpc = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'dpc_reopen@svce.ac.in', ?, 'dpc', 1)`,
      [dpcOfficer, passwordHash]
    );
    const uHod = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'hod_reopen@svce.ac.in', ?, 'hod', 1)`,
      [hodOfficer, passwordHash]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, 'IDC-REOPEN-1', 'Reopen Candidate', 'Information Technology', 'IV Year', 'A', 'stu_reopen@svce.ac.in', '+91 98401 99991', 'Dr. Test Advisor', 'EMP-FA-TEST-01', 'fa@test.svce.ac.in', '+91 98401 11223')`,
      [uStu.insertId, regStudent]
    );

    await query(
      `INSERT INTO library_staff (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Library Incharge', 'lib_reopen@svce.ac.in', '+91 98401 99992', 'Information Technology')`,
      [uLib.insertId, libOfficer]
    );

    await query(
      `INSERT INTO dpc_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'DPC Incharge', 'dpc_reopen@svce.ac.in', '+91 98401 99993', 'Information Technology')`,
      [uDpc.insertId, dpcOfficer]
    );

    await query(
      `INSERT INTO hod_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Dr. HOD IT', 'hod_reopen@svce.ac.in', '+91 98401 99994', 'Information Technology')`,
      [uHod.insertId, hodOfficer]
    );

    studentToken = jwt.sign({ id: uStu.insertId, username: regStudent, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    libOfficerToken = jwt.sign({ id: uLib.insertId, username: libOfficer, role: 'library_staff' }, env.JWT_SECRET, { expiresIn: '1h' });
    dpcOfficerToken = jwt.sign({ id: uDpc.insertId, username: dpcOfficer, role: 'dpc' }, env.JWT_SECRET, { expiresIn: '1h' });
    hodToken = jwt.sign({ id: uHod.insertId, username: hodOfficer, role: 'hod' }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  beforeEach(async () => {
    // Reset test clearance request and stages
    await query(`DELETE FROM nodues_requests WHERE register_number = ?`, [regStudent]);

    const reqRes = await query(
      `INSERT INTO nodues_requests (request_number, register_number, student_name, id_card_number, department, year, overall_status, progress_percentage, current_stage, certificate_number, certificate_status, certificate_token, certificate_hmac)
       VALUES ('NDR-REOPEN-TEST', ?, 'Reopen Candidate', 'IDC-REOPEN-1', 'Information Technology', 'IV Year', 'Approved', 100, 'Completed', 'CERT-TEST-999', 'Valid', 'token999', 'hmac999')`,
      [regStudent]
    );
    requestId = reqRes.insertId;

    // Seed 6 stages - all Approved initially
    const stageNames = ['Department Library', 'DPC', 'Central Library', 'Faculty Advisor', 'Finance', 'HOD'];
    for (let i = 0; i < stageNames.length; i++) {
      await query(
        `INSERT INTO nodues_stages (request_id, department_name, stage_order, status, approved_by, remarks)
         VALUES (?, ?, ?, 'Approved', 'Officer Initial', 'Initial clearance approved')`,
        [requestId, stageNames[i], i + 1]
      );
    }
  });

  afterAll(async () => {
    await query(`DELETE FROM nodues_requests WHERE register_number = ?`, [regStudent]);
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?)`, [regStudent, libOfficer, dpcOfficer, hodOfficer]);
    await query(`DELETE FROM students WHERE register_number = ?`, [regStudent]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [libOfficer]);
    await query(`DELETE FROM dpc_profile WHERE employee_id = ?`, [dpcOfficer]);
    await query(`DELETE FROM hod_profile WHERE employee_id = ?`, [hodOfficer]);
  });

  test('Student cannot reopen a clearance stage (Expect 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/nodues/reopen-stage')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        requestId,
        departmentName: 'Department Library',
        reason: 'Student attempting self reopening'
      });

    expect(res.status).toBe(403);
  });

  test('Reopening without mandatory reason is rejected (Expect 400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/nodues/reopen-stage')
      .set('Authorization', `Bearer ${libOfficerToken}`)
      .send({
        requestId,
        departmentName: 'Department Library',
        reason: '   ' // Empty reason
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('DPC officer cannot reopen Department Library stage (Wrong department role, Expect 403)', async () => {
    const res = await request(app)
      .post('/api/nodues/reopen-stage')
      .set('Authorization', `Bearer ${dpcOfficerToken}`)
      .send({
        requestId,
        departmentName: 'Department Library',
        reason: 'DPC officer attempting cross-stage reopening'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/unauthorized|not permitted/i);
  });

  test('Department Library officer successfully reopens stage, resets downstream stages, revokes certificate and records hash-chained audit log', async () => {
    const reopenReason = 'New unreturned book discovered with outstanding fine';
    const res = await request(app)
      .post('/api/nodues/reopen-stage')
      .set('Authorization', `Bearer ${libOfficerToken}`)
      .send({
        requestId,
        departmentName: 'Department Library',
        reason: reopenReason
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 1. Target stage must be 'Hold' with reopening remarks
    const targetStage = await getOne(
      `SELECT status, remarks FROM nodues_stages WHERE request_id = ? AND department_name = 'Department Library'`,
      [requestId]
    );
    expect(targetStage.status).toBe('Hold');
    expect(targetStage.remarks).toContain(reopenReason);

    // 2. All downstream stages must be reset to 'Pending'
    const downstreamStages = await query(
      `SELECT department_name, status FROM nodues_stages WHERE request_id = ? AND stage_order > 1`,
      [requestId]
    );
    expect(downstreamStages.length).toBe(5);
    downstreamStages.forEach(s => {
      expect(s.status).toBe('Pending');
    });

    // 3. Request status reset and certificate revoked
    const updatedReq = await getOne(`SELECT * FROM nodues_requests WHERE id = ?`, [requestId]);
    expect(updatedReq.overall_status).toBe('In Progress');
    expect(updatedReq.certificate_status).toBe('Revoked');
    expect(updatedReq.certificate_number).toBeNull();
    expect(updatedReq.revocation_reason).toContain(reopenReason);

    // 4. Audit Chain Integrity Verification
    const auditChainCheck = await verifyAuditChain('nodues_audit_logs', requestId);
    expect(auditChainCheck.valid).toBe(true);

    // Check latest audit entry
    const latestAudit = await getOne(
      `SELECT * FROM nodues_audit_logs WHERE request_id = ? ORDER BY id DESC LIMIT 1`,
      [requestId]
    );
    expect(latestAudit.action_type).toBe('Stage Reopened');
    expect(latestAudit.department_name).toBe('Department Library');
    expect(latestAudit.remarks).toContain(reopenReason);
  });

  test('HOD has authority to reopen any clearance stage', async () => {
    const reopenReason = 'HOD review: audit flagged discrepancy in Finance section';
    const res = await request(app)
      .post('/api/nodues/reopen-stage')
      .set('Authorization', `Bearer ${hodToken}`)
      .send({
        requestId,
        departmentName: 'Finance',
        reason: reopenReason
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Finance stage is now 'Hold'
    const finStage = await getOne(
      `SELECT status, remarks FROM nodues_stages WHERE request_id = ? AND department_name = 'Finance'`,
      [requestId]
    );
    expect(finStage.status).toBe('Hold');

    // Downstream stage (HOD) is reset to 'Pending'
    const hodStage = await getOne(
      `SELECT status FROM nodues_stages WHERE request_id = ? AND department_name = 'HOD'`,
      [requestId]
    );
    expect(hodStage.status).toBe('Pending');

    // Upstream stages (1-4) remain 'Approved'
    const upstreamStages = await query(
      `SELECT department_name, status FROM nodues_stages WHERE request_id = ? AND stage_order < 5`,
      [requestId]
    );
    expect(upstreamStages.length).toBe(4);
    upstreamStages.forEach(s => {
      expect(s.status).toBe('Approved');
    });
  });
});
