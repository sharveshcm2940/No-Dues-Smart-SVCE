const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const libraryController = require('../controllers/libraryController');
const faController = require('../controllers/faController');
const hodController = require('../controllers/hodController');
const dpcController = require('../controllers/dpcController');
const financeController = require('../controllers/financeController');
const mainLibraryController = require('../controllers/mainLibraryController');
const auditLogController = require('../controllers/auditLogController');
const certificateController = require('../controllers/certificateController');
const fileController = require('../controllers/fileController');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { uploadDocument, uploadPhoto } = require('../utils/fileUpload');
const { handleSSEConnection } = require('../utils/sse');

// Server-Sent Events (SSE) Real-Time Stream Endpoint
router.get('/sse', handleSSEConnection);

// System Audit Logs (Available across all 7 dashboards with device name, device type, location)
router.get('/audit-logs', authenticateToken, auditLogController.getAuditLogs);
router.post('/audit-logs', authenticateToken, auditLogController.recordClientAction);

// Authentication Routes
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authenticateToken, authController.logout);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/mfa/setup', authenticateToken, authController.setupMfa);
router.post('/auth/mfa/enable', authenticateToken, authController.enableMfa);
router.post('/auth/mfa/verify', authController.verifyMfa);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.post('/auth/password', authenticateToken, authController.updatePassword);
router.post('/auth/handover', authenticateToken, authController.handoverPosition);

// Public Certificate Verification (Strict field isolation, rate-limited)
router.get('/verify/:token', certificateController.verifyCertificatePublic);
router.get('/certificate/verify/:token', certificateController.verifyCertificatePublic);

// Secure File Management
router.post(
  '/files/upload',
  authenticateToken,
  uploadDocument.single('file'),
  fileController.uploadDocument
);
router.get(
  '/files/:fileId',
  authenticateToken,
  fileController.downloadFile
);
router.post(
  '/student/profile-photo',
  authenticateToken,
  authorizeRole(['student']),
  uploadPhoto.single('photo'),
  fileController.uploadProfilePhoto
);

// Student Portal Routes (Role: student)
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
  studentController.cancelNoDuesRequest
);

router.post(
  '/student/resubmit-nodues',
  authenticateToken,
  authorizeRole(['student']),
  studentController.resubmitNoDuesRequest
);

router.get(
  '/student/audit-logs/:requestId',
  authenticateToken,
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

// Department Library Staff Routes (Role: library_staff)
router.get(
  '/library/dashboard',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.getLibraryDashboard
);

router.post(
  '/library/process-nodues',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.processNoDuesAction
);

router.post(
  '/library/add-fine',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.addFineToStudent
);

router.post(
  '/library/update-metrics',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.updateLibraryMetrics
);

router.get(
  '/library/books',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.getBooks
);

router.post(
  '/library/books',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.addBook
);

router.put(
  '/library/books/:id',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.updateBook
);

router.delete(
  '/library/books/:id',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.deleteBook
);

router.get(
  '/library/students',
  authenticateToken,
  authorizeRole(['library_staff', 'faculty_advisor', 'hod']),
  libraryController.getStudentRecords
);

router.get(
  '/library/students/:regNo',
  authenticateToken,
  authorizeRole(['library_staff', 'faculty_advisor', 'hod']),
  libraryController.getStudentDetail
);

router.get(
  '/library/complaints',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.getAllComplaints
);

router.put(
  '/library/complaints/:id',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.updateComplaintStatus
);

router.post(
  '/library/announcements',
  authenticateToken,
  authorizeRole(['library_staff', 'hod']),
  libraryController.createAnnouncement
);

router.delete(
  '/library/announcements/:id',
  authenticateToken,
  authorizeRole(['library_staff', 'hod']),
  libraryController.deleteAnnouncement
);

router.get(
  '/library/reports',
  authenticateToken,
  authorizeRole(['library_staff', 'faculty_advisor', 'hod']),
  libraryController.getReportData
);

router.post(
  '/library/bulk-approve',
  authenticateToken,
  authorizeRole(['library_staff']),
  libraryController.bulkApproveNoDues
);

// Faculty Advisor Routes (Role: faculty_advisor)
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
  faController.getStudentHallTicketDetail
);

// Head of Department Routes (Role: hod)
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

// Department Placement Coordinator Routes (Role: dpc)
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
  dpcController.processDPCAction
);

router.post(
  '/dpc/bulk-approve',
  authenticateToken,
  authorizeRole(['dpc']),
  dpcController.bulkApproveDPC
);

// Finance Officer Routes (Role: finance)
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
  financeController.processFinanceAction
);

router.post(
  '/finance/bulk-approve',
  authenticateToken,
  authorizeRole(['finance']),
  financeController.bulkApproveFinance
);

// Main Library / Central Library Routes (Role: main_library_staff)
router.get(
  '/main-library/dashboard',
  authenticateToken,
  authorizeRole(['main_library_staff']),
  mainLibraryController.getMainLibraryDashboard
);

router.post(
  '/main-library/process-nodues',
  authenticateToken,
  authorizeRole(['main_library_staff']),
  mainLibraryController.processMainLibraryAction
);

router.post(
  '/main-library/bulk-approve',
  authenticateToken,
  authorizeRole(['main_library_staff']),
  mainLibraryController.bulkApproveMainLibrary
);

module.exports = router;
