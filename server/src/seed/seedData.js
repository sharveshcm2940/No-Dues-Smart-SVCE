const { query, getOne } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('SVCE ERP: Initializing MySQL database schema and verifying tables...');

  // Disable foreign keys temporarily for migrations
  await query('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Users Table
  await query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty_advisor', 'library_staff', 'main_library_staff', 'finance', 'dpc', 'hod') NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 2. Faculty Table (Master Faculty Roster)
  await query(`CREATE TABLE IF NOT EXISTS faculty (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 3. Faculty Advisors Table
  await query(`CREATE TABLE IF NOT EXISTS faculty_advisors (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 4. Students Table
  await query(`CREATE TABLE IF NOT EXISTS students (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 5. Institutional Profiles & Role Tables
  await query(`CREATE TABLE IF NOT EXISTS library_staff (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS main_library_profile (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS finance_profile (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS hod_profile (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS dpc_profile (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 6. Books & Borrow Records
  await query(`CREATE TABLE IF NOT EXISTS books (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS borrow_records (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // 7. No-Dues Requests & Audit Logs
  await query(`CREATE TABLE IF NOT EXISTS nodues_requests (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS nodues_audit_logs (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS nodues_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    updated_at DATETIME,
    approved_by VARCHAR(100),
    remarks TEXT,
    FOREIGN KEY(request_id) REFERENCES nodues_requests(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS complaints (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS announcements (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_user VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS library_metrics (
    id INT PRIMARY KEY DEFAULT 1,
    total_books INT,
    available_books INT,
    borrowed_books INT,
    pending_returns INT,
    is_custom INT DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS hall_ticket_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_register_number VARCHAR(50) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    updated_by_name VARCHAR(100) NOT NULL,
    updated_by_emp_id VARCHAR(50) NOT NULL,
    remarks TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Re-enable foreign key checks
  await query('SET FOREIGN_KEY_CHECKS = 1');

  // Check if initial users exist
  const existingUsers = await getOne('SELECT COUNT(*) as count FROM users');
  if (existingUsers && existingUsers.count > 0) {
    console.log(`SVCE ERP: MySQL database contains ${existingUsers.count} user(s). Initial schema active ✅`);
    return;
  }

  console.log('SVCE ERP: Fresh database detected. Seeding initial institutional records...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // HOD
  const hodUser = await query(`INSERT IGNORE INTO users (username,password,role,email) VALUES (?,?,?,?)`,['EMP-HOD-IT-01',passwordHash,'hod','vidhya.v@svce.ac.in']);
  await query(`INSERT IGNORE INTO hod_profile (user_id,employee_id,full_name,college_name,department,designation,email,phone) VALUES (?,?,?,?,?,?,?,?)`,[hodUser.lastID || 1,'EMP-HOD-IT-01','Dr V Vidhya','Sri Venkateswara College of Engineering','Information Technology','Professor & Head of Department','vidhya.v@svce.ac.in','+91 94440 12345']);

  // DPC
  const dpcUser = await query(`INSERT IGNORE INTO users (username,password,role,email) VALUES (?,?,?,?)`,['EMP-DPC-IT-01',passwordHash,'dpc','dpc.it@svce.ac.in']);
  await query(`INSERT IGNORE INTO dpc_profile (user_id,employee_id,full_name,college_name,department,designation,email,phone) VALUES (?,?,?,?,?,?,?,?)`,[dpcUser.lastID || 2,'EMP-DPC-IT-01','Dr. R. Placement Coordinator','Sri Venkateswara College of Engineering','Information Technology','Department Placement Coordinator (DPC)','dpc.it@svce.ac.in','+91 94455 11223']);

  // Library Staff (Dept Library)
  const libUser = await query(`INSERT IGNORE INTO users (username,password,role,email) VALUES (?,?,?,?)`,['EMP-LIB-IT-01',passwordHash,'library_staff','sivakumar.e@svce.ac.in']);
  await query(`INSERT IGNORE INTO library_staff (user_id,employee_id,full_name,college_name,department,designation,email,phone) VALUES (?,?,?,?,?,?,?,?)`,[libUser.lastID || 3,'EMP-LIB-IT-01','Sivakumar E','Sri Venkateswara College of Engineering','Information Technology','Library In-Charge','sivakumar.e@svce.ac.in','+91 94450 99887']);

  // Main Library Staff (Central Library)
  const mlibUser = await query(`INSERT IGNORE INTO users (username,password,role,email) VALUES (?,?,?,?)`,['EMP-MLIB-IT-01',passwordHash,'main_library_staff','mohan.kumar@svce.ac.in']);
  await query(`INSERT IGNORE INTO main_library_profile (user_id,employee_id,full_name,college_name,department,designation,email,phone) VALUES (?,?,?,?,?,?,?,?)`,[mlibUser.lastID || 4,'EMP-MLIB-IT-01','Mohan Kumar S','Sri Venkateswara College of Engineering','Central Library','Main Library Officer','mohan.kumar@svce.ac.in','+91 94450 11224']);

  // Finance Officer
  const finUser = await query(`INSERT IGNORE INTO users (username,password,role,email) VALUES (?,?,?,?)`,['EMP-FIN-IT-01',passwordHash,'finance','gurusamy.m@svce.ac.in']);
  await query(`INSERT IGNORE INTO finance_profile (user_id,employee_id,full_name,college_name,department,designation,email,phone) VALUES (?,?,?,?,?,?,?,?)`,[finUser.lastID || 5,'EMP-FIN-IT-01','Gurusamy M','Sri Venkateswara College of Engineering','Finance and Accounts Section','Finance Clearance Officer','gurusamy.m@svce.ac.in','+91 94440 22336']);

  // Faculty Advisors & Master Faculty Roster
  const faList = [
    {empId:'EMP-FA-IT-01',name:'V Praveenkumar',email:'praveenkumar.v@svce.ac.in',batch:'2023-2027 (III Year IT-B)',phone:'+91 98401 11223'},
    {empId:'EMP-FA-IT-02',name:'N.Selvaganesh',  email:'selvaganesh.n@svce.ac.in',  batch:'2023-2027 (III Year IT-B)',phone:'+91 98402 22334'},
    {empId:'EMP-FA-IT-03',name:'V.Ranjith',      email:'ranjith.v@svce.ac.in',      batch:'2023-2027 (III Year IT-A)',phone:'+91 98403 33445'},
    {empId:'EMP-FA-IT-04',name:'S.Kavishree',    email:'kavishree.s@svce.ac.in',    batch:'2023-2027 (III Year IT-A)',phone:'+91 98404 44556'},
  ];

  for (const fa of faList) {
    // 1. Insert into Master Faculty Roster
    const facRes = await query(`INSERT IGNORE INTO faculty (employee_id, department, name, phone, email, status) VALUES (?,?,?,?,?,?)`, [fa.empId, 'Information Technology', fa.name, fa.phone, fa.email, 'ACTIVE']);
    const facRow = await getOne('SELECT id FROM faculty WHERE employee_id = ?', [fa.empId]);
    const facultyId = facRow ? facRow.id : facRes.lastID;

    // 2. Insert into Users & Faculty Advisors
    const fUser = await query(`INSERT IGNORE INTO users (username,password,role,email) VALUES (?,?,?,?)`,[fa.empId,passwordHash,'faculty_advisor',fa.email]);
    await query(`INSERT IGNORE INTO faculty_advisors (user_id,faculty_id,employee_id,full_name,college_name,department,designation,assigned_batch,email,phone) VALUES (?,?,?,?,?,?,?,?,?,?)`,[fUser.lastID || facultyId,facultyId,fa.empId,fa.name,'Sri Venkateswara College of Engineering','Information Technology','Assistant Professor & Faculty Advisor',fa.batch,fa.email,fa.phone]);
  }

  console.log('SVCE ERP: Initial MySQL database structure ready ✅');
}

module.exports = { seedDatabase };
