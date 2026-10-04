const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress, logAuditEntry, executeStageTransition } = require('../utils/workflowHelper');
const { sanitizeRequest } = require('../utils/dataMasking');
const { getOfficerDepartment } = require('../middleware/authorizeResource');

// Get DPC Dashboard Statistics & Submissions
exports.getDPCDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // DPC Profile
    const dpc = await getOne('SELECT * FROM dpc_profile WHERE employee_id = ?', [empId]);
    const officerDept = await getOfficerDepartment(req.user);

    let deptClause = '';
    const params = [];
    if (officerDept) {
      deptClause = 'AND s.department = ?';
      params.push(officerDept);
    }

    // All Career Submissions
    const careerSubmissionsRaw = await query(
      `SELECT nr.*, s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone
       FROM nodues_requests nr
       JOIN students s ON nr.register_number = s.register_number
       WHERE nr.career_option IS NOT NULL ${deptClause}
       ORDER BY 
         CASE s.year 
           WHEN 'IV Year' THEN 4 
           WHEN 'III Year' THEN 3 
           WHEN 'II Year' THEN 2 
           WHEN 'I Year' THEN 1 
           ELSE 0 
         END DESC, 
         s.full_name ASC`,
      params
    );

    // Pending Stage 2 DPC Approvals
    const pendingDPCRequestsRaw = await query(`
      SELECT 
        nr.*,
        s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone,
        ns.status as dpc_stage_status,
        ns.remarks as dpc_stage_remarks
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'DPC'
      JOIN students s ON nr.register_number = s.register_number
      WHERE ns.status = 'Pending' ${deptClause}
      ORDER BY 
        CASE s.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        s.full_name ASC`,
      params
    );

    const careerSubmissions = careerSubmissionsRaw.map(r => sanitizeRequest(r, req.user.role));
    const pendingDPCRequests = pendingDPCRequestsRaw.map(r => sanitizeRequest(r, req.user.role));

    // Approved DPC Requests count
    const approvedDPCCount = await getOne(`
      SELECT COUNT(*) as count 
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'DPC' AND ns.status = 'Approved'
      ${officerDept ? 'AND nr.department = ?' : ''}
    `, officerDept ? [officerDept] : []);

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

    if (!['Approve', 'Reject', 'Hold'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action specified.' });
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

    const transitionResult = await executeStageTransition({
      requestId,
      departmentName: 'DPC',
      action,
      remarks: remarks || `Career Pathway (${request.career_option || 'General'}) verified and cleared by DPC.`,
      actorUser: { username: empId, full_name: approverName, role: 'dpc' }
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
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (DPC Stage)`,
        studentMsg: `Department Placement Coordinator ${approverName} ${actionText} your Stage 2 career clearance. Remarks: ${remarks || 'Document verification pending'}`,
        faMsg: `URGENT ADVISEE ALERT: The No-Dues application (${request.request_number}) of your advisee ${request.student_name} (${request.register_number}) was ${actionText.toUpperCase()} by Department Placement Coordinator. Remarks: ${remarks || 'Document verification pending'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${transitionResult.status} by DPC.` });

  } catch (error) {
    console.error('Process DPC Action Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing DPC clearance action.' });
  }
};

// Bulk Approve All Pending DPC Stage 5 Requests
exports.bulkApproveDPC = async (req, res) => {
  try {
    const empId = req.user.username;
    const dpc = await getOne('SELECT full_name FROM dpc_profile WHERE employee_id = ?', [empId]);
    const approverName = dpc ? `${dpc.full_name} (DPC Coordinator)` : 'DPC Placement Officer';

    const pendingStages = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'DPC' AND ns.status = 'Pending'
    `);

    let count = 0;
    for (const item of pendingStages) {
      const transResult = await executeStageTransition({
        requestId: item.request_id,
        departmentName: 'DPC',
        action: 'Approve',
        remarks: 'Bulk Approved by DPC Placement Officer.',
        actorUser: { username: empId, full_name: approverName, role: 'dpc' }
      });

      if (transResult.success) {
        count++;
      }
    }

    return res.json({
      success: true,
      message: `Successfully granted DPC career verification approval for ${count} request(s).`
    });
  } catch (error) {
    console.error('Bulk Approve DPC Error:', error);
    return res.status(500).json({ success: false, message: 'Error performing bulk DPC clearance approval.' });
  }
};
