const { query, getOne, getPool } = require('../config/db');
const { appendNoDuesAuditLog } = require('./auditChain');
const { generateCertificateToken, computeCertificateHmac } = require('./certificateSigner');

const SEQUENTIAL_STAGES = [
  { order: 1, name: 'Department Library', role: 'library_staff' },
  { order: 2, name: 'DPC', role: 'dpc' },
  { order: 3, name: 'Central Library', role: 'main_library_staff' },
  { order: 4, name: 'Faculty Advisor', role: 'faculty_advisor' },
  { order: 5, name: 'Finance', role: 'finance' },
  { order: 6, name: 'HOD', role: 'hod' }
];

/**
 * Executes a state transition for a No-Dues clearance stage with:
 * 1. Database transaction
 * 2. Row locking (SELECT ... FOR UPDATE) on both request and stage rows to prevent race conditions & double-approvals
 * 3. Strict sequential stage order validation (Dept Library -> DPC -> Central Library -> Faculty Advisor -> Finance -> HOD)
 * 4. Cryptographic hash-chained audit trail
 */
async function executeStageTransition({
  requestId,
  departmentName,
  action,
  remarks = '',
  actorUser,
  existingConnection = null
}) {
  const pool = getPool();
  const conn = existingConnection || (await pool.getConnection());
  const isOuterTx = Boolean(existingConnection);

  if (!isOuterTx) {
    await conn.beginTransaction();
  }

  try {
    // 1. Lock the request row
    const [requests] = await conn.query(
      'SELECT * FROM nodues_requests WHERE id = ? FOR UPDATE',
      [requestId]
    );

    if (!requests || requests.length === 0) {
      if (!isOuterTx) await conn.rollback();
      return { status: 404, message: 'Clearance request record not found.' };
    }

    const request = requests[0];

    if (request.overall_status === 'Approved') {
      if (!isOuterTx) await conn.rollback();
      return { status: 400, message: 'Clearance request is already completed and approved.' };
    }

    if (request.overall_status === 'Cancelled') {
      if (!isOuterTx) await conn.rollback();
      return { status: 400, message: 'Cancelled clearance requests cannot be processed.' };
    }

    // 2. Lock all stage rows for this request
    const [stages] = await conn.query(
      'SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC FOR UPDATE',
      [requestId]
    );

    const targetStage = stages.find(
      s => s.department_name.toLowerCase() === departmentName.toLowerCase()
    );

    if (!targetStage) {
      if (!isOuterTx) await conn.rollback();
      return { success: false, statusCode: 404, message: `Stage '${departmentName}' not found for request #${requestId}.` };
    }

    if (action === 'Approve') {
      if (targetStage.status === 'Approved') {
        if (!isOuterTx) await conn.rollback();
        return { success: false, statusCode: 400, message: `Stage '${targetStage.department_name}' is already approved.` };
      }

      // Enforce strict sequential stage order:
      // All prior stages (stage_order < targetStage.stage_order) MUST be Approved
      const priorUnapproved = stages.find(
        s => s.stage_order < targetStage.stage_order && s.status !== 'Approved'
      );

      if (priorUnapproved) {
        if (!isOuterTx) await conn.rollback();
        return {
          success: false,
          statusCode: 400,
          message: `Stage order violation: Clearance for '${targetStage.department_name}' requires prior approval from '${priorUnapproved.department_name}'.`
        };
      }
    } else if (action === 'Reject') {
      if (targetStage.status === 'Approved') {
        if (!isOuterTx) await conn.rollback();
        return { success: false, statusCode: 400, message: 'An already approved stage cannot be retroactively rejected without administrative revocation.' };
      }
    } else if (action === 'Resubmit') {
      if (targetStage.status !== 'Rejected') {
        if (!isOuterTx) await conn.rollback();
        return { success: false, statusCode: 400, message: `Only rejected stages can be resubmitted. Current status: ${targetStage.status}` };
      }
    }

    const actorName = actorUser ? (actorUser.full_name || actorUser.username) : 'Institutional Officer';
    const actorRole = actorUser ? actorUser.role : 'staff';
    const newStageStatus = action === 'Approve' ? 'Approved' : (action === 'Reject' ? 'Rejected' : (action === 'Resubmit' ? 'Pending' : 'Hold'));

    // 4. Update the target stage row
    await conn.query(
      `UPDATE nodues_stages 
       SET status = ?, approved_by = ?, remarks = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStageStatus, action === 'Resubmit' ? null : actorName, remarks || `${action} action recorded.`, targetStage.id]
    );

    // 5. Determine overall request status & next stages
    let newOverallStatus = 'In Progress';
    let newCurrentStage = targetStage.department_name;

    if (action === 'Reject') {
      newOverallStatus = 'Rejected';
      newCurrentStage = `${targetStage.department_name} (Rejected)`;
      await conn.query(
        `UPDATE nodues_requests 
         SET overall_status = 'Rejected', current_stage = ?, progress_percentage = 0
         WHERE id = ?`,
        [newCurrentStage, requestId]
      );
    } else if (action === 'Hold') {
      newOverallStatus = 'In Progress';
      newCurrentStage = `${targetStage.department_name} (On Hold)`;
      await conn.query(
        `UPDATE nodues_requests 
         SET current_stage = ?
         WHERE id = ?`,
        [newCurrentStage, requestId]
      );
    } else if (action === 'Resubmit') {
      newOverallStatus = 'In Progress';
      newCurrentStage = targetStage.department_name;
      await conn.query(
        `UPDATE nodues_requests 
         SET overall_status = 'In Progress', current_stage = ?, resubmission_count = COALESCE(resubmission_count, 0) + 1
         WHERE id = ?`,
        [newCurrentStage, requestId]
      );
    } else if (action === 'Approve') {
      // Find next unapproved sequential stage (skipping auto-exempted stages)
      const remainingUnapproved = stages
        .filter(s => s.stage_order > targetStage.stage_order && s.status !== 'Approved');
      const nextStage = remainingUnapproved.length > 0 ? remainingUnapproved[0] : null;

      if (nextStage) {
        // Unlock next stage to Pending
        await conn.query(
          `UPDATE nodues_stages SET status = 'Pending', updated_at = NOW() WHERE id = ?`,
          [nextStage.id]
        );
        newCurrentStage = nextStage.department_name;

        // Calculate progress percentage
        const approvedCount = stages.filter(s => s.status === 'Approved').length + 1; // +1 for the one we just approved
        const progressPercentage = Math.round((approvedCount / stages.length) * 100);

        await conn.query(
          `UPDATE nodues_requests 
           SET overall_status = 'In Progress', current_stage = ?, progress_percentage = ?
           WHERE id = ?`,
          [newCurrentStage, progressPercentage, requestId]
        );

        // Notify next department
        await conn.query(
          `INSERT INTO notifications (target_user, title, message, type)
           VALUES (?, ?, ?, 'info')`,
          [
            nextStage.department_name,
            `Pending No-Dues Clearance: ${request.student_name}`,
            `Request #${request.request_number} has been approved by ${targetStage.department_name} and is now awaiting clearance from ${nextStage.department_name}.`
          ]
        );
      } else {
        // Final stage (HOD) Approved: Full completion & Certificate Issuance
        newOverallStatus = 'Approved';
        newCurrentStage = 'Completed';
        const completionDate = new Date();
        const certNo = request.certificate_number || `CERT-SVCE-IT-2026-${String(requestId).padStart(4, '0')}`;
        const certToken = request.certificate_token || generateCertificateToken();
        const certHmac = computeCertificateHmac({
          certificateNumber: certNo,
          registerNumber: request.register_number,
          issueDate: completionDate,
          requestId
        });

        await conn.query(
          `UPDATE nodues_requests 
           SET overall_status = 'Approved', progress_percentage = 100, current_stage = 'Completed', 
               completion_date = ?, certificate_number = ?, certificate_token = ?, certificate_hmac = ?, 
               certificate_version = COALESCE(certificate_version, 1), certificate_status = 'Valid'
           WHERE id = ?`,
          [completionDate, certNo, certToken, certHmac, requestId]
        );

        // Notify student of completion
        await conn.query(
          `INSERT INTO notifications (target_user, title, message, type)
           VALUES (?, ?, ?, 'success')`,
          [
            request.register_number,
            'No-Dues Clearance Completed 🎉',
            `Congratulations! Your No-Dues clearance request ${request.request_number} has been fully approved by HOD. Your official Digital Clearance Certificate (${certNo}) is now generated and verifiable.`
          ]
        );
      }
    }

    // 6. Cryptographically hash-chained audit log
    await appendNoDuesAuditLog({
      requestId,
      departmentName: targetStage.department_name,
      actionType: action === 'Approve' ? 'Approval' : (action === 'Reject' ? 'Rejection' : (action === 'Resubmit' ? 'Re-submission' : 'Hold')),
      actorName,
      actorRole,
      statusAfter: newStageStatus,
      remarks: remarks || `${action} recorded.`
    }, conn);

    if (!isOuterTx) {
      await conn.commit();
    }

    return {
      success: true,
      requestId,
      departmentName: targetStage.department_name,
      stageStatus: newStageStatus,
      overallStatus: newOverallStatus,
      currentStage: newCurrentStage
    };

  } catch (err) {
    if (!isOuterTx) {
      await conn.rollback();
    }
    throw err;
  } finally {
    if (!isOuterTx) {
      conn.release();
    }
  }
}

/**
 * Fallback recalculation helper for query views
 */
async function updateRequestProgress(requestId) {
  try {
    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) return null;

    const stages = await query(
      'SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC',
      [requestId]
    );

    const approvedCount = stages.filter(s => s.status === 'Approved').length;
    const progress = Math.round((approvedCount / (stages.length || 6)) * 100);

    await query('UPDATE nodues_requests SET progress_percentage = ? WHERE id = ?', [progress, requestId]);

    return {
      status: request.overall_status,
      progress,
      stage: request.current_stage
    };
  } catch (err) {
    console.error('updateRequestProgress error:', err);
    return null;
  }
}

/**
 * Synchronize progress percentages across all clearance requests in nodues_requests
 */
async function syncAllRequestsProgress() {
  try {
    const requests = await query('SELECT id FROM nodues_requests');
    if (requests && requests.length > 0) {
      for (const req of requests) {
        await updateRequestProgress(req.id);
      }
    }
  } catch (err) {
    console.error('syncAllRequestsProgress error:', err);
  }
}

/**
 * Logs an audit entry using append-only cryptographic hash chaining
 */
async function logAuditEntry({ requestId, departmentName, actionType, actorName, actorRole, statusAfter, remarks, studentComment, attachmentUrl, req = null }) {
  try {
    return await appendNoDuesAuditLog({
      requestId,
      departmentName,
      actionType,
      actorName,
      actorRole,
      statusAfter,
      remarks,
      studentComment,
      attachmentUrl
    });
  } catch (err) {
    console.error('logAuditEntry error:', err);
  }
}

/**
 * Reopens a previously approved clearance stage with mandatory reason,
 * resets all downstream dependent stages to 'Pending', revokes any issued certificate,
 * notifies the student and advisor, and audit-logs the event with hash chaining.
 */
async function reopenStage({ requestId, departmentName, reason, actorUser }, existingConn = null) {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return {
      success: false,
      statusCode: 400,
      message: 'A mandatory reason (minimum 5 characters) is required to reopen an approved stage.'
    };
  }

  const pool = getPool();
  const conn = existingConn || (await pool.getConnection());
  const isOuterTx = !!existingConn;

  try {
    if (!isOuterTx) {
      await conn.beginTransaction();
    }

    // 1. Lock the request row
    const [requestRows] = await conn.query('SELECT * FROM nodues_requests WHERE id = ? FOR UPDATE', [requestId]);
    if (!requestRows || requestRows.length === 0) {
      if (!isOuterTx) await conn.rollback();
      return { success: false, statusCode: 404, message: 'Clearance request not found.' };
    }
    const request = requestRows[0];

    // 2. Lock all stage rows
    const [stages] = await conn.query(
      'SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC FOR UPDATE',
      [requestId]
    );

    const targetStage = stages.find(
      s => s.department_name.toLowerCase() === departmentName.toLowerCase()
    );

    if (!targetStage) {
      if (!isOuterTx) await conn.rollback();
      return { success: false, statusCode: 404, message: `Stage '${departmentName}' not found for request #${requestId}.` };
    }

    if (targetStage.status !== 'Approved') {
      if (!isOuterTx) await conn.rollback();
      return {
        success: false,
        statusCode: 400,
        message: `Stage '${targetStage.department_name}' is not currently approved (Current status: ${targetStage.status}). Only approved stages can be reopened.`
      };
    }

    // 3. Authorization verification
    // Authorized: HOD, Admin, or the specific department officer for this stage
    const actorRole = actorUser ? actorUser.role : '';
    const deptRoleMap = {
      'Department Library': ['library_staff', 'hod', 'admin'],
      'DPC': ['dpc', 'hod', 'admin'],
      'Central Library': ['main_library_staff', 'hod', 'admin'],
      'Faculty Advisor': ['faculty_advisor', 'hod', 'admin'],
      'Finance': ['finance', 'hod', 'admin'],
      'HOD': ['hod', 'admin']
    };

    const allowedRoles = deptRoleMap[targetStage.department_name] || ['hod', 'admin'];
    if (!allowedRoles.includes(actorRole)) {
      if (!isOuterTx) await conn.rollback();
      return {
        success: false,
        statusCode: 403,
        message: `Unauthorized: Role '${actorRole}' is not permitted to reopen '${targetStage.department_name}'. Required: ${allowedRoles.join(', ')}.`
      };
    }

    const actorName = actorUser ? (actorUser.full_name || actorUser.username) : 'Institutional Officer';
    const cleanReason = reason.trim();

    // 4. Update the target stage to 'Hold' with reopening remarks
    await conn.query(
      `UPDATE nodues_stages 
       SET status = 'Hold', approved_by = NULL, remarks = ?, updated_at = NOW()
       WHERE id = ?`,
      [`Reopened by ${actorName}: ${cleanReason}`, targetStage.id]
    );

    // 5. Reset all downstream dependent stages (stage_order > targetStage.stage_order)
    const downstreamStages = stages.filter(s => s.stage_order > targetStage.stage_order);
    for (const downStage of downstreamStages) {
      await conn.query(
        `UPDATE nodues_stages 
         SET status = 'Pending', approved_by = NULL, remarks = ?, updated_at = NOW()
         WHERE id = ?`,
        [`Reset due to reopening of ${targetStage.department_name}: ${cleanReason}`, downStage.id]
      );
    }

    // 6. Revoke any issued certificate and reset overall_status to 'In Progress'
    const wasCompleted = request.overall_status === 'Approved' || !!request.certificate_number;
    let certRevoked = false;

    if (wasCompleted || request.certificate_status === 'Valid') {
      await conn.query(
        `UPDATE nodues_requests 
         SET certificate_status = 'Revoked',
             revocation_reason = ?,
             revoked_by = ?,
             revoked_at = NOW(),
             certificate_token = NULL,
             certificate_hmac = NULL,
             certificate_number = NULL,
             completion_date = NULL
         WHERE id = ?`,
        [`Stage '${targetStage.department_name}' reopened: ${cleanReason}`, actorName, requestId]
      );
      certRevoked = true;
    }

    // Recalculate progress: count remaining approved stages
    const remainingApproved = stages.filter(s => s.stage_order < targetStage.stage_order && s.status === 'Approved').length;
    const newProgress = Math.round((remainingApproved / (stages.length || 6)) * 100);

    await conn.query(
      `UPDATE nodues_requests 
       SET overall_status = 'In Progress',
           current_stage = ?,
           progress_percentage = ?
       WHERE id = ?`,
      [`${targetStage.department_name} (Reopened)`, newProgress, requestId]
    );

    // 7. Append-only cryptographic audit log
    await appendNoDuesAuditLog({
      requestId,
      departmentName: targetStage.department_name,
      actionType: 'Stage Reopened',
      actorName,
      actorRole,
      statusAfter: 'Hold',
      remarks: `Stage reopened. Reason: ${cleanReason}${certRevoked ? ' [Issued certificate was revoked]' : ''}`
    }, conn);

    // 8. Notifications
    await conn.query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, 'warning')`,
      [
        request.register_number,
        `Clearance Stage Reopened: ${targetStage.department_name}`,
        `Your No-Dues clearance for ${targetStage.department_name} has been reopened by ${actorName}. Reason: ${cleanReason}. Subsequent clearance stages have been placed on hold.`
      ]
    );

    if (!isOuterTx) {
      await conn.commit();
    }

    return {
      success: true,
      requestId,
      departmentName: targetStage.department_name,
      reopenedBy: actorName,
      downstreamStagesReset: downstreamStages.length,
      certificateRevoked: certRevoked,
      newOverallStatus: 'In Progress',
      newProgress
    };
  } catch (err) {
    if (!isOuterTx) {
      await conn.rollback();
    }
    throw err;
  } finally {
    if (!isOuterTx) {
      conn.release();
    }
  }
}

module.exports = {
  SEQUENTIAL_STAGES,
  executeStageTransition,
  reopenStage,
  updateRequestProgress,
  syncAllRequestsProgress,
  logAuditEntry
};
