const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress, logAuditEntry } = require('../utils/workflowHelper');

// Get Main Library Dashboard Stats & Requests
exports.getMainLibraryDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // Main Library Profile
    const mainLib = await getOne('SELECT * FROM main_library_profile WHERE employee_id = ?', [empId]);

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

    // Pending Central Library clearances (Stage 2)
    const pendingRequests = await query(`
      SELECT 
        nr.*,
        s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone,
        ns.status as main_library_stage_status,
        ns.remarks as main_library_stage_remarks
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'Central Library'
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

    // Approved Central Library count
    const approvedCount = await getOne(`
      SELECT COUNT(*) as count 
      FROM nodues_stages 
      WHERE department_name = 'Central Library' AND status = 'Approved'
    `);

    return res.json({
      success: true,
      data: {
        mainLib,
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
    console.error('Main Library Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading Main Library dashboard.' });
  }
};

// Process Main Library Action (Approve / Reject / Hold)
exports.processMainLibraryAction = async (req, res) => {
  try {
    const empId = req.user.username;
    const { requestId, action, remarks } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and Action are required.' });
    }

    const officer = await getOne('SELECT full_name FROM main_library_profile WHERE employee_id = ?', [empId]);
    const approverName = officer ? `${officer.full_name} (Main Library Staff)` : 'Main Library Staff';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    const newStatus = action === 'Approve' ? 'Approved' : (action === 'Reject' ? 'Rejected' : 'Hold');

    // Update Central Library Stage
    await query(
      `UPDATE nodues_stages 
       SET status = ?, approved_by = ?, remarks = ?, updated_at = NOW()
       WHERE request_id = ? AND department_name = 'Central Library'`,
      [newStatus, approverName, remarks || 'Central library books and fines cleared.', requestId]
    );

    // Audit Log Entry
    await logAuditEntry({
      requestId,
      departmentName: 'Central Library',
      actionType: action === 'Approve' ? 'Approval' : (action === 'Reject' ? 'Rejection' : 'Hold'),
      actorName: approverName,
      actorRole: 'main_library_staff',
      statusAfter: newStatus,
      remarks: remarks || (action === 'Approve' ? 'Central library books and fines cleared.' : 'Put on hold by Central Library.')
    });

    if (action === 'Approve') {
      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'Central Library Approved', `Main Library staff (${approverName}) approved your No-Dues.`, 'success']
      );

      // Check parallel clearance to unlock FA
      await updateRequestProgress(requestId);
    } else if (action === 'Reject' || action === 'Hold') {
      const isReject = action === 'Reject';
      const actionText = isReject ? 'rejected' : 'placed on hold';

      if (isReject) {
        await query(
          `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'Central Library (Rejected)' WHERE id = ?`,
          [requestId]
        );
      }

      await notifyStudentAndFA({
        registerNumber: request.register_number,
        requestNumber: request.request_number,
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (Central Library Stage)`,
        studentMsg: `Main Library Staff ${approverName} ${actionText} your central library clearance. Remarks: ${remarks || 'Outstanding books/fines detected.'}`,
        faMsg: `ADVISEE CENTRAL LIBRARY ALERT: No-Dues application (${request.request_number}) of ${request.student_name} was ${actionText.toUpperCase()} by Central Library. Remarks: ${remarks || 'Outstanding books/fines detected.'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${newStatus} by Main Library.` });

  } catch (error) {
    console.error('Process Main Library Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing Main Library action.' });
  }
};

// Bulk Approve Main Library Requests
exports.bulkApproveMainLibrary = async (req, res) => {
  try {
    const empId = req.user.username;
    const officer = await getOne('SELECT full_name FROM main_library_profile WHERE employee_id = ?', [empId]);
    const approverName = officer ? `${officer.full_name} (Main Library Staff)` : 'Main Library Staff';

    const pendingRequests = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'Central Library' AND ns.status = 'Pending'
    `);

    let count = 0;
    for (const item of pendingRequests) {
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = 'Bulk Approved by Main Library.', updated_at = NOW()
         WHERE request_id = ? AND department_name = 'Central Library'`,
        [approverName, item.request_id]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [item.register_number, 'Central Library Approved', `Main Library staff cleared your No-Dues request ${item.request_number}.`, 'success']
      );

      await updateRequestProgress(item.request_id);
      count++;
    }

    return res.json({ success: true, message: `Successfully bulk approved ${count} Central Library clearance requests.` });

  } catch (error) {
    console.error('Bulk Approve Main Library Error:', error);
    return res.status(500).json({ success: false, message: 'Error executing bulk Main Library approval.' });
  }
};
