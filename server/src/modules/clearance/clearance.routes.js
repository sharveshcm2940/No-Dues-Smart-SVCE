const express = require('express');
const router = express.Router();

const studentController = require('../../controllers/studentController');
const faController = require('../../controllers/faController');
const hodController = require('../../controllers/hodController');
const dpcController = require('../../controllers/dpcController');
const financeController = require('../../controllers/financeController');
const reopenController = require('../../controllers/reopenController');
const certificateController = require('../../controllers/certificateController');
const fileController = require('../../controllers/fileController');

const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { requireRequestOwnership, requireStudentOrAdvisee } = require('../../middleware/authorizeResource');
const { uploadPhoto } = require('../../utils/fileUpload');

// ============================================================================
// DOMAIN SERVICE: CLEARANCE & WORKFLOW STATE MACHINE
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Student Clearance Lifecycle & Dashboard
// ----------------------------------------------------------------------------
router.get(
  '/student/dashboard',
  authenticateToken,
  authorizeRole(['student']),
  studentController.getStudentDashboard
);

router.post(
  '/student/request-nodues',
  authenticateToken,
  authorizeRole(['student']),
  studentController.submitNoDuesRequest
);

router.post(
  '/student/cancel-nodues',
  authenticateToken,
  authorizeRole(['student']),
  requireRequestOwnership(),
  studentController.cancelNoDuesRequest
);

router.post(
  '/student/resubmit-nodues',
  authenticateToken,
  authorizeRole(['student']),
  requireRequestOwnership(),
  studentController.resubmitNoDuesRequest
);

router.get(
  '/student/audit-logs/:requestId',
  authenticateToken,
  requireRequestOwnership(),
  studentController.getAuditLogs
);

router.get(
  '/student/borrow-records',
  authenticateToken,
  authorizeRole(['student']),
  studentController.getBorrowRecords
);

router.get(
  '/student/complaints',
  authenticateToken,
  authorizeRole(['student']),
  studentController.getStudentComplaints
);

router.post(
  '/student/complaints',
  authenticateToken,
  authorizeRole(['student']),
  studentController.createComplaint
);

router.get('/student/announcements', authenticateToken, studentController.getAnnouncements);
router.get('/student/notifications', authenticateToken, studentController.getNotifications);

router.put(
  '/student/profile',
  authenticateToken,
  authorizeRole(['student']),
  studentController.updateProfile
);

router.post(
  '/student/profile-photo',
  authenticateToken,
  authorizeRole(['student']),
  uploadPhoto.single('photo'),
  fileController.uploadProfilePhoto
);

// ----------------------------------------------------------------------------
// 2. Faculty Advisor Stage Clearance
// ----------------------------------------------------------------------------
router.get(
  '/fa/dashboard',
  authenticateToken,
  authorizeRole(['faculty_advisor']),
  faController.getFADashboard
);

router.post(
  '/fa/process-nodues',
  authenticateToken,
  authorizeRole(['faculty_advisor']),
  requireRequestOwnership(),
  faController.processFAAction
);

router.post(
  '/fa/bulk-approve',
  authenticateToken,
  authorizeRole(['faculty_advisor']),
  faController.bulkApproveAdvisees
);

router.get(
  '/fa/students',
  authenticateToken,
  authorizeRole(['faculty_advisor']),
  faController.getAssignedStudents
);

router.post(
  '/fa/hall-ticket/update',
  authenticateToken,
  authorizeRole(['faculty_advisor']),
  faController.updateHallTicketStatus
);

router.get(
  '/fa/students/:regNo/detail',
  authenticateToken,
  authorizeRole(['faculty_advisor']),
  requireStudentOrAdvisee('regNo'),
  faController.getStudentHallTicketDetail
);

// ----------------------------------------------------------------------------
// 3. Department Placement Coordinator Stage Clearance
// ----------------------------------------------------------------------------
router.get(
  '/dpc/dashboard',
  authenticateToken,
  authorizeRole(['dpc']),
  dpcController.getDPCDashboard
);

router.post(
  '/dpc/process-nodues',
  authenticateToken,
  authorizeRole(['dpc']),
  requireRequestOwnership(),
  dpcController.processDPCAction
);

router.post(
  '/dpc/bulk-approve',
  authenticateToken,
  authorizeRole(['dpc']),
  dpcController.bulkApproveDPC
);

// ----------------------------------------------------------------------------
// 4. Finance Section Stage Clearance
// ----------------------------------------------------------------------------
router.get(
  '/finance/dashboard',
  authenticateToken,
  authorizeRole(['finance']),
  financeController.getFinanceDashboard
);

router.post(
  '/finance/process-nodues',
  authenticateToken,
  authorizeRole(['finance']),
  requireRequestOwnership(),
  financeController.processFinanceAction
);

router.post(
  '/finance/bulk-approve',
  authenticateToken,
  authorizeRole(['finance']),
  financeController.bulkApproveFinance
);

// ----------------------------------------------------------------------------
// 5. Head of Department Stage Clearance & Student Management
// ----------------------------------------------------------------------------
router.get(
  '/hod/dashboard',
  authenticateToken,
  authorizeRole(['hod']),
  hodController.getHODDashboard
);

router.post(
  '/hod/process-nodues',
  authenticateToken,
  authorizeRole(['hod']),
  requireRequestOwnership(),
  hodController.processHODAction
);

router.post(
  '/hod/bulk-approve',
  authenticateToken,
  authorizeRole(['hod']),
  hodController.bulkApproveHOD
);

router.post(
  '/hod/certificate/revoke',
  authenticateToken,
  authorizeRole(['hod', 'admin']),
  certificateController.revokeCertificate
);

router.post(
  '/hod/certificate/reissue',
  authenticateToken,
  authorizeRole(['hod', 'admin']),
  certificateController.reissueCertificate
);

router.post(
  '/hod/bulk-register-students',
  authenticateToken,
  authorizeRole(['hod']),
  hodController.bulkRegisterStudents
);

router.delete(
  '/hod/students/year/:year',
  authenticateToken,
  authorizeRole(['hod']),
  hodController.deleteStudentsByYear
);

router.delete(
  '/hod/students/all',
  authenticateToken,
  authorizeRole(['hod']),
  hodController.clearAllStudents
);

// ----------------------------------------------------------------------------
// 6. Stage Reopening Action
// ----------------------------------------------------------------------------
router.post(
  '/nodues/reopen-stage',
  authenticateToken,
  authorizeRole(['library_staff', 'dpc', 'main_library_staff', 'faculty_advisor', 'finance', 'hod', 'admin']),
  reopenController.reopenStageAction
);

// ----------------------------------------------------------------------------
// 7. Public Certificate Verification (Cryptographic Token / QR Code)
// ----------------------------------------------------------------------------
router.get('/verify/:token', certificateController.verifyCertificatePublic);
router.get('/certificate/verify/:token', certificateController.verifyCertificatePublic);

module.exports = router;
