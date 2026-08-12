const { query, getOne } = require('../config/db');
const { broadcastEvent } = require('./sse');

/**
 * Dispatches notifications simultaneously to BOTH the Student AND their respective Faculty Advisor (FA).
 */
async function notifyStudentAndFA({ registerNumber, requestNumber, title, studentMsg, faMsg, type = 'warning' }) {
  try {
    // 1. Notify Student
    if (registerNumber) {
      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [registerNumber, title, studentMsg, type]
      );
      broadcastEvent('notification', { title, message: studentMsg, type }, registerNumber);
    }

    // 2. Fetch Student Profile to resolve Respective FA details
    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [registerNumber]);
    if (!student) return;

    const faTargets = [
      student.advisor_emp_id,
      student.advisor_email,
      student.advisor_name
    ].filter(Boolean);

    // Resolve FA user record from faculty_advisors / users tables
    const faUser = await getOne(
      `SELECT u.username, fa.employee_id, fa.email, fa.full_name
       FROM faculty_advisors fa
       LEFT JOIN users u ON fa.user_id = u.id
       WHERE fa.employee_id = ? OR fa.email = ? OR fa.full_name = ?`,
      [student.advisor_emp_id, student.advisor_email, student.advisor_name]
    );

    if (faUser) {
      if (faUser.username) faTargets.push(faUser.username);
      if (faUser.employee_id) faTargets.push(faUser.employee_id);
      if (faUser.email) faTargets.push(faUser.email);
      if (faUser.full_name) faTargets.push(faUser.full_name);
    }

    const uniqueFaTargets = [...new Set(faTargets.filter(Boolean))];
    const finalFaMsg = faMsg || `ADVISEE ALERT: No-Dues application (${requestNumber || ''}) of your advisee ${student.full_name} (${registerNumber}) status update: ${title}`;

    for (const target of uniqueFaTargets) {
      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [target, `Advisee Alert: ${title}`, finalFaMsg, type]
      );
      broadcastEvent('notification', { title: `Advisee Alert: ${title}`, message: finalFaMsg, type }, target);
    }

    // Broadcast global stage update to dashboard listeners
    broadcastEvent('nodues_update', { registerNumber, requestNumber, title });

  } catch (error) {
    console.error('Error dispatching dual notification to FA & Student:', error);
  }
}

module.exports = {
  notifyStudentAndFA
};
