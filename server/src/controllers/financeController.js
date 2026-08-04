const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress } = require('../utils/workflowHelper');

// Get Finance Dashboard Stats & Requests
exports.getFinanceDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // Finance Profile
    const finance = await getOne('SELECT * FROM finance_profile WHERE employee_id = ?', [empId]);

    // All active requests with student details
    const allRequests = await query(`
      SELECT nr.*, s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone
      FROM nodues_requests nr
      JOIN students s ON nr.register_number = s.register_number
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

    // Pending Finance clearances (Stage 1)
    const pendingRequests = await query(`
      SELECT 
        nr.*,
        s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone,
        ns.status as finance_stage_status,
        ns.remarks as finance_stage_remarks
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'Finance'
      JOIN students s ON nr.register_number = s.register_number
      WHERE ns.status = 'Pending'
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

    // Approved Finance count
    const approvedCount = await getOne(`
      SELECT COUNT(*) as count 
      FROM nodues_stages 
      WHERE department_name = 'Finance' AND status = 'Approved'
    `);

    return res.json({
      success: true,
      data: {
        finance,
        stats: {
          totalRequests: allRequests.length,
          pendingApprovals: pendingRequests.length,
          approvedCount: approvedCount.count || 0
        },
        allRequests,
        pendingRequests
      }
    });

  } catch (error) {
    console.error('Finance Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading Finance dashboard.' });
  }
};

// Process Finance Action (Approve / Reject / Hold)
exports.processFinanceAction = async (req, res) => {
  try {
    const empId = req.user.username;
    const { requestId, action, remarks } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and Action are required.' });
    }

    const officer = await getOne('SELECT full_name FROM finance_profile WHERE employee_id = ?', [empId]);
    const approverName = officer ? `${officer.full_name} (Finance Officer)` : 'Finance Officer';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    const newStatus = action === 'Approve' ? 'Approved' : (action === 'Reject' ? 'Rejected' : 'Hold');

    // Update Finance Stage
    await query(
      `UPDATE nodues_stages 
       SET status = ?, approved_by = ?, remarks = ?, updated_at = datetime('now')
       WHERE request_id = ? AND department_name = 'Finance'`,
      [newStatus, approverName, remarks || 'Tuition and laboratory accounts cleared.', requestId]
    );

    if (action === 'Approve') {
      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'Finance Clearance Approved', `Finance Section (${approverName}) has cleared your No-Dues request.`, 'success']
      );

      // Check parallel clearance to unlock FA
      await updateRequestProgress(requestId);
    } else if (action === 'Reject' || action === 'Hold') {
      const isReject = action === 'Reject';
      const actionText = isReject ? 'rejected' : 'placed on hold';

      if (isReject) {
        await query(
          `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'Finance (Rejected)' WHERE id = ?`,
          [requestId]
        );
      }

      await notifyStudentAndFA({
        registerNumber: request.register_number,
        requestNumber: request.request_number,
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (Finance Stage)`,
        studentMsg: `Finance Officer ${approverName} ${actionText} your clearance. Remarks: ${remarks || 'Outstanding fees/dues detected.'}`,
        faMsg: `ADVISEE FINANCE ALERT: No-Dues application (${request.request_number}) of ${request.student_name} was ${actionText.toUpperCase()} by Finance Section. Remarks: ${remarks || 'Outstanding fees/dues detected.'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${newStatus} by Finance.` });

  } catch (error) {
    console.error('Process Finance Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing Finance action.' });
  }
};

// Bulk Approve Finance Requests
exports.bulkApproveFinance = async (req, res) => {
  try {
    const empId = req.user.username;
    const officer = await getOne('SELECT full_name FROM finance_profile WHERE employee_id = ?', [empId]);
    const approverName = officer ? `${officer.full_name} (Finance Officer)` : 'Finance Officer';

    const pendingRequests = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'Finance' AND ns.status = 'Pending'
    `);

    let count = 0;
    for (const item of pendingRequests) {
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = 'Bulk Approved by Finance Section.', updated_at = datetime('now')
         WHERE request_id = ? AND department_name = 'Finance'`,
        [approverName, item.request_id]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [item.register_number, 'Finance Clearance Approved', `Finance Section has cleared your No-Dues request ${item.request_number}.`, 'success']
      );

      await updateRequestProgress(item.request_id);
      count++;
    }

    return res.json({ success: true, message: `Successfully bulk approved ${count} Finance clearance requests.` });

  } catch (error) {
    console.error('Bulk Approve Finance Error:', error);
    return res.status(500).json({ success: false, message: 'Error executing bulk Finance approval.' });
  }
};
