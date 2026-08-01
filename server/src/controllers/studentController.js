const { query, getOne } = require('../config/db');

// Get Student Dashboard Data
exports.getStudentDashboard = async (req, res) => {
  try {
    const regNo = req.user.username;

    // Student Profile
    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [regNo]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Borrowed Books count
    const borrowedBooks = await query(
      `SELECT br.*, b.title, b.author, b.shelf_number 
       FROM borrow_records br
       JOIN books b ON br.book_id = b.book_id
       WHERE br.register_number = ? AND br.status = 'Issued'`,
      [regNo]
    );

    // Total Fine accumulated
    const fineSum = await getOne(
      `SELECT SUM(fine_amount) as total_fine FROM borrow_records WHERE register_number = ? AND fine_status = 'Unpaid'`,
      [regNo]
    );

    // Active No-Dues Request & Stages
    const activeRequest = await getOne(
      `SELECT * FROM nodues_requests WHERE register_number = ? ORDER BY id DESC LIMIT 1`,
      [regNo]
    );

    let stages = [];
    let certificate = null;

    if (activeRequest) {
      stages = await query(
        `SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC`,
        [activeRequest.id]
      );

      // Check if 100% approved
      const allApproved = stages.length > 0 && stages.every(s => s.status === 'Approved');
      if (allApproved && !activeRequest.certificate_number) {
        const certNo = `CERT-SVCE-IT-2026-${String(activeRequest.id).padStart(4, '0')}`;
        await query(
          `UPDATE nodues_requests SET overall_status = 'Approved', progress_percentage = 100, current_stage = 'Completed', certificate_number = ?, completion_date = datetime('now') WHERE id = ?`,
          [certNo, activeRequest.id]
        );
        activeRequest.overall_status = 'Approved';
        activeRequest.progress_percentage = 100;
        activeRequest.current_stage = 'Completed';
        activeRequest.certificate_number = certNo;
      }
    }

    // Dept Library Clearance Status Calculation
    const deptLibraryStage = stages.find(s => s.department_name === 'Department Library');
    const deptLibraryStatus = deptLibraryStage ? deptLibraryStage.status : (borrowedBooks.length === 0 && (fineSum.total_fine || 0) === 0 ? 'Eligible' : 'Dues Pending');

    const approvedCount = stages.filter(s => s.status === 'Approved').length;
    const pendingCount = stages.filter(s => s.status === 'Pending').length;

    // All Approved Certificates (Current & Previous Terms)
    const approvedCertificates = await query(
      `SELECT * FROM nodues_requests WHERE register_number = ? AND overall_status = 'Approved' ORDER BY id DESC`,
      [regNo]
    );

    return res.json({
      success: true,
      data: {
        profile: student,
        metrics: {
          borrowedCount: borrowedBooks.length,
          pendingBooks: borrowedBooks.length,
          currentFine: fineSum.total_fine || 0,
          deptLibraryStatus,
          overallStatus: activeRequest ? activeRequest.overall_status : 'Not Submitted',
          activeRequestNumber: activeRequest ? activeRequest.request_number : null,
          approvedDepartments: approvedCount,
          pendingDepartments: pendingCount
        },
        activeRequest,
        approvedCertificates,
        stages,
        borrowedBooks
      }
    });

  } catch (error) {
    console.error('Student Dashboard Error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading student dashboard.' });
  }
};

// Submit No-Dues Request
exports.submitNoDuesRequest = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { 
      forceNew, 
      remarks,
      career_option,
      company_name,
      job_designation,
      ctc_package,
      offer_letter_url,
      higher_college_name,
      higher_degree,
      higher_app_form_url,
      higher_scorecard_url,
      higher_contact,
      exam_name,
      exam_reg_no,
      admit_card_url,
      exam_details,
      startup_name,
      business_idea,
      business_details,
      pitch_deck_url
    } = req.body || {};

    // Check if student has active request
    const existingReq = await getOne(
      `SELECT * FROM nodues_requests WHERE register_number = ? AND overall_status = 'In Progress'`,
      [regNo]
    );

    if (existingReq) {
      await query(`DELETE FROM nodues_stages WHERE request_id = ?`, [existingReq.id]);
      await query(`DELETE FROM nodues_requests WHERE id = ?`, [existingReq.id]);
    }

    const student = await getOne('SELECT * FROM students WHERE register_number = ?', [regNo]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const maxIdRow = await getOne('SELECT MAX(id) as max_id FROM nodues_requests');
    const nextNum = (maxIdRow && maxIdRow.max_id ? maxIdRow.max_id : 0) + 1;
    const reqNum = `NDR-2026-${String(nextNum).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

    const newReq = await query(
      `INSERT INTO nodues_requests (
        request_number, register_number, student_name, id_card_number, department, year, overall_status, progress_percentage, current_stage,
        career_option, company_name, job_designation, ctc_package, offer_letter_url,
        higher_college_name, higher_degree, higher_app_form_url, higher_scorecard_url, higher_contact,
        exam_name, exam_reg_no, admit_card_url, exam_details,
        startup_name, business_idea, business_details, pitch_deck_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqNum, regNo, student.full_name, student.id_card_number, student.department, student.year, 'In Progress', 16, 'All Sections Review',
        career_option || null, company_name || null, job_designation || null, ctc_package || null, offer_letter_url || null,
        higher_college_name || null, higher_degree || null, higher_app_form_url || null, higher_scorecard_url || null, higher_contact || null,
        exam_name || null, exam_reg_no || null, admit_card_url || null, exam_details || null,
        startup_name || null, business_idea || null, business_details || null, pitch_deck_url || null
      ]
    );

    const stages = [
      { name: 'Finance', order: 1, status: 'Pending', approved_by: null, remarks: 'Awaiting Finance clearance review.' },
      { name: 'Central Library', order: 2, status: 'Pending', approved_by: null, remarks: 'Awaiting Central Library clearance review.' },
      { name: 'Department Library', order: 3, status: 'Pending', approved_by: null, remarks: remarks || 'Awaiting Department Library clearance review.' },
      { name: 'Faculty Advisor', order: 4, status: 'Pending', approved_by: null, remarks: 'Awaiting Faculty Advisor review.' },
      { name: 'DPC', order: 5, status: 'Pending', approved_by: null, remarks: career_option ? `Awaiting DPC verification of Career Option: ${career_option}` : 'Awaiting DPC / placement verification.' },
      { name: 'HOD', order: 6, status: 'Pending', approved_by: null, remarks: 'Awaiting HOD final review.' }
    ];

    for (const s of stages) {
      await query(
        `INSERT INTO nodues_stages (request_id, department_name, stage_order, status, updated_at, approved_by, remarks)
         VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`,
        [newReq.lastID, s.name, s.order, s.status, s.approved_by, s.remarks]
      );
    }

    await query(
      `INSERT INTO notifications (target_user, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [regNo, 'No-Dues Request Submitted', `Your No-Dues request ${reqNum} was submitted successfully.`, 'success']
    );

    return res.json({
      success: true,
      message: `No-Dues Request ${reqNum} submitted successfully!`,
      requestNumber: reqNum
    });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit No-Dues request.' });
  }
};

// Cancel No-Dues Request (before final processing)
exports.cancelNoDuesRequest = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { requestId } = req.body;

    const request = await getOne(
      `SELECT * FROM nodues_requests WHERE id = ? AND register_number = ?`,
      [requestId, regNo]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request record not found.' });
    }

    if (request.overall_status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Approved requests cannot be cancelled.' });
    }

    await query(`DELETE FROM nodues_stages WHERE request_id = ?`, [requestId]);
    await query(`DELETE FROM nodues_requests WHERE id = ?`, [requestId]);

    return res.json({ success: true, message: 'No-Dues request has been cancelled successfully.' });
  } catch (error) {
    console.error('Cancel Request Error:', error);
    return res.status(500).json({ success: false, message: 'Error cancelling request.' });
  }
};

// Get Borrowed Books & Borrow History
exports.getBorrowRecords = async (req, res) => {
  try {
    const regNo = req.user.username;

    const activeBooks = await query(
      `SELECT br.*, b.title, b.author, b.publisher, b.category, b.shelf_number
       FROM borrow_records br
       JOIN books b ON br.book_id = b.book_id
       WHERE br.register_number = ? AND br.status = 'Issued'
       ORDER BY br.due_date ASC`,
      [regNo]
    );

    const history = await query(
      `SELECT br.*, b.title, b.author, b.publisher, b.category
       FROM borrow_records br
       JOIN books b ON br.book_id = b.book_id
       WHERE br.register_number = ? AND br.status = 'Returned'
       ORDER BY br.return_date DESC`,
      [regNo]
    );

    return res.json({
      success: true,
      data: {
        activeBooks,
        history
      }
    });

  } catch (error) {
    console.error('Get Borrow Records Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching borrow records.' });
  }
};

// Complaint Registration & Management
exports.getStudentComplaints = async (req, res) => {
  try {
    const regNo = req.user.username;
    const complaints = await query(
      `SELECT * FROM complaints WHERE register_number = ? ORDER BY id DESC`,
      [regNo]
    );
    return res.json({ success: true, complaints });
  } catch (error) {
    console.error('Get Complaints Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching complaints.' });
  }
};

exports.createComplaint = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { category, title, description, priority, attachmentUrl } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ success: false, message: 'Category, Title, and Description are required.' });
    }

    const student = await getOne('SELECT full_name FROM students WHERE register_number = ?', [regNo]);
    const count = await getOne('SELECT COUNT(*) as count FROM complaints');
    const cmpId = `CMP-IT-2026-${String(count.count + 1).padStart(2, '0')}`;

    await query(
      `INSERT INTO complaints (complaint_id, register_number, student_name, category, title, description, attachment_url, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cmpId, regNo, student.full_name, category, title, description, attachmentUrl || null, priority || 'Medium', 'Open']
    );

    return res.json({ success: true, message: 'Complaint registered successfully.', complaintId: cmpId });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    return res.status(500).json({ success: false, message: 'Error registering complaint.' });
  }
};

// Get Announcements Feed
exports.getAnnouncements = async (req, res) => {
  try {
    const list = await query(
      `SELECT * FROM announcements WHERE status = 'Published' ORDER BY is_pinned DESC, id DESC`
    );
    return res.json({ success: true, announcements: list });
  } catch (error) {
    console.error('Get Announcements Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading announcements.' });
  }
};

// Get User Notifications (Student, FA, Staff, DPC, HOD)
exports.getNotifications = async (req, res) => {
  try {
    const username = req.user.username;
    const role = req.user.role;

    let possibleTargets = [username];

    if (role === 'student') {
      const student = await getOne('SELECT register_number, email FROM students WHERE user_id = ? OR register_number = ?', [req.user.id, username]);
      if (student) {
        if (student.register_number) possibleTargets.push(student.register_number);
        if (student.email) possibleTargets.push(student.email);
      }
    } else if (role === 'faculty_advisor') {
      const fa = await getOne('SELECT employee_id, email, full_name FROM faculty_advisors WHERE user_id = ? OR employee_id = ?', [req.user.id, username]);
      if (fa) {
        if (fa.employee_id) possibleTargets.push(fa.employee_id);
        if (fa.email) possibleTargets.push(fa.email);
        if (fa.full_name) possibleTargets.push(fa.full_name);
      }
    }

    // Remove duplicates and empty values
    possibleTargets = [...new Set(possibleTargets.filter(Boolean))];

    const placeholders = possibleTargets.map(() => '?').join(',');
    const list = await query(
      `SELECT * FROM notifications WHERE target_user IN (${placeholders}) ORDER BY id DESC LIMIT 30`,
      possibleTargets
    );

    return res.json({ success: true, notifications: list });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return res.status(500).json({ success: false, message: 'Error loading notifications.' });
  }
};

// Update Profile Details (Phone Number, Photo)
exports.updateProfile = async (req, res) => {
  try {
    const regNo = req.user.username;
    const { phone, photoUrl } = req.body;

    if (phone) {
      await query(`UPDATE students SET phone = ? WHERE register_number = ?`, [phone, regNo]);
    }
    if (photoUrl) {
      await query(`UPDATE students SET photo_url = ? WHERE register_number = ?`, [photoUrl, regNo]);
    }

    return res.json({ success: true, message: 'Profile details updated successfully.' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating profile details.' });
  }
};
