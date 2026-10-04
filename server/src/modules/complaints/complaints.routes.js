const express = require('express');
const router = express.Router();

const complaintController = require('../../controllers/complaintController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

// ============================================================================
// DOMAIN SERVICE: UNIFIED COMPLAINTS & GRIEVANCE DESK
// ============================================================================

router.get('/complaints', authenticateToken, complaintController.getComplaints);
router.get('/complaints/:id', authenticateToken, complaintController.getComplaintDetails);
router.post('/complaints', authenticateToken, complaintController.createComplaint);

router.put(
  '/complaints/:id/assign',
  authenticateToken,
  authorizeRole(['library_staff', 'dpc', 'main_library_staff', 'faculty_advisor', 'finance', 'hod', 'admin']),
  complaintController.assignComplaint
);

router.put(
  '/complaints/:id/status',
  authenticateToken,
  authorizeRole(['library_staff', 'dpc', 'main_library_staff', 'faculty_advisor', 'finance', 'hod', 'admin']),
  complaintController.updateComplaintStatus
);

module.exports = router;
