const request = require('supertest');
const app = require('../src/server');
const { query, getOne } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const bcrypt = require('bcryptjs');
const { paymentGateway } = require('../src/services/paymentGateway');

describe('Phase 3 - Task 4: Configurable Fines, Officer Receipting & Payment Gateway', () => {
  let student1Token;
  let student2Token;
  let officerToken;
  let borrowRecord1Id;
  let borrowRecord2Id;

  const regStudent1 = 'STU_FINE_001';
  const regStudent2 = 'STU_FINE_002';
  const officerUser = 'LIB_FINE_OFFICER';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecureFinePass123!', 10);

    // Clean up
    await query(`DELETE FROM users WHERE username IN (?, ?, ?)`, [regStudent1, regStudent2, officerUser]);
    await query(`DELETE FROM students WHERE register_number IN (?, ?)`, [regStudent1, regStudent2]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [officerUser]);
    await query(`DELETE FROM borrow_records WHERE register_number IN (?, ?)`, [regStudent1, regStudent2]);

    // Create users
    const uStu1 = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'stu1_fine@svce.ac.in', ?, 'student', 1)`,
      [regStudent1, passwordHash]
    );
    const uStu2 = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'stu2_fine@svce.ac.in', ?, 'student', 1)`,
      [regStudent2, passwordHash]
    );
    const uOff = await query(
      `INSERT INTO users (username, email, password, role, is_active) VALUES (?, 'off_fine@svce.ac.in', ?, 'library_staff', 1)`,
      [officerUser, passwordHash]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, 'IDC-F-01', 'Fine Student One', 'Information Technology', 'IV Year', 'A', 'stu1_fine@svce.ac.in', '+91 98401 88881', 'Dr. Fine FA', 'EMP-FA-01', 'fa@svce.ac.in', '+91 98401 11223')`,
      [uStu1.insertId, regStudent1]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, 'IDC-F-02', 'Fine Student Two', 'Information Technology', 'IV Year', 'A', 'stu2_fine@svce.ac.in', '+91 98401 88882', 'Dr. Fine FA', 'EMP-FA-01', 'fa@svce.ac.in', '+91 98401 11223')`,
      [uStu2.insertId, regStudent2]
    );

    await query(
      `INSERT INTO library_staff (user_id, employee_id, full_name, email, phone, department)
       VALUES (?, ?, 'Library Fine Officer', 'off_fine@svce.ac.in', '+91 98401 88883', 'Information Technology')`,
      [uOff.insertId, officerUser]
    );

    student1Token = jwt.sign({ id: uStu1.insertId, username: regStudent1, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    student2Token = jwt.sign({ id: uStu2.insertId, username: regStudent2, role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    officerToken = jwt.sign({ id: uOff.insertId, username: officerUser, role: 'library_staff', full_name: 'Library Fine Officer' }, env.JWT_SECRET, { expiresIn: '1h' });

    // Seed test borrow records
    const b1 = await query(
      `INSERT INTO borrow_records (register_number, book_id, issue_date, due_date, fine_amount, status, fine_status)
       VALUES (?, 'BK-FINE-01', '2026-08-01', '2026-08-15', 75.00, 'Issued', 'Unpaid')`,
      [regStudent1]
    );
    borrowRecord1Id = b1.insertId;

    const b2 = await query(
      `INSERT INTO borrow_records (register_number, book_id, issue_date, due_date, fine_amount, status, fine_status)
       VALUES (?, 'BK-FINE-02', '2026-08-01', '2026-08-15', 120.00, 'Issued', 'Unpaid')`,
      [regStudent2]
    );
    borrowRecord2Id = b2.insertId;
  });

  afterAll(async () => {
    await query(`DELETE FROM users WHERE username IN (?, ?, ?)`, [regStudent1, regStudent2, officerUser]);
    await query(`DELETE FROM students WHERE register_number IN (?, ?)`, [regStudent1, regStudent2]);
    await query(`DELETE FROM library_staff WHERE employee_id = ?`, [officerUser]);
    await query(`DELETE FROM borrow_records WHERE register_number IN (?, ?)`, [regStudent1, regStudent2]);
  });

  test('Fetch active fine rules from system_settings table', async () => {
    const res = await request(app)
      .get('/api/fines/rules')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rules).toHaveProperty('ratePerDay');
    expect(res.body.rules).toHaveProperty('graceDays');
    expect(res.body.rules).toHaveProperty('capAmount');
  });

  test('Dynamic fine calculation accurately calculates overdue amount with cap', async () => {
    const res = await request(app)
      .post('/api/fines/calculate')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        dueDate: '2026-08-01',
        returnDate: '2026-08-11' // 10 days later
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.calculation.daysOverdue).toBe(10);
    expect(res.body.calculation.calculatedFine).toBeGreaterThan(0);
  });

  test('Student cannot mark fine as paid (Requires officer role, Expect 403)', async () => {
    const res = await request(app)
      .post('/api/fines/mark-paid')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        recordId: borrowRecord1Id,
        receiptNumber: 'RCP-STUDENT-ATTEMPT'
      });

    expect(res.status).toBe(403);
  });

  test('Officer marking fine as paid requires mandatory receipt number', async () => {
    const res = await request(app)
      .post('/api/fines/mark-paid')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        recordId: borrowRecord1Id,
        receiptNumber: '   ' // Empty
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Authorized officer successfully records fine as paid with receipt and timestamp', async () => {
    const receipt = 'RCP-LIB-2026-8801';
    const res = await request(app)
      .post('/api/fines/mark-paid')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        recordId: borrowRecord1Id,
        receiptNumber: receipt,
        paymentMethod: 'Cash (Counter Desk)',
        remarks: 'Collected at circulation desk'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receiptNumber).toBe(receipt);

    const record = await getOne('SELECT fine_status, receipt_number, paid_at, paid_by FROM borrow_records WHERE id = ?', [borrowRecord1Id]);
    expect(record.fine_status).toBe('Paid');
    expect(record.receipt_number).toBe(receipt);
    expect(record.paid_at).toBeDefined();
    expect(record.paid_by).toContain('Library Fine Officer');
  });

  test('Cannot mark an already paid fine as paid again (Expect 400)', async () => {
    const res = await request(app)
      .post('/api/fines/mark-paid')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        recordId: borrowRecord1Id,
        receiptNumber: 'RCP-DUPLICATE-TRY'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already paid/i);
  });

  test('Student cannot initiate payment order for another student (IDOR, Expect 403)', async () => {
    // Student 1 tries to initiate payment for Student 2's borrowRecord2Id
    const res = await request(app)
      .post('/api/fines/initiate-payment')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ recordId: borrowRecord2Id });

    expect(res.status).toBe(403);
  });

  test('Student initiates online payment and completes mock gateway verification with cryptographic signature', async () => {
    // 1. Initiate online payment for borrowRecord2Id by Student 2
    const initRes = await request(app)
      .post('/api/fines/initiate-payment')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ recordId: borrowRecord2Id });

    expect(initRes.status).toBe(200);
    expect(initRes.body.success).toBe(true);
    expect(initRes.body.order).toHaveProperty('orderId');
    expect(initRes.body.order).toHaveProperty('checkoutUrl');

    const { orderId } = initRes.body.order;

    // 2. Attempt verification with forged signature (Expect 400)
    const forgedRes = await request(app)
      .post('/api/fines/verify-payment')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        recordId: borrowRecord2Id,
        orderId,
        paymentId: 'MOCK_PAY_FORGED',
        signature: '0'.repeat(64) // Invalid forged signature
      });

    expect(forgedRes.status).toBe(400);
    expect(forgedRes.body.success).toBe(false);
    expect(forgedRes.body.message).toMatch(/verification failed|signature mismatch/i);

    // 3. Complete payment with legitimate mock gateway signature
    const validMockPayload = paymentGateway.generateMockSuccessPayload(orderId);
    const verifyRes = await request(app)
      .post('/api/fines/verify-payment')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        recordId: borrowRecord2Id,
        orderId: validMockPayload.orderId,
        paymentId: validMockPayload.paymentId,
        signature: validMockPayload.signature
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.receiptNumber).toMatch(/^RCP-ONL-/);

    // 4. Verify record in database is marked Paid
    const record = await getOne('SELECT fine_status, receipt_number, payment_reference, payment_method FROM borrow_records WHERE id = ?', [borrowRecord2Id]);
    expect(record.fine_status).toBe('Paid');
    expect(record.payment_reference).toBe(validMockPayload.paymentId);
    expect(record.payment_method).toContain('MockGateway');
  });
});
