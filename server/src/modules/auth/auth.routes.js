const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { authenticateToken } = require('../../middleware/auth');

// ============================================================================
// DOMAIN SERVICE: AUTHENTICATION & IDENTITY SERVICE
// ============================================================================

// Core Authentication & Session Lifecycles
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);

// Password Management & Recovery
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/password', authenticateToken, authController.updatePassword);

// MFA Endpoints (Backward compatibility stubs / institutional compliance)
router.post('/mfa/setup', authenticateToken, authController.setupMfa);
router.post('/mfa/enable', authenticateToken, authController.enableMfa);
router.post('/mfa/verify', authController.verifyMfa);

// Identity & Role Position Handover
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/handover', authenticateToken, authController.handoverPosition);

module.exports = router;
