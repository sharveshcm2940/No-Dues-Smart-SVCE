const { query, getOne, getPool } = require('../config/db');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get complaints scoped to role and department routing
 */
exports.getComplaints = async (req, res) => {
  try {
    const { role, username, id: userId } = req.user;
    const { status, department, search } = req.query;

    const conditions = [];
    const params = [];

    // Role-based scoping
    if (role === 'student') {
      conditions.push('c.register_number = ?');
      params.push(username);
    } else if (['hod', 'admin'].includes(role)) {
      // HOD and Admin have institutional overview; can filter by department if specified
      if (department && department !== 'ALL') {
        conditions.push('c.department = ?');
        params.push(department);
      }
    } else {
      // Department Officers: see complaints routed to their department or directly assigned to them
      const roleDeptMap = {
        library_staff: 'Department Library',
        main_library_staff: 'Central Library',
        dpc: 'DPC',
        finance: 'Finance',
        faculty_advisor: 'Faculty Advisor'
      };

      const myDept = roleDeptMap[role];
      if (myDept) {
        conditions.push('(c.department = ? OR c.assigned_to_user_id = ?)');
        params.push(myDept, userId);
      } else {
        conditions.push('c.assigned_to_user_id = ?');
        params.push(userId);
      }
    }

    if (status && status !== 'ALL') {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push('(c.complaint_id LIKE ? OR c.title LIKE ? OR c.register_number LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const complaints = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM complaint_status_history h WHERE h.complaint_id = c.id) as history_count
       FROM complaints c
       ${whereClause}
       ORDER BY c.id DESC`,
      params
    );

    return res.json({ success: true, complaints });
  } catch (error) {
    console.error('Get Complaints Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch complaints list.' });
  }
};

/**
 * Get complaint details with status audit history
 */
exports.getComplaintDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await getOne('SELECT * FROM complaints WHERE id = ?', [id]);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint ticket not found.' });
    }

    // Access control
    const { role, username, id: userId } = req.user;
    if (role === 'student' && complaint.register_number !== username) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only view your own complaints.' });
    }

    if (!['student', 'hod', 'admin'].includes(role)) {
      const roleDeptMap = {
        library_staff: 'Department Library',
        main_library_staff: 'Central Library',
        dpc: 'DPC',
        finance: 'Finance',
        faculty_advisor: 'Faculty Advisor'
      };

      const myDept = roleDeptMap[role];
      if (complaint.department !== myDept && complaint.assigned_to_user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: This complaint is routed to a different department roster.'
        });
      }
    }

    const history = await query(
      'SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY id ASC',
      [id]
    );

    return res.json({
      success: true,
      complaint,
      history,
      statusHistory: history
    });
  } catch (error) {
    console.error('Get Complaint Details Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load complaint details.' });
  }
};

/**
 * Register a new complaint with department routing
 */
exports.createComplaint = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { category, department, title, description, priority, attachment_url } = req.body;
    const regNo = req.user.role === 'student' ? req.user.username : (req.body.register_number || req.user.username);

    if (!category || !title || !description) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Category, Title, and Description are required to file a ticket.'
      });
    }

    // Resolve student name
    const student = await getOne('SELECT full_name FROM students WHERE register_number = ?', [regNo]);
    const studentName = student ? student.full_name : req.user.username;

    // Resolve routed department from category if not explicitly provided
    let routedDept = department;
    if (!routedDept) {
      const catLower = category.toLowerCase();
      if (catLower.includes('department library') || catLower.includes('dept library') || catLower.includes('book')) {
        routedDept = 'Department Library';
      } else if (catLower.includes('central library') || catLower.includes('main library')) {
        routedDept = 'Central Library';
      } else if (catLower.includes('placement') || catLower.includes('dpc') || catLower.includes('career')) {
        routedDept = 'DPC';
      } else if (catLower.includes('fee') || catLower.includes('finance') || catLower.includes('challan') || catLower.includes('dues')) {
        routedDept = 'Finance';
      } else if (catLower.includes('advisor') || catLower.includes('attendance') || catLower.includes('fa')) {
        routedDept = 'Faculty Advisor';
      } else if (catLower.includes('hod') || catLower.includes('department')) {
        routedDept = 'HOD';
      } else {
        routedDept = 'General';
      }
    }

    // Generate unique complaint ID
    const [maxId] = await conn.query('SELECT MAX(id) as maxId FROM complaints');
    const nextSeq = ((maxId && maxId[0].maxId) || 0) + 1;
    const complaintId = `CMP-2026-${String(nextSeq).padStart(4, '0')}`;

    const [insertResult] = await conn.query(
      `INSERT INTO complaints 
       (complaint_id, register_number, student_name, category, department, title, description, attachment_url, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [complaintId, regNo, studentName, category, routedDept, title.trim(), description.trim(), attachment_url || null, priority || 'Medium']
    );
    const newId = insertResult.insertId;

    // Record initial status history
    await conn.query(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by_user_id, changed_by_name, changed_by_role, remarks)
       VALUES (?, NULL, 'Open', ?, ?, ?, 'Ticket created by user.')`,
      [newId, req.user.id, studentName, req.user.role]
    );

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'COMPLAINT_FILED',
      details: `Complaint ${complaintId} filed by ${regNo} routed to '${routedDept}'. Title: '${title.trim()}'.`,
      module: 'Complaint Desk'
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      complaintId,
      id: newId,
      routedDepartment: routedDept
    });
  } catch (error) {
    await conn.rollback();
    console.error('Create Complaint Error:', error);
    return res.status(500).json({ success: false, message: 'Server error filing complaint.' });
  } finally {
    conn.release();
  }
};

/**
 * Assign complaint ticket to a specific officer
 */
exports.assignComplaint = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const { assigneeUserId, assigneeName, assigneeRole, remarks } = req.body;

    if (!assigneeUserId || !assigneeName) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Assignee User ID and Name are required.' });
    }

    const [cmpRows] = await conn.query('SELECT * FROM complaints WHERE id = ? FOR UPDATE', [id]);
    if (!cmpRows || cmpRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Complaint ticket not found.' });
    }
    const cmp = cmpRows[0];

    // Authorization: HOD, Admin, or officer in the same department
    const { role } = req.user;
    if (!['hod', 'admin'].includes(role)) {
      const roleDeptMap = {
        library_staff: 'Department Library',
        main_library_staff: 'Central Library',
        dpc: 'DPC',
        finance: 'Finance',
        faculty_advisor: 'Faculty Advisor'
      };
      if (cmp.department !== roleDeptMap[role]) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Unauthorized: Cannot reassign complaints of other departments.' });
      }
    }

    await conn.query(
      `UPDATE complaints 
       SET assigned_to = ?, assigned_to_user_id = ?, assigned_to_role = ?, status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END, updated_at = NOW()
       WHERE id = ?`,
      [assigneeName, assigneeUserId, assigneeRole || 'officer', id]
    );

    await conn.query(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by_user_id, changed_by_name, changed_by_role, remarks)
       VALUES (?, ?, CASE WHEN ? = 'Open' THEN 'In Progress' ELSE ? END, ?, ?, ?, ?)`,
      [
        id,
        cmp.status,
        cmp.status,
        cmp.status,
        req.user.id,
        req.user.full_name || req.user.username,
        req.user.role,
        remarks || `Ticket assigned to ${assigneeName} (${assigneeRole || 'officer'}).`
      ]
    );

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'COMPLAINT_ASSIGNED',
      details: `Complaint ${cmp.complaint_id} assigned to ${assigneeName} by ${req.user.username}.`,
      module: 'Complaint Desk'
    });

    return res.json({
      success: true,
      message: `Complaint ticket ${cmp.complaint_id} assigned to ${assigneeName}.`
    });
  } catch (error) {
    await conn.rollback();
    console.error('Assign Complaint Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign complaint.' });
  } finally {
    conn.release();
  }
};

/**
 * Update complaint status (In Progress, Resolved, Closed, Rejected) with resolution timestamp
 */
exports.updateComplaintStatus = async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const { status, reply, remarks } = req.body;

    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Valid status required. Options: ${validStatuses.join(', ')}`
      });
    }

    const [cmpRows] = await conn.query('SELECT * FROM complaints WHERE id = ? FOR UPDATE', [id]);
    if (!cmpRows || cmpRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Complaint ticket not found.' });
    }
    const cmp = cmpRows[0];

    // Authorization
    const { role, id: userId } = req.user;
    if (!['hod', 'admin'].includes(role)) {
      const roleDeptMap = {
        library_staff: 'Department Library',
        main_library_staff: 'Central Library',
        dpc: 'DPC',
        finance: 'Finance',
        faculty_advisor: 'Faculty Advisor'
      };
      if (cmp.department !== roleDeptMap[role] && cmp.assigned_to_user_id !== userId) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Unauthorized to update this complaint.' });
      }
    }

    const isResolved = ['Resolved', 'Closed'].includes(status);
    const resolvedAt = isResolved ? new Date() : (status === 'Open' ? null : cmp.resolved_at);

    await conn.query(
      `UPDATE complaints 
       SET status = ?, reply = COALESCE(?, reply), resolved_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, reply ? reply.trim() : null, resolvedAt, id]
    );

    const changerName = req.user.full_name || req.user.username;
    await conn.query(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by_user_id, changed_by_name, changed_by_role, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cmp.status,
        status,
        req.user.id,
        changerName,
        req.user.role,
        remarks || reply || `Status changed from ${cmp.status} to ${status}.`
      ]
    );

    // Notify student
    await conn.query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        cmp.register_number,
        `Complaint Ticket Updated: ${cmp.complaint_id}`,
        `Your complaint (${cmp.title}) status has been updated to '${status}'. ${reply ? 'Staff Reply: ' + reply : ''}`,
        isResolved ? 'success' : 'info'
      ]
    );

    await conn.commit();

    await logAuditEvent({
      req,
      user: req.user,
      action: 'COMPLAINT_STATUS_UPDATED',
      details: `Complaint ${cmp.complaint_id} status updated to '${status}' by ${changerName}.`,
      module: 'Complaint Desk'
    });

    return res.json({
      success: true,
      message: `Complaint ticket ${cmp.complaint_id} status updated to ${status}.`,
      status,
      resolvedAt
    });
  } catch (error) {
    await conn.rollback();
    console.error('Update Complaint Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update complaint status.' });
  } finally {
    conn.release();
  }
};
