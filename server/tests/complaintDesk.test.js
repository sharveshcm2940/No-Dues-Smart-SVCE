const request = require('supertest');
const app = require('../src/server');
const { query, getOne } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');

describe('Phase 3 - Task 5: Complaint Desk with Routing, Assignee, Status History & Access Control', () => {
  let studentAToken;
  let studentBToken;
  let libOfficerToken;
  let dpcOfficerToken;
  let adminToken;
  let uLibId;

  const regStudentA = 'STU_CMP_A';
  const regStudentB = 'STU_CMP_B';
  const libOfficer = 'LIB_CMP_OFFICER';
  const dpcOfficer = 'DPC_CMP_OFFICER';
  const adminUser = 'ADMIN_CMP_SUPER';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecureCmpPass123!', 10);

    // Clean up
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?, ?)`, [regStudentA, regStudentB, libOfficer, dpcOfficer, adminUser]);
    await query(`DELETE FROM students WHERE register_number IN (?, ?)`, [regStudentA, regStudentB]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [libOfficer]);
    await query(`DELETE FROM dpc_profile WHERE employee_id = ?`, [dpcOfficer]);
    await query(`DELETE FROM complaints WHERE register_number IN (?, ?)`, [regStudentA, regStudentB]);

    // Create users
    const uA = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'cmpa@svce.ac.in', ?, 'student', 1)`,
      [regStudentA, passwordHash]
    );
    const uB = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'cmpb@svce.ac.in', ?, 'student', 1)`,
      [regStudentB, passwordHash]
    );
    const uLib = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'cmplib@svce.ac.in', ?, 'library_staff', 1)`,
      [libOfficer, passwordHash]
    );
    uLibId = uLib.insertId;

    const uDpc = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'cmpdpc@svce.ac.in', ?, 'dpc', 1)`,
      [dpcOfficer, passwordHash]
    );
    const uAdm = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'cmpadm@svce.ac.in', ?, 'admin', 1)`,
      [adminUser, passwordHash]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, 'IDC-CMP-A', 'Complaint Student A', 'Information Technology', 'IV Year', 'A', 'cmpa@svce.ac.in', '+91 98401 77771', 'Dr. FA', 'EMP-01', 'fa@svce.ac.in', '+91 98401 11223')`,
      [uA.insertId, regStudentA]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, 'IDC-CMP-B', 'Complaint Student B', 'Information Technology', 'IV Year', 'B', 'cmpb@svce.ac.in', '+91 98401 77772', 'Dr. FA', 'EMP-01', 'fa@svce.ac.in', '+91 98401 11223')`,
      [uB.insertId, regStudentB]
    );

    await query(
      `INSERT INTO library_staff (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Library Desk Officer', 'cmplib@svce.ac.in', '+91 98401 77773', 'Information Technology')`,
      [uLib.insertId, libOfficer]
    );

    await query(
      `INSERT INTO dpc_profile (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'DPC Desk Officer', 'cmpdpc@svce.ac.in', '+91 98401 77774', 'Information Technology')`,
      [uDpc.insertId, dpcOfficer]
    );

    studentAToken = jwt.sign({ id: uA.insertId, username: regStudentA, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    studentBToken = jwt.sign({ id: uB.insertId, username: regStudentB, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    libOfficerToken = jwt.sign({ id: uLib.insertId, username: libOfficer, role: 'library_staff', full_name: 'Library Desk Officer' }, env.JWT_SECRET, { expiresIn: '1h' });
    dpcOfficerToken = jwt.sign({ id: uDpc.insertId, username: dpcOfficer, role: 'dpc', full_name: 'DPC Desk Officer' }, env.JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: uAdm.insertId, username: adminUser, role: 'admin', full_name: 'Admin Desk Officer' }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await query(`DELETE FROM complaints WHERE register_number IN (?, ?)`, [regStudentA, regStudentB]);
    await query(`DELETE FROM users WHERE username IN (?, ?, ?, ?, ?)`, [regStudentA, regStudentB, libOfficer, dpcOfficer, adminUser]);
    await query(`DELETE FROM students WHERE register_number IN (?, ?)`, [regStudentA, regStudentB]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [libOfficer]);
    await query(`DELETE FROM dpc_profile WHERE employee_id = ?`, [dpcOfficer]);
  });

  let complaintAId;

  test('Student files complaint: Category routes ticket to correct department and records initial status history', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        category: 'Department Library Books',
        title: 'Discrepancy in overdue book records',
        description: 'Book was returned on 10th August but still appears as unreturned in the system.',
        priority: 'High'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.routedDepartment).toBe('Department Library');
    expect(res.body.id).toBeDefined();

    complaintAId = res.body.id;

    // Check status history entry created
    const history = await query('SELECT * FROM complaint_status_history WHERE complaint_id = ?', [complaintAId]);
    expect(history.length).toBe(1);
    expect(history[0].new_status).toBe('Open');
  });

  test('Access Control: Student B cannot view Student A complaint details (IDOR, Expect 403)', async () => {
    const res = await request(app)
      .get(`/api/complaints/${complaintAId}`)
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Access Control: Cross-department officer cannot view ticket routed to another department (Expect 403)', async () => {
    // DPC officer tries to view Department Library complaint
    const res = await request(app)
      .get(`/api/complaints/${complaintAId}`)
      .set('Authorization', `Bearer ${dpcOfficerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Authorized department officer can view department complaint details and status history', async () => {
    const res = await request(app)
      .get(`/api/complaints/${complaintAId}`)
      .set('Authorization', `Bearer ${libOfficerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint.id).toBe(complaintAId);
    expect(Array.isArray(res.body.statusHistory)).toBe(true);
    expect(res.body.statusHistory.length).toBeGreaterThan(0);
  });

  test('Admin has institutional overview and can view any complaint ticket', async () => {
    const res = await request(app)
      .get(`/api/complaints/${complaintAId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint.id).toBe(complaintAId);
  });

  test('Cross-department officer cannot reassign ticket of another department (Expect 403)', async () => {
    const res = await request(app)
      .put(`/api/complaints/${complaintAId}/assign`)
      .set('Authorization', `Bearer ${dpcOfficerToken}`)
      .send({
        assigneeUserId: uLibId,
        assigneeName: 'Library Staff Assigned',
        assigneeRole: 'library_staff'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Authorized officer assigns complaint to staff member, transitioning status to In Progress', async () => {
    const res = await request(app)
      .put(`/api/complaints/${complaintAId}/assign`)
      .set('Authorization', `Bearer ${libOfficerToken}`)
      .send({
        assigneeUserId: uLibId,
        assigneeName: 'Library Desk Officer',
        assigneeRole: 'library_staff',
        remarks: 'Assigned to head librarian for circulation register check.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cmp = await getOne('SELECT status, assigned_to, assigned_to_user_id FROM complaints WHERE id = ?', [complaintAId]);
    expect(cmp.status).toBe('In Progress');
    expect(cmp.assigned_to).toBe('Library Desk Officer');
    expect(cmp.assigned_to_user_id).toBe(uLibId);

    // Verify history recorded
    const history = await query('SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY id ASC', [complaintAId]);
    expect(history.length).toBe(2);
    expect(history[1].new_status).toBe('In Progress');
  });

  test('Officer resolves complaint with reply, setting resolved_at timestamp and updating history', async () => {
    const resolutionReply = 'Circulation record verified. The return date has been updated and the fine reversed.';
    const res = await request(app)
      .put(`/api/complaints/${complaintAId}/status`)
      .set('Authorization', `Bearer ${libOfficerToken}`)
      .send({
        status: 'Resolved',
        reply: resolutionReply,
        remarks: 'Verified physical token in circulation register.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cmp = await getOne('SELECT status, reply, resolved_at FROM complaints WHERE id = ?', [complaintAId]);
    expect(cmp.status).toBe('Resolved');
    expect(cmp.reply).toBe(resolutionReply);
    expect(cmp.resolved_at).not.toBeNull();

    // Verify history now has 3 steps: Open -> In Progress -> Resolved
    const history = await query('SELECT old_status, new_status FROM complaint_status_history WHERE complaint_id = ? ORDER BY id ASC', [complaintAId]);
    expect(history.length).toBe(3);
    expect(history[2].old_status).toBe('In Progress');
    expect(history[2].new_status).toBe('Resolved');

    // Student A can view their resolved complaint and the resolution reply
    const studentView = await request(app)
      .get(`/api/complaints/${complaintAId}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(studentView.status).toBe(200);
    expect(studentView.body.complaint.status).toBe('Resolved');
    expect(studentView.body.complaint.reply).toBe(resolutionReply);
    expect(studentView.body.statusHistory.length).toBe(3);
  });
});
