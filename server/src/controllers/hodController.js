const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress, logAuditEntry } = require('../utils/workflowHelper');

// Get HOD Executive Overview Dashboard Statistics
exports.getHODDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // HOD Profile
    const hod = await getOne('SELECT * FROM hod_profile WHERE employee_id = ?', [empId]);

    // Master Stats
    const totalStudents = await getOne('SELECT COUNT(*) as count FROM students');
    const clearedStudents = await getOne(`SELECT COUNT(*) as count FROM nodues_requests WHERE overall_status = 'Approved'`);
    const pendingHODApprovals = await query(`
      SELECT 
        nr.id as request_id,
        nr.request_number,
        nr.register_number,
        nr.student_name,
        nr.id_card_number,
        nr.department,
        nr.year,
        nr.request_date,
        nr.overall_status,
        ns.status as hod_stage_status,
        ns.remarks as hod_stage_remarks
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'HOD'
      WHERE ns.status = 'Pending'
      ORDER BY 
        CASE nr.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        nr.student_name ASC
    `);

    const allDepartmentRequests = await query(`
      SELECT nr.*, 
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.status = 'Issued') as active_books,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.fine_status = 'Unpaid') as fine_unpaid
      FROM nodues_requests nr
      WHERE (
        SELECT status 
        FROM nodues_stages fin_s 
        WHERE fin_s.request_id = nr.id AND fin_s.department_name = 'Finance'
      ) = 'Approved'
      ORDER BY 
        CASE nr.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        nr.student_name ASC
    `);

    // Department Master Student Roster
    const allStudents = await query(`
      SELECT s.*, 
        COALESCE(nr.overall_status, 'Not Submitted') as nodues_status,
        COALESCE(nr.current_stage, 'N/A') as current_stage,
        COALESCE(nr.progress_percentage, 0) as progress_percentage,
        nr.certificate_number
      FROM students s
      LEFT JOIN nodues_requests nr ON s.register_number = nr.register_number
      ORDER BY 
        CASE s.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        s.full_name ASC
    `);

    return res.json({
      success: true,
      data: {
        hod,
        stats: {
          totalStudents: totalStudents.count || 0,
          clearedStudents: clearedStudents.count || 0,
          pendingHODCount: pendingHODApprovals.length,
          totalCertificates: clearedStudents.count || 0
        },
        pendingHODApprovals,
        allDepartmentRequests,
        allStudents
      }
    });

  } catch (error) {
    console.error('HOD Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading HOD executive dashboard.' });
  }
};

// Process HOD Final Approval Sign-off
exports.processHODAction = async (req, res) => {
  try {
    const empId = req.user.username;
    const { requestId, action, remarks } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and Action are required.' });
    }

    const hod = await getOne('SELECT full_name FROM hod_profile WHERE employee_id = ?', [empId]);
    const approverName = hod ? `${hod.full_name} (Head of Department)` : 'Dr V Vidhya (HOD - IT)';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    if (action === 'Approve') {
      const stages = await query('SELECT * FROM nodues_stages WHERE request_id = ?', [requestId]);
      const faStage = stages.find(s => s.department_name === 'Faculty Advisor');

      if (!faStage || faStage.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'HOD final sign-off is locked until Faculty Advisor clearance is approved.'
        });
      }

      // Update HOD Stage
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = ?, updated_at = datetime('now')
         WHERE request_id = ? AND department_name = 'HOD'`,
        [approverName, remarks || 'Head of Department approval granted.', requestId]
      );

      // Audit Log Entry
      await logAuditEntry({
        requestId,
        departmentName: 'HOD',
        actionType: 'Approval',
        actorName: approverName,
        actorRole: 'hod',
        statusAfter: 'Approved',
        remarks: remarks || 'Head of Department final clearance granted.'
      });

      const result = await updateRequestProgress(requestId);

      if (result && result.status === 'Approved') {
        await query(
          `INSERT INTO notifications (target_user, title, message, type)
           VALUES (?, ?, ?, ?)`,
          [request.register_number, 'No-Dues Clearance Completed!', `All sections have approved your request. Your official SVCE Digital Certificate ${result.certificateNumber} is now ready for download!`, 'success']
        );

        return res.json({
          success: true,
          message: `Request ${request.request_number} fully approved. Digital Certificate ${result.certificateNumber} generated!`
        });
      }

      return res.json({
        success: true,
        message: `Request ${request.request_number} approved by HOD. Certificate will be generated after all remaining sections approve.`
      });

    } else {
      const newStatus = action === 'Reject' ? 'Rejected' : 'Hold';

      await query(
        `UPDATE nodues_stages 
         SET status = ?, approved_by = ?, remarks = ?, updated_at = datetime('now')
         WHERE request_id = ? AND department_name = 'HOD'`,
        [newStatus, approverName, remarks, requestId]
      );

      // Audit Log Entry
      await logAuditEntry({
        requestId,
        departmentName: 'HOD',
        actionType: action === 'Reject' ? 'Rejection' : 'Hold',
        actorName: approverName,
        actorRole: 'hod',
        statusAfter: newStatus,
        remarks: remarks || (action === 'Reject' ? 'Rejection by HOD.' : 'Put on hold by HOD.')
      });

      if (action === 'Reject') {
        await query(
          `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'HOD (Rejected)' WHERE id = ?`,
          [requestId]
        );
      }

      await notifyStudentAndFA({
        registerNumber: request.register_number,
        requestNumber: request.request_number,
        title: `No-Dues Request ${action === 'Reject' ? 'REJECTED' : 'Put On Hold'} (HOD Stage)`,
        studentMsg: `Head of Department ${approverName} ${action === 'Reject' ? 'rejected' : 'placed on hold'} your No-Dues request ${request.request_number}. Remarks: ${remarks || 'Institutional clearance pending'}`,
        faMsg: `URGENT ADVISEE ALERT: The No-Dues application (${request.request_number}) of your advisee ${request.student_name} (${request.register_number}) was ${action === 'Reject' ? 'REJECTED' : 'PLACED ON HOLD'} by Head of Department. Remarks: ${remarks || 'Institutional clearance pending'}`,
        type: action === 'Reject' ? 'danger' : 'warning'
      });

      return res.json({ success: true, message: `Request ${request.request_number} marked as ${newStatus} by HOD.` });
    }

  } catch (error) {
    console.error('Process HOD Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing HOD sign-off.' });
  }
};

// Bulk Approve All Pending Stage 6 HOD Requests
exports.bulkApproveHOD = async (req, res) => {
  try {
    const empId = req.user.username;
    const hod = await getOne('SELECT full_name FROM hod_profile WHERE employee_id = ?', [empId]);
    const approverName = hod ? `${hod.full_name} (Head of Department)` : 'Dr V Vidhya (HOD - IT)';

    const pendingStages = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'HOD' AND ns.status = 'Pending'
        AND (
          SELECT status 
          FROM nodues_stages fa_s 
          WHERE fa_s.request_id = nr.id AND fa_s.department_name = 'Faculty Advisor'
        ) = 'Approved'
    `);

    let count = 0;
    for (const item of pendingStages) {
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = 'Bulk HOD approval granted.', updated_at = datetime('now') 
         WHERE request_id = ? AND department_name = 'HOD'`,
        [approverName, item.request_id]
      );

      await updateRequestProgress(item.request_id);
      count++;
    }

    return res.json({
      success: true,
      message: `Successfully granted final HOD sign-off and issued Digital Certificates for ${count} student(s).`
    });
  } catch (error) {
    console.error('Bulk Approve HOD Error:', error);
    return res.status(500).json({ success: false, message: 'Error performing bulk HOD final approval.' });
  }
};

// Bulk Register Students from Excel/CSV JSON Data
exports.bulkRegisterStudents = async (req, res) => {
  try {
    const { studentsList } = req.body;

    if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty students list provided.' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 10);
    let registeredCount = 0;
    let skippedCount = 0;

    for (const s of studentsList) {
      const regNo = (s.register_number || s.regNo || '').trim();
      const name = (s.full_name || s.name || '').trim();
      if (!regNo || !name) {
        skippedCount++;
        continue;
      }

      const email = s.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@svce.ac.in`;
      const idCard = s.id_card_number || s.idCard || `SVCE-IT-${regNo.length >= 3 ? regNo.slice(-3) : regNo}`;
      const phone = s.phone || '+91 99999 88888';
      const year = s.year || 'IV Year';
      const section = s.section || 'Sec-A';
      const batch = s.batch || s.academic_batch || '2023-2027';
      const academicBatch = s.academic_batch || s.batch || '2023-2027';
      const rollNo = s.roll_number || s.rollNo || idCard;
      const passingYear = parseInt(s.passing_year || s.passingYear || 2027, 10);

      let facultyId = null;
      let advName = s.advisor_name || s.advisorName || 'V Praveenkumar';
      let advEmp = s.advisor_emp_id || s.advisorEmp || 'EMP-FA-IT-01';
      let advEmail = 'praveenkumar.v@svce.ac.in';
      let advPhone = '+91 98401 11223';

      if (s.faculty_id || s.facultyId) {
        const fac = await getOne('SELECT * FROM faculty WHERE id = ?', [s.faculty_id || s.facultyId]);
        if (fac) {
          facultyId = fac.id;
          advName = fac.name;
          advEmp = fac.employee_id;
          advEmail = fac.email;
          advPhone = fac.phone || advPhone;
        }
      }

      if (!facultyId && (advEmp || advName)) {
        const fac = await getOne('SELECT * FROM faculty WHERE employee_id = ? OR name LIKE ?', [advEmp, `%${advName}%`]);
        if (fac) {
          facultyId = fac.id;
          advName = fac.name;
          advEmp = fac.employee_id;
          advEmail = fac.email;
          advPhone = fac.phone || advPhone;
        }
      }

      // Insert User login record
      await query(
        `INSERT IGNORE INTO users (username, password, role, email) VALUES (?, ?, 'student', ?)`,
        [regNo, passwordHash, email]
      );

      const userRow = await getOne('SELECT id FROM users WHERE username = ?', [regNo]);
      if (userRow) {
        // Insert student profile
        const result = await query(
          `INSERT IGNORE INTO students (
            user_id, register_number, id_card_number, full_name, college_name, department, programme, batch, academic_batch, year, semester, section, roll_number, email, phone, passing_year, faculty_id, advisor_name, advisor_emp_id, advisor_email, advisor_phone
          ) VALUES (?, ?, ?, ?, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', ?, ?, ?, 'Semester VII', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userRow.id, regNo, idCard, name, batch, academicBatch, year, section, rollNo, email, phone, passingYear, facultyId, advName, advEmp, advEmail, advPhone]
        );

        if (result.changes > 0 || result.affectedRows > 0) {
          registeredCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Bulk registration complete. Successfully registered ${registeredCount} students. Skipped ${skippedCount} duplicate/invalid entries.`
    });

  } catch (error) {
    console.error('Bulk Register Students Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing bulk student registration.' });
  }
};

// Delete All Student Data of a Specific Year
exports.deleteStudentsByYear = async (req, res) => {
  try {
    const { year } = req.params;

    if (!year) {
      return res.status(400).json({ success: false, message: 'Year parameter is required.' });
    }

    // 1. Delete stages
    await query(`
      DELETE FROM nodues_stages 
      WHERE request_id IN (
        SELECT id FROM nodues_requests 
        WHERE register_number IN (SELECT register_number FROM students WHERE year = ?)
      )
    `, [year]);

    // 2. Delete requests
    await query(`
      DELETE FROM nodues_requests 
      WHERE register_number IN (SELECT register_number FROM students WHERE year = ?)
    `, [year]);

    // 3. Delete borrow records
    await query(`
      DELETE FROM borrow_records 
      WHERE register_number IN (SELECT register_number FROM students WHERE year = ?)
    `, [year]);

    // 4. Delete complaints
    await query(`
      DELETE FROM complaints 
      WHERE register_number IN (SELECT register_number FROM students WHERE year = ?)
    `, [year]);

    // 5. Delete notifications
    await query(`
      DELETE FROM notifications 
      WHERE target_user IN (SELECT register_number FROM students WHERE year = ?)
    `, [year]);

    // 6. Delete profiles
    const deletedStudents = await query(`SELECT user_id FROM students WHERE year = ?`, [year]);
    const studentUserIds = deletedStudents.map(s => s.user_id);

    await query(`DELETE FROM students WHERE year = ?`, [year]);

    // 7. Delete users logins
    if (studentUserIds.length > 0) {
      const placeholders = studentUserIds.map(() => '?').join(',');
      await query(`DELETE FROM users WHERE id IN (${placeholders})`, studentUserIds);
    }

    return res.json({
      success: true,
      message: `Successfully deleted all students, user logins, and clearance request history for ${year}.`
    });

  } catch (error) {
    console.error('Delete Students by Year Error:', error);
    return res.status(500).json({ success: false, message: 'Error deleting student data by year.' });
  }
};

// Reset/Wipe All Student Data Completely
exports.clearAllStudents = async (req, res) => {
  try {
    // 1. Drop/delete stages
    await query('DELETE FROM nodues_stages');

    // 2. Delete requests
    await query('DELETE FROM nodues_requests');

    // 3. Delete borrow records
    await query('DELETE FROM borrow_records');

    // 4. Delete complaints
    await query('DELETE FROM complaints');

    // 5. Delete notifications
    await query('DELETE FROM notifications');

    // 6. Fetch all student user IDs to clean login table
    const allStudentUsers = await query(`SELECT user_id FROM students`);
    const studentUserIds = allStudentUsers.map(s => s.user_id);

    // 7. Delete profiles
    await query('DELETE FROM students');

    // 8. Delete users
    if (studentUserIds.length > 0) {
      const placeholders = studentUserIds.map(() => '?').join(',');
      await query(`DELETE FROM users WHERE id IN (${placeholders})`, studentUserIds);
    }

    return res.json({
      success: true,
      message: 'Successfully purged all student directory details, login profiles, and clearance history from the database.'
    });

  } catch (error) {
    console.error('Reset All Students Error:', error);
    return res.status(500).json({ success: false, message: 'Error performing complete student wipe.' });
  }
};

// ── FACULTY & ADVISOR MANAGEMENT ENDPOINTS ───────────────────────────────────

// 1. Get all faculty members with assigned student counts
exports.getFacultyList = async (req, res) => {
  try {
    const faculty = await query(`
      SELECT f.*,
        (SELECT COUNT(*) FROM students s WHERE s.faculty_id = f.id OR s.advisor_emp_id = f.employee_id) as assigned_students_count
      FROM faculty f
      ORDER BY 
        CASE f.status WHEN 'ACTIVE' THEN 1 WHEN 'ON_LEAVE' THEN 2 ELSE 3 END,
        f.name ASC
    `);

    return res.json({ success: true, data: faculty });
  } catch (error) {
    console.error('Get Faculty List Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading faculty directory.' });
  }
};

// 2. Add a new Faculty Member
exports.addFaculty = async (req, res) => {
  try {
    const { employeeId, name, department, phone, email, status } = req.body;
    if (!employeeId || !name || !email) {
      return res.status(400).json({ success: false, message: 'Employee ID, Full Name, and Email are required.' });
    }

    const existing = await getOne('SELECT id FROM faculty WHERE employee_id = ?', [employeeId]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Faculty member with Employee ID '${employeeId}' already exists.` });
    }

    const deptVal = department || 'Information Technology';
    const statusVal = status || 'ACTIVE';

    const result = await query(
      `INSERT INTO faculty (employee_id, name, department, phone, email, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, name, deptVal, phone || '', email, statusVal]
    );

    const facultyId = result.lastID;

    // Create user account & faculty_advisor record if role login needed
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 10);
    const uRes = await query(
      `INSERT INTO users (username, password, role, email) VALUES (?, ?, 'faculty_advisor', ?)
       ON DUPLICATE KEY UPDATE email=VALUES(email)`,
      [employeeId, passwordHash, email]
    );

    const userId = uRes.lastID || (await getOne('SELECT id FROM users WHERE username = ?', [employeeId])).id;

    await query(
      `INSERT INTO faculty_advisors (user_id, faculty_id, employee_id, full_name, college_name, department, designation, email, phone)
       VALUES (?, ?, ?, ?, 'Sri Venkateswara College of Engineering', ?, 'Assistant Professor & Faculty Advisor', ?, ?)
       ON DUPLICATE KEY UPDATE faculty_id=VALUES(faculty_id), full_name=VALUES(full_name)`,
      [userId, facultyId, employeeId, name, deptVal, email, phone || '']
    );

    return res.json({ success: true, message: `Faculty member '${name}' added successfully.`, facultyId });
  } catch (error) {
    console.error('Add Faculty Error:', error);
    return res.status(500).json({ success: false, message: 'Server error adding faculty member.' });
  }
};

// 3. Edit Faculty Member
exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, phone, email, status } = req.body;

    const fac = await getOne('SELECT * FROM faculty WHERE id = ?', [id]);
    if (!fac) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    await query(
      `UPDATE faculty SET name = ?, department = ?, phone = ?, email = ?, status = ? WHERE id = ?`,
      [name || fac.name, department || fac.department, phone || fac.phone, email || fac.email, status || fac.status, id]
    );

    // Sync faculty_advisors table and students table
    await query(
      `UPDATE faculty_advisors SET full_name = ?, department = ?, phone = ?, email = ? WHERE faculty_id = ? OR employee_id = ?`,
      [name || fac.name, department || fac.department, phone || fac.phone, email || fac.email, id, fac.employee_id]
    );

    await query(
      `UPDATE students SET advisor_name = ?, advisor_email = ?, advisor_phone = ? WHERE faculty_id = ?`,
      [name || fac.name, email || fac.email, phone || fac.phone, id]
    );

    return res.json({ success: true, message: `Faculty details for '${name || fac.name}' updated successfully.` });
  } catch (error) {
    console.error('Update Faculty Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating faculty details.' });
  }
};

// 4. Update Faculty Status (ACTIVE, INACTIVE, ON_LEAVE, TRANSFERRED, RETIRED)
exports.updateFacultyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TRANSFERRED', 'RETIRED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const fac = await getOne('SELECT * FROM faculty WHERE id = ?', [id]);
    if (!fac) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    await query('UPDATE faculty SET status = ? WHERE id = ?', [status, id]);

    return res.json({ success: true, message: `Faculty status for '${fac.name}' changed to ${status}.` });
  } catch (error) {
    console.error('Update Faculty Status Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating faculty status.' });
  }
};

// 5. Get Assigned Students for a specific Faculty
exports.getFacultyStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const fac = await getOne('SELECT * FROM faculty WHERE id = ?', [id]);
    if (!fac) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    const students = await query(
      `SELECT s.*, 
         COALESCE(nr.overall_status, 'Not Submitted') as nodues_status,
         COALESCE(nr.current_stage, 'N/A') as current_stage
       FROM students s
       LEFT JOIN nodues_requests nr ON s.register_number = nr.register_number
       WHERE s.faculty_id = ? OR s.advisor_emp_id = ?
       ORDER BY s.academic_batch DESC, s.section ASC, s.full_name ASC`,
      [id, fac.employee_id]
    );

    return res.json({ success: true, data: { faculty: fac, students } });
  } catch (error) {
    console.error('Get Faculty Students Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching faculty advisees.' });
  }
};

// 6. Get Advisor Assignments Summary grouped by Academic Batch & Section
exports.getAdvisorAssignments = async (req, res) => {
  try {
    const assignments = await query(`
      SELECT 
        s.academic_batch,
        s.section,
        s.year,
        COUNT(*) as student_count,
        f.id as faculty_id,
        f.name as faculty_name,
        f.employee_id as faculty_emp_id,
        f.email as faculty_email,
        f.status as faculty_status
      FROM students s
      LEFT JOIN faculty f ON s.faculty_id = f.id
      GROUP BY s.academic_batch, s.section, s.year, f.id, f.name, f.employee_id, f.email, f.status
      ORDER BY s.academic_batch DESC, s.section ASC
    `);

    const activeFaculty = await query(`SELECT * FROM faculty WHERE status = 'ACTIVE' ORDER BY name ASC`);

    return res.json({ success: true, data: { assignments, activeFaculty } });
  } catch (error) {
    console.error('Get Advisor Assignments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading advisor assignments.' });
  }
};

// 7. Bulk Reassign Batch & Section to a new Faculty Advisor
exports.reassignBatchAdvisor = async (req, res) => {
  try {
    const { academicBatch, section, newFacultyId } = req.body;
    if (!academicBatch || !section || !newFacultyId) {
      return res.status(400).json({ success: false, message: 'Academic Batch, Section, and New Faculty Advisor are required.' });
    }

    const { transaction } = require('../config/db');

    const result = await transaction(async (tx) => {
      const newFac = await tx.getOne('SELECT * FROM faculty WHERE id = ?', [newFacultyId]);
      if (!newFac) throw new Error('Selected faculty advisor not found.');
      if (newFac.status !== 'ACTIVE') throw new Error(`Faculty '${newFac.name}' is marked as ${newFac.status} and cannot be assigned.`);

      const affected = await tx.query(
        'SELECT COUNT(*) as count FROM students WHERE academic_batch = ? AND section = ?',
        [academicBatch, section]
      );
      const studentCount = affected[0]?.count || 0;

      await tx.query(
        `UPDATE students
         SET faculty_id = ?,
             advisor_name = ?,
             advisor_emp_id = ?,
             advisor_email = ?,
             advisor_phone = ?
         WHERE academic_batch = ? AND section = ?`,
        [newFac.id, newFac.name, newFac.employee_id, newFac.email, newFac.phone || '', academicBatch, section]
      );

      return { studentCount, newFacultyName: newFac.name };
    });

    return res.json({
      success: true,
      message: `Successfully reassigned ${result.studentCount} students in Batch ${academicBatch} (${section}) to Faculty Advisor ${result.newFacultyName}.`
    });

  } catch (error) {
    console.error('Reassign Batch Advisor Error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Server error reassigning batch advisor.' });
  }
};

// 8. Replace Outgoing Faculty (Bulk Reassign selected groups and update outgoing status)
exports.replaceFaculty = async (req, res) => {
  try {
    const { outgoingFacultyId, replacementFacultyId, selectedGroups = [], newStatus } = req.body;

    if (!outgoingFacultyId || !replacementFacultyId || selectedGroups.length === 0) {
      return res.status(400).json({ success: false, message: 'Outgoing Faculty, Replacement Faculty, and at least one student group are required.' });
    }

    const { transaction } = require('../config/db');

    const result = await transaction(async (tx) => {
      const outgoing = await tx.getOne('SELECT * FROM faculty WHERE id = ?', [outgoingFacultyId]);
      const replacement = await tx.getOne('SELECT * FROM faculty WHERE id = ?', [replacementFacultyId]);

      if (!outgoing) throw new Error('Outgoing faculty member not found.');
      if (!replacement) throw new Error('Replacement faculty member not found.');
      if (replacement.status !== 'ACTIVE') throw new Error(`Replacement faculty '${replacement.name}' is inactive.`);

      let totalUpdated = 0;

      for (const group of selectedGroups) {
        const updateRes = await tx.query(
          `UPDATE students
           SET faculty_id = ?,
               advisor_name = ?,
               advisor_emp_id = ?,
               advisor_email = ?,
               advisor_phone = ?
           WHERE (faculty_id = ? OR advisor_emp_id = ?) AND academic_batch = ? AND section = ?`,
          [
            replacement.id, replacement.name, replacement.employee_id, replacement.email, replacement.phone || '',
            outgoingFacultyId, outgoing.employee_id, group.batch, group.section
          ]
        );
        totalUpdated += updateRes.changes || updateRes.affectedRows || 0;
      }

      if (newStatus && newStatus !== 'ACTIVE') {
        await tx.query('UPDATE faculty SET status = ? WHERE id = ?', [newStatus, outgoingFacultyId]);
      }

      return { totalUpdated, outgoingName: outgoing.name, replacementName: replacement.name, newStatus };
    });

    return res.json({
      success: true,
      message: `Successfully reassigned ${result.totalUpdated} students from '${result.outgoingName}' to '${result.replacementName}'. Outgoing status set to ${result.newStatus || 'INACTIVE'}.`
    });

  } catch (error) {
    console.error('Replace Faculty Error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Server error completing faculty replacement.' });
  }
};
