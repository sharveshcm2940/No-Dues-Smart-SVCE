const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress, logAuditEntry, executeStageTransition } = require('../utils/workflowHelper');
const { sanitizeStudentProfile, sanitizeRequest } = require('../utils/dataMasking');

// Get Faculty Advisor (FA) Dashboard Statistics & Advisees
exports.getFADashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // FA Profile
    const advisor = await getOne('SELECT * FROM faculty_advisors WHERE employee_id = ?', [empId]);

    // Assigned advisees list
    const adviseesRaw = await query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = s.register_number AND br.status = 'Issued') as active_books,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = s.register_number AND br.fine_status = 'Unpaid') as fine_unpaid,
        (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status,
        (SELECT current_stage FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as current_stage
       FROM students s
       WHERE s.advisor_emp_id = ? OR s.advisor_name = ?
       ORDER BY 
         CASE s.year 
           WHEN 'IV Year' THEN 4 
           WHEN 'III Year' THEN 3 
           WHEN 'II Year' THEN 2 
           WHEN 'I Year' THEN 1 
           ELSE 0 
         END DESC, 
         s.full_name ASC`,
      [empId, advisor ? advisor.full_name : '']
    );

    // Pending FA Stage Approvals
    const pendingFARequestsRaw = await query(`
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
        ns.status as fa_stage_status,
        ns.remarks as fa_stage_remarks
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'Faculty Advisor'
      WHERE ns.status = 'Pending' AND (nr.register_number IN (SELECT register_number FROM students WHERE advisor_emp_id = ? OR advisor_name = ?))
      ORDER BY 
        CASE nr.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        nr.student_name ASC`,
      [empId, advisor ? advisor.full_name : '']
    );

    const advisees = adviseesRaw.map(s => sanitizeStudentProfile(s, req.user.role));
    const pendingFARequests = pendingFARequestsRaw.map(r => sanitizeRequest(r, req.user.role));

    const approvedFACount = await getOne(`
      SELECT COUNT(*) as count 
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'Faculty Advisor' AND ns.status = 'Approved'
    `);

    return res.json({
      success: true,
      data: {
        advisor,
        stats: {
          totalAdvisees: advisees.length,
          pendingApprovals: pendingFARequests.length,
          approvedCount: approvedFACount.count || 0
        },
        advisees,
        pendingFARequests
      }
    });

  } catch (error) {
    console.error('FA Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading Faculty Advisor dashboard.' });
  }
};

// Process FA Action (Approve / Reject / Hold)
exports.processFAAction = async (req, res) => {
  try {
    const empId = req.user.username;
    const { requestId, action, remarks } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and Action are required.' });
    }

    if (!['Approve', 'Reject', 'Hold'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action specified.' });
    }

    const advisor = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ?', [empId]);
    const approverName = advisor ? `${advisor.full_name} (Faculty Advisor)` : 'Faculty Advisor';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    // Authorization Check: Verify student belongs to this Faculty Advisor
    const student = await getOne(
      'SELECT id FROM students WHERE register_number = ? AND (advisor_emp_id = ? OR advisor_name = ?)',
      [request.register_number, empId, advisor ? advisor.full_name : '']
    );
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: This student is not assigned under your Faculty Advisor advisee roster.'
      });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    const transitionResult = await executeStageTransition({
      requestId,
      departmentName: 'Faculty Advisor',
      action,
      remarks: remarks || (action === 'Approve' ? 'Faculty Advisor approval granted.' : 'Put on hold by Faculty Advisor.'),
      actorUser: { username: empId, full_name: approverName, role: 'faculty_advisor' }
    });

    if (!transitionResult.success) {
      return res.status(transitionResult.statusCode || 400).json({ success: false, message: transitionResult.message });
    }

    if (action === 'Reject' || action === 'Hold') {
      const isReject = action === 'Reject';
      const actionText = isReject ? 'rejected' : 'placed on hold';

      await notifyStudentAndFA({
        registerNumber: request.register_number,
        requestNumber: request.request_number,
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (Faculty Advisor Stage)`,
        studentMsg: `Your Faculty Advisor ${approverName} ${actionText} your No-Dues request ${request.request_number}. Remarks: ${remarks || 'Dues/Verification required'}`,
        faMsg: `URGENT ADVISEE ALERT: The No-Dues application (${request.request_number}) of your advisee ${request.student_name} (${request.register_number}) was ${actionText.toUpperCase()} by Faculty Advisor. Remarks: ${remarks || 'Dues/Action required'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${transitionResult.status} by Faculty Advisor.` });

  } catch (error) {
    console.error('Process FA Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing FA action.' });
  }
};

// Bulk Approve All Pending Advisee No-Dues Requests
exports.bulkApproveAdvisees = async (req, res) => {
  try {
    const empId = req.user.username;
    const fa = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ?', [empId]);
    const approverName = fa ? `${fa.full_name} (Faculty Advisor)` : 'Faculty Advisor Sign-off';

    const faName = fa ? fa.full_name : '';
    const pendingStages = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number, nr.year
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      JOIN students s ON nr.register_number = s.register_number
      WHERE ns.department_name = 'Faculty Advisor' AND ns.status = 'Pending'
        AND (s.advisor_emp_id = ? OR s.advisor_name = ?)
        AND (
          SELECT status 
          FROM nodues_stages fin_s 
          WHERE fin_s.request_id = nr.id AND fin_s.department_name = 'Finance'
        ) = 'Approved'
    `, [empId, faName]);

    let count = 0;
    for (const item of pendingStages) {
      const transResult = await executeStageTransition({
        requestId: item.request_id,
        departmentName: 'Faculty Advisor',
        action: 'Approve',
        remarks: 'Bulk Approved by Faculty Advisor.',
        actorUser: { username: empId, full_name: approverName, role: 'faculty_advisor' }
      });

      if (transResult.success) {
        count++;
      }
    }

    return res.json({
      success: true,
      message: `Successfully granted Faculty Advisor approval for ${count} advisee request(s).`
    });
  } catch (error) {
    console.error('Bulk Approve FA Error:', error);
    return res.status(500).json({ success: false, message: 'Error executing bulk Faculty Advisor approval.' });
  }
};

// Get all students assigned under logged-in FA with Hall Ticket status
exports.getAssignedStudents = async (req, res) => {
  try {
    const empId = req.user.username;
    const advisor = await getOne('SELECT * FROM faculty_advisors WHERE employee_id = ?', [empId]);

    const students = await query(
      `SELECT s.*,
        COALESCE(s.hall_ticket_status, 'Not Issued') as hall_ticket_status,
        s.hall_ticket_issued_by,
        s.hall_ticket_issued_by_emp_id,
        s.hall_ticket_issued_at,
        s.hall_ticket_remarks,
        (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status,
        (SELECT current_stage FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as current_stage,
        (SELECT request_number FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as request_number,
        (SELECT id FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as request_id
       FROM students s
       WHERE s.advisor_emp_id = ? OR s.advisor_name = ?
       ORDER BY 
         CASE s.year 
           WHEN 'IV Year' THEN 4 
           WHEN 'III Year' THEN 3 
           WHEN 'II Year' THEN 2 
           WHEN 'I Year' THEN 1 
           ELSE 0 
         END DESC, 
         s.full_name ASC`,
      [empId, advisor ? advisor.full_name : '']
    );

    const totalStudents = students.length;
    const issuedCount = students.filter(s => s.hall_ticket_status === 'Issued').length;
    const notIssuedCount = totalStudents - issuedCount;

    return res.json({
      success: true,
      data: {
        advisor,
        stats: {
          totalStudents,
          issuedCount,
          notIssuedCount
        },
        students
      }
    });

  } catch (error) {
    console.error('Get Assigned Students Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading assigned students roster.' });
  }
};

// Update Student Hall Ticket Issued Status (FA Only)
exports.updateHallTicketStatus = async (req, res) => {
  try {
    const empId = req.user.username;
    const { register_number, hall_ticket_status, remarks } = req.body;

    if (!register_number || !hall_ticket_status) {
      return res.status(400).json({ success: false, message: 'Register Number and Hall Ticket Status are required.' });
    }

    const advisor = await getOne('SELECT * FROM faculty_advisors WHERE employee_id = ?', [empId]);
    if (!advisor) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Logged in user is not a Faculty Advisor.' });
    }

    // Backend Role-Based Access Control: Verify student belongs to logged in FA
    const student = await getOne(
      'SELECT * FROM students WHERE register_number = ? AND (advisor_emp_id = ? OR advisor_name = ?)',
      [register_number, empId, advisor.full_name]
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: This student is not assigned under your Faculty Advisor roster.'
      });
    }

    const prevStatus = student.hall_ticket_status || 'Not Issued';

    // Update student hall ticket info
    await query(
      `UPDATE students 
       SET hall_ticket_status = ?,
           hall_ticket_issued_by = ?,
           hall_ticket_issued_by_emp_id = ?,
           hall_ticket_issued_at = NOW(),
           hall_ticket_remarks = ?
       WHERE register_number = ?`,
      [hall_ticket_status, advisor.full_name, empId, remarks || null, register_number]
    );

    // Record audit entry in hall_ticket_audit_logs
    await query(
      `INSERT INTO hall_ticket_audit_logs (
        student_register_number, student_name, previous_status, new_status, updated_by_name, updated_by_emp_id, remarks, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [register_number, student.full_name, prevStatus, hall_ticket_status, advisor.full_name, empId, remarks || null]
    );

    // Send notification to student
    await query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        register_number,
        'Hall Ticket Status Updated',
        `Your Hall Ticket status has been marked as: ${hall_ticket_status} by Faculty Advisor ${advisor.full_name}.`,
        hall_ticket_status === 'Issued' ? 'success' : 'warning'
      ]
    );

    return res.json({
      success: true,
      message: `Hall Ticket status for ${student.full_name} updated to '${hall_ticket_status}' successfully.`
    });

  } catch (error) {
    console.error('Update Hall Ticket Status Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating Hall Ticket status.' });
  }
};

// Get Detailed Student Profile & Hall Ticket Audit History
exports.getStudentHallTicketDetail = async (req, res) => {
  try {
    const { regNo } = req.params;

    const empId = req.user.username;
    const advisor = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ?', [empId]);

    const student = await getOne(
      'SELECT * FROM students WHERE register_number = ? AND (advisor_emp_id = ? OR advisor_name = ?)',
      [regNo, empId, advisor ? advisor.full_name : '']
    );
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Student is not assigned under your Faculty Advisor advisee roster.'
      });
    }

    // No dues request & stages
    const noduesRequest = await getOne('SELECT * FROM nodues_requests WHERE register_number = ? ORDER BY id DESC LIMIT 1', [regNo]);
    let stages = [];
    let auditLogs = [];

    if (noduesRequest) {
      stages = await query('SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC', [noduesRequest.id]);
      auditLogs = await query('SELECT * FROM nodues_audit_logs WHERE request_id = ? ORDER BY timestamp DESC', [noduesRequest.id]);
    }

    // Hall Ticket audit history
    const htAuditLogs = await query(
      'SELECT * FROM hall_ticket_audit_logs WHERE student_register_number = ? ORDER BY timestamp DESC',
      [regNo]
    );

    // Library borrow records
    const borrowRecords = await query(
      'SELECT * FROM borrow_records WHERE register_number = ? ORDER BY issue_date DESC',
      [regNo]
    );

    return res.json({
      success: true,
      data: {
        student,
        noduesRequest,
        stages,
        auditLogs,
        htAuditLogs,
        borrowRecords
      }
    });

  } catch (error) {
    console.error('Get Student Hall Ticket Detail Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching student details.' });
  }
};
