const { db, query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('Initializing SVCE database schema with complete 3rd Year B.Tech IT advisee rosters (98 Students across 4 Faculty Advisors)...');

  // Drop old tables to apply fresh seed data cleanly
  await query('DROP TABLE IF EXISTS users');
  await query('DROP TABLE IF EXISTS students');
  await query('DROP TABLE IF EXISTS library_staff');
  await query('DROP TABLE IF EXISTS faculty_advisors');
  await query('DROP TABLE IF EXISTS hod_profile');
  await query('DROP TABLE IF EXISTS books');
  await query('DROP TABLE IF EXISTS borrow_records');
  await query('DROP TABLE IF EXISTS nodues_requests');
  await query('DROP TABLE IF EXISTS nodues_stages');
  await query('DROP TABLE IF EXISTS complaints');
  await query('DROP TABLE IF EXISTS announcements');
  await query('DROP TABLE IF EXISTS notifications');

  // Create Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'library_staff', 'faculty_advisor', 'hod')),
      email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Students Profile table
  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      register_number TEXT UNIQUE NOT NULL,
      id_card_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      photo_url TEXT,
      college_name TEXT DEFAULT 'Sri Venkateswara College of Engineering',
      department TEXT DEFAULT 'Information Technology',
      programme TEXT DEFAULT 'B.Tech IT',
      batch TEXT DEFAULT '2023-2027',
      year TEXT DEFAULT 'III Year',
      semester TEXT DEFAULT 'Semester V',
      section TEXT DEFAULT 'Sec-A',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      advisor_name TEXT NOT NULL,
      advisor_emp_id TEXT NOT NULL,
      advisor_email TEXT NOT NULL,
      advisor_phone TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create Library Staff Profile table
  await query(`
    CREATE TABLE IF NOT EXISTS library_staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      college_name TEXT DEFAULT 'Sri Venkateswara College of Engineering',
      department TEXT DEFAULT 'Information Technology',
      designation TEXT DEFAULT 'Library In-Charge',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create Faculty Advisor Profile table
  await query(`
    CREATE TABLE IF NOT EXISTS faculty_advisors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      college_name TEXT DEFAULT 'Sri Venkateswara College of Engineering',
      department TEXT DEFAULT 'Information Technology',
      designation TEXT DEFAULT 'Assistant Professor & Faculty Advisor',
      assigned_batch TEXT DEFAULT '2023-2027 (III Year IT)',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create HOD Profile table
  await query(`
    CREATE TABLE IF NOT EXISTS hod_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      college_name TEXT DEFAULT 'Sri Venkateswara College of Engineering',
      department TEXT DEFAULT 'Information Technology',
      designation TEXT DEFAULT 'Professor & Head of Department',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create Books Catalog table
  await query(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT NOT NULL,
      category TEXT NOT NULL,
      edition TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      shelf_number TEXT NOT NULL,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1,
      issued_copies INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Available'
    )
  `);

  // Create Borrow Records table
  await query(`
    CREATE TABLE IF NOT EXISTS borrow_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      register_number TEXT NOT NULL,
      book_id TEXT NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      return_date DATE,
      fine_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Issued',
      fine_status TEXT DEFAULT 'None'
    )
  `);

  // Create No-Dues Requests table
  await query(`
    CREATE TABLE IF NOT EXISTS nodues_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number TEXT UNIQUE NOT NULL,
      register_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      id_card_number TEXT NOT NULL,
      college_name TEXT DEFAULT 'Sri Venkateswara College of Engineering',
      department TEXT DEFAULT 'Information Technology',
      year TEXT NOT NULL,
      request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      overall_status TEXT DEFAULT 'In Progress',
      progress_percentage INTEGER DEFAULT 16,
      current_stage TEXT DEFAULT 'Department Library',
      certificate_number TEXT,
      completion_date DATETIME
    )
  `);

  // Create Multi-Department Request Tracking Stages table
  await query(`
    CREATE TABLE IF NOT EXISTS nodues_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      department_name TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      status TEXT DEFAULT 'Pending',
      updated_at DATETIME,
      approved_by TEXT,
      remarks TEXT,
      FOREIGN KEY(request_id) REFERENCES nodues_requests(id)
    )
  `);

  // Create Complaints table
  await query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT UNIQUE NOT NULL,
      register_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      attachment_url TEXT,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Open',
      reply TEXT,
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Announcements table
  await query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      college_name TEXT DEFAULT 'Sri Venkateswara College of Engineering',
      department TEXT DEFAULT 'Information Technology',
      category TEXT DEFAULT 'Library',
      priority TEXT DEFAULT 'Medium',
      attachment_url TEXT,
      is_pinned INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Audit Logs & Notifications table
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // HASH PASSWORD FOR DEFAULT ACCOUNTS
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. HOD LOGIN: Dr V Vidhya (EMP-HOD-IT-01)
  const hodUser = await query(
    `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
    ['EMP-HOD-IT-01', passwordHash, 'hod', 'vidhya.v@svce.ac.in']
  );
  await query(
    `INSERT INTO hod_profile (user_id, employee_id, full_name, college_name, department, designation, email, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hodUser.lastID,
      'EMP-HOD-IT-01',
      'Dr V Vidhya',
      'Sri Venkateswara College of Engineering',
      'Information Technology',
      'Professor & Head of Department',
      'vidhya.v@svce.ac.in',
      '+91 94440 12345'
    ]
  );

  // 2. DEPARTMENT LIBRARY LOGIN: Sivakumar E (EMP-LIB-IT-01)
  const libUser = await query(
    `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
    ['EMP-LIB-IT-01', passwordHash, 'library_staff', 'sivakumar.e@svce.ac.in']
  );
  await query(
    `INSERT INTO library_staff (user_id, employee_id, full_name, college_name, department, designation, email, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      libUser.lastID,
      'EMP-LIB-IT-01',
      'Sivakumar E',
      'Sri Venkateswara College of Engineering',
      'Information Technology',
      'Library In-Charge',
      'sivakumar.e@svce.ac.in',
      '+91 94450 99887'
    ]
  );

  // 3. FACULTY ADVISORS LOGINS
  const faList = [
    { empId: 'EMP-FA-IT-01', name: 'V.Praveen Kumar', email: 'praveenkumar.v@svce.ac.in', batch: '2023-2027 (III Year IT-B)', phone: '+91 98401 11223' },
    { empId: 'EMP-FA-IT-02', name: 'N.Selvaganesh', email: 'selvaganesh.n@svce.ac.in', batch: '2023-2027 (III Year IT-B)', phone: '+91 98402 22334' },
    { empId: 'EMP-FA-IT-03', name: 'V.Ranjith', email: 'ranjith.v@svce.ac.in', batch: '2023-2027 (III Year IT-A)', phone: '+91 98403 33445' },
    { empId: 'EMP-FA-IT-04', name: 'S.Kavishree', email: 'kavishree.s@svce.ac.in', batch: '2023-2027 (III Year IT-A)', phone: '+91 98404 44556' },
  ];

  for (const fa of faList) {
    const fUser = await query(
      `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
      [fa.empId, passwordHash, 'faculty_advisor', fa.email]
    );
    await query(
      `INSERT INTO faculty_advisors (user_id, employee_id, full_name, college_name, department, designation, assigned_batch, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fUser.lastID, fa.empId, fa.name, 'Sri Venkateswara College of Engineering', 'Information Technology', 'Assistant Professor & Faculty Advisor', fa.batch, fa.email, fa.phone]
    );
  }

  // 4. STUDENTS UNDER FACULTY ADVISOR V. RANJITH (3rd Year IT-A: Rolls 1 to 24 & 301)
  const ranjithAdvisees = [
    { roll: '1', name: 'Abinaya', reg: 'IT2025001' },
    { roll: '2', name: 'Akshaya', reg: 'IT2025002' },
    { roll: '3', name: 'Anuradha', reg: 'IT2025003' },
    { roll: '4', name: 'Aravind PL', reg: 'IT2025004' },
    { roll: '5', name: 'Archana B', reg: 'IT2025005' },
    { roll: '6', name: 'BalaMurugan VT', reg: 'IT2025006' },
    { roll: '7', name: 'BalaMurugan K', reg: 'IT2025007' },
    { roll: '8', name: 'Bhavana', reg: 'IT2025008' },
    { roll: '9', name: 'Hari Shankar CP', reg: 'IT2025009' },
    { roll: '10', name: 'D Kishan Kumar', reg: 'IT2025010' },
    { roll: '11', name: 'Deepika K', reg: 'IT2025011' },
    { roll: '12', name: 'Dharshini M', reg: 'IT2025012' },
    { roll: '13', name: 'Divya Shree M', reg: 'IT2025013' },
    { roll: '14', name: 'Ezhumalai R', reg: 'IT2025014' },
    { roll: '15', name: 'Gayathiri', reg: 'IT2025015' },
    { roll: '16', name: 'Geetha K', reg: 'IT2025016' },
    { roll: '17', name: 'Giridharan', reg: 'IT2025017' },
    { roll: '18', name: 'Gowsan', reg: 'IT2025018' },
    { roll: '19', name: 'Gunapriya Suresh', reg: 'IT2025019' },
    { roll: '20', name: 'Hansikaa S', reg: 'IT2025020' },
    { roll: '21', name: 'Hariharan MS', reg: 'IT2025021' },
    { roll: '22', name: 'Harini S', reg: 'IT2025022' },
    { roll: '23', name: 'Hariram Bharathwaj Murali', reg: 'IT2025023' },
    { roll: '24', name: 'Harish K', reg: 'IT2025024' },
    { roll: '301', name: 'Srinivasan', reg: 'IT2025301' }
  ];

  for (const st of ranjithAdvisees) {
    const email = `${st.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@svce.ac.in`;
    const phone = `+91 98403 ${st.roll}456`;

    const sUser = await query(
      `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
      [st.reg, passwordHash, 'student', email]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, photo_url, college_name, department, programme, batch, year, semester, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sUser.lastID,
        st.reg,
        `SVCE-IT-${st.roll}`,
        st.name,
        null,
        'Sri Venkateswara College of Engineering',
        'Information Technology',
        'B.Tech IT',
        '2023-2027',
        'III Year',
        'Semester V',
        'Sec-A',
        email,
        phone,
        'V.Ranjith',
        'EMP-FA-IT-03',
        'ranjith.v@svce.ac.in',
        '+91 98403 33445'
      ]
    );
  }

  // 5. STUDENTS UNDER FACULTY ADVISOR S. KAVISHREE (3rd Year IT-A: Rolls 25 to 48 & 302)
  const kavishreeAdvisees = [
    { roll: '25', name: 'Harshul', reg: 'IT2025025' },
    { roll: '26', name: 'Hayakreevan', reg: 'IT2025026' },
    { roll: '27', name: 'Hemesh S', reg: 'IT2025027' },
    { roll: '28', name: 'Irfan Alee Thajudeen', reg: 'IT2025028' },
    { roll: '29', name: 'Isha L', reg: 'IT2025029' },
    { roll: '30', name: 'Janapriyan S', reg: 'IT2025030' },
    { roll: '31', name: 'Jaswanth', reg: 'IT2025031' },
    { roll: '32', name: 'Jeeva L', reg: 'IT2025032' },
    { roll: '33', name: 'Jeevitha Dinakaran', reg: 'IT2025033' },
    { roll: '34', name: 'Kamalesh R V', reg: 'IT2025034' },
    { roll: '35', name: 'Kanish S', reg: 'IT2025035' },
    { roll: '36', name: 'Kavivarthini V', reg: 'IT2025036' },
    { roll: '37', name: 'Keerthana M', reg: 'IT2025037' },
    { roll: '38', name: 'Kirthika Sri R S', reg: 'IT2025038' },
    { roll: '39', name: 'Laavanya R', reg: 'IT2025039' },
    { roll: '40', name: 'Lavanya K', reg: 'IT2025040' },
    { roll: '41', name: 'Ligin J M', reg: 'IT2025041' },
    { roll: '42', name: 'Lisshanth', reg: 'IT2025042' },
    { roll: '43', name: 'Logesh D', reg: 'IT2025043' },
    { roll: '44', name: 'M H Pooja', reg: 'IT2025044' },
    { roll: '45', name: 'M Hannah Felin', reg: 'IT2025045' },
    { roll: '46', name: 'Madhulekha Selshini R', reg: 'IT2025046' },
    { roll: '47', name: 'Madhumitha S', reg: 'IT2025047' },
    { roll: '48', name: 'Mangala S', reg: 'IT2025048' },
    { roll: '302', name: 'Venkatesh U', reg: 'IT2025302' }
  ];

  for (const st of kavishreeAdvisees) {
    const email = `${st.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@svce.ac.in`;
    const phone = `+91 98404 ${st.roll}789`;

    const sUser = await query(
      `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
      [st.reg, passwordHash, 'student', email]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, photo_url, college_name, department, programme, batch, year, semester, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sUser.lastID,
        st.reg,
        `SVCE-IT-${st.roll}`,
        st.name,
        null,
        'Sri Venkateswara College of Engineering',
        'Information Technology',
        'B.Tech IT',
        '2023-2027',
        'III Year',
        'Semester V',
        'Sec-A',
        email,
        phone,
        'S.Kavishree',
        'EMP-FA-IT-04',
        'kavishree.s@svce.ac.in',
        '+91 98404 44556'
      ]
    );
  }

  // 6. STUDENTS UNDER FACULTY ADVISOR N. SELVAGANESH (3rd Year IT-B: Rolls 49 to 73)
  const selvaAdvisees = [
    { roll: '49', name: 'Merin Aashika', reg: 'IT2025049' },
    { roll: '50', name: 'Mithun C', reg: 'IT2025050' },
    { roll: '51', name: 'Mohammed Unais', reg: 'IT2025051' },
    { roll: '52', name: 'Mohammed Shafiq', reg: 'IT2025052' },
    { roll: '53', name: 'Mounesh', reg: 'IT2025053' },
    { roll: '54', name: 'Nasrin Banu', reg: 'IT2025054' },
    { roll: '55', name: 'Nathiya M', reg: 'IT2025055' },
    { roll: '56', name: 'Naveen SG', reg: 'IT2025056' },
    { roll: '57', name: 'Naveen Velan', reg: 'IT2025057' },
    { roll: '58', name: 'Niranjan', reg: 'IT2025058' },
    { roll: '59', name: 'Niranjana', reg: 'IT2025059' },
    { roll: '60', name: 'Dhivya Shri', reg: 'IT2025060' },
    { roll: '61', name: 'Parkavi', reg: 'IT2025061' },
    { roll: '64', name: 'Payal Rajput', reg: 'IT2025064' },
    { roll: '65', name: 'Perarivalan', reg: 'IT2025065' },
    { roll: '66', name: 'Pitchappan', reg: 'IT2025066' },
    { roll: '67', name: 'Pranvi Mohan', reg: 'IT2025067' },
    { roll: '68', name: 'Preetha Rajam', reg: 'IT2025068' },
    { roll: '69', name: 'Prem SR', reg: 'IT2025069' },
    { roll: '70', name: 'Saravanan', reg: 'IT2025070' },
    { roll: '71', name: 'Ragini', reg: 'IT2025071' },
    { roll: '72', name: 'Rajaguru', reg: 'IT2025072' },
    { roll: '73', name: 'Raviram Anbumani', reg: 'IT2025073' }
  ];

  for (const st of selvaAdvisees) {
    const email = `${st.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@svce.ac.in`;
    const phone = `+91 98402 ${st.roll}789`;

    const sUser = await query(
      `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
      [st.reg, passwordHash, 'student', email]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, photo_url, college_name, department, programme, batch, year, semester, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sUser.lastID,
        st.reg,
        `SVCE-IT-${st.roll}`,
        st.name,
        null,
        'Sri Venkateswara College of Engineering',
        'Information Technology',
        'B.Tech IT',
        '2023-2027',
        'III Year',
        'Semester V',
        'Sec-B',
        email,
        phone,
        'N.Selvaganesh',
        'EMP-FA-IT-02',
        'selvaganesh.n@svce.ac.in',
        '+91 98402 22334'
      ]
    );
  }

  // 7. STUDENTS UNDER FACULTY ADVISOR V. PRAVEEN KUMAR (3rd Year IT-B: Rolls 74 to 98)
  const praveenAdvisees = [
    { roll: '74', name: 'Ritika S', reg: 'IT2025074' },
    { roll: '75', name: 'Rohinidevi', reg: 'IT2025075' },
    { roll: '76', name: 'Sanjeev Sriram', reg: 'IT2025076' },
    { roll: '77', name: 'Samiksha', reg: 'IT2025077' },
    { roll: '78', name: 'Sandhiya G', reg: 'IT2025078' },
    { roll: '79', name: 'Sandhiya P', reg: 'IT2025079' },
    { roll: '80', name: 'Sanjay', reg: 'IT2025080' },
    { roll: '81', name: 'Saranyadevi', reg: 'IT2025081' },
    { roll: '82', name: 'Sarveshvaran', reg: 'IT2025082' },
    { roll: '83', name: 'Sashwanth', reg: 'IT2025083' },
    { roll: '84', name: 'Sharvesh CM', reg: 'IT2025084' },
    { roll: '85', name: 'Siddharth Santhosh kumar', reg: 'IT2025085' },
    { roll: '86', name: 'Sivaprasath', reg: 'IT2025086' },
    { roll: '87', name: 'Srivarshini', reg: 'IT2025087' },
    { roll: '88', name: 'Sruthilaya', reg: 'IT2025088' },
    { roll: '89', name: 'Surjithkumar', reg: 'IT2025089' },
    { roll: '90', name: 'Swetha', reg: 'IT2025090' },
    { roll: '91', name: 'Thamaraiselvi', reg: 'IT2025091' },
    { roll: '92', name: 'Tharun', reg: 'IT2025092' },
    { roll: '93', name: 'Thaufiq Abdul Kaadher', reg: 'IT2025093' },
    { roll: '94', name: 'Vaishnavi', reg: 'IT2025094' },
    { roll: '95', name: 'Vaishobiya', reg: 'IT2025095' },
    { roll: '96', name: 'Varshan V Chari', reg: 'IT2025096' },
    { roll: '97', name: 'Vivek A', reg: 'IT2025097' },
    { roll: '98', name: 'Yogi Krishnan', reg: 'IT2025098' }
  ];

  for (const st of praveenAdvisees) {
    const email = `${st.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@svce.ac.in`;
    const phone = `+91 98401 ${st.roll}123`;

    const sUser = await query(
      `INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)`,
      [st.reg, passwordHash, 'student', email]
    );

    await query(
      `INSERT INTO students (user_id, register_number, id_card_number, full_name, photo_url, college_name, department, programme, batch, year, semester, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sUser.lastID,
        st.reg,
        `SVCE-IT-${st.roll}`,
        st.name,
        null,
        'Sri Venkateswara College of Engineering',
        'Information Technology',
        'B.Tech IT',
        '2023-2027',
        'III Year',
        'Semester V',
        'Sec-B',
        email,
        phone,
        'V.Praveen Kumar',
        'EMP-FA-IT-01',
        'praveenkumar.v@svce.ac.in',
        '+91 98401 11223'
      ]
    );
  }

  // 8. BOOKS CATALOG
  const sampleBooks = [
    ['BK-IT-101', 'Operating System Concepts', 'Silberschatz, Galvin, Gagne', 'Wiley', 'Core IT', '10th Edition', '978-1118063330', 'Shelf-A2', 30, 24, 6],
    ['BK-IT-102', 'Data Structures and Algorithm Analysis in C++', 'Mark Allen Weiss', 'Pearson', 'Data Structures', '4th Edition', '978-0132847377', 'Shelf-B1', 30, 26, 4],
    ['BK-IT-103', 'Database System Concepts', 'Abraham Silberschatz', 'McGraw-Hill', 'Database Systems', '7th Edition', '978-0078022159', 'Shelf-C3', 25, 20, 5],
    ['BK-IT-104', 'Computer Networking: A Top-Down Approach', 'Kurose & Ross', 'Pearson', 'Networks', '8th Edition', '978-0136681557', 'Shelf-D4', 30, 30, 0],
    ['BK-IT-105', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Pearson', 'AI & ML', '4th Edition', '978-0134610993', 'Shelf-E1', 25, 25, 0]
  ];

  for (const b of sampleBooks) {
    await query(
      `INSERT INTO books (book_id, title, author, publisher, category, edition, isbn, shelf_number, total_copies, available_copies, issued_copies)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      b
    );
  }

  // 9. BORROW RECORDS
  // Harshul (Clean)
  await query(
    `INSERT INTO borrow_records (register_number, book_id, issue_date, due_date, return_date, fine_amount, status, fine_status)
     VALUES ('IT2025025', 'BK-IT-102', '2026-06-01', '2026-06-15', '2026-06-14', 0, 'Returned', 'Paid')`
  );

  // Hayakreevan (Issued 1 book)
  await query(
    `INSERT INTO borrow_records (register_number, book_id, issue_date, due_date, return_date, fine_amount, status, fine_status)
     VALUES ('IT2025026', 'BK-IT-101', '2026-07-01', '2026-07-15', NULL, 50.00, 'Issued', 'Unpaid')`
  );

  // 10. NO-DUES CLEARANCE REQUESTS & STAGES FOR S. KAVISHREE ADVISEES
  // Request for Harshul (At Stage 4 - Ready for FA S.Kavishree approval!)
  const reqHarshul = await query(
    `INSERT INTO nodues_requests (request_number, register_number, student_name, id_card_number, college_name, department, year, overall_status, progress_percentage, current_stage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['NDR-2026-025', 'IT2025025', 'Harshul', 'SVCE-IT-25', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', 'In Progress', 66, 'Faculty Advisor']
  );

  const stagesHarshul = [
    { name: 'Finance', order: 1, status: 'Approved', approved_by: 'SVCE Finance Office', remarks: 'Fees clear.' },
    { name: 'Central Library', order: 2, status: 'Approved', approved_by: 'Central Library Portal', remarks: 'Cleared.' },
    { name: 'Department Library', order: 3, status: 'Approved', approved_by: 'Sivakumar E (Library In-Charge)', remarks: '0 Books & ₹0 Fine verified. Cleared.' },
    { name: 'Faculty Advisor', order: 4, status: 'Pending', approved_by: null, remarks: 'Awaiting Faculty Advisor S.Kavishree review.' },
    { name: 'DPC', order: 5, status: 'Pending', approved_by: null, remarks: 'Pending FA clearance.' },
    { name: 'HOD', order: 6, status: 'Pending', approved_by: null, remarks: 'Final HOD Dr V Vidhya sign-off pending.' }
  ];

  for (const s of stagesHarshul) {
    await query(
      `INSERT INTO nodues_stages (request_id, department_name, stage_order, status, updated_at, approved_by, remarks)
       VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`,
      [reqHarshul.lastID, s.name, s.order, s.status, s.approved_by, s.remarks]
    );
  }

  // 11. ANNOUNCEMENTS
  await query(
    `INSERT INTO announcements (title, description, college_name, department, category, priority, is_pinned, status)
     VALUES ('3rd Year IT No-Dues Clearance Schedule', 'All 3rd Year B.Tech IT students under Faculty Advisors S.Kavishree, V.Ranjith, V.Praveen Kumar & N.Selvaganesh are requested to complete book returns with Sivakumar E and submit online clearance applications.', 'Sri Venkateswara College of Engineering', 'Information Technology', 'No-Dues', 'High', 1, 'Published')`
  );

  console.log('SVCE database seeded successfully with all 98 III Year IT advisees across S.Kavishree, V.Ranjith, V.Praveen Kumar, and N.Selvaganesh!');
}

module.exports = { seedDatabase };
