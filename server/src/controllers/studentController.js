const { query, getOne, getPool } = require('../config/db');
const { updateRequestProgress, logAuditEntry, executeStageTransition } = require('../utils/workflowHelper');
const { appendNoDuesAuditLog } = require('../utils/auditChain');
const { logAuditEvent } = require('../utils/auditLogger');

// Get Student Dashboard Data
exports.getStudentDashboard = async (req, res) => {
  try {
    const regNo = req.user.username;

    // Student Profile
    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [regNo]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Borrowed Books count
    const borrowedBooks = await query(
      `SELECT br.*, b.title, b.author, b.shelf_number 
       FROM borrow_records br
       JOIN books b ON br.book_id = b.book_id
       WHERE br.register_number = ? AND br.status = 'Issued'`,
      [regNo]
    );

    // Total Fine accumulated
    const fineSum = await getOne(
      `SELECT SUM(fine_amount) as total_fine FROM borrow_records WHERE register_number = ? AND fine_status = 'Unpaid'`,
      [regNo]
    );

    // Active No-Dues Request & Stages
    let activeRequest = await getOne(
      `SELECT * FROM nodues_requests WHERE register_number = ? ORDER BY id DESC LIMIT 1`,
      [regNo]
    );

    let stages = [];

    if (activeRequest) {
      await updateRequestProgress(activeRequest.id);
      activeRequest = await getOne(
        `SELECT * FROM nodues_requests WHERE id = ?`,
        [activeRequest.id]
      );

      stages = await query(
        `SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC`,
        [activeRequest.id]
      );
    }

    // Dept Library Clearance Status Calculation
    const deptLibraryStage = stages.find(s => s.department_name === 'Department Library');
    const deptLibraryStatus = deptLibraryStage ? deptLibraryStage.status : (borrowedBooks.length === 0 && (fineSum.total_fine || 0) === 0 ? 'Eligible' : 'Dues Pending');

    const approvedCount = stages.filter(s => s.status === 'Approved').length;
    const pendingCount = stages.filter(s => s.status === 'Pending').length;

    // All Approved Certificates (Current & Previous Terms)
    const approvedCertificates = await query(
      `SELECT * FROM nodues_requests WHERE register_number = ? AND overall_status = 'Approved' ORDER BY id DESC`,
      [regNo]
    );

    return res.json({
      success: true,
      data: {
        profile: student,
        metrics: {
          borrowedCount: borrowedBooks.length,
          pendingBooks: borrowedBooks.length,
          currentFine: fineSum.total_fine || 0,
          deptLibraryStatus,
          overallStatus: activeRequest ? activeRequest.overall_status : 'Not Submitted',
          activeRequestNumber: activeRequest ? activeRequest.request_number : null,
          approvedDepartments: approvedCount,
          pendingDepartments: pendingCount
        },
        activeRequest,
        approvedCertificates,
        stages,
        borrowedBooks
      }
    });

  } catch (error) {
    console.error('Student Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading student dashboard.' });
  }
};

// Submit No-Dues Request
exports.submitNoDuesRequest = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const regNo = req.user.username;
    const { 
      remarks,
      career_option,
      company_name,
      job_designation,
      ctc_package,
      offer_letter_url,
      higher_college_name,
      higher_degree,
      higher_app_form_url,
      higher_scorecard_url,
      higher_letter_url,
      higher_contact,
      exam_name,
      exam_reg_no,
      admit_card_url,
      exam_letter_url,
      exam_details,
      startup_name,
      business_idea,
      business_details,
      pitch_deck_url
    } = req.body || {};

    // 1. Check if student already has an active No-Dues request in progress
    const [inProgressReqs] = await conn.query(
      `SELECT * FROM nodues_requests WHERE register_number = ? AND overall_status = 'In Progress' FOR UPDATE`,
      [regNo]
    );

    if (inProgressReqs && inProgressReqs.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `You already have an active No-Dues request (${inProgressReqs[0].request_number}) in progress. A student can only apply for one No-Dues request at a time.`
      });
    }

    // 2. Check if student already has an approved request
    const [approvedReqs] = await conn.query(
      `SELECT * FROM nodues_requests WHERE register_number = ? AND overall_status = 'Approved' FOR UPDATE`,
      [regNo]
    );

    if (approvedReqs && approvedReqs.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Your No-Dues clearance application (${approvedReqs[0].request_number}) has already been fully approved and completed.`
      });
    }

    const [students] = await conn.query('SELECT * FROM students WHERE register_number = ?', [regNo]);
    if (!students || students.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    const student = students[0];

    const [maxIdRows] = await conn.query('SELECT MAX(id) as max_id FROM nodues_requests');
    const nextNum = (maxIdRows && maxIdRows[0] && maxIdRows[0].max_id ? maxIdRows[0].max_id : 0) + 1;
    const reqNum = `NDR-2026-${String(nextNum).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

    const [insertResult] = await conn.query(
      `INSERT INTO nodues_requests (
        request_number, register_number, student_name, id_card_number, department, year, overall_status, progress_percentage, current_stage,
        career_option, company_name, job_designation, ctc_package, offer_letter_url,
        higher_college_name, higher_degree, higher_app_form_url, higher_scorecard_url, higher_letter_url, higher_contact,
        exam_name, exam_reg_no, admit_card_url, exam_letter_url, exam_details,
        startup_name, business_idea, business_details, pitch_deck_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqNum, regNo, student.full_name, student.id_card_number, student.department, student.year, 'In Progress', 0, 'Department Library',
        career_option || null, company_name || null, job_designation || null, ctc_package || null, offer_letter_url || null,
        higher_college_name || null, higher_degree || null, higher_app_form_url || null, higher_scorecard_url || null, higher_letter_url || null, higher_contact || null,
        exam_name || null, exam_reg_no || null, admit_card_url || null, exam_letter_url || null, exam_details || null,
        startup_name || null, business_idea || null, business_details || null, pitch_deck_url || null
      ]
    );

    const requestId = insertResult.insertId;
    const isFourthYear = Boolean(student.year && (student.year.includes('IV') || student.year.includes('4th')));

    // Sequential 6-stage clearance workflow:
    // 1. Dept Library -> 2. DPC -> 3. Central Library -> 4. Faculty Advisor -> 5. Finance -> 6. HOD
    const stages = [
      { name: 'Department Library', order: 1, status: 'Pending', approved_by: null, remarks: remarks || 'Awaiting Department Library clearance review.' },
      { name: 'DPC', order: 2, status: isFourthYear ? 'Locked' : 'Approved', approved_by: isFourthYear ? null : 'System (Auto-Cleared)', remarks: isFourthYear ? (career_option ? `Awaiting DPC verification of Career Option: ${career_option}` : 'Awaiting DPC / placement verification.') : 'Not applicable for non-final year students.' },
      { name: 'Central Library', order: 3, status: 'Locked', approved_by: null, remarks: 'Awaiting Central Library clearance review.' },
      { name: 'Faculty Advisor', order: 4, status: 'Locked', approved_by: null, remarks: 'Awaiting Faculty Advisor review.' },
      { name: 'Finance', order: 5, status: 'Locked', approved_by: null, remarks: 'Awaiting Finance clearance review.' },
      { name: 'HOD', order: 6, status: 'Locked', approved_by: null, remarks: 'Awaiting HOD final review.' }
    ];

    for (const s of stages) {
      await conn.query(
        `INSERT INTO nodues_stages (request_id, department_name, stage_order, status, updated_at, approved_by, remarks)
         VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
        [requestId, s.name, s.order, s.status, s.approved_by, s.remarks]
      );
    }

    // Cryptographic hash-chained audit log
    await appendNoDuesAuditLog({
      requestId,
      departmentName: 'Student Submission',
      actionType: 'Submission',
      actorName: student.full_name,
      actorRole: 'student',
      statusAfter: 'Pending Department Library',
      remarks: remarks || 'No-Dues clearance application submitted by student.'
    }, conn);

    // Notifications
    await conn.query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [regNo, 'No-Dues Request Submitted', `Your No-Dues request ${reqNum} was submitted successfully and sent for Department Library clearance.`, 'success']
    );

    await conn.query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES ('library_staff', ?, ?, 'info')`,
      [
        'New No-Dues Clearance Request', `Student ${student.full_name} (${regNo}) has submitted a new No-Dues request ${reqNum}.`
      ]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: `No-Dues Request ${reqNum} submitted successfully!`,
      requestNumber: reqNum
    });

  } catch (error) {
    await conn.rollback();
    console.error('Submit Request Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit No-Dues request.' });
  } finally {
    conn.release();
  }
};

// Cancel No-Dues Request (before final processing)
exports.cancelNoDuesRequest = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const regNo = req.user.username;
    const { requestId } = req.body;

    const [requests] = await conn.query(
      `SELECT * FROM nodues_requests WHERE id = ? AND register_number = ? FOR UPDATE`,
      [requestId, regNo]
    );

    if (!requests || requests.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Request record not found.' });
    }

    const request = requests[0];

    if (request.overall_status === 'Approved') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Approved requests cannot be cancelled.' });
    }

    // Soft cancellation: update status to Cancelled and retain audit logs and stage history
    await conn.query(
      `UPDATE nodues_requests 
       SET overall_status = 'Cancelled', current_stage = 'Cancelled by Student' 
       WHERE id = ?`,
      [requestId]
    );

    await appendNoDuesAuditLog({
      requestId,
      departmentName: 'Student Cancellation',
      actionType: 'Cancellation',
      actorName: request.student_name,
      actorRole: 'student',
      statusAfter: 'Cancelled',
      remarks: 'Application cancelled by student. Audit trail preserved.'
    }, conn);

    await conn.commit();

    return res.json({ success: true, message: 'No-Dues request has been cancelled successfully.' });
  } catch (error) {
    await conn.rollback();
    console.error('Cancel Request Error:', error);
    return res.status(500).json({ success: false, message: 'Error cancelling request.' });
  } finally {
    conn.release();
  }
};

// Get Borrowed Books & Borrow History
exports.getBorrowRecords = async (req, res) => {
  try {
    const regNo = req.user.username;

    const activeBooks = await query(
      `SELECT br.*, b.title, b.author, b.publisher, b.category, b.shelf_number
       FROM borrow_records br
       JOIN books b ON br.book_id = b.book_id
       WHERE br.register_number = ? AND br.status = 'Issued'
       ORDER BY br.due_date ASC`,
      [regNo]
    );

    const history = await query(
      `SELECT br.*, b.title, b.author, b.publisher, b.category
       FROM borrow_records br
       JOIN books b ON br.book_id = b.book_id
       WHERE br.register_number = ? AND br.status = 'Returned'
       ORDER BY br.return_date DESC`,
      [regNo]
    );

    return res.json({
      success: true,
      data: {
        activeBooks,
        history
      }
    });

  } catch (error) {
    console.error('Get Borrow Records Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching borrow records.' });
  }
};

// Complaint Registration & Management
exports.getStudentComplaints = async (req, res) => {
  try {
    const regNo = req.user.username;
    const complaints = await query(
      `SELECT * FROM complaints WHERE register_number = ? ORDER BY id DESC`,
      [regNo]
    );
    return res.json({ success: true, complaints });
  } catch (error) {
    console.error('Get Complaints Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching complaints.' });
  }
};

exports.createComplaint = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { category, title, description, priority, attachmentUrl } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ success: false, message: 'Category, Title, and Description are required.' });
    }

    const student = await getOne('SELECT full_name FROM students WHERE register_number = ?', [regNo]);
    const maxIdRow = await getOne('SELECT MAX(id) as max_id FROM complaints');
    const nextNum = (maxIdRow && maxIdRow.max_id ? maxIdRow.max_id : 0) + 1;
    const cmpId = `CMP-IT-2026-${String(nextNum).padStart(3, '0')}`;

    await query(
      `INSERT INTO complaints (complaint_id, register_number, student_name, category, title, description, attachment_url, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cmpId, regNo, student ? student.full_name : 'Student', category, title, description, attachmentUrl || null, priority || 'Medium', 'Open']
    );

    return res.json({ success: true, message: 'Complaint registered successfully.', complaintId: cmpId });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    return res.status(500).json({ success: false, message: 'Error registering complaint.' });
  }
};

// Get Announcements Feed
exports.getAnnouncements = async (req, res) => {
  try {
    const list = await query(
      `SELECT * FROM announcements WHERE status = 'Published' ORDER BY is_pinned DESC, id DESC`
    );
    return res.json({ success: true, announcements: list });
  } catch (error) {
    console.error('Get Announcements Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading announcements.' });
  }
};

// Get User Notifications (Student, FA, Staff, DPC, HOD, Finance, Main Library)
exports.getNotifications = async (req, res) => {
  try {
    const username = req.user.username;
    const role = req.user.role;

    let possibleTargets = [username, role];

    if (role === 'student') {
      const student = await getOne('SELECT register_number, email FROM students WHERE user_id = ? OR register_number = ?', [req.user.id, username]);
      if (student) {
        if (student.register_number) possibleTargets.push(student.register_number);
        if (student.email) possibleTargets.push(student.email);
      }
    } else if (role === 'faculty_advisor') {
      const fa = await getOne('SELECT employee_id, email, full_name FROM faculty_advisors WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (fa) {
        if (fa.employee_id) possibleTargets.push(fa.employee_id);
        if (fa.email) possibleTargets.push(fa.email);
        if (fa.full_name) possibleTargets.push(fa.full_name);
      }
    } else if (role === 'hod') {
      const hod = await getOne('SELECT employee_id, email, full_name FROM hod_profile WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (hod) {
        if (hod.employee_id) possibleTargets.push(hod.employee_id);
        if (hod.email) possibleTargets.push(hod.email);
        if (hod.full_name) possibleTargets.push(hod.full_name);
      }
    } else if (role === 'dpc') {
      const dpc = await getOne('SELECT employee_id, email, full_name FROM dpc_profile WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (dpc) {
        if (dpc.employee_id) possibleTargets.push(dpc.employee_id);
        if (dpc.email) possibleTargets.push(dpc.email);
        if (dpc.full_name) possibleTargets.push(dpc.full_name);
      }
    } else if (role === 'finance') {
      const fin = await getOne('SELECT employee_id, email, full_name FROM finance_profile WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (fin) {
        if (fin.employee_id) possibleTargets.push(fin.employee_id);
        if (fin.email) possibleTargets.push(fin.email);
        if (fin.full_name) possibleTargets.push(fin.full_name);
      }
    } else if (role === 'main_library_staff') {
      const ml = await getOne('SELECT employee_id, email, full_name FROM main_library_profile WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (ml) {
        if (ml.employee_id) possibleTargets.push(ml.employee_id);
        if (ml.email) possibleTargets.push(ml.email);
        if (ml.full_name) possibleTargets.push(ml.full_name);
      }
    } else if (role === 'library_staff') {
      const ls = await getOne('SELECT employee_id, email, full_name FROM library_staff WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (ls) {
        if (ls.employee_id) possibleTargets.push(ls.employee_id);
        if (ls.email) possibleTargets.push(ls.email);
        if (ls.full_name) possibleTargets.push(ls.full_name);
      }
    }

    // Remove duplicates and empty values
    possibleTargets = [...new Set(possibleTargets.filter(Boolean))];

    const placeholders = possibleTargets.map(() => '?').join(',');
    const list = await query(
      `SELECT * FROM notifications WHERE target_user IN (${placeholders}) ORDER BY id DESC LIMIT 30`,
      possibleTargets
    );

    return res.json({ success: true, notifications: list });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading notifications.' });
  }
};

// Update Profile Details (Phone Number, Photo)
exports.updateProfile = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { phone, photoUrl } = req.body;

    if (phone) {
      await query(`UPDATE students SET phone = ? WHERE register_number = ?`, [phone, regNo]);
    }
    if (photoUrl) {
      await query(`UPDATE students SET photo_url = ? WHERE register_number = ?`, [photoUrl, regNo]);
    }

    await logAuditEvent({
      req,
      user: req.user,
      action: 'PROFILE_UPDATED',
      details: `Student profile contact/photo details updated`,
      module: 'Profile Management'
    });

    return res.json({ success: true, message: 'Profile details updated successfully.' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating profile details.' });
  }
};

// Re-submit No-Dues Request after Rejection (Targeted Re-submission)
exports.resubmitNoDuesRequest = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { requestId, comment, attachmentUrl } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'A student comment explaining what issue was resolved is mandatory before re-submitting.'
      });
    }

    const request = await getOne(
      'SELECT * FROM nodues_requests WHERE id = ? AND register_number = ?',
      [requestId, regNo]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request record not found.' });
    }

    // Find the stage that rejected the request
    const stages = await query('SELECT * FROM nodues_stages WHERE request_id = ?', [requestId]);
    const rejectedStage = stages.find(s => s.status === 'Rejected');

    if (!rejectedStage) {
      return res.status(400).json({
        success: false,
        message: 'No rejected department stage found for this request. Only rejected requests can be re-submitted.'
      });
    }

    const deptName = rejectedStage.department_name;

    const transitionResult = await executeStageTransition({
      requestId,
      departmentName: deptName,
      action: 'Resubmit',
      remarks: `Re-submitted by student: ${comment.trim()}`,
      actorUser: { username: regNo, full_name: request.student_name, role: 'student' }
    });

    if (!transitionResult.success) {
      return res.status(transitionResult.statusCode || 400).json({ success: false, message: transitionResult.message });
    }

    // Send notification ONLY to the rejecting department
    const roleTargetMap = {
      'Central Library': 'main_library_staff',
      'Department Library': 'library_staff',
      'DPC': 'dpc',
      'Finance': 'finance',
      'Faculty Advisor': 'faculty_advisor',
      'HOD': 'hod'
    };

    const targetRole = roleTargetMap[deptName] || deptName;

    await query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        targetRole,
        `Re-submitted Clearance Request (${request.request_number})`,
        `Student ${request.student_name} (${request.register_number}) has re-submitted their clearance request to ${deptName}. Comment: "${comment.trim()}"`,
        'info'
      ]
    );

    return res.json({
      success: true,
      message: `Your clearance request has been re-submitted directly to ${deptName}.`
    });

  } catch (error) {
    console.error('Re-submit Request Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing re-submission.' });
  }
};

// Get Audit Log Trail for a Request
exports.getAuditLogs = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Authorization check: If user is student, verify request ownership
    if (req.user.role === 'student') {
      const owned = await getOne(
        'SELECT id FROM nodues_requests WHERE id = ? AND register_number = ?',
        [requestId, req.user.username]
      );
      if (!owned) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this clearance request.' });
      }
    }

    const logs = await query(
      `SELECT * FROM nodues_audit_logs WHERE request_id = ? ORDER BY id DESC`,
      [requestId]
    );
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching audit logs.' });
  }
};
