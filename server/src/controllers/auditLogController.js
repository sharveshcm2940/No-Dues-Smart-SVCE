const { query, getOne } = require('../config/db');
const { logAuditEvent } = require('../utils/auditLogger');

exports.getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : '';
    const deviceType = req.query.device_type && req.query.device_type !== 'ALL' ? req.query.device_type : '';
    const moduleFilter = req.query.module && req.query.module !== 'ALL' ? req.query.module : '';
    const roleFilter = req.query.role && req.query.role !== 'ALL' ? req.query.role : '';

    const conditions = [];
    const params = [];

    // Strictly enforce only login details audit logs (no clearance, fake, or unrelated logs)
    conditions.push("action IN ('USER_LOGIN', 'USER_LOGOUT')");

    // Respective login details scoping:
    // Staff & student users see their respective login records.
    // HOD has executive oversight of department logins, with ability to filter by role.
    if (req.user.role !== 'hod') {
      conditions.push('(username = ? OR role = ?)');
      params.push(req.user.username, req.user.role);
    } else {
      if (roleFilter) {
        conditions.push('role = ?');
        params.push(roleFilter);
      }
    }

    if (deviceType) {
      conditions.push('device_type = ?');
      params.push(deviceType);
    }

    if (search) {
      conditions.push('(username LIKE ? OR full_name LIKE ? OR action LIKE ? OR details LIKE ? OR device_name LIKE ? OR location LIKE ? OR ip_address LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild, wild, wild, wild);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM system_audit_logs ${whereClause}`;
    const totalRow = await getOne(countSql, params);
    const total = totalRow ? totalRow.total : 0;

    const logsSql = `
      SELECT id, user_id, username, full_name, role, action, details, module, 
             device_name, device_type, location, ip_address, created_at
      FROM system_audit_logs
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const logs = await query(logsSql, [...params, limit, offset]);

    // Summary statistics for dashboard cards matching the respective login query
    const statsSql = `
      SELECT 
        COUNT(*) as total_logs,
        SUM(CASE WHEN device_type = 'Desktop' THEN 1 ELSE 0 END) as desktop_count,
        SUM(CASE WHEN device_type = 'Mobile' THEN 1 ELSE 0 END) as mobile_count,
        SUM(CASE WHEN device_type = 'Tablet' THEN 1 ELSE 0 END) as tablet_count,
        COUNT(DISTINCT location) as location_count,
        COUNT(DISTINCT device_name) as device_count
      FROM system_audit_logs
      ${whereClause}
    `;

    const stats = await getOne(statsSql, params);

    return res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      stats: {
        totalLogs: stats?.total_logs || total,
        desktopCount: Number(stats?.desktop_count || 0),
        mobileCount: Number(stats?.mobile_count || 0),
        tabletCount: Number(stats?.tablet_count || 0),
        locationCount: Number(stats?.location_count || 0),
        deviceCount: Number(stats?.device_count || 0)
      }
    });

  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
};

exports.recordClientAction = async (req, res) => {
  try {
    const { action, details, module } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, message: 'Action name is required.' });
    }

    await logAuditEvent({
      req,
      user: req.user,
      action,
      details: details || '',
      module: module || 'Client UI'
    });

    return res.json({ success: true, message: 'Audit event recorded successfully.' });
  } catch (err) {
    console.error('Error recording client audit event:', err);
    return res.status(500).json({ success: false, message: 'Failed to record audit event.' });
  }
};

exports.verifyAuditLogs = async (req, res) => {
  try {
    const { verifyAuditChain } = require('../utils/auditChain');
    const sysResult = await verifyAuditChain('system_audit_logs');
    const noduesResult = await verifyAuditChain('nodues_audit_logs');

    const isTampered = !sysResult.valid || !noduesResult.valid;

    return res.json({
      success: true,
      valid: !isTampered,
      tampered: isTampered,
      systemLogsVerified: sysResult.verifiedCount,
      noduesLogsVerified: noduesResult.verifiedCount,
      systemAuditChain: sysResult,
      noduesAuditChain: noduesResult,
      message: isTampered ? 'Tampering detected in audit log hash chain!' : 'Cryptographic audit log chains are intact and verified.'
    });
  } catch (err) {
    console.error('Error verifying audit logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify audit logs integrity.' });
  }
};
