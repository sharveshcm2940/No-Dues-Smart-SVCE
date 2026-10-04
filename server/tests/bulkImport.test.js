const request = require('supertest');
const app = require('../src/server');
const { query, getOne } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');

describe('Phase 3 - Task 2: Bulk Import (CSV) with Validation, Dry-Run & Upsert', () => {
  let adminToken;
  let studentToken;
  const adminUsername = 'ADM_BULK_TEST';
  const studentUsername = 'STU_BULK_TEST';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecureBulkPass123!', 10);

    // Clean up
    await query(`DELETE FROM users WHERE username IN (?, ?)`, [adminUsername, studentUsername]);
    await query(`DELETE FROM students WHERE register_number LIKE 'BULK_STU_%'`);
    await query(`DELETE FROM library_staff WHERE employee_id LIKE 'BULK_STAFF_%'`);
    await query(`DELETE FROM borrow_records WHERE register_number LIKE 'BULK_STU_%'`);

    // Create admin user
    const adminRes = await query(
      `INSERT INTO users (username, email, password, role, is_active, mfa_enabled, must_change_password)
       VALUES (?, 'admin_bulk@svce.ac.in', ?, 'admin', 1, 0, 0)`,
      [adminUsername, passwordHash]
    );
    const adminUserId = adminRes.insertId;

    // Create non-admin student user
    const stuRes = await query(
      `INSERT INTO users (username, email, password, role, is_active, mfa_enabled, must_change_password)
       VALUES (?, 'student_bulk@svce.ac.in', ?, 'student', 1, 0, 0)`,
      [studentUsername, passwordHash]
    );
    const stuUserId = stuRes.insertId;

    adminToken = jwt.sign({ id: adminUserId, username: adminUsername, role: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
    studentToken = jwt.sign({ id: stuUserId, username: studentUsername, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await query(`DELETE FROM users WHERE username IN (?, ?)`, [adminUsername, studentUsername]);
    await query(`DELETE FROM users WHERE username LIKE 'BULK_STU_%' OR username LIKE 'BULK_STAFF_%'`);
    await query(`DELETE FROM students WHERE register_number LIKE 'BULK_STU_%'`);
    await query(`DELETE FROM library_staff WHERE employee_id LIKE 'BULK_STAFF_%'`);
    await query(`DELETE FROM borrow_records WHERE register_number LIKE 'BULK_STU_%'`);
  });

  test('Non-admin user cannot access bulk import endpoints (Expect 403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/bulk-import/template/students')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  test('Admin can download sample CSV templates', async () => {
    for (const type of ['students', 'staff', 'borrow-records']) {
      const res = await request(app)
        .get(`/api/admin/bulk-import/template/${type}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text.length).toBeGreaterThan(20);
    }
  });

  test('Dry-run preview validates student CSV rows and reports errors without inserting', async () => {
    const csvContent = 
`register_number,full_name,department,year,section,email,phone
BULK_STU_001,Valid Student One,Information Technology,IV Year,A,bulk1@svce.ac.in,+91 98401 00001
BULK_STU_002,,Information Technology,IV Year,A,bulk2@svce.ac.in,+91 98401 00002
BULK_STU_003,Invalid Email Student,Information Technology,IV Year,A,not-an-email,+91 98401 00003`;

    const res = await request(app)
      .post('/api/admin/bulk-import/students?dryRun=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent), 'students.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dryRun).toBe(true);
    expect(res.body.totalRows).toBe(3);
    expect(res.body.validCount).toBe(1);
    expect(res.body.errorCount).toBe(2);
    expect(res.body.errors.length).toBe(2);

    // Verify database was NOT mutated
    const dbCheck = await getOne('SELECT COUNT(*) as cnt FROM students WHERE register_number = ?', ['BULK_STU_001']);
    expect(dbCheck.cnt).toBe(0);
  });

  test('Live student import performs idempotent upsert (insert new, update existing)', async () => {
    // 1. Initial import of 2 valid students
    const csvInitial = 
`register_number,full_name,department,year,section,email,phone
BULK_STU_010,Alice Green,Information Technology,IV Year,A,alice@svce.ac.in,+91 98401 11111
BULK_STU_020,Bob Brown,Information Technology,IV Year,B,bob@svce.ac.in,+91 98401 22222`;

    const res1 = await request(app)
      .post('/api/admin/bulk-import/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvInitial), 'students.csv');

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.createdCount).toBe(2);
    expect(res1.body.updatedCount).toBe(0);

    const s1 = await getOne('SELECT full_name, email FROM students WHERE register_number = ?', ['BULK_STU_010']);
    expect(s1.full_name).toBe('Alice Green');

    // 2. Re-import with updated email for Alice and new student Charlie
    const csvUpdate = 
`register_number,full_name,department,year,section,email,phone
BULK_STU_010,Alice Green,Information Technology,IV Year,A,alice.updated@svce.ac.in,+91 98401 11111
BULK_STU_030,Charlie Davis,Information Technology,IV Year,A,charlie@svce.ac.in,+91 98401 33333`;

    const res2 = await request(app)
      .post('/api/admin/bulk-import/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvUpdate), 'students.csv');

    expect(res2.status).toBe(200);
    expect(res2.body.createdCount).toBe(1); // Charlie
    expect(res2.body.updatedCount).toBe(1); // Alice

    const s1Updated = await getOne('SELECT email FROM students WHERE register_number = ?', ['BULK_STU_010']);
    expect(s1Updated.email).toBe('alice.updated@svce.ac.in');
  });

  test('Bulk import borrow records with dry run and execution', async () => {
    const csvBorrow = 
`register_number,student_name,department,book_id,book_title,author,issue_date,due_date,fine_amount,status
BULK_STU_010,Alice Green,Information Technology,BK-9901,Modern Operating Systems,Andrew S Tanenbaum,2026-08-01,2026-08-15,0.00,Returned
BULK_STU_010,Alice Green,Information Technology,BK-9902,Computer Networks,Andrew S Tanenbaum,2026-08-01,2026-08-15,50.00,Active`;

    // 1. Dry run
    const dryRes = await request(app)
      .post('/api/admin/bulk-import/borrow-records?dryRun=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvBorrow), 'borrow.csv');

    expect(dryRes.status).toBe(200);
    expect(dryRes.body.dryRun).toBe(true);
    expect(dryRes.body.validCount).toBe(2);

    // 2. Live import
    const liveRes = await request(app)
      .post('/api/admin/bulk-import/borrow-records')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvBorrow), 'borrow.csv');

    expect(liveRes.status).toBe(200);
    expect(liveRes.body.createdCount).toBe(2);

    const bRecord = await getOne('SELECT fine_amount, status FROM borrow_records WHERE register_number = ? AND book_id = ?', ['BULK_STU_010', 'BK-9902']);
    expect(parseFloat(bRecord.fine_amount)).toBe(50.00);
    expect(bRecord.status).toBe('Active');
  });

  test('Bulk import rejects files exceeding 5MB size limit (Expect 400)', async () => {
    // Generate a buffer larger than 5MB (5.2MB)
    const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024, 'a');

    const res = await request(app)
      .post('/api/admin/bulk-import/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', largeBuffer, 'huge_file.csv');

    expect([400, 413]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});
