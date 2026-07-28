const { query, getOne } = require('../config/db');

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
      ORDER BY nr.id DESC
    `);

    return res.json({
      success: true,
      data: {
        staff,
        stats: {
          totalBooks: totalBooks.total || 0,
          availableBooks: totalBooks.available || 0,
          borrowedBooks: totalBooks.issued || 0,
          pendingReturns: pendingReturns.count || 0,
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
       SET status = ?, approved_by = ?, remarks = ?, updated_at = datetime('now')
       WHERE request_id = ? AND department_name = 'Department Library'`,
      [newStatus, approverName, remarks || (action === 'Approve' ? 'Department Library clearance granted.' : 'Put on hold by Department Library.'), requestId]
    );

    // If Approved, update progress and unlock next stage (Faculty Advisor)
    if (action === 'Approve') {
      await query(
        `UPDATE nodues_stages SET status = 'Pending', remarks = 'Awaiting Faculty Advisor review.' 
         WHERE request_id = ? AND department_name = 'Faculty Advisor'`,
        [requestId]
      );

      await query(
        `UPDATE nodues_requests 
         SET progress_percentage = 66, current_stage = 'Faculty Advisor'
         WHERE id = ?`,
        [requestId]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'Department Library Approved', `Department Library has approved your No-Dues request ${request.request_number}.`, 'success']
      );
    } else if (action === 'Reject') {
      await query(
        `UPDATE nodues_requests SET overall_status = 'Rejected', current_stage = 'Department Library (Rejected)' WHERE id = ?`,
        [requestId]
      );

      await query(
        `INSERT INTO notifications (target_user, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [request.register_number, 'No-Dues Request Rejected', `Your No-Dues request ${request.request_number} was rejected by Department Library. Reason: ${remarks}`, 'danger']
      );
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
      ORDER BY s.id DESC
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
      `UPDATE complaints SET status = ?, reply = ?, assigned_to = ?, updated_at = datetime('now') WHERE id = ?`,
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

    let reportTitle = 'Enterprise System Report';
    let columns = [];
    let rows = [];

    if (type === 'books') {
      reportTitle = 'IT Department Library - Book Inventory Report';
      columns = ['Book ID', 'Title', 'Author', 'Publisher', 'Category', 'Shelf', 'Total', 'Available', 'Issued', 'Status'];
      const data = await query('SELECT * FROM books ORDER BY title ASC');
      rows = data.map(b => [b.book_id, b.title, b.author, b.publisher, b.category, b.shelf_number, b.total_copies, b.available_copies, b.issued_copies, b.status]);
    } else if (type === 'issued') {
      reportTitle = 'Issued Books & Active Circulation Report';
      columns = ['Reg Number', 'Book ID', 'Title', 'Issue Date', 'Due Date', 'Fine (₹)', 'Status'];
      const data = await query(`
        SELECT br.*, b.title 
        FROM borrow_records br 
        JOIN books b ON br.book_id = b.book_id 
        WHERE br.status = 'Issued'
      `);
      rows = data.map(b => [b.register_number, b.book_id, b.title, b.issue_date, b.due_date, b.fine_amount, b.status]);
    } else if (type === 'nodues') {
      reportTitle = 'Final Year No-Dues Clearance Applications Report';
      columns = ['Request ID', 'Reg Number', 'Student Name', 'Department', 'Current Stage', 'Overall Status', 'Progress (%)', 'Date'];
      const data = await query('SELECT * FROM nodues_requests ORDER BY id DESC');
      rows = data.map(n => [n.request_number, n.register_number, n.student_name, n.department, n.current_stage, n.overall_status, `${n.progress_percentage}%`, n.request_date]);
    } else if (type === 'fines') {
      reportTitle = 'Fine Collections & Unpaid Dues Audit Report';
      columns = ['Reg Number', 'Book ID', 'Issue Date', 'Due Date', 'Fine Amount (₹)', 'Fine Status'];
      const data = await query('SELECT * FROM borrow_records WHERE fine_amount > 0');
      rows = data.map(f => [f.register_number, f.book_id, f.issue_date, f.due_date, `₹${f.fine_amount}`, f.fine_status]);
    } else {
      reportTitle = 'IT Department No-Dues Master Summary Report';
      columns = ['Reg Number', 'Student Name', 'Dept', 'Year', 'Books Issued', 'Unpaid Fine', 'No-Dues Status'];
      const data = await query(`
        SELECT 
          s.register_number,
          s.full_name,
          s.department,
          s.year,
          (SELECT COUNT(*) FROM borrow_records br WHERE br.register_number = s.register_number AND br.status = 'Issued') as books_issued,
          (SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records br WHERE br.register_number = s.register_number AND br.fine_status = 'Unpaid') as fine_unpaid,
          (SELECT overall_status FROM nodues_requests nr WHERE nr.register_number = s.register_number ORDER BY id DESC LIMIT 1) as nodues_status
        FROM students s
      `);
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
