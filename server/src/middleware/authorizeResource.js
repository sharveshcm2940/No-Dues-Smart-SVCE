const { getOne } = require('../config/db');

/**
 * Centralized Authorization & IDOR Protection Middleware
 * Enforces least-privilege scoping across all roles:
 * - Students: Own requests, own files, own complaints, own notifications only.
 * - Faculty Advisors: Only assigned advisees.
 * - Department Officers (HOD, DPC, Dept Library): Only students/requests in their department.
 * - Officers: Only authorized stages.
 */

/**
 * Helper to retrieve officer's assigned department
 */
async function getOfficerDepartment(user) {
  if (!user) return null;
  const role = user.role;
  const username = user.username;

  if (role === 'hod') {
    const hod = await getOne('SELECT department FROM hod_profile WHERE employee_id = ? OR user_id = ?', [username, user.id]);
    return hod ? hod.department : null;
  }
  if (role === 'dpc') {
    const dpc = await getOne('SELECT department FROM dpc_profile WHERE employee_id = ? OR user_id = ?', [username, user.id]);
    return dpc ? dpc.department : null;
  }
  if (role === 'library_staff') {
    const ls = await getOne('SELECT department FROM library_staff WHERE employee_id = ? OR user_id = ?', [username, user.id]);
    return ls ? ls.department : null;
  }
  if (role === 'faculty_advisor') {
    const fa = await getOne('SELECT department FROM faculty_advisors WHERE employee_id = ? OR user_id = ?', [username, user.id]);
    return fa ? fa.department : null;
  }

  return null;
}

/**
 * Middleware: Verify caller has legitimate authorization to access a specific No-Dues request
 */
function requireRequestOwnership(options = {}) {
  return async (req, res, next) => {
    try {
      const requestId = req.params.requestId || req.params.id || req.body?.requestId;
      if (!requestId) {
        return res.status(400).json({ success: false, message: 'Request ID parameter is required.' });
      }

      const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
      if (!request) {
        return res.status(404).json({ success: false, message: 'Clearance request record not found.' });
      }

      const { role, username, id: userId } = req.user;

      // 1. Student Access: Must be the owner of the request
      if (role === 'student') {
        if (request.register_number !== username) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You do not own this clearance request.'
          });
        }
      }

      // 2. Faculty Advisor Access: Student must be an assigned advisee
      else if (role === 'faculty_advisor') {
        const fa = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ? OR user_id = ?', [username, userId]);
        const advisee = await getOne(
          'SELECT id FROM students WHERE register_number = ? AND (advisor_emp_id = ? OR advisor_name = ?)',
          [request.register_number, username, fa ? fa.full_name : '']
        );
        if (!advisee) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: This request does not belong to an assigned advisee in your roster.'
          });
        }
      }

      // 3. Department Officers (HOD, DPC, Dept Library): Must match department
      else if (['hod', 'dpc', 'library_staff'].includes(role)) {
        const officerDept = await getOfficerDepartment(req.user);
        if (officerDept && request.department && officerDept.toLowerCase() !== request.department.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Access denied: Request belongs to department '${request.department}', but your account is scoped to '${officerDept}'.`
          });
        }
      }

      // College-wide officers (Finance, Main Library, Admin) have institutional access
      req.noduesRequest = request;
      next();
    } catch (err) {
      console.error('Authorization Check Error:', err);
      return res.status(500).json({ success: false, message: 'Authorization verification failed.' });
    }
  };
}

/**
 * Middleware: Verify student/advisee identity when accessing student profile records
 */
function requireStudentOrAdvisee(paramName = 'regNo') {
  return async (req, res, next) => {
    try {
      const regNo = req.params[paramName] || req.body?.register_number || req.query?.[paramName];
      if (!regNo) {
        return res.status(400).json({ success: false, message: 'Student Register Number is required.' });
      }

      const student = await getOne('SELECT * FROM students WHERE register_number = ?', [regNo]);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }

      const { role, username, id: userId } = req.user;

      // Student can only access their own record
      if (role === 'student') {
        if (regNo !== username) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only access your own student records.'
          });
        }
      }

      // FA can only access their advisees
      else if (role === 'faculty_advisor') {
        const fa = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ? OR user_id = ?', [username, userId]);
        if (student.advisor_emp_id !== username && student.advisor_name !== (fa ? fa.full_name : '')) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Student is not assigned under your Faculty Advisor advisee roster.'
          });
        }
      }

      // Department officers (HOD, DPC, Dept Library) can only access students in their department
      else if (['hod', 'dpc', 'library_staff'].includes(role)) {
        const officerDept = await getOfficerDepartment(req.user);
        if (officerDept && student.department && officerDept.toLowerCase() !== student.department.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Access denied: Student belongs to '${student.department}', but your account is scoped to '${officerDept}'.`
          });
        }
      }

      req.targetStudent = student;
      next();
    } catch (err) {
      console.error('Student Authorization Check Error:', err);
      return res.status(500).json({ success: false, message: 'Student authorization verification failed.' });
    }
  };
}

module.exports = {
  getOfficerDepartment,
  requireRequestOwnership,
  requireStudentOrAdvisee
};
