const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');

describe('Task 2: Sequential Workflow Enforcement & Concurrency Locking', () => {
  let tokenStudent;
  let tokenDeptLib;
  let tokenDPC;
  let tokenMainLib;
  let tokenFA;
  let tokenFinance;
  let tokenHOD;

  let testRequestId;
  const regNo = 'WORKFLOW_TEST_STUDENT';

  const staffLib = 'WF_LIB_OFFICER';
  const staffDPC = 'WF_DPC_OFFICER';
  const staffMainLib = 'WF_MAINLIB_OFFICER';
  const staffFA = 'WF_FA_OFFICER';
  const staffFinance = 'WF_FINANCE_OFFICER';
  const staffHOD = 'WF_HOD_OFFICER';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!@#', 10);

    // Clean up
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?)`,
      [regNo, staffLib, staffDPC, staffMainLib, staffFA, staffFinance, staffHOD]);
    await query(`DELETE FROM students WHERE register_number = ?`, [regNo]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [staffLib]);
    await query(`DELETE FROM dpc_profile WHERE employee_id = ?`, [staffDPC]);
    await query(`DELETE FROM main_library_profile WHERE employee_id = ?`, [staffMainLib]);
    await query(`DELETE FROM faculty_advisors WHERE employee_id = ?`, [staffFA]);
    await query(`DELETE FROM finance_profile WHERE employee_id = ?`, [staffFinance]);
    await query(`DELETE FROM hod_profile WHERE employee_id = ?`, [staffHOD]);

    // Insert users
    await query(
      `INSERT INTO users (username, email, password, role, must_change_password) VALUES
       (?, 'wf_student@test.svce.ac.in', ?, 'student', 0),
       (?, 'wf_lib@test.svce.ac.in', ?, 'library_staff', 0),
       (?, 'wf_dpc@test.svce.ac.in', ?, 'dpc', 0),
       (?, 'wf_mainlib@test.svce.ac.in', ?, 'main_library_staff', 0),
       (?, 'wf_fa@test.svce.ac.in', ?, 'faculty_advisor', 0),
       (?, 'wf_fin@test.svce.ac.in', ?, 'finance', 0),
       (?, 'wf_hod@test.svce.ac.in', ?, 'hod', 0)`,
      [
        regNo, passwordHash,
        staffLib, passwordHash,
        staffDPC, passwordHash,
        staffMainLib, passwordHash,
        staffFA, passwordHash,
        staffFinance, passwordHash,
        staffHOD, passwordHash
      ]
    );

    const userRows = await query(
      `SELECT id, username FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?)`,
      [regNo, staffLib, staffDPC, staffMainLib, staffFA, staffFinance, staffHOD]
    );
    const uMap = {};
    userRows.forEach(u => { uMap[u.username] = u.id; });

    // Insert profile records
    await query(
      `INSERT INTO library_staff (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'IT Library Officer', 'wf_lib@test.svce.ac.in', '+91 94450 99887', 'Information Technology')`,
      [uMap[staffLib], staffLib]
    );

    await query(
      `INSERT INTO dpc_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'IT DPC Coordinator', 'wf_dpc@test.svce.ac.in', '+91 94455 11223', 'Information Technology')`,
      [uMap[staffDPC], staffDPC]
    );

    await query(
      `INSERT INTO main_library_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Central Library Officer', 'wf_mainlib@test.svce.ac.in', '+91 94450 11224', 'Central Library')`,
      [uMap[staffMainLib], staffMainLib]
    );

    await query(
      `INSERT INTO faculty_advisors (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Prof. Faculty Advisor', 'wf_fa@test.svce.ac.in', '+91 98401 11223', 'Information Technology')`,
      [uMap[staffFA], staffFA]
    );

    await query(
      `INSERT INTO finance_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Chief Finance Officer', 'wf_fin@test.svce.ac.in', '+91 94440 22336', 'Finance and Accounts Section')`,
      [uMap[staffFinance], staffFinance]
    );

    await query(
      `INSERT INTO hod_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Dr. Head of Department', 'wf_hod@test.svce.ac.in', '+91 94440 12345', 'Information Technology')`,
      [uMap[staffHOD], staffHOD]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_emp_id, advisor_name, advisor_email, advisor_phone)
       VALUES (?, ?, 'IDC-WF-01', 'Workflow Test Student', 'Information Technology', 'IV Year', 'A', 'wf_student@test.svce.ac.in', '9876543210', ?, 'Prof. Faculty Advisor', 'wf_fa@test.svce.ac.in', '+91 98401 11223')`,
      [uMap[regNo], regNo, staffFA]
    );

    tokenStudent = jwt.sign({ id: uMap[regNo], username: regNo, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenDeptLib = jwt.sign({ id: uMap[staffLib], username: staffLib, role: 'library_staff' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenDPC = jwt.sign({ id: uMap[staffDPC], username: staffDPC, role: 'dpc' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenMainLib = jwt.sign({ id: uMap[staffMainLib], username: staffMainLib, role: 'main_library_staff' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenFA = jwt.sign({ id: uMap[staffFA], username: staffFA, role: 'faculty_advisor' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenFinance = jwt.sign({ id: uMap[staffFinance], username: staffFinance, role: 'finance' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenHOD = jwt.sign({ id: uMap[staffHOD], username: staffHOD, role: 'hod' }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (testRequestId) {
      await query(`DELETE FROM nodues_stages WHERE request_id = ?`, [testRequestId]);
      await query(`DELETE FROM nodues_audit_logs WHERE request_id = ?`, [testRequestId]);
      await query(`DELETE FROM nodues_requests WHERE id = ?`, [testRequestId]);
    }
    await query(`DELETE FROM students WHERE register_number = ?`, [regNo]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [staffLib]);
    await query(`DELETE FROM dpc_profile WHERE employee_id = ?`, [staffDPC]);
    await query(`DELETE FROM main_library_profile WHERE employee_id = ?`, [staffMainLib]);
    await query(`DELETE FROM faculty_advisors WHERE employee_id = ?`, [staffFA]);
    await query(`DELETE FROM finance_profile WHERE employee_id = ?`, [staffFinance]);
    await query(`DELETE FROM hod_profile WHERE employee_id = ?`, [staffHOD]);
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?)`,
      [regNo, staffLib, staffDPC, staffMainLib, staffFA, staffFinance, staffHOD]);
  });

  describe('Sequential Stage Order Enforcement', () => {
    test('Student submits new No-Dues request (Starts at Stage 1 Department Library Pending)', async () => {
      const res = await request(app)
        .post('/api/student/request-nodues')
        .set('Authorization', `Bearer ${tokenStudent}`)
        .send({ remarks: 'Clearance application for graduation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const rows = await query('SELECT * FROM nodues_requests WHERE register_number = ?', [regNo]);
      expect(rows.length).toBe(1);
      testRequestId = rows[0].id;
      expect(rows[0].overall_status).toBe('In Progress');
      expect(rows[0].current_stage).toBe('Department Library');

      const stages = await query(
        'SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC',
        [testRequestId]
      );
      expect(stages.length).toBe(6);
      expect(stages[0].department_name).toBe('Department Library');
      expect(stages[0].status).toBe('Pending');
      expect(stages[1].department_name).toBe('DPC');
      expect(stages[1].status).toBe('Locked');
    });

    test('Out-of-order approval attempt: HOD cannot approve when prior stages are not approved (Expect 400)', async () => {
      const res = await request(app)
        .post('/api/hod/process-nodues')
        .set('Authorization', `Bearer ${tokenHOD}`)
        .send({
          requestId: testRequestId,
          action: 'Approve',
          remarks: 'Premature HOD sign-off attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Stage order violation/i);
    });

    test('Out-of-order approval attempt: DPC cannot approve before Department Library (Expect 400)', async () => {
      const res = await request(app)
        .post('/api/dpc/process-nodues')
        .set('Authorization', `Bearer ${tokenDPC}`)
        .send({
          requestId: testRequestId,
          action: 'Approve',
          remarks: 'Premature DPC approval attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/requires prior approval from 'Department Library'/i);
    });

    test('Stage 1 (Department Library) Approved -> Unlocks Stage 2 (DPC)', async () => {
      const res = await request(app)
        .post('/api/library/process-nodues')
        .set('Authorization', `Bearer ${tokenDeptLib}`)
        .send({
          requestId: testRequestId,
          action: 'Approve',
          remarks: 'All department books returned.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dpcStage = await query(
        `SELECT * FROM nodues_stages WHERE request_id = ? AND department_name = 'DPC'`,
        [testRequestId]
      );
      expect(dpcStage[0].status).toBe('Pending');
    });

    test('Duplicate approval on already approved Department Library stage fails (Expect 400)', async () => {
      const res = await request(app)
        .post('/api/library/process-nodues')
        .set('Authorization', `Bearer ${tokenDeptLib}`)
        .send({
          requestId: testRequestId,
          action: 'Approve',
          remarks: 'Redundant approval attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already approved/i);
    });
  });

  describe('Concurrency & Double-Approval Race Condition Protection', () => {
    test('Simultaneous concurrent approvals on DPC stage: exactly one succeeds, second gets 400', async () => {
      // Fire two simultaneous approvals
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/dpc/process-nodues')
          .set('Authorization', `Bearer ${tokenDPC}`)
          .send({ requestId: testRequestId, action: 'Approve', remarks: 'Concurrent Approval 1' }),
        request(app)
          .post('/api/dpc/process-nodues')
          .set('Authorization', `Bearer ${tokenDPC}`)
          .send({ requestId: testRequestId, action: 'Approve', remarks: 'Concurrent Approval 2' })
      ]);

      const statuses = [res1.status, res2.status].sort();
      // One must be 200, the other must be 400 (locked out due to targetStage.status === 'Approved')
      expect(statuses).toEqual([200, 400]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 400 ? res1 : res2;

      expect(successRes.body.success).toBe(true);
      expect(failRes.body.success).toBe(false);
      expect(failRes.body.message).toMatch(/already approved/i);
    });
  });

  describe('End-to-End Workflow Completion & Certificate Generation', () => {
    test('Advance Central Library (Stage 3) -> Unlocks Faculty Advisor (Stage 4)', async () => {
      const res = await request(app)
        .post('/api/main-library/process-nodues')
        .set('Authorization', `Bearer ${tokenMainLib}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Central library cleared.' });

      expect(res.status).toBe(200);

      const faStage = await query(
        `SELECT * FROM nodues_stages WHERE request_id = ? AND department_name = 'Faculty Advisor'`,
        [testRequestId]
      );
      expect(faStage[0].status).toBe('Pending');
    });

    test('Advance Faculty Advisor (Stage 4) -> Unlocks Finance (Stage 5)', async () => {
      const res = await request(app)
        .post('/api/fa/process-nodues')
        .set('Authorization', `Bearer ${tokenFA}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Academic criteria met.' });

      expect(res.status).toBe(200);

      const finStage = await query(
        `SELECT * FROM nodues_stages WHERE request_id = ? AND department_name = 'Finance'`,
        [testRequestId]
      );
      expect(finStage[0].status).toBe('Pending');
    });

    test('Advance Finance (Stage 5) -> Unlocks HOD (Stage 6)', async () => {
      const res = await request(app)
        .post('/api/finance/process-nodues')
        .set('Authorization', `Bearer ${tokenFinance}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Tuition and fees fully paid.' });

      expect(res.status).toBe(200);

      const hodStage = await query(
        `SELECT * FROM nodues_stages WHERE request_id = ? AND department_name = 'HOD'`,
        [testRequestId]
      );
      expect(hodStage[0].status).toBe('Pending');
    });

    test('Final Stage 6 (HOD) Approval -> Completes clearance, generates Token & HMAC', async () => {
      const res = await request(app)
        .post('/api/hod/process-nodues')
        .set('Authorization', `Bearer ${tokenHOD}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Institutional sign-off granted.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const requestRow = await query('SELECT * FROM nodues_requests WHERE id = ?', [testRequestId]);
      expect(requestRow[0].overall_status).toBe('Approved');
      expect(requestRow[0].progress_percentage).toBe(100);
      expect(requestRow[0].certificate_token).toBeTruthy();
      expect(requestRow[0].certificate_hmac).toBeTruthy();
      expect(requestRow[0].certificate_status).toBe('Valid');
    });
  });
});
