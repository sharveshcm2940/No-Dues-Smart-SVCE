const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress, logAuditEntry, executeStageTransition } = require('../utils/workflowHelper');
const { sanitizeRequest } = require('../utils/dataMasking');

// Get Finance Dashboard Stats & Requests
exports.getFinanceDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // Finance Profile
    const finance = await getOne('SELECT * FROM finance_profile WHERE employee_id = ?', [empId]);

    // All active requests with student details
    const allRequestsRaw = await query(`
      SELECT nr.*, s.section, s.batch, s.programme, s.email as student_email, s.phone as student_phone
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'Finance'
      JOIN students s ON nr.register_number = s.register_number
      WHERE ns.status != 'Locked'
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

    // Pending Finance clearances
    const pendingRequestsRaw = await query(`
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

    const allRequests = allRequestsRaw.map(r => sanitizeRequest(r, req.user.role));
    const pendingRequests = pendingRequestsRaw.map(r => sanitizeRequest(r, req.user.role));

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

    if (!['Approve', 'Reject', 'Hold'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action specified.' });
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

    const transitionResult = await executeStageTransition({
      requestId,
      departmentName: 'Finance',
      action,
      remarks: remarks || (action === 'Approve' ? 'Tuition and laboratory accounts cleared.' : 'Dues outstanding/on hold by Finance.'),
      actorUser: { username: empId, full_name: approverName, role: 'finance' }
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
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (Finance Stage)`,
        studentMsg: `Finance Officer ${approverName} ${actionText} your clearance. Remarks: ${remarks || 'Outstanding fees/dues detected.'}`,
        faMsg: `ADVISEE FINANCE ALERT: No-Dues application (${request.request_number}) of ${request.student_name} was ${actionText.toUpperCase()} by Finance Section. Remarks: ${remarks || 'Outstanding fees/dues detected.'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({ success: true, message: `Request ${request.request_number} marked as ${transitionResult.stageStatus} by Finance.` });

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
        AND (
          SELECT COUNT(*) 
          FROM nodues_stages init_s 
          WHERE init_s.request_id = nr.id 
            AND init_s.department_name IN ('DPC', 'Central Library', 'Department Library') 
            AND init_s.status = 'Approved'
        ) = 3
    `);

    let count = 0;
    for (const item of pendingRequests) {
      const transResult = await executeStageTransition({
        requestId: item.request_id,
        departmentName: 'Finance',
        action: 'Approve',
        remarks: 'Bulk Approved by Finance Section.',
        actorUser: { username: empId, full_name: approverName, role: 'finance' }
      });

      if (transResult.success) {
        count++;
      }
    }

    return res.json({ success: true, message: `Successfully bulk approved ${count} Finance clearance requests.` });

  } catch (error) {
    console.error('Bulk Approve Finance Error:', error);
    return res.status(500).json({ success: false, message: 'Error executing bulk Finance approval.' });
  }
};
