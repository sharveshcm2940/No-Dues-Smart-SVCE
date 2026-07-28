const { query, getOne } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

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

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Update Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
};
