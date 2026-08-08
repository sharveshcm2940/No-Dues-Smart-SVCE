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
      const batch = s.batch || '2022-2026';
      const advEmp = s.advisor_emp_id || s.advisorEmp || 'EMP-FA-IT-01';
      const advName = s.advisor_name || s.advisorName || 'V.Praveen Kumar';

      // Query advisor details for email and phone syncing
      const fa = await getOne('SELECT email, phone FROM faculty_advisors WHERE employee_id = ?', [advEmp]);
      const advEmail = fa ? fa.email : `${advName.toLowerCase().replace(/ /g, '')}@svce.ac.in`;
      const advPhone = fa ? fa.phone : '+91 98401 11223';

      // Insert User login record
      await query(
        `INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, 'student', ?)`,
        [regNo, passwordHash, email]
      );

      const userRow = await getOne('SELECT id FROM users WHERE username = ?', [regNo]);
      if (userRow) {
        // Insert student profile
        const result = await query(
          `INSERT OR IGNORE INTO students (
            user_id, register_number, id_card_number, full_name, college_name, department, programme, batch, year, semester, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone
          ) VALUES (?, ?, ?, ?, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', ?, ?, 'Semester VII', ?, ?, ?, ?, ?, ?, ?)`,
          [userRow.id, regNo, idCard, name, batch, year, section, email, phone, advName, advEmp, advEmail, advPhone]
        );

        if (result.changes > 0) {
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
