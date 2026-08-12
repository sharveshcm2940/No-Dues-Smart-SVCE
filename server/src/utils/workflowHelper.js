const { query, getOne } = require('../config/db');

/**
 * Recalculates and updates the current stage, progress percentage, and overall status
 * of a No-Dues request based on the sequential approval rules:
 * 1. Initial Parallel Stage: DPC + Central Library + Department Library receive simultaneously.
 * 2. Finance Stage: Unlocks ONLY when DPC, Central Library, and Department Library are ALL Approved.
 * 3. Faculty Advisor Stage: Unlocks ONLY when Finance is Approved.
 * 4. HOD Stage: Unlocks ONLY when Faculty Advisor is Approved.
 * 5. Rejections pause workflow progression without resetting previously approved stages.
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

    const dpcStage = stages.find(s => s.department_name === 'DPC');
    const mainLibStage = stages.find(s => s.department_name === 'Central Library');
    const deptLibStage = stages.find(s => s.department_name === 'Department Library');
    const financeStage = stages.find(s => s.department_name === 'Finance');
    const faStage = stages.find(s => s.department_name === 'Faculty Advisor');
    const hodStage = stages.find(s => s.department_name === 'HOD');

    // Auto-approve DPC stage for non-4th year students if it's still pending
    if (!isFourthYear && dpcStage && dpcStage.status === 'Pending') {
      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = 'System (Auto-Cleared)', remarks = 'Exempted for non-final year student.', updated_at = datetime('now')
         WHERE id = ?`,
        [dpcStage.id]
      );
      dpcStage.status = 'Approved';
      dpcStage.approved_by = 'System (Auto-Cleared)';
    }

    // Check for any Rejected stage
    const rejectedStage = stages.find(s => s.status === 'Rejected');
    if (rejectedStage) {
      let rejectedStageName = `${rejectedStage.department_name} (Rejected)`;
      if (rejectedStage.department_name === 'Finance') {
        rejectedStageName = 'Finance Rejected / Dues Pending';
      }

      await query(
        `UPDATE nodues_requests 
         SET overall_status = 'Rejected', current_stage = ?, progress_percentage = 0
         WHERE id = ?`,
        [rejectedStageName, requestId]
      );
      return { status: 'Rejected', progress: 0, stage: rejectedStageName };
    }

    // Initial 3 Parallel Departments (DPC, Central Library, Dept Library)
    const initialStages = [dpcStage, mainLibStage, deptLibStage].filter(Boolean);
    const approvedInitialCount = initialStages.filter(s => s.status === 'Approved').length;
    const allInitialApproved = approvedInitialCount === initialStages.length;

    let newStageName = '';
    let newProgress = 15;
    let newOverallStatus = 'In Progress';

    if (!allInitialApproved) {
      const pendingDepts = initialStages.filter(s => s.status !== 'Approved').map(s => s.department_name);
      if (approvedInitialCount === 0) {
        newProgress = 15;
        newStageName = 'Pending DPC + Central Library + Department Library Approval';
      } else {
        newProgress = 15 + (approvedInitialCount * 10);
        newStageName = `Initial Approvals (${approvedInitialCount} of 3 cleared - Pending: ${pendingDepts.join(', ')})`;
      }
    } else {
      // All 3 initial departments have approved! Check/Unlock Finance
      if (financeStage) {
        if (financeStage.status === 'Locked') {
          await query(
            `UPDATE nodues_stages SET status = 'Pending', updated_at = datetime('now') WHERE id = ?`,
            [financeStage.id]
          );
          financeStage.status = 'Pending';

          // Notify Finance Admin & Student about unlocked stage
          await query(
            `INSERT INTO notifications (target_user, title, message, type)
             VALUES (?, ?, ?, ?)`,
            [request.register_number, 'Finance Approval Pending', `DPC, Central Library, and Department Library have approved request ${request.request_number}. Your request is now pending Finance clearance.`, 'info']
          );
          await query(
            `INSERT INTO notifications (target_user, title, message, type)
             VALUES (?, ?, ?, ?)`,
            ['EMP-FIN-IT-01', 'New No-Dues Finance Approval Request', `Student ${request.student_name} (${request.register_number}) has cleared all initial library & DPC approvals. Request ${request.request_number} is pending Finance review.`, 'info']
          );
        }

        if (financeStage.status === 'Pending') {
          newStageName = 'Pending Finance Approval';
          newProgress = 50;
        } else if (financeStage.status === 'Approved') {
          // Finance approved! Check/Unlock FA Stage
          if (faStage) {
            if (faStage.status === 'Locked') {
              await query(
                `UPDATE nodues_stages SET status = 'Pending', updated_at = datetime('now') WHERE id = ?`,
                [faStage.id]
              );
              faStage.status = 'Pending';

              // Notify FA & Student about unlocked stage
              const faEmpId = student ? student.advisor_emp_id : null;
              await query(
                `INSERT INTO notifications (target_user, title, message, type)
                 VALUES (?, ?, ?, ?)`,
                [request.register_number, 'Pending FA Approval', `Finance clearance granted for request ${request.request_number}. Your request is now pending Faculty Advisor approval.`, 'info']
              );
              if (faEmpId) {
                await query(
                  `INSERT INTO notifications (target_user, title, message, type)
                   VALUES (?, ?, ?, ?)`,
                  [faEmpId, 'Advisee Clearance Pending', `Finance approved student ${request.student_name}'s request ${request.request_number}. Pending your FA review.`, 'info']
                );
              }
            }

            if (faStage.status === 'Pending') {
              newStageName = 'Pending FA Approval';
              newProgress = 75;
            } else if (faStage.status === 'Approved') {
              // FA approved! Check/Unlock HOD Stage
              if (hodStage) {
                if (hodStage.status === 'Locked') {
                  await query(
                    `UPDATE nodues_stages SET status = 'Pending', updated_at = datetime('now') WHERE id = ?`,
                    [hodStage.id]
                  );
                  hodStage.status = 'Pending';

                  // Notify HOD & Student about unlocked stage
                  await query(
                    `INSERT INTO notifications (target_user, title, message, type)
                     VALUES (?, ?, ?, ?)`,
                    [request.register_number, 'Pending HOD Approval', `Faculty Advisor approved request ${request.request_number}. Your request is now pending final HOD approval.`, 'info']
                  );
                  await query(
                    `INSERT INTO notifications (target_user, title, message, type)
                     VALUES (?, ?, ?, ?)`,
                    ['EMP-HOD-IT-01', 'Pending HOD Final Approval', `Faculty Advisor approved student ${request.student_name}'s request ${request.request_number}. Pending final HOD sign-off.`, 'info']
                  );
                }

                if (hodStage.status === 'Pending') {
                  newStageName = 'Pending HOD Approval';
                  newProgress = 90;
                } else if (hodStage.status === 'Approved') {
                  // All required stages are approved!
                  newOverallStatus = 'Approved';
                  newStageName = 'No Due Request Approved / Completed';
                  newProgress = 100;
                }
              }
            }
          }
        }
      }
    }

    let certNo = request.certificate_number;
    if (newOverallStatus === 'Approved') {
      if (!certNo) {
        certNo = `CERT-SVCE-IT-2026-${String(requestId).padStart(4, '0')}`;
      }
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
