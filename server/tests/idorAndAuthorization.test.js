const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');

describe('Task 1: IDOR & Centralized Authorization Enforcement', () => {
  let tokenStudentA;
  let tokenStudentB;
  let tokenFA1;
  let tokenFA2;
  let tokenHOD_IT;
  let tokenLibrary_IT;

  let requestA_Id;
  let requestB_Id;
  let requestMech_Id;

  const regStudentA = 'IDOR_STUDENT_A';
  const regStudentB = 'IDOR_STUDENT_B';
  const regStudentMech = 'IDOR_STUDENT_MECH';

  const fa1EmpId = 'FA_IDOR_01';
  const fa2EmpId = 'FA_IDOR_02';
  const hodEmpId = 'HOD_IDOR_IT';
  const libEmpId = 'LIB_IDOR_IT';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!@#', 10);

    // Clean up any test users
    await query(
      `DELETE FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?)`,
      [regStudentA, regStudentB, regStudentMech, fa1EmpId, fa2EmpId, hodEmpId, libEmpId]
    );
    await query(
      `DELETE FROM students WHERE register_number IN (?, ?, ?)`,
      [regStudentA, regStudentB, regStudentMech]
    );
    await query(
      `DELETE FROM faculty_advisors WHERE employee_id IN (?, ?)`,
      [fa1EmpId, fa2EmpId]
    );
    await query(
      `DELETE FROM hod_profile WHERE employee_id = ?`,
      [hodEmpId]
    );
    await query(
      `DELETE FROM library_staff WHERE employee_id = ?`,
      [libEmpId]
    );

    // 1. Create users
    await query(
      `INSERT INTO users (username, email, password, role, must_change_password) VALUES
       (?, 'studenta@test.svce.ac.in', ?, 'student', 0),
       (?, 'studentb@test.svce.ac.in', ?, 'student', 0),
       (?, 'studentmech@test.svce.ac.in', ?, 'student', 0),
       (?, 'fa1@test.svce.ac.in', ?, 'faculty_advisor', 0),
       (?, 'fa2@test.svce.ac.in', ?, 'faculty_advisor', 0),
       (?, 'hodit@test.svce.ac.in', ?, 'hod', 0),
       (?, 'libit@test.svce.ac.in', ?, 'library_staff', 0)`,
      [
        regStudentA, passwordHash,
        regStudentB, passwordHash,
        regStudentMech, passwordHash,
        fa1EmpId, passwordHash,
        fa2EmpId, passwordHash,
        hodEmpId, passwordHash,
        libEmpId, passwordHash
      ]
    );

    const userRows = await query(
      `SELECT id, username FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?)`,
      [regStudentA, regStudentB, regStudentMech, fa1EmpId, fa2EmpId, hodEmpId, libEmpId]
    );
    const uMap = {};
    userRows.forEach(u => { uMap[u.username] = u.id; });

    // 2. Insert profile records
    await query(
      `INSERT INTO faculty_advisors (user_id, employee_id, full_name, email, phone, department) VALUES
       (?, ?, 'Dr. Advisor One', 'fa1@test.svce.ac.in', '+91 98401 11223', 'Information Technology'),
       (?, ?, 'Dr. Advisor Two', 'fa2@test.svce.ac.in', '+91 98402 22334', 'Information Technology')`,
      [uMap[fa1EmpId], fa1EmpId, uMap[fa2EmpId], fa2EmpId]
    );

    await query(
      `INSERT INTO hod_profile (user_id, employee_id, full_name, email, phone, department) VALUES
       (?, ?, 'Dr. HOD IT', 'hodit@test.svce.ac.in', '+91 94440 12345', 'Information Technology')`,
      [uMap[hodEmpId], hodEmpId]
    );

    await query(
      `INSERT INTO library_staff (user_id, employee_id, full_name, email, phone, department) VALUES
       (?, ?, 'Mr. IT Librarian', 'libit@test.svce.ac.in', '+91 94450 99887', 'Information Technology')`,
      [uMap[libEmpId], libEmpId]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_emp_id, advisor_name, advisor_email, advisor_phone) VALUES
       (?, ?, 'IDC-A', 'Student A IT', 'Information Technology', 'IV Year', 'A', 'studenta@test.svce.ac.in', '9876543210', ?, 'Dr. Advisor One', 'fa1@test.svce.ac.in', '+91 98401 11223'),
       (?, ?, 'IDC-B', 'Student B IT', 'Information Technology', 'IV Year', 'B', 'studentb@test.svce.ac.in', '9876543211', ?, 'Dr. Advisor Two', 'fa2@test.svce.ac.in', '+91 98402 22334'),
       (?, ?, 'IDC-M', 'Student Mech', 'Mechanical Engineering', 'IV Year', 'A', 'studentmech@test.svce.ac.in', '9876543212', 'FA_MECH_01', 'Dr. Mech FA', 'famech@test.svce.ac.in', '+91 98403 33445')`,
      [
        uMap[regStudentA], regStudentA, fa1EmpId,
        uMap[regStudentB], regStudentB, fa2EmpId,
        uMap[regStudentMech], regStudentMech
      ]
    );

    // 3. Issue JWT tokens
    tokenStudentA = jwt.sign({ id: uMap[regStudentA], username: regStudentA, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenStudentB = jwt.sign({ id: uMap[regStudentB], username: regStudentB, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenFA1 = jwt.sign({ id: uMap[fa1EmpId], username: fa1EmpId, role: 'faculty_advisor' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenFA2 = jwt.sign({ id: uMap[fa2EmpId], username: fa2EmpId, role: 'faculty_advisor' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenHOD_IT = jwt.sign({ id: uMap[hodEmpId], username: hodEmpId, role: 'hod' }, env.JWT_SECRET, { expiresIn: '1h' });
    tokenLibrary_IT = jwt.sign({ id: uMap[libEmpId], username: libEmpId, role: 'library_staff' }, env.JWT_SECRET, { expiresIn: '1h' });

    // 4. Create clearance requests
    const resA = await query(
      `INSERT INTO nodues_requests (request_number, register_number, student_name, id_card_number, department, year, overall_status, current_stage)
       VALUES ('NDR-IDOR-A', ?, 'Student A IT', 'IDC-A', 'Information Technology', 'IV Year', 'In Progress', 'Department Library')`,
      [regStudentA]
    );
    requestA_Id = resA.insertId;

    const resB = await query(
      `INSERT INTO nodues_requests (request_number, register_number, student_name, id_card_number, department, year, overall_status, current_stage)
       VALUES ('NDR-IDOR-B', ?, 'Student B IT', 'IDC-B', 'Information Technology', 'IV Year', 'In Progress', 'Department Library')`,
      [regStudentB]
    );
    requestB_Id = resB.insertId;

    const resMech = await query(
      `INSERT INTO nodues_requests (request_number, register_number, student_name, id_card_number, department, year, overall_status, current_stage)
       VALUES ('NDR-IDOR-MECH', ?, 'Student Mech', 'IDC-M', 'Mechanical Engineering', 'IV Year', 'In Progress', 'Department Library')`,
      [regStudentMech]
    );
    requestMech_Id = resMech.insertId;

    // Insert Department Library stages for each
    await query(
      `INSERT INTO nodues_stages (request_id, department_name, stage_order, status) VALUES
       (?, 'Department Library', 1, 'Pending'),
       (?, 'Faculty Advisor', 4, 'Locked'),
       (?, 'Department Library', 1, 'Pending'),
       (?, 'Faculty Advisor', 4, 'Locked'),
       (?, 'Department Library', 1, 'Pending'),
       (?, 'HOD', 6, 'Locked')`,
      [requestA_Id, requestA_Id, requestB_Id, requestB_Id, requestMech_Id, requestMech_Id]
    );
  });

  afterAll(async () => {
    await query(`DELETE FROM nodues_stages WHERE request_id IN (?, ?, ?)`, [requestA_Id, requestB_Id, requestMech_Id]);
    await query(`DELETE FROM nodues_requests WHERE id IN (?, ?, ?)`, [requestA_Id, requestB_Id, requestMech_Id]);
    await query(`DELETE FROM students WHERE register_number IN (?, ?, ?)`, [regStudentA, regStudentB, regStudentMech]);
    await query(`DELETE FROM faculty_advisors WHERE employee_id IN (?, ?)`, [fa1EmpId, fa2EmpId]);
    await query(`DELETE FROM hod_profile WHERE employee_id = ?`, [hodEmpId]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [libEmpId]);
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?)`, [regStudentA, regStudentB, regStudentMech, fa1EmpId, fa2EmpId, hodEmpId, libEmpId]);
  });

  describe('Student IDOR Boundaries', () => {
    test('Student A cannot cancel Student B request (Expect 403)', async () => {
      const res = await request(app)
        .post('/api/student/cancel-nodues')
        .set('Authorization', `Bearer ${tokenStudentA}`)
        .send({ requestId: requestB_Id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not own|Access denied/i);
    });

    test('Student A cannot view Student B request audit logs (Expect 403)', async () => {
      const res = await request(app)
        .get(`/api/student/audit-logs/${requestB_Id}`)
        .set('Authorization', `Bearer ${tokenStudentA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Student A can view own request audit logs (Expect 200)', async () => {
      const res = await request(app)
        .get(`/api/student/audit-logs/${requestA_Id}`)
        .set('Authorization', `Bearer ${tokenStudentA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Student cannot access Officer dashboard (Role-based 403)', async () => {
      const res = await request(app)
        .get('/api/hod/dashboard')
        .set('Authorization', `Bearer ${tokenStudentA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Faculty Advisor Advisee Boundaries', () => {
    test('FA 2 cannot access student detail of Advisee assigned to FA 1 (Expect 403)', async () => {
      const res = await request(app)
        .get(`/api/fa/students/${regStudentA}/detail`)
        .set('Authorization', `Bearer ${tokenFA2}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/advisee roster|assigned/i);
    });

    test('FA 1 can access student detail of their own assigned advisee (Expect 200)', async () => {
      const res = await request(app)
        .get(`/api/fa/students/${regStudentA}/detail`)
        .set('Authorization', `Bearer ${tokenFA1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('FA 2 cannot process clearance for Advisee assigned to FA 1 (Expect 403)', async () => {
      const res = await request(app)
        .post('/api/fa/process-nodues')
        .set('Authorization', `Bearer ${tokenFA2}`)
        .send({
          requestId: requestA_Id,
          action: 'Approve',
          remarks: 'Cross-advisee attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Department Officer Scope Boundaries', () => {
    test('IT HOD cannot process clearance for student in Mechanical Department (Expect 403)', async () => {
      const res = await request(app)
        .post('/api/hod/process-nodues')
        .set('Authorization', `Bearer ${tokenHOD_IT}`)
        .send({
          requestId: requestMech_Id,
          action: 'Approve',
          remarks: 'Cross-department approval attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/department|scoped/i);
    });

    test('IT Library Officer cannot process clearance for student in Mechanical Department (Expect 403)', async () => {
      const res = await request(app)
        .post('/api/library/process-nodues')
        .set('Authorization', `Bearer ${tokenLibrary_IT}`)
        .send({
          requestId: requestMech_Id,
          action: 'Approve',
          remarks: 'Cross-department library attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/department|scoped/i);
    });
  });
});
