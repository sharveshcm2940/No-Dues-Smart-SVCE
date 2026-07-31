const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');

// Get Faculty Advisor (FA) Dashboard Statistics & Advisees
exports.getFADashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // FA Profile
    const advisor = await getOne('SELECT * FROM faculty_advisors WHERE employee_id = ?', [empId]);

    // Assigned advisees list
    const advisees = await query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = s.register_number AND br.status = 'Issued') as active_books,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = s.register_number AND br.fine_status = 'Unpaid') as fine_unpaid,
        (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status,
        (SELECT current_stage FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as current_stage
       FROM students s
       WHERE s.advisor_emp_id = ? OR s.advisor_name = ?
       ORDER BY s.id DESC`,
      [empId, advisor ? advisor.full_name : '']
    );

    // Pending FA Stage Approvals
    const pendingFARequests = await query(`
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
      ORDER BY nr.id DESC`,
      [empId, advisor ? advisor.full_name : '']
    );

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

    const advisor = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ?', [empId]);
    const approverName = advisor ? `${advisor.full_name} (Faculty Advisor)` : 'Faculty Advisor';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    const newStatus = action === 'Approve' ? 'Approved' : (action === 'Reject' ? 'Rejected' : 'Hold');

    // Update Faculty Advisor Stage
    await query(
      `UPDATE nodues_stages 
       SET status = ?, approved_by = ?, remarks = ?, updated_at = datetime('now')
       WHERE request_id = ? AND department_name = 'Faculty Advisor'`,
      [newStatus, approverName, remarks || 'Faculty Advisor approval granted.', requestId]
    );

    if (action === 'Approve') {
      // Advance to DPC (Stage 5)
      await query(
        `UPDATE nodues_stages SET status = 'Approved', approved_by = 'DPC Automated Review', remarks = 'Department Performance Committee cleared.' 
         WHERE request_id = ? AND department_name = 'DPC'`,
        [requestId]
      );

      // Advance to HOD (Stage 6)
      await query(
        `UPDATE nodues_stages SET status = 'Pending', remarks = 'Awaiting Head of Department (HOD) final sign-off.' 
         WHERE request_id = ? AND department_name = 'HOD'`,
        [requestId]
      );

      await query(
        `UPDATE nodues_requests SET progress_percentage = 83, current_stage = 'HOD Final Approval' WHERE id = ?`,
        [requestId]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'Faculty Advisor Approved', `Your Faculty Advisor ${approverName} approved your No-Dues request ${request.request_number}.`, 'success']
      );
    } else if (action === 'Reject' || action === 'Hold') {
      const isReject = action === 'Reject';
      const actionText = isReject ? 'rejected' : 'placed on hold';

      if (isReject) {
        await query(
          `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'Faculty Advisor (Rejected)' WHERE id = ?`,
          [requestId]
        );
      }

      await notifyStudentAndFA({
        registerNumber: request.register_number,
        requestNumber: request.request_number,
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (Faculty Advisor Stage)`,
        studentMsg: `Your Faculty Advisor ${approverName} ${actionText} your No-Dues request ${request.request_number}. Remarks: ${remarks || 'Dues/Verification required'}`,
        faMsg: `URGENT ADVISEE ALERT: The No-Dues application (${request.request_number}) of your advisee ${request.student_name} (${request.register_number}) was ${actionText.toUpperCase()} by Faculty Advisor. Remarks: ${remarks || 'Dues/Action required'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${newStatus} by Faculty Advisor.` });

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

    const pendingStages = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number, nr.year
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      JOIN students s ON nr.register_number = s.register_number
      WHERE ns.department_name = 'Faculty Advisor' AND ns.status = 'Pending' AND s.advisor_id = ?
    `, [empId]);

    let count = 0;
    for (const item of pendingStages) {
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = 'Bulk Approved by Faculty Advisor.', updated_at = datetime('now') 
         WHERE request_id = ? AND department_name = 'Faculty Advisor'`,
        [approverName, item.request_id]
      );

      const is4thYear = item.year && (item.year.includes('IV') || item.year.includes('4th') || item.year.includes('Fourth') || item.year === 'IV Year');
      const nextStage = is4thYear ? 'DPC' : 'HOD';

      await query(
        `UPDATE nodues_stages 
         SET status = 'Pending', remarks = ? 
         WHERE request_id = ? AND department_name = ?`,
        [is4thYear ? 'Awaiting DPC placement officer verification.' : 'Awaiting HOD final approval.', item.request_id, nextStage]
      );

      await query(
        `UPDATE nodues_requests 
         SET progress_percentage = 83, current_stage = ? 
         WHERE id = ?`,
        [nextStage, item.request_id]
      );

      count++;
    }

    return res.json({
      success: true,
      message: `Successfully bulk approved ${count} advisee No-Dues clearance request(s).`
    });
  } catch (error) {
    console.error('Bulk Approve FA Error:', error);
    return res.status(500).json({ success: false, message: 'Error performing bulk FA approval.' });
  }
};
