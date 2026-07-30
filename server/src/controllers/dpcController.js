const { query, getOne } = require('../config/db');

// Get DPC Dashboard Statistics & Submissions
exports.getDPCDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // DPC Profile
    const dpc = await getOne('SELECT * FROM dpc_profile WHERE employee_id = ?', [empId]);

    // All Career Submissions
    const careerSubmissions = await query(
      `SELECT nr.*, s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone
       FROM nodues_requests nr
       JOIN students s ON nr.register_number = s.register_number
       WHERE nr.career_option IS NOT NULL
       ORDER BY nr.id DESC`
    );

    // Pending Stage 5 DPC Approvals
    const pendingDPCRequests = await query(`
      SELECT 
        nr.*,
        s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone,
        ns.status as dpc_stage_status,
        ns.remarks as dpc_stage_remarks
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'DPC'
      JOIN students s ON nr.register_number = s.register_number
      WHERE ns.status = 'Pending'
      ORDER BY nr.id DESC`
    );

    // Approved DPC Requests count
    const approvedDPCCount = await getOne(`
      SELECT COUNT(*) as count 
      FROM nodues_stages ns
      WHERE ns.department_name = 'DPC' AND ns.status = 'Approved'
    `);

    // Career Breakdown counts
    const placementCount = careerSubmissions.filter(c => c.career_option === 'Placements').length;
    const higherStudiesCount = careerSubmissions.filter(c => c.career_option === 'Higher Studies').length;
    const competitiveExamCount = careerSubmissions.filter(c => c.career_option === 'Competitive Exams').length;
    const entrepreneurshipCount = careerSubmissions.filter(c => c.career_option === 'Entrepreneurship').length;

    return res.json({
      success: true,
      data: {
        dpc,
        stats: {
          totalSubmissions: careerSubmissions.length,
          pendingApprovals: pendingDPCRequests.length,
          approvedCount: approvedDPCCount.count || 0,
          placementCount,
          higherStudiesCount,
          competitiveExamCount,
          entrepreneurshipCount
        },
        careerSubmissions,
        pendingDPCRequests
      }
    });

  } catch (error) {
    console.error('DPC Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading Department Placement Coordinator dashboard.' });
  }
};

// Process DPC Action (Approve / Reject)
exports.processDPCAction = async (req, res) => {
  try {
    const empId = req.user.username;
    const { requestId, action, remarks } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and Action are required.' });
    }

    const dpc = await getOne('SELECT full_name FROM dpc_profile WHERE employee_id = ?', [empId]);
    const approverName = dpc ? `${dpc.full_name} (DPC)` : 'Department Placement Coordinator (DPC)';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection remarks are mandatory.' });
    }

    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

    // Update DPC Stage (Stage 5)
    await query(
      `UPDATE nodues_stages 
       SET status = ?, approved_by = ?, remarks = ?, updated_at = datetime('now')
       WHERE request_id = ? AND department_name = 'DPC'`,
      [newStatus, approverName, remarks || `Career Pathway (${request.career_option || 'General'}) verified and cleared by DPC.`, requestId]
    );

    if (action === 'Approve') {
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
        [request.register_number, 'DPC Placement Clearance Approved', `Department Placement Coordinator ${approverName} verified your career submission (${request.career_option}) and granted Stage 5 clearance.`, 'success']
      );
    } else if (action === 'Reject') {
      await query(
        `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'Department Placement Coordinator (Rejected)' WHERE id = ?`,
        [requestId]
      );
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${newStatus} by DPC.` });

  } catch (error) {
    console.error('Process DPC Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing DPC clearance action.' });
  }
};
