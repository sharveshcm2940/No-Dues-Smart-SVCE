const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSecret: otpGenerateSecret, generateSync: otpGenerateSync, verifySync: otpVerifySync } = require('otplib');
const qrcode = require('qrcode');

const { query, getOne } = require('../config/db');
const env = require('../config/env');
const { logAuditEvent } = require('../utils/auditLogger');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');
const { sendPasswordResetEmail } = require('../utils/mailer');

const JWT_SECRET = env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET;

// Helper to hash refresh / reset tokens before storing in MySQL
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Generate a random refresh token
function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Register Number / Employee ID and Password are required.' });
    }

    const cleanUsername = username.trim();
    let user = await getOne('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (!user) {
      // Also allow flexible login by email, full name, or first/last name
      user = await getOne(
        `SELECT u.* FROM users u 
         LEFT JOIN faculty_advisors fa ON fa.user_id = u.id 
         LEFT JOIN students s ON s.user_id = u.id 
         WHERE u.email = ? 
            OR LOWER(fa.full_name) = LOWER(?) 
            OR LOWER(REPLACE(fa.full_name, '.', '')) = LOWER(REPLACE(?, '.', ''))
            OR LOWER(s.full_name) = LOWER(?)
            OR LOWER(fa.full_name) LIKE LOWER(CONCAT('%', ?, '%'))
         LIMIT 1`,
        [cleanUsername, cleanUsername, cleanUsername, cleanUsername, cleanUsername]
      );
    }

    // Generic error to prevent username enumeration
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid Register Number / Employee ID or Password.' });
    }

    // 1. Check Account Lockout (5 failed attempts for 15 minutes)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      await logAuditEvent({
        req,
        user,
        action: 'LOGIN_LOCKED_ATTEMPT',
        details: `Login attempted on locked account (${cleanUsername}). Locked for ${waitMinutes} more minutes.`,
        module: 'Authentication'
      });
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.'
      });
    }

    // 2. Check if Account is Deactivated
    if (user.is_active === 0) {
      await logAuditEvent({
        req,
        user,
        action: 'LOGIN_DEACTIVATED_ATTEMPT',
        details: `Login attempted on deactivated account (${cleanUsername}).`,
        module: 'Authentication'
      });
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your system administrator.'
      });
    }

    // 3. Validate Password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      let isNowLocked = false;

      if (failedAttempts >= 5) {
        isNowLocked = true;
        await query(
          'UPDATE users SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
          [failedAttempts, user.id]
        );
        await logAuditEvent({
          req,
          user,
          action: 'ACCOUNT_LOCKED',
          details: `Account ${cleanUsername} locked for 15 minutes after 5 failed authentication attempts.`,
          module: 'Authentication'
        });
      } else {
        await query(
          'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
          [failedAttempts, user.id]
        );
        await logAuditEvent({
          req,
          user,
          action: 'LOGIN_FAILED',
          details: `Failed password attempt ${failedAttempts}/5 for user ${cleanUsername}.`,
          module: 'Authentication'
        });
      }

      if (isNowLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.'
        });
      }

      return res.status(401).json({ success: false, message: 'Invalid Register Number / Employee ID or Password.' });
    }

    // Reset failed login attempts upon successful password
    await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

    // 3. Resolve profile data
    let profileData = null;
    if (user.role === 'student') {
      profileData = await getOne('SELECT * FROM students WHERE user_id = ?', [user.id]);
    } else if (user.role === 'library_staff') {
      profileData = await getOne('SELECT * FROM library_staff WHERE user_id = ?', [user.id]);
    } else if (user.role === 'faculty_advisor') {
      profileData = await getOne('SELECT * FROM faculty_advisors WHERE user_id = ?', [user.id]);
    } else if (user.role === 'hod') {
      profileData = await getOne('SELECT * FROM hod_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'dpc') {
      profileData = await getOne('SELECT * FROM dpc_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'finance') {
      profileData = await getOne('SELECT * FROM finance_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'main_library_staff') {
      profileData = await getOne('SELECT * FROM main_library_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'admin') {
      profileData = {
        employee_id: user.username,
        full_name: 'System Administrator',
        email: user.email,
        department: 'Institutional Administration',
        designation: 'System Administrator'
      };
    }

    // 4. Multi-Factor Authentication: Disabled per institutional policy (single direct login)

    // 5. Issue Standard 1-Hour Access Token
    const mustChangePassword = Boolean(user.must_change_password);
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        profileId: profileData ? profileData.id : null,
        register_number: user.role === 'student' ? user.username : null,
        must_change_password: mustChangePassword
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 6. Generate and Persist Rotating Refresh Token (7 days)
    const rawRefreshToken = generateRefreshToken();
    const tokenHashed = hashToken(rawRefreshToken);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [user.id, tokenHashed, req.ip || '127.0.0.1', req.headers['user-agent'] || '']
    );

    await logAuditEvent({
      req,
      user: {
        id: user.id,
        username: user.username,
        full_name: profileData?.full_name || user.username,
        role: user.role
      },
      action: 'USER_LOGIN',
      details: `User authenticated successfully into ${user.role} workspace`,
      module: 'Authentication'
    });

    return res.json({
      success: true,
      token,
      refreshToken: rawRefreshToken,
      must_change_password: mustChangePassword,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        must_change_password: mustChangePassword,
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

// TOTP MFA Verification to complete login
exports.verifyMFA = async (req, res) => {
  try {
    const mfaPendingToken = req.body.mfaPendingToken || req.body.mfa_token;
    const totpCode = req.body.totpCode || req.body.totp_code;

    if (!mfaPendingToken || !totpCode) {
      return res.status(400).json({ success: false, message: 'MFA Pending Token and 6-digit TOTP code are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(mfaPendingToken, JWT_SECRET);
    } catch (e) {
      return res.status(403).json({ success: false, message: 'MFA session expired. Please sign in again.' });
    }

    if (!decoded.mfaPending || !decoded.userId) {
      return res.status(403).json({ success: false, message: 'Invalid MFA verification token.' });
    }

    const user = await getOne('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (!user || !user.mfa_secret || !user.mfa_enabled) {
      return res.status(400).json({ success: false, message: 'MFA is not configured for this account.' });
    }

    const isValid = otpVerifySync({ secret: user.mfa_secret, token: String(totpCode).trim(), digits: 6, algorithm: 'SHA1', period: 30, timestamp: Date.now() })?.valid === true;
    if (!isValid) {
      await logAuditEvent({
        req,
        user,
        action: 'MFA_FAILED',
        details: `Invalid TOTP verification code entered for ${user.username}`,
        module: 'Authentication'
      });
      return res.status(401).json({ success: false, message: 'Invalid 6-digit TOTP code.' });
    }

    // Resolve profile
    let profileData = null;
    if (user.role === 'hod') profileData = await getOne('SELECT * FROM hod_profile WHERE user_id = ?', [user.id]);
    else if (user.role === 'finance') profileData = await getOne('SELECT * FROM finance_profile WHERE user_id = ?', [user.id]);
    else if (user.role === 'admin') {
      profileData = {
        employee_id: user.username,
        full_name: 'System Administrator',
        email: user.email,
        department: 'Institutional Administration',
        designation: 'System Administrator'
      };
    }

    const mustChangePassword = Boolean(user.must_change_password);
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        profileId: profileData ? profileData.id : null,
        must_change_password: mustChangePassword
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const rawRefreshToken = generateRefreshToken();
    const tokenHashed = hashToken(rawRefreshToken);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [user.id, tokenHashed, req.ip || '127.0.0.1', req.headers['user-agent'] || '']
    );

    await logAuditEvent({
      req,
      user,
      action: 'USER_LOGIN',
      details: `User completed MFA authentication into ${user.role} workspace`,
      module: 'Authentication'
    });

    return res.json({
      success: true,
      token,
      refreshToken: rawRefreshToken,
      must_change_password: mustChangePassword,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        must_change_password: mustChangePassword,
        profile: profileData
      }
    });

  } catch (error) {
    console.error('MFA Verification Error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying MFA code.' });
  }
};

// TOTP MFA Setup (Generate QR code & Secret)
exports.setupMFA = async (req, res) => {
  try {
    const mfaPendingToken = req.body.mfaPendingToken || req.body.mfa_token;
    let userId;

    if (mfaPendingToken) {
      const decoded = jwt.verify(mfaPendingToken, JWT_SECRET);
      userId = decoded.userId;
    } else if (req.user) {
      userId = req.user.id;
    } else {
      return res.status(401).json({ success: false, message: 'Authentication required for MFA setup.' });
    }

    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const secret = otpGenerateSecret();
    const otpauth = `otpauth://totp/SVCE%20No-Dues%20ERP:${encodeURIComponent(user.username)}?secret=${secret}&issuer=SVCE%20No-Dues%20ERP&algorithm=SHA1&digits=6&period=30`;
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    // Save candidate secret
    await query('UPDATE users SET mfa_secret = ? WHERE id = ?', [secret, user.id]);

    return res.json({
      success: true,
      secret,
      qrCodeUrl,
      message: 'Scan this QR code with Google Authenticator or Microsoft Authenticator, then enter the code to confirm.'
    });

  } catch (error) {
    console.error('MFA Setup Error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating MFA setup.' });
  }
};

// Confirm and Enable MFA
exports.enableMFA = async (req, res) => {
  try {
    const mfaPendingToken = req.body.mfaPendingToken || req.body.mfa_token;
    const totpCode = req.body.totpCode || req.body.totp_code;
    let userId;

    if (mfaPendingToken) {
      const decoded = jwt.verify(mfaPendingToken, JWT_SECRET);
      userId = decoded.userId;
    } else if (req.user) {
      userId = req.user.id;
    } else {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user || !user.mfa_secret) {
      return res.status(400).json({ success: false, message: 'Please initialize MFA setup first.' });
    }

    const isValid = otpVerifySync({ secret: user.mfa_secret, token: String(totpCode).trim(), digits: 6, algorithm: 'SHA1', period: 30, timestamp: Date.now() })?.valid === true;
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code. Please check your authenticator app.' });
    }

    await query('UPDATE users SET mfa_enabled = 1 WHERE id = ?', [user.id]);

    await logAuditEvent({
      req,
      user,
      action: 'MFA_ENABLED',
      details: `Two-Factor Authentication successfully enrolled and activated for ${user.username}`,
      module: 'Authentication'
    });

    return res.json({ success: true, message: 'Two-Factor Authentication is now enabled.' });

  } catch (error) {
    console.error('Enable MFA Error:', error);
    return res.status(500).json({ success: false, message: 'Server error enabling MFA.' });
  }
};

exports.setupMfa = exports.setupMFA;
exports.enableMfa = exports.enableMFA;
exports.verifyMfa = exports.verifyMFA;

// Rotate Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    const tokenHashed = hashToken(refreshToken.trim());

    // Check token existence and validity
    const record = await getOne(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()',
      [tokenHashed]
    );

    if (!record) {
      return res.status(401).json({ success: false, message: 'Invalid, revoked, or expired refresh token.' });
    }

    // Revoke old refresh token (Token Rotation!)
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [record.id]);

    const user = await getOne('SELECT * FROM users WHERE id = ?', [record.user_id]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User associated with refresh token no longer exists.' });
    }

    // Resolve profile
    let profileData = null;
    if (user.role === 'student') profileData = await getOne('SELECT * FROM students WHERE user_id = ?', [user.id]);
    else if (user.role === 'library_staff') profileData = await getOne('SELECT * FROM library_staff WHERE user_id = ?', [user.id]);
    else if (user.role === 'faculty_advisor') profileData = await getOne('SELECT * FROM faculty_advisors WHERE user_id = ?', [user.id]);
    else if (user.role === 'hod') profileData = await getOne('SELECT * FROM hod_profile WHERE user_id = ?', [user.id]);
    else if (user.role === 'dpc') profileData = await getOne('SELECT * FROM dpc_profile WHERE user_id = ?', [user.id]);
    else if (user.role === 'finance') profileData = await getOne('SELECT * FROM finance_profile WHERE user_id = ?', [user.id]);
    else if (user.role === 'main_library_staff') profileData = await getOne('SELECT * FROM main_library_profile WHERE user_id = ?', [user.id]);

    const mustChangePassword = Boolean(user.must_change_password);
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        profileId: profileData ? profileData.id : null,
        register_number: user.role === 'student' ? user.username : null,
        must_change_password: mustChangePassword
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHashed = hashToken(newRawRefreshToken);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [user.id, newTokenHashed, req.ip || '127.0.0.1', req.headers['user-agent'] || '']
    );

    return res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRawRefreshToken
    });

  } catch (error) {
    console.error('Refresh Token Error:', error);
    return res.status(500).json({ success: false, message: 'Server error rotating refresh token.' });
  }
};

// Logout & Revoke Refresh Token
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHashed = hashToken(refreshToken.trim());
      await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [tokenHashed]);
    }

    if (req.user) {
      await logAuditEvent({
        req,
        user: req.user,
        action: 'USER_LOGOUT',
        details: `User session ended for ${req.user.username}`,
        module: 'Authentication'
      });
    }

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// Update Password (Enforces Password Policy & Resets must_change_password flag)
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    // Enforce Password Complexity Policy
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return res.status(400).json({ success: false, message: policyResult.error });
    }

    const user = await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [newHash, req.user.id]);

    // Revoke all existing refresh tokens for security
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [req.user.id]);

    await logAuditEvent({
      req,
      user: req.user,
      action: 'PASSWORD_UPDATED',
      details: 'Account password changed successfully. Forced password flag cleared.',
      module: 'Authentication'
    });

    return res.json({ success: true, message: 'Password updated successfully. Forced change flag cleared.' });
  } catch (error) {
    console.error('Update Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
};

// Forgot Password Request (Dispatches single-use, 15-minute token by email)
exports.forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ success: false, message: 'Register Number or Email is required.' });
    }

    const clean = identifier.trim();
    const user = await getOne(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [clean, clean]
    );

    // Generic response to prevent user enumeration
    const genericResponse = {
      success: true,
      message: 'If an account matching the provided credentials exists, a password reset link has been dispatched to the registered email.'
    };

    if (!user || !user.email) {
      return res.json(genericResponse);
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHashed = hashToken(rawResetToken);

    // Save token with 15 minute expiration
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [user.id, tokenHashed]
    );

    const resetUrl = `${env.PUBLIC_BASE_URL.replace(/\/+$/, '')}/reset-password?token=${rawResetToken}`;

    await sendPasswordResetEmail({
      toEmail: user.email,
      recipientName: user.username,
      resetUrl
    });

    await logAuditEvent({
      req,
      user,
      action: 'PASSWORD_RESET_REQUESTED',
      details: `Password reset dispatched for user ${user.username}`,
      module: 'Authentication'
    });

    return res.json(genericResponse);

  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing password reset request.' });
  }
};

// Reset Password with Single-Use Token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    }

    // Enforce Password Complexity Policy
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return res.status(400).json({ success: false, message: policyResult.error });
    }

    const tokenHashed = hashToken(token.trim());

    const resetRecord = await getOne(
      'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()',
      [tokenHashed]
    );

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new link.'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password, clear must_change_password
    await query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [newHash, resetRecord.user_id]);

    // Mark reset token as used
    await query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [resetRecord.id]);

    // Revoke all active refresh tokens for user
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [resetRecord.user_id]);

    const user = await getOne('SELECT * FROM users WHERE id = ?', [resetRecord.user_id]);

    await logAuditEvent({
      req,
      user,
      action: 'PASSWORD_RESET_COMPLETED',
      details: `Password reset completed using single-use token for user ${user?.username || resetRecord.user_id}`,
      module: 'Authentication'
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.'
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error resetting password.' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await getOne('SELECT id, username, role, email, must_change_password, mfa_enabled FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let profileData = null;
    if (user.role === 'student') {
      profileData = await getOne('SELECT * FROM students WHERE user_id = ?', [user.id]);
    } else if (user.role === 'library_staff') {
      profileData = await getOne('SELECT * FROM library_staff WHERE user_id = ?', [user.id]);
    } else if (user.role === 'faculty_advisor') {
      profileData = await getOne('SELECT * FROM faculty_advisors WHERE user_id = ?', [user.id]);
    } else if (user.role === 'hod') {
      profileData = await getOne('SELECT * FROM hod_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'dpc') {
      profileData = await getOne('SELECT * FROM dpc_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'finance') {
      profileData = await getOne('SELECT * FROM finance_profile WHERE user_id = ?', [user.id]);
    } else if (user.role === 'main_library_staff') {
      profileData = await getOne('SELECT * FROM main_library_profile WHERE user_id = ?', [user.id]);
    }

    return res.json({
      success: true,
      user: {
        ...user,
        must_change_password: Boolean(user.must_change_password),
        mfa_enabled: Boolean(user.mfa_enabled),
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Get User Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
};

// Handover staff role/position to a new colleague
exports.handoverPosition = async (req, res) => {
  try {
    const { newEmployeeId, newName, newEmail, newPhone, newPassword } = req.body;
    const currentUserId = req.user.id;
    const currentUsername = req.user.username;
    const currentRole = req.user.role;

    if (!newEmployeeId || !newName || !newEmail || !newPhone || !newPassword) {
      return res.status(400).json({ success: false, message: 'All handover details (New Employee ID, Name, Email, Phone, and Password) are required.' });
    }

    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return res.status(400).json({ success: false, message: policyResult.error });
    }

    const exists = await getOne('SELECT id FROM users WHERE username = ? AND id != ?', [newEmployeeId, currentUserId]);
    if (exists) {
      return res.status(400).json({ success: false, message: `The Employee ID '${newEmployeeId}' is already registered in the system.` });
    }

    let table = '';
    if (currentRole === 'faculty_advisor') table = 'faculty_advisors';
    else if (currentRole === 'dpc') table = 'dpc_profile';
    else if (currentRole === 'hod') table = 'hod_profile';
    else if (currentRole === 'library_staff') table = 'library_staff';
    else if (currentRole === 'finance') table = 'finance_profile';
    else if (currentRole === 'main_library_staff') table = 'main_library_profile';

    if (!table) {
      return res.status(400).json({ success: false, message: 'Only staff roles can initiate a position handover.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Revoke all existing refresh tokens for the outgoing staff member
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [currentUserId]);

    // Update Users login table and require initial password change
    await query(
      `UPDATE users SET username = ?, password = ?, email = ?, must_change_password = 1 WHERE id = ?`,
      [newEmployeeId, hashedNewPassword, newEmail, currentUserId]
    );

    // Update profile table
    await query(
      `UPDATE ${table} SET employee_id = ?, full_name = ?, email = ?, phone = ? WHERE user_id = ?`,
      [newEmployeeId, newName, newEmail, newPhone, currentUserId]
    );

    if (currentRole === 'faculty_advisor') {
      await query(
        `UPDATE students 
         SET advisor_emp_id = ?, advisor_name = ?, advisor_email = ?, advisor_phone = ? 
         WHERE advisor_emp_id = ?`,
        [newEmployeeId, newName, newEmail, newPhone, currentUsername]
      );
    }

    await logAuditEvent({
      req,
      user: req.user,
      action: 'ROLE_HANDOVER',
      details: `Position ${currentRole} transferred from ${currentUsername} to ${newName} (${newEmployeeId})`,
      module: 'Administration'
    });

    return res.json({
      success: true,
      message: `Successfully transferred position control to ${newName} (${newEmployeeId}). All previous tokens revoked.`
    });

  } catch (error) {
    console.error('Handover Position Error:', error);
    return res.status(500).json({ success: false, message: 'Server error occurred during role transition.' });
  }
};
