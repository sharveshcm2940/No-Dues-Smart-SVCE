const bcrypt = require('bcryptjs');
const { query, getOne, getPool } = require('../config/db');
const { logAuditEvent } = require('../utils/auditLogger');
const { getTemplate } = require('../utils/csvTemplates');

/**
 * Robust CSV parser that handles quotes and trims fields
 */
function parseCSV(csvString) {
  if (!csvString || typeof csvString !== 'string') return [];
  const lines = csvString.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = parseCSVLine(lines[i]);
    if (rawValues.length === 0 || (rawValues.length === 1 && !rawValues[0])) continue;

    const rowObj = { _rowNumber: i + 1 };
    headers.forEach((h, idx) => {
      rowObj[h] = rawValues[idx] !== undefined ? rawValues[idx].trim() : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Bulk Import: Students
 */
exports.importStudents = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const csvContent = req.file ? req.file.buffer.toString('utf8') : req.body.csvData;
    const isDryRun = req.query.dryRun === 'true' || req.body.dryRun === true;

    if (!csvContent || csvContent.trim().length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'No CSV data provided.' });
    }

    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'CSV file contains no valid data rows or missing header.' });
    }

    const errors = [];
    const validRows = [];

    // 1. Validate rows
    for (const r of rows) {
      const regNo = r.register_number;
      const fullName = r.full_name;
      const email = r.email;
      const idCard = r.id_card_number || `IDC-${regNo}`;

      if (!regNo) {
        errors.push({ row: r._rowNumber, identifier: 'UNKNOWN', error: 'Missing register_number.' });
        continue;
      }
      if (!fullName) {
        errors.push({ row: r._rowNumber, identifier: regNo, error: 'Missing full_name.' });
        continue;
      }
      if (!email || !isValidEmail(email)) {
        errors.push({ row: r._rowNumber, identifier: regNo, error: `Invalid or missing email: '${email}'.` });
        continue;
      }

      validRows.push({
        ...r,
        register_number: regNo,
        full_name: fullName,
        email,
        id_card_number: idCard
      });
    }

    // Dry Run Preview: Return report without mutating DB
    if (isDryRun) {
      conn.release();
      return res.json({
        success: true,
        dryRun: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        previewRows: validRows.slice(0, 5),
        errors
      });
    }

    // Execution: Perform idempotent upsert
    await conn.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;
    const defaultPasswordHash = await bcrypt.hash('Svce@123456', 10);

    for (const r of validRows) {
      // 1. Ensure user record exists or update email
      const [existingUser] = await conn.query('SELECT id FROM users WHERE username = ?', [r.register_number]);
      let userId;

      if (existingUser && existingUser.length > 0) {
        userId = existingUser[0].id;
        await conn.query('UPDATE users SET email = ?, is_active = 1 WHERE id = ?', [r.email, userId]);
      } else {
        const [userRes] = await conn.query(
          `INSERT INTO users (username, email, password, role, must_change_password, is_active)
           VALUES (?, ?, ?, 'student', 1, 1)`,
          [r.register_number, r.email, defaultPasswordHash]
        );
        userId = userRes.insertId;
      }

      // 2. Upsert student record
      const [existingStudent] = await conn.query('SELECT id FROM students WHERE register_number = ?', [r.register_number]);
      if (existingStudent && existingStudent.length > 0) {
        await conn.query(
          `UPDATE students 
           SET user_id = ?, id_card_number = ?, full_name = ?, department = ?, year = ?, section = ?, email = ?, phone = ?, advisor_name = ?, advisor_emp_id = ?, advisor_email = ?, advisor_phone = ?
           WHERE register_number = ?`,
          [
            userId,
            r.id_card_number,
            r.full_name,
            r.department || 'Information Technology',
            r.year || 'IV Year',
            r.section || 'A',
            r.email,
            r.phone || '+91 98401 00000',
            r.advisor_name || 'V Praveenkumar',
            r.advisor_emp_id || 'EMP-FA-IT-01',
            r.advisor_email || 'praveenkumar.v@svce.ac.in',
            r.advisor_phone || '+91 98401 11223',
            r.register_number
          ]
        );
        updatedCount++;
      } else {
        await conn.query(
          `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            r.register_number,
            r.id_card_number,
            r.full_name,
            r.department || 'Information Technology',
            r.year || 'IV Year',
            r.section || 'A',
            r.email,
            r.phone || '+91 98401 00000',
            r.advisor_name || 'V Praveenkumar',
            r.advisor_emp_id || 'EMP-FA-IT-01',
            r.advisor_email || 'praveenkumar.v@svce.ac.in',
            r.advisor_phone || '+91 98401 11223'
          ]
        );
        createdCount++;
      }
    }

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'BULK_IMPORT_STUDENTS',
      details: `Bulk imported students: ${createdCount} created, ${updatedCount} updated, ${errors.length} failed.`,
      module: 'Bulk Import'
    });

    return res.json({
      success: true,
      dryRun: false,
      totalRows: rows.length,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      errors
    });
  } catch (error) {
    await conn.rollback();
    console.error('Bulk Import Students Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing bulk import.' });
  } finally {
    conn.release();
  }
};

/**
 * Bulk Import: Staff
 */
exports.importStaff = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const csvContent = req.file ? req.file.buffer.toString('utf8') : req.body.csvData;
    const isDryRun = req.query.dryRun === 'true' || req.body.dryRun === true;

    if (!csvContent || csvContent.trim().length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'No CSV data provided.' });
    }

    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'CSV file contains no valid data rows or missing header.' });
    }

    const validRoles = ['library_staff', 'faculty_advisor', 'hod', 'dpc', 'finance', 'main_library_staff', 'admin'];
    const errors = [];
    const validRows = [];

    for (const r of rows) {
      const empId = r.employee_id;
      const fullName = r.full_name;
      const email = r.email;
      const role = r.role ? r.role.trim().toLowerCase() : '';

      if (!empId) {
        errors.push({ row: r._rowNumber, identifier: 'UNKNOWN', error: 'Missing employee_id.' });
        continue;
      }
      if (!fullName) {
        errors.push({ row: r._rowNumber, identifier: empId, error: 'Missing full_name.' });
        continue;
      }
      if (!email || !isValidEmail(email)) {
        errors.push({ row: r._rowNumber, identifier: empId, error: `Invalid or missing email: '${email}'.` });
        continue;
      }
      if (!validRoles.includes(role)) {
        errors.push({ row: r._rowNumber, identifier: empId, error: `Invalid role '${role}'. Valid roles: ${validRoles.join(', ')}` });
        continue;
      }

      validRows.push({ ...r, employee_id: empId, full_name: fullName, email, role });
    }

    if (isDryRun) {
      conn.release();
      return res.json({
        success: true,
        dryRun: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        previewRows: validRows.slice(0, 5),
        errors
      });
    }

    await conn.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;
    const defaultPasswordHash = await bcrypt.hash('Svce@123456', 10);

    for (const r of validRows) {
      const [existingUser] = await conn.query('SELECT id FROM users WHERE username = ?', [r.employee_id]);
      let userId;

      if (existingUser && existingUser.length > 0) {
        userId = existingUser[0].id;
        await conn.query('UPDATE users SET email = ?, role = ?, is_active = 1 WHERE id = ?', [r.email, r.role, userId]);
        updatedCount++;
      } else {
        const [userRes] = await conn.query(
          `INSERT INTO users (username, email, password, role, must_change_password, is_active)
           VALUES (?, ?, ?, ?, 1, 1)`,
          [r.employee_id, r.email, defaultPasswordHash, r.role]
        );
        userId = userRes.insertId;
        createdCount++;
      }

      // Upsert profile based on role
      const tableMap = {
        library_staff: 'library_staff',
        faculty_advisor: 'faculty_advisors',
        hod: 'hod_profile',
        dpc: 'dpc_profile',
        finance: 'finance_profile',
        main_library_staff: 'main_library_profile'
      };

      const targetTable = tableMap[r.role];
      if (targetTable) {
        const [existingProfile] = await conn.query(`SELECT id FROM ${targetTable} WHERE employee_id = ?`, [r.employee_id]);
        if (existingProfile && existingProfile.length > 0) {
          await conn.query(
            `UPDATE ${targetTable} SET full_name = ?, email = ?, phone = ?, department = ? WHERE employee_id = ?`,
            [r.full_name, r.email, r.phone || '+91 94450 00000', r.department || 'Information Technology', r.employee_id]
          );
        } else {
          await conn.query(
            `INSERT INTO ${targetTable} (user_id, employee_id, full_name, email, phone, department)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, r.employee_id, r.full_name, r.email, r.phone || '+91 94450 00000', r.department || 'Information Technology']
          );
        }
      }
    }

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'BULK_IMPORT_STAFF',
      details: `Bulk imported staff: ${createdCount} created, ${updatedCount} updated, ${errors.length} failed.`,
      module: 'Bulk Import'
    });

    return res.json({
      success: true,
      dryRun: false,
      totalRows: rows.length,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      errors
    });
  } catch (error) {
    await conn.rollback();
    console.error('Bulk Import Staff Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing staff import.' });
  } finally {
    conn.release();
  }
};

/**
 * Bulk Import: Borrow Records
 */
exports.importBorrowRecords = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const csvContent = req.file ? req.file.buffer.toString('utf8') : req.body.csvData;
    const isDryRun = req.query.dryRun === 'true' || req.body.dryRun === true;

    if (!csvContent || csvContent.trim().length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'No CSV data provided.' });
    }

    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'CSV file contains no valid data rows or missing header.' });
    }

    const errors = [];
    const validRows = [];

    for (const r of rows) {
      const regNo = r.register_number;
      const bookId = r.book_id;
      const issueDate = r.issue_date;
      const dueDate = r.due_date;

      if (!regNo) {
        errors.push({ row: r._rowNumber, identifier: 'UNKNOWN', error: 'Missing register_number.' });
        continue;
      }
      if (!bookId) {
        errors.push({ row: r._rowNumber, identifier: regNo, error: 'Missing book_id.' });
        continue;
      }
      if (!issueDate) {
        errors.push({ row: r._rowNumber, identifier: `${regNo}/${bookId}`, error: 'Missing issue_date.' });
        continue;
      }
      if (!dueDate) {
        errors.push({ row: r._rowNumber, identifier: `${regNo}/${bookId}`, error: 'Missing due_date.' });
        continue;
      }

      validRows.push({ ...r, register_number: regNo, book_id: bookId, issue_date: issueDate, due_date: dueDate });
    }

    if (isDryRun) {
      conn.release();
      return res.json({
        success: true,
        dryRun: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        previewRows: validRows.slice(0, 5),
        errors
      });
    }

    await conn.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;

    for (const r of validRows) {
      const fineVal = parseFloat(r.fine_amount) || 0.00;
      const fineStatus = r.fine_status || (fineVal > 0 ? 'Unpaid' : 'None');
      const status = r.status || 'Issued';

      const [existing] = await conn.query(
        'SELECT id FROM borrow_records WHERE register_number = ? AND book_id = ? AND issue_date = ?',
        [r.register_number, r.book_id, r.issue_date]
      );

      if (existing && existing.length > 0) {
        await conn.query(
          `UPDATE borrow_records 
           SET due_date = ?, return_date = ?, fine_amount = ?, status = ?, fine_status = ?, remarks = ?
           WHERE id = ?`,
          [r.due_date, r.return_date || null, fineVal, status, fineStatus, r.remarks || 'Imported via CSV', existing[0].id]
        );
        updatedCount++;
      } else {
        await conn.query(
          `INSERT INTO borrow_records (register_number, book_id, issue_date, due_date, return_date, fine_amount, status, fine_status, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.register_number, r.book_id, r.issue_date, r.due_date, r.return_date || null, fineVal, status, fineStatus, r.remarks || 'Imported via CSV']
        );
        createdCount++;
      }
    }

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'BULK_IMPORT_BORROW_RECORDS',
      details: `Bulk imported borrow records: ${createdCount} created, ${updatedCount} updated, ${errors.length} failed.`,
      module: 'Bulk Import'
    });

    return res.json({
      success: true,
      dryRun: false,
      totalRows: rows.length,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      errors
    });
  } catch (error) {
    await conn.rollback();
    console.error('Bulk Import Borrow Records Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing borrow records import.' });
  } finally {
    conn.release();
  }
};

/**
 * Download sample CSV template
 */
exports.downloadTemplate = (req, res) => {
  const { type } = req.params;
  const template = getTemplate(type);

  if (!template) {
    return res.status(404).json({ success: false, message: `Template type '${type}' not found.` });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  return res.send(template);
};
