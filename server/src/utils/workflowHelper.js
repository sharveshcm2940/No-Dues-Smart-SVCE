const { query, getOne } = require('../config/db');

/**
 * Recalculates and updates the current stage, progress percentage, and overall status
 * of a No-Dues request based on the status of all department clearance stages.
 */
async function updateRequestProgress(requestId) {
  try {
    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) return null;

    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [request.register_number]);
    const isFourthYear = (request.year && (request.year.includes('IV') || request.year.includes('4th'))) ||
                        (student && student.year && (student.year.includes('IV') || student.year.includes('4th')));

    const stages = await query(
      'SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC',
      [requestId]
    );

    // Auto-approve DPC stage for non-4th year students if it's still pending
    if (!isFourthYear) {
      const dpcStage = stages.find(s => s.department_name === 'DPC');
      if (dpcStage && dpcStage.status === 'Pending') {
        await query(
          `UPDATE nodues_stages 
           SET status = 'Approved', approved_by = 'System (Auto-Cleared)', remarks = 'Not applicable for non-final year students.', updated_at = datetime('now')
           WHERE id = ?`,
          [dpcStage.id]
        );
        dpcStage.status = 'Approved';
        dpcStage.approved_by = 'System (Auto-Cleared)';
      }
    }

    const financeStage = stages.find(s => s.department_name === 'Finance');
    const mainLibStage = stages.find(s => s.department_name === 'Central Library');
    const deptLibStage = stages.find(s => s.department_name === 'Department Library');
    const faStage = stages.find(s => s.department_name === 'Faculty Advisor');
    const dpcStage = stages.find(s => s.department_name === 'DPC');
    const hodStage = stages.find(s => s.department_name === 'HOD');

    // Check if any stage is Rejected
    const hasRejection = stages.some(s => s.status === 'Rejected');
    if (hasRejection) {
      const rejectedStage = stages.find(s => s.status === 'Rejected');
      const stageName = rejectedStage ? rejectedStage.department_name : 'Clearance';
      await query(
        `UPDATE nodues_requests 
         SET overall_status = 'Rejected', current_stage = ?, progress_percentage = 0
         WHERE id = ?`,
        [`${stageName} (Rejected)`, requestId]
      );
      return { status: 'Rejected', progress: 0, stage: `${stageName} (Rejected)` };
    }

    // Check 2 initial parallel library stages (Central Library & Dept Library)
    const libraryStages = [mainLibStage, deptLibStage].filter(Boolean);
    const approvedLibraryCount = libraryStages.filter(s => s.status === 'Approved').length;
    const allLibrariesApproved = approvedLibraryCount === libraryStages.length;

    let newStageName = '';
    let newProgress = 0;
    let newOverallStatus = 'In Progress';

    if (!allLibrariesApproved) {
      if (approvedLibraryCount === 0) {
        newProgress = 10;
        newStageName = 'Pending Library Verification';
      } else {
        newProgress = 25;
        const pendingNames = libraryStages.filter(s => s.status !== 'Approved').map(s => s.department_name).join(', ');
        newStageName = `Library Verification (1 of 2 cleared - Pending: ${pendingNames})`;
      }
    } else if (isFourthYear && dpcStage && dpcStage.status !== 'Approved') {
      newStageName = 'Pending DPC Approval';
      newProgress = 40;
    } else if (financeStage && financeStage.status !== 'Approved') {
      newStageName = 'Pending Finance Approval';
      newProgress = 60;
    } else if (faStage && faStage.status !== 'Approved') {
      newStageName = 'Pending FA Review';
      newProgress = 80;
    } else if (hodStage && hodStage.status !== 'Approved') {
      newStageName = 'Pending Final Approval (HOD)';
      newProgress = 90;
    } else {
      // All required stages are approved!
      newOverallStatus = 'Approved';
      newStageName = 'Completed (No Due Certificate Approved)';
      newProgress = 100;
    }

    let certNo = request.certificate_number;
    if (newOverallStatus === 'Approved' && !certNo) {
      certNo = `CERT-SVCE-IT-2026-${String(requestId).padStart(4, '0')}`;
      await query(
        `UPDATE nodues_requests 
         SET overall_status = 'Approved', progress_percentage = 100, current_stage = 'Completed', certificate_number = ?, completion_date = datetime('now')
         WHERE id = ?`,
        [certNo, requestId]
      );
    } else {
      await query(
        `UPDATE nodues_requests 
         SET overall_status = ?, progress_percentage = ?, current_stage = ?
         WHERE id = ?`,
        [newOverallStatus, newProgress, newStageName, requestId]
      );
    }

    return {
      status: newOverallStatus,
      progress: newProgress,
      stage: newStageName,
      certificateNumber: certNo
    };

  } catch (error) {
    console.error('Update Request Progress Error:', error);
    return null;
  }
}

/**
 * Logs an audit entry for tracking approval, rejection, hold, or student re-submission history.
 */
async function logAuditEntry({ requestId, departmentName, actionType, actorName, actorRole, statusAfter, remarks, studentComment, attachmentUrl }) {
  try {
    await query(
      `INSERT INTO nodues_audit_logs (
        request_id, department_name, action_type, actor_name, actor_role, status_after, remarks, student_comment, attachment_url, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [requestId, departmentName, actionType, actorName, actorRole, statusAfter, remarks || null, studentComment || null, attachmentUrl || null]
    );
  } catch (err) {
    console.error('Log Audit Entry Error:', err);
  }
}

/**
 * Recalculates all requests in the database to sync progress and current stage.
 */
async function syncAllRequestsProgress() {
  try {
    const allRequests = await query('SELECT id FROM nodues_requests');
    for (const r of allRequests) {
      await updateRequestProgress(r.id);
    }
    console.log(`Synced ${allRequests.length} clearance request progress states.`);
  } catch (err) {
    console.error('Sync All Requests Progress Error:', err);
  }
}

module.exports = {
  updateRequestProgress,
  logAuditEntry,
  syncAllRequestsProgress
};
