const bcrypt = require('bcryptjs');
const { query, getOne, getPool } = require('../config/db');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get users with pagination, role filter, search, and active status
 */
exports.getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : '';
    const roleFilter = req.query.role && req.query.role !== 'ALL' ? req.query.role : '';
    const statusFilter = req.query.status && req.query.status !== 'ALL' ? req.query.status : '';

    const conditions = [];
    const params = [];

    if (roleFilter) {
      conditions.push('role = ?');
      params.push(roleFilter);
    }

    if (statusFilter === 'active') {
      conditions.push('is_active = 1');
    } else if (statusFilter === 'deactivated') {
      conditions.push('is_active = 0');
    } else if (statusFilter === 'locked') {
      conditions.push('locked_until IS NOT NULL AND locked_until > NOW()');
    }

    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult] = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countResult ? countResult.total : 0;

    const users = await query(
      `SELECT id, username, email, role, is_active, must_change_password, failed_login_attempts, locked_until, mfa_enabled, created_at
       FROM users ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin Get Users Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users list.' });
  }
};

/**
 * Create a new user with role and profile provisioning
 */
exports.createUser = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { username, email, password, role, full_name, department, phone, register_number, employee_id } = req.body;

    if (!username || !email || !password || !role) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Username, Email, Password, and Role are mandatory.'
      });
    }

    const validRoles = ['student', 'library_staff', 'faculty_advisor', 'hod', 'dpc', 'finance', 'main_library_staff', 'admin'];
    if (!validRoles.includes(role)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Valid roles: ${validRoles.join(', ')}`
      });
    }

    // Check duplicate username or email
    const [existing] = await conn.query('SELECT id, username, email FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim()]);
    if (existing && existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: existing[0].username === username.trim()
          ? 'A user with this username / register number already exists.'
          : 'A user with this email address already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const mustChange = req.body.must_change_password ? 1 : 0;

    const [userResult] = await conn.query(
      `INSERT INTO users (username, email, password, role, must_change_password, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [username.trim(), email.trim(), hashedPassword, role, mustChange]
    );
    const userId = userResult.insertId;

    const name = full_name || username.trim();
    const dept = department || 'Information Technology';
    const ph = phone || '+91 98401 00000';
    const empId = employee_id || username.trim();

    // Create profile record according to role
    if (role === 'student') {
      const regNo = register_number || username.trim();
      await conn.query(
        `INSERT INTO students (user_id, register_number, id_card_number, full_name, department, year, section, email, phone, advisor_name, advisor_emp_id, advisor_email, advisor_phone)
         VALUES (?, ?, ?, ?, ?, 'IV Year', 'A', ?, ?, 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223')`,
        [userId, regNo, `IDC-${regNo}`, name, dept, email.trim(), ph]
      );
    } else if (role === 'library_staff') {
      await conn.query(
        `INSERT INTO library_staff (user_id, employee_id, full_name, email, phone, department)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, empId, name, email.trim(), ph, dept]
      );
    } else if (role === 'faculty_advisor') {
      await conn.query(
        `INSERT INTO faculty_advisors (user_id, employee_id, full_name, email, phone, department)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, empId, name, email.trim(), ph, dept]
      );
    } else if (role === 'hod') {
      await conn.query(
        `INSERT INTO hod_profile (user_id, employee_id, full_name, email, phone, department)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, empId, name, email.trim(), ph, dept]
      );
    } else if (role === 'dpc') {
      await conn.query(
        `INSERT INTO dpc_profile (user_id, employee_id, full_name, email, phone, department)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, empId, name, email.trim(), ph, dept]
      );
    } else if (role === 'finance') {
      await conn.query(
        `INSERT INTO finance_profile (user_id, employee_id, full_name, email, phone, department)
         VALUES (?, ?, ?, ?, ?, 'Finance and Accounts Section')`,
        [userId, empId, name, email.trim(), ph]
      );
    } else if (role === 'main_library_staff') {
      await conn.query(
        `INSERT INTO main_library_profile (user_id, employee_id, full_name, email, phone, department)
         VALUES (?, ?, ?, ?, ?, 'Central Library')`,
        [userId, empId, name, email.trim(), ph]
      );
    }

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'ADMIN_CREATE_USER',
      details: `Administrator ${req.user.username} created user '${username.trim()}' with role '${role}' (User ID: ${userId}).`,
      module: 'User Management'
    });

    return res.status(201).json({
      success: true,
      message: `User '${username.trim()}' created successfully.`,
      userId
    });
  } catch (error) {
    await conn.rollback();
    console.error('Admin Create User Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  } finally {
    conn.release();
  }
};

/**
 * Update an existing user's details (email, role, active status)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, is_active } = req.body;

    const user = await getOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updates = [];
    const params = [];

    if (email) {
      updates.push('email = ?');
      params.push(email.trim());
    }

    if (role) {
      const validRoles = ['student', 'library_staff', 'faculty_advisor', 'hod', 'dpc', 'finance', 'main_library_staff', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (is_active !== undefined) {
      if (parseInt(id) === req.user.id && !is_active) {
        return res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own active account.' });
      }
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }

    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAuditEvent({
      req,
      user: req.user,
      action: 'ADMIN_UPDATE_USER',
      details: `Administrator ${req.user.username} updated profile for user #${id} (${user.username}).`,
      module: 'User Management'
    });

    return res.json({
      success: true,
      message: `User '${user.username}' updated successfully.`
    });
  } catch (error) {
    console.error('Admin Update User Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

/**
 * Toggle user activation status (Active / Deactivated)
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot deactivate their own active account.'
      });
    }

    const user = await getOne('SELECT id, username, is_active FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = user.is_active ? 0 : 1;
    await query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

    // If deactivating, revoke active sessions
    if (newStatus === 0) {
      await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [id]);
    }

    await logAuditEvent({
      req,
      user: req.user,
      action: newStatus === 1 ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_DEACTIVATE_USER',
      details: `Administrator ${req.user.username} ${newStatus === 1 ? 'activated' : 'deactivated'} user '${user.username}'.`,
      module: 'User Management'
    });

    return res.json({
      success: true,
      message: `User '${user.username}' has been ${newStatus === 1 ? 'activated' : 'deactivated'}.`,
      isActive: newStatus === 1
    });
  } catch (error) {
    console.error('Admin Toggle User Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to modify user status.' });
  }
};

/**
 * Force password reset on next login
 */
exports.forcePasswordReset = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getOne('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await query('UPDATE users SET must_change_password = 1 WHERE id = ?', [id]);
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [id]);

    await logAuditEvent({
      req,
      user: req.user,
      action: 'ADMIN_FORCE_PASSWORD_RESET',
      details: `Administrator ${req.user.username} forced password reset for user '${user.username}'.`,
      module: 'User Management'
    });

    return res.json({
      success: true,
      message: `Password reset will be required upon next login for '${user.username}'.`
    });
  } catch (error) {
    console.error('Admin Force Password Reset Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to force password reset.' });
  }
};

/**
 * Unlock locked account
 */
exports.unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getOne('SELECT id, username, locked_until FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [id]);

    await logAuditEvent({
      req,
      user: req.user,
      action: 'ADMIN_UNLOCK_USER',
      details: `Administrator ${req.user.username} unlocked account '${user.username}'.`,
      module: 'User Management'
    });

    return res.json({
      success: true,
      message: `Account '${user.username}' has been successfully unlocked.`
    });
  } catch (error) {
    console.error('Admin Unlock User Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unlock user account.' });
  }
};

/**
 * Get system settings
 */
exports.getSettings = async (req, res) => {
  try {
    const rows = await query('SELECT * FROM system_settings ORDER BY setting_key ASC');
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = {
        value: r.setting_value,
        description: r.description,
        updatedBy: r.updated_by,
        updatedAt: r.updated_at
      };
    });

    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Admin Get Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve system settings.' });
  }
};

/**
 * Update system settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings payload.' });
    }

    const updatedKeys = [];

    for (const [key, value] of Object.entries(settings)) {
      // Validate numeric settings
      if (['fine_rate_per_day', 'fine_grace_days', 'fine_cap_amount'].includes(key)) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({
            success: false,
            message: `Setting '${key}' must be a non-negative number.`
          });
        }
      }

      await query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW()`,
        [key, String(value), req.user.username]
      );
      updatedKeys.push(key);
    }

    await logAuditEvent({
      req,
      user: req.user,
      action: 'ADMIN_UPDATE_SETTINGS',
      details: `Administrator ${req.user.username} updated system settings: [${updatedKeys.join(', ')}].`,
      module: 'System Settings'
    });

    return res.json({
      success: true,
      message: `Updated ${updatedKeys.length} system setting(s) successfully.`
    });
  } catch (error) {
    console.error('Admin Update Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update system settings.' });
  }
};
