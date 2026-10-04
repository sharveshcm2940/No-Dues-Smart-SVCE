const express = require('express');
const router = express.Router();

const adminController = require('../../controllers/adminController');
const bulkImportController = require('../../controllers/bulkImportController');

const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { uploadCsv } = require('../../utils/fileUpload');

// ============================================================================
// DOMAIN SERVICE: INSTITUTIONAL ADMINISTRATION & BULK INGESTION
// ============================================================================

// ----------------------------------------------------------------------------
// 1. User Administration & Security Controls
// ----------------------------------------------------------------------------
router.get('/admin/users', authenticateToken, authorizeRole(['admin']), adminController.getUsers);
router.post('/admin/users', authenticateToken, authorizeRole(['admin']), adminController.createUser);
router.put('/admin/users/:id', authenticateToken, authorizeRole(['admin']), adminController.updateUser);
router.post('/admin/users/:id/toggle-status', authenticateToken, authorizeRole(['admin']), adminController.toggleUserStatus);
router.post('/admin/users/:id/force-password-reset', authenticateToken, authorizeRole(['admin']), adminController.forcePasswordReset);
router.post('/admin/users/:id/unlock', authenticateToken, authorizeRole(['admin']), adminController.unlockUser);

// ----------------------------------------------------------------------------
// 2. Global System Settings
// ----------------------------------------------------------------------------
router.get('/admin/settings', authenticateToken, authorizeRole(['admin']), adminController.getSettings);
router.put('/admin/settings', authenticateToken, authorizeRole(['admin']), adminController.updateSettings);

// ----------------------------------------------------------------------------
// 3. High-Throughput Bulk Data Ingestion
// ----------------------------------------------------------------------------
router.post(
  '/admin/bulk-import/students',
  authenticateToken,
  authorizeRole(['admin']),
  uploadCsv.single('file'),
  bulkImportController.importStudents
);

router.post(
  '/admin/bulk-import/staff',
  authenticateToken,
  authorizeRole(['admin']),
  uploadCsv.single('file'),
  bulkImportController.importStaff
);

router.post(
  '/admin/bulk-import/borrow-records',
  authenticateToken,
  authorizeRole(['admin']),
  uploadCsv.single('file'),
  bulkImportController.importBorrowRecords
);

router.get(
  '/admin/bulk-import/template/:type',
  authenticateToken,
  authorizeRole(['admin']),
  bulkImportController.downloadTemplate
);

module.exports = router;
