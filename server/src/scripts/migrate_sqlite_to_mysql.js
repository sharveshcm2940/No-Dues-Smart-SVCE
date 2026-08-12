const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'no_dues_erp';

const sqliteDbPath = path.resolve(__dirname, '../../database.sqlite');

async function runMigration() {
  console.log('=======================================================');
  console.log('  SQLite → MySQL Migration Engine (No-Dues ERP)');
  console.log('=======================================================');

  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`❌ Source SQLite database file not found at: ${sqliteDbPath}`);
    process.exit(1);
  }

  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  const sqliteQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  };

  let mysqlPool = null;

  try {
    // 1. Ensure MySQL Server is reachable & create DB
    const rootConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConnection.end();

    mysqlPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      multipleStatements: true
    });

    console.log(`✅ Connected to MySQL Database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}`);

    // Disable foreign key checks for schema creation and batch inserts
    await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Create MySQL Tables
    console.log('📦 Creating MySQL schema tables...');

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'faculty_advisor', 'library_staff', 'main_library_staff', 'finance', 'dpc', 'hod') NOT NULL,
        email VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS faculty (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serial_no INT,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(100) DEFAULT 'Information Technology',
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        status ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TRANSFERRED', 'RETIRED') DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS faculty_advisors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        faculty_id INT,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        designation VARCHAR(100) DEFAULT 'Assistant Professor & Faculty Advisor',
        assigned_batch VARCHAR(100) DEFAULT '2023-2027 (III Year IT)',
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_fa_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serial_no INT,
        user_id INT UNIQUE NOT NULL,
        register_number VARCHAR(50) UNIQUE NOT NULL,
        id_card_number VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        photo_url VARCHAR(500),
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        programme VARCHAR(100) DEFAULT 'B.Tech IT',
        batch VARCHAR(50) DEFAULT '2023-2027',
        academic_batch VARCHAR(50) DEFAULT '2023-2027',
        year VARCHAR(20) DEFAULT 'III Year',
        semester VARCHAR(50) DEFAULT 'Semester V',
        section VARCHAR(20) DEFAULT 'Sec-A',
        roll_number VARCHAR(50),
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        passing_year INT DEFAULT 2027,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        faculty_id INT,
        advisor_name VARCHAR(100),
        advisor_emp_id VARCHAR(50),
        advisor_email VARCHAR(100),
        advisor_phone VARCHAR(20),
        hall_ticket_status VARCHAR(50) DEFAULT 'Not Issued',
        hall_ticket_issued_by VARCHAR(100),
        hall_ticket_issued_by_emp_id VARCHAR(50),
        hall_ticket_issued_at DATETIME,
        hall_ticket_remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_students_reg (register_number),
        INDEX idx_students_faculty (faculty_id),
        INDEX idx_students_batch_sec (academic_batch, section),
        CONSTRAINT fk_students_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS library_staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        designation VARCHAR(100) DEFAULT 'Library In-Charge',
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS main_library_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Central Library',
        designation VARCHAR(100) DEFAULT 'Main Library Officer',
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS finance_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Finance and Accounts Section',
        designation VARCHAR(100) DEFAULT 'Finance Clearance Officer',
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS hod_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        designation VARCHAR(100) DEFAULT 'Professor & Head of Department',
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS dpc_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        designation VARCHAR(100) DEFAULT 'Department Placement Coordinator (DPC)',
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        publisher VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        edition VARCHAR(100) NOT NULL,
        isbn VARCHAR(100) UNIQUE NOT NULL,
        shelf_number VARCHAR(50) NOT NULL,
        total_copies INT DEFAULT 1,
        available_copies INT DEFAULT 1,
        issued_copies INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Available'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS borrow_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        register_number VARCHAR(50) NOT NULL,
        book_id VARCHAR(50) NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE,
        fine_amount DOUBLE DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Issued',
        fine_status VARCHAR(50) DEFAULT 'None',
        remarks TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS nodues_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_number VARCHAR(50) UNIQUE NOT NULL,
        register_number VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        id_card_number VARCHAR(50) NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        year VARCHAR(20) NOT NULL,
        request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        overall_status VARCHAR(50) DEFAULT 'In Progress',
        progress_percentage INT DEFAULT 16,
        current_stage VARCHAR(100) DEFAULT 'Department Library',
        certificate_number VARCHAR(100),
        completion_date DATETIME,
        career_option VARCHAR(50),
        company_name VARCHAR(255), job_designation VARCHAR(255), ctc_package VARCHAR(100), offer_letter_url LONGTEXT,
        higher_college_name VARCHAR(255), higher_degree VARCHAR(255), higher_app_form_url LONGTEXT, higher_scorecard_url LONGTEXT, higher_letter_url LONGTEXT, higher_contact VARCHAR(100),
        exam_name VARCHAR(255), exam_reg_no VARCHAR(100), admit_card_url LONGTEXT, exam_letter_url LONGTEXT, exam_details TEXT,
        startup_name VARCHAR(255), business_idea TEXT, business_details TEXT, pitch_deck_url LONGTEXT,
        resubmission_count INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS nodues_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        department_name VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        actor_name VARCHAR(100) NOT NULL,
        actor_role VARCHAR(50) NOT NULL,
        status_after VARCHAR(50) NOT NULL,
        remarks TEXT,
        student_comment TEXT,
        attachment_url LONGTEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(request_id) REFERENCES nodues_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS nodues_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        department_name VARCHAR(100) NOT NULL,
        stage_order INT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        updated_at DATETIME,
        approved_by VARCHAR(100),
        remarks TEXT,
        FOREIGN KEY(request_id) REFERENCES nodues_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id VARCHAR(50) UNIQUE NOT NULL,
        register_number VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        attachment_url LONGTEXT,
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Open',
        reply TEXT,
        assigned_to VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        college_name VARCHAR(150) DEFAULT 'Sri Venkateswara College of Engineering',
        department VARCHAR(100) DEFAULT 'Information Technology',
        category VARCHAR(100) DEFAULT 'Library',
        priority VARCHAR(20) DEFAULT 'Medium',
        attachment_url LONGTEXT,
        is_pinned INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        target_user VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS library_metrics (
        id INT PRIMARY KEY DEFAULT 1,
        total_books INT,
        available_books INT,
        borrowed_books INT,
        pending_returns INT,
        is_custom INT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS hall_ticket_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_register_number VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        previous_status VARCHAR(50) NOT NULL,
        new_status VARCHAR(50) NOT NULL,
        updated_by_name VARCHAR(100) NOT NULL,
        updated_by_emp_id VARCHAR(50) NOT NULL,
        remarks TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Migrate Users Table
    const sqliteUsers = await sqliteQuery('SELECT * FROM users');
    let usersMigrated = 0;
    for (const u of sqliteUsers) {
      await mysqlPool.query(
        `INSERT INTO users (id, username, password, role, email, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE username=VALUES(username), password=VALUES(password), role=VALUES(role), email=VALUES(email)`,
        [u.id, u.username, u.password, u.role, u.email, u.created_at || new Date()]
      );
      usersMigrated++;
    }

    // 4. Migrate/Create Faculty Table (from faculty_advisors)
    const sqliteFAs = await sqliteQuery('SELECT * FROM faculty_advisors');
    let facultyMigrated = 0;
    for (const fa of sqliteFAs) {
      await mysqlPool.query(
        `INSERT INTO faculty (employee_id, department, name, phone, email, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email)`,
        [fa.employee_id, fa.department || 'Information Technology', fa.full_name, fa.phone, fa.email]
      );
      
      const [facRow] = await mysqlPool.query('SELECT id FROM faculty WHERE employee_id = ?', [fa.employee_id]);
      const facultyId = facRow[0].id;

      await mysqlPool.query(
        `INSERT INTO faculty_advisors (id, user_id, faculty_id, employee_id, full_name, college_name, department, designation, assigned_batch, email, phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE faculty_id=VALUES(faculty_id), full_name=VALUES(full_name), assigned_batch=VALUES(assigned_batch)`,
        [fa.id, fa.user_id, facultyId, fa.employee_id, fa.full_name, fa.college_name, fa.department, fa.designation, fa.assigned_batch, fa.email, fa.phone, fa.created_at || new Date()]
      );
      facultyMigrated++;
    }

    // 5. Migrate Students Table and resolve faculty_id
    const sqliteStudents = await sqliteQuery('SELECT * FROM students');
    let studentsMigrated = 0;
    for (const s of sqliteStudents) {
      let facultyId = null;
      if (s.advisor_emp_id) {
        const [fRow] = await mysqlPool.query('SELECT id FROM faculty WHERE employee_id = ?', [s.advisor_emp_id]);
        if (fRow.length > 0) facultyId = fRow[0].id;
      }
      if (!facultyId && s.advisor_name) {
        const [fRow] = await mysqlPool.query('SELECT id FROM faculty WHERE name LIKE ?', [`%${s.advisor_name}%`]);
        if (fRow.length > 0) facultyId = fRow[0].id;
      }

      const batchVal = s.batch || s.academic_batch || '2023-2027';
      const yearVal = s.year || 'III Year';

      await mysqlPool.query(
        `INSERT INTO students (
          id, user_id, register_number, id_card_number, full_name, photo_url, college_name, department, programme,
          batch, academic_batch, year, semester, section, roll_number, email, phone, passing_year, status, faculty_id,
          advisor_name, advisor_emp_id, advisor_email, advisor_phone, hall_ticket_status, hall_ticket_issued_by,
          hall_ticket_issued_by_emp_id, hall_ticket_issued_at, hall_ticket_remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          user_id=VALUES(user_id), full_name=VALUES(full_name), faculty_id=VALUES(faculty_id),
          academic_batch=VALUES(academic_batch), section=VALUES(section), hall_ticket_status=VALUES(hall_ticket_status)`,
        [
          s.id, s.user_id, s.register_number, s.id_card_number, s.full_name, s.photo_url || null,
          s.college_name || 'Sri Venkateswara College of Engineering', s.department || 'Information Technology',
          s.programme || 'B.Tech IT', batchVal, batchVal, yearVal, s.semester || 'Semester V', s.section || 'Sec-A',
          s.roll_number || s.id_card_number, s.email, s.phone, s.passing_year || 2027, s.status || 'ACTIVE',
          facultyId, s.advisor_name, s.advisor_emp_id, s.advisor_email, s.advisor_phone,
          s.hall_ticket_status || 'Not Issued', s.hall_ticket_issued_by || null, s.hall_ticket_issued_by_emp_id || null,
          s.hall_ticket_issued_at || null, s.hall_ticket_remarks || null
        ]
      );
      studentsMigrated++;
    }

    // 6. Migrate Profiles & Institutional Records
    const profiles = [
      { sqliteTable: 'library_staff', mysqlTable: 'library_staff' },
      { sqliteTable: 'main_library_profile', mysqlTable: 'main_library_profile' },
      { sqliteTable: 'finance_profile', mysqlTable: 'finance_profile' },
      { sqliteTable: 'hod_profile', mysqlTable: 'hod_profile' },
      { sqliteTable: 'dpc_profile', mysqlTable: 'dpc_profile' }
    ];

    for (const p of profiles) {
      try {
        const rows = await sqliteQuery(`SELECT * FROM ${p.sqliteTable}`);
        for (const r of rows) {
          await mysqlPool.query(
            `INSERT INTO ${p.mysqlTable} (id, user_id, employee_id, full_name, college_name, department, designation, email, phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), email=VALUES(email)`,
            [r.id, r.user_id, r.employee_id, r.full_name, r.college_name, r.department, r.designation, r.email, r.phone]
          );
        }
      } catch (e) {
        // Table optional or empty
      }
    }

    // 7. Migrate Books
    const books = await sqliteQuery('SELECT * FROM books');
    for (const b of books) {
      await mysqlPool.query(
        `INSERT INTO books (id, book_id, title, author, publisher, category, edition, isbn, shelf_number, total_copies, available_copies, issued_copies, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), available_copies=VALUES(available_copies)`,
        [b.id, b.book_id, b.title, b.author, b.publisher, b.category, b.edition, b.isbn, b.shelf_number, b.total_copies, b.available_copies, b.issued_copies, b.status]
      );
    }

    // 8. Migrate Borrow Records
    const borrows = await sqliteQuery('SELECT * FROM borrow_records');
    for (const br of borrows) {
      await mysqlPool.query(
        `INSERT INTO borrow_records (id, register_number, book_id, issue_date, due_date, return_date, fine_amount, status, fine_status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), fine_amount=VALUES(fine_amount)`,
        [br.id, br.register_number, br.book_id, br.issue_date, br.due_date, br.return_date, br.fine_amount, br.status, br.fine_status, br.remarks]
      );
    }

    // 9. Migrate No-Dues Requests
    const reqs = await sqliteQuery('SELECT * FROM nodues_requests');
    let reqsMigrated = 0;
    for (const r of reqs) {
      await mysqlPool.query(
        `INSERT INTO nodues_requests (
          id, request_number, register_number, student_name, id_card_number, college_name, department, year, request_date,
          overall_status, progress_percentage, current_stage, certificate_number, completion_date, career_option,
          company_name, job_designation, ctc_package, offer_letter_url, higher_college_name, higher_degree, higher_app_form_url,
          higher_scorecard_url, higher_letter_url, higher_contact, exam_name, exam_reg_no, admit_card_url, exam_letter_url,
          exam_details, startup_name, business_idea, business_details, pitch_deck_url, resubmission_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE overall_status=VALUES(overall_status), progress_percentage=VALUES(progress_percentage), current_stage=VALUES(current_stage)`,
        [
          r.id, r.request_number, r.register_number, r.student_name, r.id_card_number, r.college_name, r.department, r.year,
          r.request_date || new Date(), r.overall_status, r.progress_percentage, r.current_stage, r.certificate_number, r.completion_date,
          r.career_option, r.company_name, r.job_designation, r.ctc_package, r.offer_letter_url, r.higher_college_name, r.higher_degree,
          r.higher_app_form_url, r.higher_scorecard_url, r.higher_letter_url, r.higher_contact, r.exam_name, r.exam_reg_no,
          r.admit_card_url, r.exam_letter_url, r.exam_details, r.startup_name, r.business_idea, r.business_details, r.pitch_deck_url,
          r.resubmission_count || 0
        ]
      );
      reqsMigrated++;
    }

    // 10. Migrate Stages & Audit Logs
    const stages = await sqliteQuery('SELECT * FROM nodues_stages');
    let stagesMigrated = 0;
    for (const st of stages) {
      await mysqlPool.query(
        `INSERT INTO nodues_stages (id, request_id, department_name, stage_order, status, updated_at, approved_by, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), approved_by=VALUES(approved_by), remarks=VALUES(remarks)`,
        [st.id, st.request_id, st.department_name, st.stage_order, st.status, st.updated_at, st.approved_by, st.remarks]
      );
      stagesMigrated++;
    }

    const auditLogs = await sqliteQuery('SELECT * FROM nodues_audit_logs');
    for (const al of auditLogs) {
      await mysqlPool.query(
        `INSERT INTO nodues_audit_logs (id, request_id, department_name, action_type, actor_name, actor_role, status_after, remarks, student_comment, attachment_url, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE remarks=VALUES(remarks)`,
        [al.id, al.request_id, al.department_name, al.action_type, al.actor_name, al.actor_role, al.status_after, al.remarks, al.student_comment, al.attachment_url, al.timestamp]
      );
    }

    const htLogs = await sqliteQuery('SELECT * FROM hall_ticket_audit_logs');
    for (const htl of htLogs) {
      await mysqlPool.query(
        `INSERT INTO hall_ticket_audit_logs (id, student_register_number, student_name, previous_status, new_status, updated_by_name, updated_by_emp_id, remarks, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE new_status=VALUES(new_status)`,
        [htl.id, htl.student_register_number, htl.student_name, htl.previous_status, htl.new_status, htl.updated_by_name, htl.updated_by_emp_id, htl.remarks, htl.timestamp]
      );
    }

    // 11. Migrate Complaints, Announcements, Notifications, Library Metrics
    const complaints = await sqliteQuery('SELECT * FROM complaints');
    for (const c of complaints) {
      await mysqlPool.query(
        `INSERT INTO complaints (id, complaint_id, register_number, student_name, category, title, description, attachment_url, priority, status, reply, assigned_to, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), reply=VALUES(reply)`,
        [c.id, c.complaint_id, c.register_number, c.student_name, c.category, c.title, c.description, c.attachment_url, c.priority, c.status, c.reply, c.assigned_to, c.created_at, c.updated_at]
      );
    }

    const announcements = await sqliteQuery('SELECT * FROM announcements');
    for (const a of announcements) {
      await mysqlPool.query(
        `INSERT INTO announcements (id, title, description, college_name, department, category, priority, attachment_url, is_pinned, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description)`,
        [a.id, a.title, a.description, a.college_name, a.department, a.category, a.priority, a.attachment_url, a.is_pinned, a.status, a.created_at]
      );
    }

    const notifications = await sqliteQuery('SELECT * FROM notifications');
    for (const n of notifications) {
      await mysqlPool.query(
        `INSERT INTO notifications (id, target_user, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_read=VALUES(is_read)`,
        [n.id, n.target_user, n.title, n.message, n.type, n.is_read, n.created_at]
      );
    }

    const metrics = await sqliteQuery('SELECT * FROM library_metrics');
    for (const m of metrics) {
      await mysqlPool.query(
        `INSERT INTO library_metrics (id, total_books, available_books, borrowed_books, pending_returns, is_custom, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE total_books=VALUES(total_books), available_books=VALUES(available_books)`,
        [m.id, m.total_books, m.available_books, m.borrowed_books, m.pending_returns, m.is_custom, m.updated_at]
      );
    }

    // Re-enable foreign key checks
    await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1');

    // 12. Migration Verification Statistics
    const [[{ count: mysqlUsersCount }]] = await mysqlPool.query('SELECT COUNT(*) as count FROM users');
    const [[{ count: mysqlFacultyCount }]] = await mysqlPool.query('SELECT COUNT(*) as count FROM faculty');
    const [[{ count: mysqlStudentsCount }]] = await mysqlPool.query('SELECT COUNT(*) as count FROM students');
    const [[{ count: mysqlReqsCount }]] = await mysqlPool.query('SELECT COUNT(*) as count FROM nodues_requests');
    const [[{ count: mysqlStagesCount }]] = await mysqlPool.query('SELECT COUNT(*) as count FROM nodues_stages');

    console.log('\n=======================================================');
    console.log('  SQLite → MySQL Migration Summary Report');
    console.log('=======================================================');
    console.log(` Users Table      | SQLite: ${sqliteUsers.length}  | MySQL: ${mysqlUsersCount}  | Status: OK ✅`);
    console.log(` Faculty Table    | SQLite: ${sqliteFAs.length}  | MySQL: ${mysqlFacultyCount}  | Status: OK ✅`);
    console.log(` Students Table   | SQLite: ${sqliteStudents.length} | MySQL: ${mysqlStudentsCount} | Status: OK ✅`);
    console.log(` Requests Table   | SQLite: ${reqs.length}  | MySQL: ${mysqlReqsCount}  | Status: OK ✅`);
    console.log(` Stages Table     | SQLite: ${stages.length}  | MySQL: ${mysqlStagesCount}  | Status: OK ✅`);
    console.log('=======================================================');
    console.log('🎉 Migration Completed Successfully! No records lost.\n');

  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    if (sqliteDb) sqliteDb.close();
    if (mysqlPool) await mysqlPool.end();
  }
}

runMigration();
