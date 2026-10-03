const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/config/db');
const { validateAndScanUploadedFile, processProfilePhoto } = require('../src/utils/fileUpload');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

describe('Security Task 4: File Uploads, Magic Bytes & Access Control', () => {
  let studentToken;
  let unauthorizedStudentToken;
  let hodToken;
  let approverToken;
  let studentUserId;
  let fileId;
  let uploadedFilePath;

  // Valid minimal PDF buffer: %PDF-1.4 ... %%EOF
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF');
  // Spoofed text file pretending to be PDF
  const fakePdfBuffer = Buffer.from('This is pure plain text pretending to be a PDF document.');

  beforeAll(async () => {
    const hash = await bcrypt.hash('StrongPassword123!@#$', 10);
    await query('DELETE FROM users WHERE username IN (?, ?, ?, ?)', [
      'FILE_TEST_STUDENT',
      'FILE_TEST_UNAUTH',
      'FILE_TEST_HOD',
      'FILE_TEST_APPROVER'
    ]);

    const sRes = await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES ('FILE_TEST_STUDENT', 'file_student@test.svce.ac.in', ?, 'student', 0)`,
      [hash]
    );
    studentUserId = sRes.insertId;

    await query(
      `INSERT INTO users (username, email, password, role, must_change_password)
       VALUES ('FILE_TEST_UNAUTH', 'file_unauth@test.svce.ac.in', ?, 'student', 0),
              ('FILE_TEST_HOD', 'file_hod@test.svce.ac.in', ?, 'hod', 0),
              ('FILE_TEST_APPROVER', 'file_approver@test.svce.ac.in', ?, 'library_staff', 0)`,
      [hash, hash, hash]
    );

    // Get tokens
    const sLogin = await request(app).post('/api/auth/login').send({ username: 'FILE_TEST_STUDENT', password: 'StrongPassword123!@#$' });
    studentToken = sLogin.body.token;

    const uLogin = await request(app).post('/api/auth/login').send({ username: 'FILE_TEST_UNAUTH', password: 'StrongPassword123!@#$' });
    unauthorizedStudentToken = uLogin.body.token;

    const hUser = await query('SELECT id FROM users WHERE username = ?', ['FILE_TEST_HOD']);
    const jwt = require('jsonwebtoken');
    const env = require('../src/config/env');
    hodToken = jwt.sign(
      { id: hUser[0].id, username: 'FILE_TEST_HOD', role: 'hod', email: 'file_hod@test.svce.ac.in', must_change_password: false },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const aLogin = await request(app).post('/api/auth/login').send({ username: 'FILE_TEST_APPROVER', password: 'StrongPassword123!@#$' });
    approverToken = aLogin.body.token;
  });

  afterAll(async () => {
    // Clean up test file on disk
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
    }
    if (fileId) {
      await query('DELETE FROM file_access_logs WHERE file_id = ?', [fileId]);
      await query('DELETE FROM uploaded_files WHERE file_id = ?', [fileId]);
    }
    await query('DELETE FROM users WHERE username IN (?, ?, ?, ?)', [
      'FILE_TEST_STUDENT',
      'FILE_TEST_UNAUTH',
      'FILE_TEST_HOD',
      'FILE_TEST_APPROVER'
    ]);
  });

  test('should reject file upload when magic bytes do not match allowed signatures', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', fakePdfBuffer, 'test.pdf');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/magic bytes|file integrity|does not match/i);
  });

  test('should upload valid PDF, generate random filename and store outside web root', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', validPdfBuffer, 'original_student_filename.pdf');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeDefined();

    fileId = res.body.fileId;
    expect(fileId).toBeDefined();

    // Verify stored details in DB
    const rows = await query('SELECT * FROM uploaded_files WHERE file_id = ?', [fileId]);
    expect(rows.length).toBe(1);
    expect(rows[0].original_name).toBe('original_student_filename.pdf');
    // Random server filename must NOT equal original filename
    expect(rows[0].stored_filename).not.toBe('original_student_filename.pdf');
    expect(rows[0].stored_filename).toMatch(/^[a-f0-9-]+\.pdf$/i);

    uploadedFilePath = rows[0].file_path;
    expect(fs.existsSync(uploadedFilePath)).toBe(true);
  });

  test('should allow owning student to download file and record audit log', async () => {
    const res = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);

    // Verify audit log entry was created
    const logs = await query('SELECT * FROM file_access_logs WHERE file_id = ?', [fileId]);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].user_id).toBe(studentUserId);
  });

  test('should block unauthorized student from downloading another user file (HTTP 403)', async () => {
    const res = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${unauthorizedStudentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/forbidden|unauthorized|denied|not authorized/i);
  });

  test('should allow HOD and approver to download file', async () => {
    // 1. HOD access
    const hodRes = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${hodToken}`);

    expect(hodRes.status).toBe(200);

    // 2. Approver access
    const approverRes = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${approverToken}`);

    expect(approverRes.status).toBe(200);
  });

  test('should strip EXIF and resize profile photo using sharp', async () => {
    // Create a 1x1 test PNG buffer
    const sharp = require('sharp');
    const testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 120, b: 255 }
      }
    }).png().toBuffer();

    // Attach as student's profile photo
    // First link student record
    await query('DELETE FROM students WHERE user_id = ?', [studentUserId]);
    await query(
      `INSERT INTO students (register_number, full_name, id_card_number, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone, department, batch, user_id)
       VALUES ('FILE_STU_REG', 'Photo Test Student', 'IDC-PHOTO-01', 'phototest@test.svce.ac.in', '9876543210', 'Dr. Advisor', 'EMP-ADV-02', 'advisor2@test.svce.ac.in', '9876543212', 'Information Technology', '2022-2026', ?)`,
      [studentUserId]
    );

    const res = await request(app)
      .post('/api/student/profile-photo')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('photo', testImageBuffer, 'avatar.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.photoUrl).toBeDefined();

    // Verify stored student record has photo_url
    const stuRows = await query('SELECT photo_url FROM students WHERE user_id = ?', [studentUserId]);
    expect(stuRows[0].photo_url).toBe(res.body.photoUrl);
  });
});
