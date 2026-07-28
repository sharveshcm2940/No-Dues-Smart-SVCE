const { query, getOne } = require('../config/db');

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
      ORDER BY nr.id DESC
    `);

    const allDepartmentRequests = await query(`
      SELECT nr.*, 
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.status = 'Issued') as active_books,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.fine_status = 'Unpaid') as fine_unpaid
      FROM nodues_requests nr
      ORDER BY nr.id DESC
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
        allDepartmentRequests
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
    const approverName = hod ? `${hod.full_name} (Head of Department)` : 'Dr. G. Sumathi (HOD - IT)';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    if (action === 'Approve') {
      const certNo = `CERT-SVCE-IT-2026-${String(request.id).padStart(4, '0')}`;

      // Update HOD Stage
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = ?, updated_at = datetime('now')
         WHERE request_id = ? AND department_name = 'HOD'`,
        [approverName, remarks || 'Final Head of Department approval granted. Digital Certificate issued.', requestId]
      );

      // Update Master Request to Completed & Issued Certificate
      await query(
        `UPDATE nodues_requests 
         SET overall_status = 'Approved', progress_percentage = 100, current_stage = 'Completed', certificate_number = ?, completion_date = datetime('now')
         WHERE id = ?`,
        [certNo, requestId]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'No-Dues Clearance Completed!', `Head of Department ${approverName} approved your request. Your official SVCE Digital Certificate ${certNo} is now ready for download!`, 'success']
      );

      return res.json({
        success: true,
        message: `Request ${request.request_number} APPROVED by HOD. Digital Certificate ${certNo} generated!`
      });

    } else {
      const newStatus = action === 'Reject' ? 'Rejected' : 'Hold';

      await query(
        `UPDATE nodues_stages 
         SET status = ?, approved_by = ?, remarks = ?, updated_at = datetime('now')
         WHERE request_id = ? AND department_name = 'HOD'`,
        [newStatus, approverName, remarks, requestId]
      );

      if (action === 'Reject') {
        await query(
          `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'HOD (Rejected)' WHERE id = ?`,
          [requestId]
        );
      }

      return res.json({ success: true, message: `Request ${request.request_number} marked as ${newStatus} by HOD.` });
    }

  } catch (error) {
    console.error('Process HOD Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing HOD sign-off.' });
  }
};
