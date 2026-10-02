const { query, getOne } = require('../config/db');
const { notifyStudentAndFA } = require('../utils/notifier');
const { updateRequestProgress, logAuditEntry } = require('../utils/workflowHelper');

// Get Library Staff Dashboard Statistics
exports.getLibraryDashboard = async (req, res) => {
  try {
    const empId = req.user.username;

    // Staff details
    const staff = await getOne('SELECT * FROM library_staff WHERE employee_id = ?', [empId]);

    // Statistics Counts
    const totalBooks = await getOne('SELECT SUM(total_copies) as total, SUM(available_copies) as available, SUM(issued_copies) as issued FROM books');
    const pendingReturns = await getOne(`SELECT COUNT(*) as count FROM borrow_records WHERE status = 'Issued' AND due_date < date('now')`);
    
    const noduesStats = await getOne(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN overall_status = 'In Progress' THEN 1 ELSE 0 END) as pending_requests,
        SUM(CASE WHEN overall_status = 'Approved' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN overall_status = 'Rejected' THEN 1 ELSE 0 END) as rejected_requests,
        SUM(CASE WHEN date(request_date) = date('now') THEN 1 ELSE 0 END) as today_requests
      FROM nodues_requests
    `);

    // Department Library specific stage counts
    const deptStageStats = await getOne(`
      SELECT
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_dept_approvals,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_dept_approvals,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_dept_approvals,
        SUM(CASE WHEN status = 'Hold' THEN 1 ELSE 0 END) as hold_dept_approvals
      FROM nodues_stages
      WHERE department_name = 'Department Library'
    `);

    // Recent Requests for Dept Library
    const recentRequests = await query(`
      SELECT 
        nr.id as request_id,
        nr.request_number,
        nr.register_number,
        nr.student_name,
        nr.id_card_number,
        nr.department,
        nr.year,
        nr.request_date,
        nr.overall_status,
        ns.status as dept_library_status,
        ns.remarks as dept_library_remarks,
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.status = 'Issued') as pending_books,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.fine_status = 'Unpaid') as fine_amount
      FROM nodues_requests nr
      JOIN nodues_stages ns ON nr.id = ns.request_id AND ns.department_name = 'Department Library'
      ORDER BY 
        CASE nr.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        nr.student_name ASC
    `);

    // Ensure library_metrics table exists
    await query(`
      CREATE TABLE IF NOT EXISTS library_metrics (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_books INTEGER,
        available_books INTEGER,
        borrowed_books INTEGER,
        pending_returns INTEGER,
        is_custom INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const customMetrics = await getOne('SELECT * FROM library_metrics WHERE id = 1');

    const totalBooksVal = (customMetrics && customMetrics.is_custom && customMetrics.total_books !== null) 
      ? customMetrics.total_books 
      : (totalBooks.total || 0);

    const availableBooksVal = (customMetrics && customMetrics.is_custom && customMetrics.available_books !== null) 
      ? customMetrics.available_books 
      : (totalBooks.available || 0);

    const borrowedBooksVal = (customMetrics && customMetrics.is_custom && customMetrics.borrowed_books !== null) 
      ? customMetrics.borrowed_books 
      : (totalBooks.issued || 0);

    const pendingReturnsVal = (customMetrics && customMetrics.is_custom && customMetrics.pending_returns !== null) 
      ? customMetrics.pending_returns 
      : (pendingReturns.count || 0);

    return res.json({
      success: true,
      data: {
        staff,
        stats: {
          totalBooks: totalBooksVal,
          availableBooks: availableBooksVal,
          borrowedBooks: borrowedBooksVal,
          pendingReturns: pendingReturnsVal,
          isCustomMetrics: customMetrics ? Boolean(customMetrics.is_custom) : false,
          pendingRequests: deptStageStats.pending_dept_approvals || 0,
          approvedRequests: deptStageStats.approved_dept_approvals || 0,
          rejectedRequests: deptStageStats.rejected_dept_approvals || 0,
          holdRequests: deptStageStats.hold_dept_approvals || 0,
          todayRequests: noduesStats.today_requests || 0
        },
        recentRequests
      }
    });

  } catch (error) {
    console.error('Library Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading department library dashboard.' });
  }
};

// Process No-Dues Request Action (Approve / Reject / Hold)
exports.processNoDuesAction = async (req, res) => {
  try {
    const staffId = req.user.username;
    const { requestId, action, remarks } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and Action are required.' });
    }

    if (!['Approve', 'Reject', 'Hold'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action specified.' });
    }

    const staff = await getOne('SELECT full_name FROM library_staff WHERE employee_id = ?', [staffId]);
    const approverName = staff ? `${staff.full_name} (IT Library Officer)` : 'IT Department Library Officer';

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'No-Dues Request record not found.' });
    }

    // STRICT APPROVAL RULE ENFORCEMENT
    if (action === 'Approve') {
      const pendingBooksCount = await getOne(
        `SELECT COUNT(*) as count FROM borrow_records WHERE register_number = ? AND status = 'Issued'`,
        [request.register_number]
      );

      const fineSum = await getOne(
        `SELECT COALESCE(SUM(fine_amount), 0) as total FROM borrow_records WHERE register_number = ? AND fine_status = 'Unpaid'`,
        [request.register_number]
      );

      if (pendingBooksCount.count > 0 || fineSum.total > 0) {
        return res.status(400).json({
          success: false,
          isBlocked: true,
          message: 'Student has pending library dues. Approval blocked until all books are returned and fines are cleared.'
        });
      }
    }

    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Rejection remarks are mandatory when rejecting a No-Dues request.'
      });
    }

    const newStatus = action === 'Approve' ? 'Approved' : (action === 'Reject' ? 'Rejected' : 'Hold');

    // Update Department Library Stage
    await query(
      `UPDATE nodues_stages 
       SET status = ?, approved_by = ?, remarks = ?, updated_at = NOW()
       WHERE request_id = ? AND department_name = 'Department Library'`,
      [newStatus, approverName, remarks || (action === 'Approve' ? 'Department Library clearance granted.' : 'Put on hold by Department Library.'), requestId]
    );

    // Audit Log Entry
    await logAuditEntry({
      requestId,
      departmentName: 'Department Library',
      actionType: action === 'Approve' ? 'Approval' : (action === 'Reject' ? 'Rejection' : 'Hold'),
      actorName: approverName,
      actorRole: 'library_staff',
      statusAfter: newStatus,
      remarks: remarks || (action === 'Approve' ? 'Department Library clearance granted.' : 'Put on hold by Department Library.')
    });

    // If Approved, update progress and unlock next stage (Faculty Advisor)
    if (action === 'Approve') {
      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'Department Library Approved', `Department Library has approved your No-Dues request ${request.request_number}.`, 'success']
      );

      // Check parallel clearances
      await updateRequestProgress(requestId);
    } else if (action === 'Reject' || action === 'Hold') {
      const isReject = action === 'Reject';
      const actionText = isReject ? 'rejected' : 'placed on hold';

      if (isReject) {
        await query(
          `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'Department Library (Rejected)' WHERE id = ?`,
          [requestId]
        );
      }

      await notifyStudentAndFA({
        registerNumber: request.register_number,
        requestNumber: request.request_number,
        title: `No-Dues Request ${isReject ? 'REJECTED' : 'Put On Hold'} (Department Library)`,
        studentMsg: `Your No-Dues request ${request.request_number} was ${actionText} by Department Library. Reason/Remarks: ${remarks || 'Dues pending'}`,
        faMsg: `URGENT ADVISEE ALERT: The No-Dues application (${request.request_number}) of your advisee ${request.student_name} (${request.register_number}) was ${actionText.toUpperCase()} by Department Library. Remarks: ${remarks || 'Pending library dues/audit'}`,
        type: isReject ? 'danger' : 'warning'
      });
    }

    return res.json({
      success: true,
      message: `No-Dues Request ${request.request_number} marked as ${newStatus} successfully.`
    });

  } catch (error) {
    console.error('Process NoDues Action Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing request action.' });
  }
};

// Book Inventory Management (CRUD)
exports.getBooks = async (req, res) => {
  try {
    const books = await query('SELECT * FROM books ORDER BY id DESC');
    return res.json({ success: true, books });
  } catch (error) {
    console.error('Get Books Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading books catalog.' });
  }
};

exports.addBook = async (req, res) => {
  try {
    const { book_id, title, author, publisher, category, edition, isbn, shelf_number, total_copies } = req.body;

    if (!book_id || !title || !author || !isbn) {
      return res.status(400).json({ success: false, message: 'Book ID, Title, Author, and ISBN are required.' });
    }

    // Check duplicate book_id or ISBN
    const existing = await getOne('SELECT * FROM books WHERE book_id = ? OR isbn = ?', [book_id, isbn]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A book with the same Book ID or ISBN already exists.' });
    }

    const copies = parseInt(total_copies) || 1;

    await query(
      `INSERT INTO books (book_id, title, author, publisher, category, edition, isbn, shelf_number, total_copies, available_copies, issued_copies, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [book_id, title, author, publisher || 'University Press', category || 'Core IT', edition || '1st Edition', isbn, shelf_number || 'Shelf-A1', copies, copies, 0, 'Available']
    );

    return res.json({ success: true, message: `Book '${title}' added to catalog successfully.` });
  } catch (error) {
    console.error('Add Book Error:', error);
    return res.status(500).json({ success: false, message: 'Error creating book record.' });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, publisher, category, edition, isbn, shelf_number, total_copies, available_copies } = req.body;

    await query(
      `UPDATE books 
       SET title = ?, author = ?, publisher = ?, category = ?, edition = ?, isbn = ?, shelf_number = ?, total_copies = ?, available_copies = ?
       WHERE id = ?`,
      [title, author, publisher, category, edition, isbn, shelf_number, total_copies, available_copies, id]
    );

    return res.json({ success: true, message: 'Book details updated successfully.' });
  } catch (error) {
    console.error('Update Book Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating book details.' });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if book currently has active issues
    const book = await getOne('SELECT book_id FROM books WHERE id = ?', [id]);
    if (book) {
      const activeIssues = await getOne('SELECT COUNT(*) as count FROM borrow_records WHERE book_id = ? AND status = "Issued"', [book.book_id]);
      if (activeIssues.count > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete book with active issued copies.' });
      }
    }

    await query('DELETE FROM books WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Book removed from catalog.' });
  } catch (error) {
    console.error('Delete Book Error:', error);
    return res.status(500).json({ success: false, message: 'Error deleting book record.' });
  }
};

// Student Records List & Detailed Profile
exports.getStudentRecords = async (req, res) => {
  try {
    const students = await query(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = s.register_number AND br.status = 'Issued') as active_borrowed_count,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = s.register_number AND br.fine_status = 'Unpaid') as unpaid_fine,
        (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status
      FROM students s
      ORDER BY 
        CASE s.year 
          WHEN 'IV Year' THEN 4 
          WHEN 'III Year' THEN 3 
          WHEN 'II Year' THEN 2 
          WHEN 'I Year' THEN 1 
          ELSE 0 
        END DESC, 
        s.full_name ASC
    `);
    return res.json({ success: true, students });
  } catch (error) {
    console.error('Get Student Records Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading student directory.' });
  }
};

exports.getStudentDetail = async (req, res) => {
  try {
    const { regNo } = req.params;
    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [regNo]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const borrowHistory = await query(
      `SELECT br.*, b.title, b.author 
       FROM borrow_records br 
       JOIN books b ON br.book_id = b.book_id 
       WHERE br.register_number = ? 
       ORDER BY br.id DESC`,
      [regNo]
    );

    const noduesRequest = await getOne(
      `SELECT * FROM nodues_requests WHERE register_number = ? ORDER BY id DESC LIMIT 1`,
      [regNo]
    );

    let stages = [];
    if (noduesRequest) {
      stages = await query(`SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC`, [noduesRequest.id]);
    }

    return res.json({
      success: true,
      data: {
        student,
        borrowHistory,
        noduesRequest,
        stages
      }
    });
  } catch (error) {
    console.error('Get Student Detail Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading student profile.' });
  }
};

// Complaint Management for Library Staff
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await query('SELECT * FROM complaints ORDER BY id DESC');
    return res.json({ success: true, complaints });
  } catch (error) {
    console.error('Get All Complaints Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching complaints desk.' });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply, assigned_to } = req.body;

    const cmp = await getOne('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!cmp) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    await query(
      `UPDATE complaints SET status = ?, reply = ?, assigned_to = ?, updated_at = NOW() WHERE id = ?`,
      [status, reply || cmp.reply, assigned_to || cmp.assigned_to, id]
    );

    await query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [cmp.register_number, 'Complaint Status Updated', `Your ticket ${cmp.complaint_id} status changed to ${status}. Reply: ${reply || 'Updated by staff'}`, 'info']
    );

    return res.json({ success: true, message: `Complaint ticket status updated to ${status}.` });
  } catch (error) {
    console.error('Update Complaint Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating complaint ticket.' });
  }
};

// Announcements Management
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, description, category, priority, is_pinned } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and Description are required.' });
    }

    await query(
      `INSERT INTO announcements (title, description, category, priority, is_pinned, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, category || 'General', priority || 'Medium', is_pinned ? 1 : 0, 'Published']
    );

    return res.json({ success: true, message: 'Announcement published successfully.' });
  } catch (error) {
    console.error('Create Announcement Error:', error);
    return res.status(500).json({ success: false, message: 'Error publishing announcement.' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM announcements WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error('Delete Announcement Error:', error);
    return res.status(500).json({ success: false, message: 'Error deleting announcement.' });
  }
};

// Enterprise Reports Data Handler
exports.getReportData = async (req, res) => {
  try {
    const { type } = req.query; // 'daily', 'monthly', 'books', 'issued', 'pending_returns', 'fines', 'nodues', 'complaints'

    const isFA = req.user && (req.user.role === 'faculty_advisor' || req.user.role === 'fa');
    let faName = '';
    const empId = req.user ? req.user.username : '';

    if (isFA) {
      const fa = await getOne('SELECT full_name FROM faculty_advisors WHERE employee_id = ?', [empId]);
      faName = fa ? fa.full_name : '';
    }

    let reportTitle = 'Enterprise System Report';
    let columns = [];
    let rows = [];

    if (type === 'books') {
      reportTitle = 'IT Department Library - Book Inventory Report';
      columns = ['Book ID', 'Title', 'Author', 'Publisher', 'Category', 'Shelf', 'Total', 'Available', 'Issued', 'Status'];
      const data = await query('SELECT * FROM books ORDER BY title ASC');
      rows = data.map(b => [b.book_id, b.title, b.author, b.publisher, b.category, b.shelf_number, b.total_copies, b.available_copies, b.issued_copies, b.status]);
    } else if (type === 'issued') {
      reportTitle = isFA ? `Allocated Advisees Issued Books Report (${faName || 'Faculty Advisor'})` : 'Issued Books & Active Circulation Report';
      columns = ['Reg Number', 'Book ID', 'Title', 'Issue Date', 'Due Date', 'Fine (₹)', 'Status'];
      
      let data = [];
      if (isFA) {
        data = await query(`
          SELECT br.*, COALESCE(b.title, br.remarks, 'Library Item') as title 
          FROM borrow_records br 
          JOIN students s ON br.register_number = s.register_number
          LEFT JOIN books b ON br.book_id = b.book_id 
          WHERE br.status = 'Issued' AND (s.advisor_emp_id = ? OR s.advisor_name = ?)
          ORDER BY br.id DESC
        `, [empId, faName]);
      } else {
        data = await query(`
          SELECT br.*, COALESCE(b.title, br.remarks, 'Library Item') as title 
          FROM borrow_records br 
          LEFT JOIN books b ON br.book_id = b.book_id 
          WHERE br.status = 'Issued'
          ORDER BY br.id DESC
        `);
      }
      rows = data.map(b => [b.register_number, b.book_id, b.title, b.issue_date, b.due_date, b.fine_amount, b.status]);
    } else if (type === 'nodues') {
      reportTitle = isFA ? `Allocated Advisees No-Dues Clearance Applications Report (${faName || 'Faculty Advisor'})` : 'Final Year No-Dues Clearance Applications Report';
      columns = ['Request ID', 'Reg Number', 'Student Name', 'Department', 'Current Stage', 'Overall Status', 'Progress (%)', 'Date'];
      
      let data = [];
      if (isFA) {
        data = await query(`
          SELECT nr.* 
          FROM nodues_requests nr
          JOIN students s ON nr.register_number = s.register_number
          WHERE s.advisor_emp_id = ? OR s.advisor_name = ?
          ORDER BY nr.id DESC
        `, [empId, faName]);
      } else {
        data = await query('SELECT * FROM nodues_requests ORDER BY id DESC');
      }
      rows = data.map(n => [n.request_number, n.register_number, n.student_name, n.department, n.current_stage, n.overall_status, `${n.progress_percentage}%`, n.request_date]);
    } else if (type === 'fines') {
      reportTitle = isFA ? `Allocated Advisees Fine Collections Report (${faName || 'Faculty Advisor'})` : 'Fine Collections & Unpaid Dues Audit Report';
      columns = ['Reg Number', 'Book ID', 'Issue Date', 'Due Date', 'Fine Amount (₹)', 'Fine Status'];
      
      let data = [];
      if (isFA) {
        data = await query(`
          SELECT br.* 
          FROM borrow_records br
          JOIN students s ON br.register_number = s.register_number
          WHERE br.fine_amount > 0 AND (s.advisor_emp_id = ? OR s.advisor_name = ?)
          ORDER BY br.id DESC
        `, [empId, faName]);
      } else {
        data = await query('SELECT * FROM borrow_records WHERE fine_amount > 0 ORDER BY id DESC');
      }
      rows = data.map(f => [f.register_number, f.book_id, f.issue_date, f.due_date, `₹${f.fine_amount}`, f.fine_status]);
    } else {
      reportTitle = isFA ? `Allocated Advisees Master Clearance Audit Summary (${faName || 'Faculty Advisor'})` : 'IT Department No-Dues Master Summary Report';
      columns = ['Reg Number', 'Student Name', 'Dept', 'Year', 'Books Issued', 'Unpaid Fine', 'No-Dues Status'];
      
      let data = [];
      if (isFA) {
        data = await query(`
          SELECT 
            s.register_number,
            s.full_name,
            s.department,
            s.year,
            (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = s.register_number AND br.status = 'Issued') as books_issued,
            (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = s.register_number AND br.fine_status = 'Unpaid') as fine_unpaid,
            (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status
          FROM students s
          WHERE s.advisor_emp_id = ? OR s.advisor_name = ?
          ORDER BY s.full_name ASC
        `, [empId, faName]);
      } else {
        data = await query(`
          SELECT 
            s.register_number,
            s.full_name,
            s.department,
            s.year,
            (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = s.register_number AND br.status = 'Issued') as books_issued,
            (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = s.register_number AND br.fine_status = 'Unpaid') as fine_unpaid,
            (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status
          FROM students s
          ORDER BY s.full_name ASC
        `);
      }
      rows = data.map(d => [d.register_number, d.full_name, d.department, d.year, d.books_issued, `₹${d.fine_unpaid}`, d.nodues_status || 'Not Submitted']);
    }

    return res.json({
      success: true,
      report: {
        title: reportTitle,
        department: 'Information Technology Department',
        generatedAt: new Date().toLocaleString(),
        columns,
        rows
      }
    });

  } catch (error) {
    console.error('Get Report Data Error:', error);
    return res.status(500).json({ success: false, message: 'Error generating report payload.' });
  }
};

// Add/Impose Fine on a Student Record
exports.addFineToStudent = async (req, res) => {
  try {
    const { register_number, amount, reason } = req.body;

    if (!register_number || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid student register number and fine amount (₹) are required.' });
    }

    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [register_number]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const fineVal = parseFloat(amount);
    const fineReason = reason || 'Department Library Manual Dues Adjustment';

    // Ensure remarks column exists on borrow_records
    try {
      await query(`ALTER TABLE borrow_records ADD COLUMN remarks TEXT`);
    } catch (e) {
      // Column may already exist
    }

    // Insert borrow_records fine ledger entry
    await query(
      `INSERT INTO borrow_records (register_number, book_id, issue_date, due_date, return_date, status, fine_amount, fine_status, remarks)
       VALUES (?, ?, date('now'), date('now'), date('now'), 'Returned', ?, 'Unpaid', ?)`,
      [register_number, 'LIB-FINE-MANUAL', fineVal, fineReason]
    );

    // Send Notification to student
    await notifyStudentAndFA({
      registerNumber: register_number,
      title: 'Library Fine Imposed',
      studentMsg: `Department Library staff imposed a fine of ₹${fineVal}. Reason: ${fineReason}`,
      faMsg: `ADVISEE DUES WARNING: A library fine of ₹${fineVal} was imposed on your advisee ${student.full_name} (${register_number}). Reason: ${fineReason}`,
      type: 'warning'
    });

    return res.json({
      success: true,
      message: `Fine of ₹${fineVal} successfully imposed on student ${student.full_name} (${register_number}). Notifications sent to student and Faculty Advisor (${student.advisor_name}).`
    });

  } catch (error) {
    console.error('Add Fine Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error imposing fine on student.' });
  }
};

// Bulk Approve All Eligible No-Dues Requests
exports.bulkApproveNoDues = async (req, res) => {
  try {
    const staffId = req.user.username;
    const staff = await getOne('SELECT full_name FROM library_staff WHERE employee_id = ?', [staffId]);
    const approverName = staff ? `${staff.full_name} (IT Library Officer)` : 'IT Department Library Officer';

    // Get all pending Stage 3 requests
    const pendingStages = await query(`
      SELECT ns.request_id, nr.register_number, nr.request_number,
        (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.status = 'Issued') as pending_books,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = nr.register_number AND br.fine_status = 'Unpaid') as fine_amount
      FROM nodues_stages ns
      JOIN nodues_requests nr ON ns.request_id = nr.id
      WHERE ns.department_name = 'Department Library' AND ns.status = 'Pending'
    `);

    let approvedCount = 0;
    let blockedCount = 0;

    for (const item of pendingStages) {
      if (item.pending_books > 0 || item.fine_amount > 0) {
        blockedCount++;
        continue;
      }

      await query(
        `UPDATE nodues_stages 
         SET status = 'Approved', approved_by = ?, remarks = 'Bulk Approved by Department Library.', updated_at = NOW() 
         WHERE request_id = ? AND department_name = 'Department Library'`,
        [approverName, item.request_id]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [item.register_number, 'Department Library Approved', `Department Library has approved your No-Dues request ${item.request_number}.`, 'success']
      );

      // Check parallel clearances
      await updateRequestProgress(item.request_id);
      approvedCount++;
    }

    return res.json({
      success: true,
      message: `Bulk Approval Completed: ${approvedCount} eligible request(s) approved.${blockedCount > 0 ? ` ${blockedCount} request(s) skipped due to pending books/fines.` : ''}`
    });
  } catch (error) {
    console.error('Bulk Approve Library Error:', error);
    return res.status(500).json({ success: false, message: 'Error performing bulk library approval.' });
  }
};

// Update Library Metric Statistics (Total Books, Available, Borrowed, Pending Returns)
exports.updateLibraryMetrics = async (req, res) => {
  try {
    const { total_books, available_books, borrowed_books, pending_returns, reset_to_auto } = req.body;

    await query(`
      CREATE TABLE IF NOT EXISTS library_metrics (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_books INTEGER,
        available_books INTEGER,
        borrowed_books INTEGER,
        pending_returns INTEGER,
        is_custom INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (reset_to_auto) {
      await query(`DELETE FROM library_metrics WHERE id = 1`);
      return res.json({
        success: true,
        message: 'Library metric statistics reset to auto-calculated database totals.'
      });
    }

    const t = parseInt(total_books) || 0;
    const a = parseInt(available_books) || 0;
    const b = parseInt(borrowed_books) || 0;
    const p = parseInt(pending_returns) || 0;

    const existing = await getOne('SELECT id FROM library_metrics WHERE id = 1');
    if (existing) {
      await query(
        `UPDATE library_metrics 
         SET total_books = ?, available_books = ?, borrowed_books = ?, pending_returns = ?, is_custom = 1, updated_at = NOW()
         WHERE id = 1`,
        [t, a, b, p]
      );
    } else {
      await query(
        `INSERT INTO library_metrics (id, total_books, available_books, borrowed_books, pending_returns, is_custom)
         VALUES (1, ?, ?, ?, ?, 1)`,
        [t, a, b, p]
      );
    }

    return res.json({
      success: true,
      message: 'Library metric statistics updated successfully.'
    });

  } catch (error) {
    console.error('Update Library Metrics Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating library metrics.' });
  }
};
