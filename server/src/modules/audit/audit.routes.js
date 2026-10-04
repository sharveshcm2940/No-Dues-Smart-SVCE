const express = require('express');
const router = express.Router();

const auditLogController = require('../../controllers/auditLogController');
const consentController = require('../../controllers/consentController');

const { authenticateToken, authorizeRole } = require('../../middleware/auth');

// ============================================================================
// DOMAIN SERVICE: CRYPTOGRAPHIC AUDIT & DPDP 2023 COMPLIANCE
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Cryptographic Audit Log Trail & Verification
// ----------------------------------------------------------------------------
router.get('/audit-logs', authenticateToken, auditLogController.getAuditLogs);
router.post('/audit-logs', authenticateToken, auditLogController.recordClientAction);
router.get('/audit-logs/verify', authenticateToken, auditLogController.verifyAuditLogs);
router.get('/admin/audit-logs/verify', authenticateToken, auditLogController.verifyAuditLogs);
router.post('/admin/audit-logs/purge', authenticateToken, authorizeRole(['hod', 'admin']), consentController.purgeExpiredLogs);

// ----------------------------------------------------------------------------
// 2. DPDP Act 2023 Consent Management
// ----------------------------------------------------------------------------
router.get('/consent', authenticateToken, consentController.getUserConsents);
router.post('/consent', authenticateToken, consentController.recordConsent);

module.exports = router;
