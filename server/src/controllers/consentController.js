const { query, getOne } = require('../config/db');
const env = require('../config/env');
const { logAuditEvent } = require('../utils/auditLogger');

exports.getUserConsents = async (req, res) => {
  try {
    const userId = req.user.id;
    const records = await query(
      'SELECT id, purpose, policy_version, status, created_at, revoked_at FROM consent_records WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );

    return res.json({
      success: true,
      consents: records
    });
  } catch (err) {
    console.error('Error fetching user consents:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve consent records.' });
  }
};

exports.recordConsent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { purpose, status, policyVersion } = req.body;

    if (!purpose || !status || !['Granted', 'Revoked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid purpose and status ('Granted' or 'Revoked') are required."
      });
    }

    const version = policyVersion || 'v1.0';
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Client';

    const revokedAt = status === 'Revoked' ? new Date() : null;

    const insertResult = await query(
      `INSERT INTO consent_records (user_id, purpose, policy_version, status, ip_address, user_agent, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, purpose, version, status, ipAddress, userAgent, revokedAt]
    );

    await logAuditEvent({
      req,
      user: req.user,
      action: status === 'Granted' ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      details: `User updated consent for purpose '${purpose}' to '${status}' (Policy ${version})`,
      module: 'Privacy & DPDP'
    });

    return res.json({
      success: true,
      message: `Consent for ${purpose} has been successfully ${status.toLowerCase()}.`,
      recordId: insertResult?.insertId || insertResult?.id
    });
  } catch (err) {
    console.error('Error updating consent:', err);
    return res.status(500).json({ success: false, message: 'Failed to record consent.' });
  }
};

/**
 * Retention cleanup job logic (callable from script or authorized admin endpoint)
 */
async function purgeExpiredAuditLogs(retentionDays = null) {
  const days = retentionDays || env.AUDIT_LOG_RETENTION_DAYS || 90;
  const result = await query(
    `DELETE FROM system_audit_logs 
     WHERE action IN ('USER_LOGIN', 'USER_LOGOUT') 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days]
  );
  return {
    deletedCount: result.affectedRows,
    retentionDays: days
  };
}

exports.purgeExpiredLogs = async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || env.AUDIT_LOG_RETENTION_DAYS || 90;
    const result = await purgeExpiredAuditLogs(days);
    return res.json({
      success: true,
      message: `Purged ${result.deletedCount} login/logout audit records older than ${result.retentionDays} days.`,
      ...result
    });
  } catch (err) {
    console.error('Error purging audit logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to purge audit logs.' });
  }
};

exports.purgeExpiredAuditLogs = purgeExpiredAuditLogs;
