const { query, getOne } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Register Number / Employee ID and Password are required.' });
    }

    // Auto-detect user role from database by username
    const user = await getOne('SELECT * FROM users WHERE username = ?', [username.trim()]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid Register Number / Employee ID or Password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid Register Number / Employee ID or Password.' });
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

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        profileId: profileData ? profileData.id : null,
        register_number: user.role === 'student' ? user.username : null
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Record audit log for login
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
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await getOne('SELECT id, username, role, email FROM users WHERE id = ?', [req.user.id]);
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
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Get User Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    const user = await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [newHash, req.user.id]);

    await logAuditEvent({
      req,
      user: req.user,
      action: 'PASSWORD_UPDATED',
      details: 'Account password changed successfully',
      module: 'Authentication'
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Update Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
};

// Handover staff role/position to a new colleague
exports.handoverPosition = async (req, res) => {
  try {
    const { newEmployeeId, newName, newEmail, newPhone, newPassword } = req.body;
    const currentUserId = req.user.id;
    const currentUsername = req.user.username; // Current Employee ID
    const currentRole = req.user.role;

    if (!newEmployeeId || !newName || !newEmail || !newPhone || !newPassword) {
      return res.status(400).json({ success: false, message: 'All handover details (New Employee ID, Name, Email, Phone, and Password) are required.' });
    }

    // Check if new Employee ID already exists (excluding the current user)
    const exists = await getOne('SELECT id FROM users WHERE username = ? AND id != ?', [newEmployeeId, currentUserId]);
    if (exists) {
      return res.status(400).json({ success: false, message: `The Employee ID '${newEmployeeId}' is already registered in the system.` });
    }

    // Determine target profile table based on role
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

    // 1. Update the Users login table
    await query(
      `UPDATE users SET username = ?, password = ?, email = ? WHERE id = ?`,
      [newEmployeeId, hashedNewPassword, newEmail, currentUserId]
    );

    // 2. Update the Profile table
    await query(
      `UPDATE ${table} SET employee_id = ?, full_name = ?, email = ?, phone = ? WHERE user_id = ?`,
      [newEmployeeId, newName, newEmail, newPhone, currentUserId]
    );

    // 3. For Faculty Advisor Handover: Update all students assigned to this FA
    if (currentRole === 'faculty_advisor') {
      await query(
        `UPDATE students 
         SET advisor_emp_id = ?, advisor_name = ?, advisor_email = ?, advisor_phone = ? 
         WHERE advisor_emp_id = ?`,
        [newEmployeeId, newName, newEmail, newPhone, currentUsername]
      );
      console.log(`SVCE ERP: Advisees synced for new Faculty Advisor ${newName} (${newEmployeeId}).`);
    }

    return res.json({
      success: true,
      message: `Successfully transferred position control to ${newName} (${newEmployeeId}). Current session credentials updated; please hand over the new details to the incoming staff member.`
    });

  } catch (error) {
    console.error('Handover Position Error:', error);
    return res.status(500).json({ success: false, message: 'Server error occurred during role transition.' });
  }
};
