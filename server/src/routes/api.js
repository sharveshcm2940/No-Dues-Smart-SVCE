const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const libraryController = require('../controllers/libraryController');
const faController = require('../controllers/faController');
const hodController = require('../controllers/hodController');
const dpcController = require('../controllers/dpcController');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Authentication Routes
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.post('/auth/password', authenticateToken, authController.updatePassword);

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

module.exports = router;
