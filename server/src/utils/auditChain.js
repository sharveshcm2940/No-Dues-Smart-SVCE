const crypto = require('crypto');
const { query, getPool } = require('../config/db');

const GENESIS_HASH = '0'.repeat(64);

function formatMySQLDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeDate(ts) {
  if (!ts) return '';
  if (ts instanceof Date) return formatMySQLDate(ts);
  return String(ts);
}

/**
 * Computes SHA-256 entry hash for audit log chaining
 */
function computeSystemAuditHash({ previousHash, userId, username, action, details, moduleName, ipAddress, createdAt }) {
  const normDate = normalizeDate(createdAt);
  const payload = [
    previousHash || GENESIS_HASH,
    String(userId || ''),
    String(username || ''),
    String(action || ''),
    String(details || ''),
    String(moduleName || ''),
    String(ipAddress || ''),
    normDate
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function computeNoDuesAuditHash({ previousHash, requestId, departmentName, actionType, actorName, actorRole, statusAfter, remarks, timestamp }) {
  const normDate = normalizeDate(timestamp);
  const payload = [
    previousHash || GENESIS_HASH,
    String(requestId || ''),
    String(departmentName || ''),
    String(actionType || ''),
    String(actorName || ''),
    String(actorRole || ''),
    String(statusAfter || ''),
    String(remarks || ''),
    normDate
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Inserts a cryptographically chained record into system_audit_logs
 */
async function appendSystemAuditLog({ userId, username, fullName, role, action, details, module, moduleName, deviceName, deviceType, location, ipAddress }, existingConn = null) {
  const conn = existingConn || (await getPool().getConnection());
  const mustRelease = !existingConn;
  try {
    // 1. Fetch latest entry hash
    const [latest] = await conn.query('SELECT id, entry_hash FROM system_audit_logs WHERE entry_hash IS NOT NULL ORDER BY id DESC LIMIT 1 FOR UPDATE');
    const previousHash = (latest && latest.length > 0 && latest[0].entry_hash) ? latest[0].entry_hash : GENESIS_HASH;

    const nowStr = formatMySQLDate(new Date());
    const mod = module || moduleName || 'General';
    const entryHash = computeSystemAuditHash({
      previousHash,
      userId,
      username,
      action,
      details,
      moduleName: mod,
      ipAddress,
      createdAt: nowStr
    });

    const [res] = await conn.query(
      `INSERT INTO system_audit_logs 
       (user_id, username, full_name, role, action, details, module, device_name, device_type, location, ip_address, previous_hash, entry_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, username || 'System', fullName || username || 'System', role || 'system', action, details || '', mod, deviceName || 'Unknown', deviceType || 'Desktop', location || 'Unknown', ipAddress || '127.0.0.1', previousHash, entryHash, nowStr]
    );

    return { id: res.insertId, previousHash, entryHash };
  } finally {
    if (mustRelease) conn.release();
  }
}

/**
 * Inserts a cryptographically chained record into nodues_audit_logs
 */
async function appendNoDuesAuditLog({ requestId, departmentName, actionType, actorName, actorRole, statusAfter, remarks, studentComment, attachmentUrl }, existingConn = null) {
  const conn = existingConn || (await getPool().getConnection());
  const mustRelease = !existingConn;
  try {
    const [latest] = await conn.query('SELECT id, entry_hash FROM nodues_audit_logs WHERE entry_hash IS NOT NULL ORDER BY id DESC LIMIT 1 FOR UPDATE');
    const previousHash = (latest && latest.length > 0 && latest[0].entry_hash) ? latest[0].entry_hash : GENESIS_HASH;

    const nowStr = formatMySQLDate(new Date());
    const rem = remarks || '';
    const entryHash = computeNoDuesAuditHash({
      previousHash,
      requestId,
      departmentName,
      actionType,
      actorName,
      actorRole,
      statusAfter,
      remarks: rem,
      timestamp: nowStr
    });

    const [res] = await conn.query(
      `INSERT INTO nodues_audit_logs 
       (request_id, department_name, action_type, actor_name, actor_role, status_after, remarks, student_comment, attachment_url, previous_hash, entry_hash, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, departmentName, actionType, actorName, actorRole, statusAfter, rem, studentComment || null, attachmentUrl || null, previousHash, entryHash, nowStr]
    );

    return { id: res.insertId, previousHash, entryHash };
  } finally {
    if (mustRelease) conn.release();
  }
}

/**
 * Verifies the integrity of the audit log hash chain
 */
async function verifyAuditChain(tableName = null) {
  if (!tableName) {
    const sysResult = await verifyAuditChain('system_audit_logs');
    if (!sysResult.valid) {
      return { ...sysResult, tamperedTable: 'system_audit_logs', tamperedLogId: sysResult.tamperedRowId };
    }
    const noduesResult = await verifyAuditChain('nodues_audit_logs');
    if (!noduesResult.valid) {
      return { ...noduesResult, tamperedTable: 'nodues_audit_logs', tamperedLogId: noduesResult.tamperedRowId };
    }
    return {
      valid: true,
      systemAuditChain: sysResult,
      noduesAuditChain: noduesResult,
      verifiedCount: (sysResult.verifiedCount || 0) + (noduesResult.verifiedCount || 0),
      systemLogsVerified: sysResult.verifiedCount || 0,
      noduesLogsVerified: noduesResult.verifiedCount || 0,
      totalRecords: (sysResult.totalRecords || 0) + (noduesResult.totalRecords || 0),
      message: 'All cryptographic hash chains are intact and untampered.'
    };
  }

  const validTables = ['system_audit_logs', 'nodues_audit_logs'];
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name for audit chain verification: ${tableName}`);
  }

  const rows = await query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
  if (rows.length === 0) {
    return { valid: true, totalRecords: 0, verifiedCount: 0, message: 'No records in audit log.' };
  }

  let expectedPreviousHash = GENESIS_HASH;
  let verifiedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // If historical row created before chaining was activated
    if (!row.entry_hash && !row.previous_hash) {
      continue;
    }

    if (row.previous_hash !== expectedPreviousHash) {
      return {
        valid: false,
        tamperedRowId: row.id,
        tamperedTable: tableName,
        error: 'Broken chain: previous_hash does not match preceding entry_hash',
        expectedPreviousHash,
        actualPreviousHash: row.previous_hash
      };
    }

    let calculatedHash;
    if (tableName === 'system_audit_logs') {
      calculatedHash = computeSystemAuditHash({
        previousHash: row.previous_hash,
        userId: row.user_id,
        username: row.username,
        action: row.action,
        details: row.details,
        moduleName: row.module,
        ipAddress: row.ip_address,
        createdAt: row.created_at
      });
    } else {
      calculatedHash = computeNoDuesAuditHash({
        previousHash: row.previous_hash,
        requestId: row.request_id,
        departmentName: row.department_name,
        actionType: row.action_type,
        actorName: row.actor_name,
        actorRole: row.actor_role,
        statusAfter: row.status_after,
        remarks: row.remarks,
        timestamp: row.timestamp
      });
    }

    if (calculatedHash !== row.entry_hash) {
      return {
        valid: false,
        tamperedRowId: row.id,
        tamperedTable: tableName,
        error: 'Tampered entry: recomputed hash does not match stored entry_hash',
        storedHash: row.entry_hash,
        calculatedHash
      };
    }

    expectedPreviousHash = row.entry_hash;
    verifiedCount++;
  }

  return {
    valid: true,
    totalRecords: rows.length,
    verifiedCount,
    latestHash: expectedPreviousHash,
    message: 'Cryptographic hash chain is intact and untampered.'
  };
}

module.exports = {
  GENESIS_HASH,
  computeSystemAuditHash,
  computeNoDuesAuditHash,
  appendSystemAuditLog,
  appendNoDuesAuditLog,
  verifyAuditChain
};
