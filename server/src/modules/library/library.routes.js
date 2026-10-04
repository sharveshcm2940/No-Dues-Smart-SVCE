const express = require('express');
const router = express.Router();

const libraryController = require('../../controllers/libraryController');
const mainLibraryController = require('../../controllers/mainLibraryController');
const finePaymentController = require('../../controllers/finePaymentController');

const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { requireRequestOwnership, requireStudentOrAdvisee } = require('../../middleware/authorizeResource');

// ============================================================================
// DOMAIN SERVICE: LIBRARY CATALOG & FINE PAYMENT SERVICE
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Department Library Operations
// ----------------------------------------------------------------------------
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
  requireRequestOwnership(),
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
  requireStudentOrAdvisee('regNo'),
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

// ----------------------------------------------------------------------------
// 2. Main Library (Central Library) Operations
// ----------------------------------------------------------------------------
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
  requireRequestOwnership(),
  mainLibraryController.processMainLibraryAction
);

router.post(
  '/main-library/bulk-approve',
  authenticateToken,
  authorizeRole(['main_library_staff']),
  mainLibraryController.bulkApproveMainLibrary
);

// ----------------------------------------------------------------------------
// 3. Fines Engine & Online Payment Gateway
// ----------------------------------------------------------------------------
router.get('/fines/rules', authenticateToken, finePaymentController.getFineRules);
router.post('/fines/calculate', authenticateToken, finePaymentController.calculateFine);
router.post(
  '/fines/mark-paid',
  authenticateToken,
  authorizeRole(['library_staff', 'finance', 'admin']),
  finePaymentController.markFinePaid
);
router.post('/fines/initiate-payment', authenticateToken, finePaymentController.initiateOnlinePayment);
router.post('/fines/verify-payment', authenticateToken, finePaymentController.verifyOnlinePayment);

module.exports = router;
