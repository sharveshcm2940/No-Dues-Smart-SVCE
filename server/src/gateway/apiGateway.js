const express = require('express');
const router = express.Router();

const authModule = require('../modules/auth');
const clearanceModule = require('../modules/clearance');
const libraryModule = require('../modules/library');
const complaintsModule = require('../modules/complaints');
const adminModule = require('../modules/admin');
const auditModule = require('../modules/audit');
const filesModule = require('../modules/files');

const { handleSSEConnection } = require('../utils/sse');
const { authenticateToken } = require('../middleware/auth');

// =========================================================================
// API GATEWAY: REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
// =========================================================================
router.get('/sse', handleSSEConnection);

// =========================================================================
// API GATEWAY: MODULAR DOMAIN SERVICES (MICROSERVICE-STYLE SEPARATION)
// =========================================================================

// 1. Authentication & Identity Service (/api/auth/*)
router.use('/auth', authModule.routes);

// 2. Clearance & Workflow State Machine Service (/api/clearance/* & /api/*)
router.use('/clearance', clearanceModule.routes);
router.use('/', clearanceModule.routes); // Backward compatibility flat mount

// 3. Library Catalog & Fine Payment Service (/api/library-service/* & /api/*)
router.use('/library-service', libraryModule.routes);
router.use('/', libraryModule.routes); // Backward compatibility flat mount

// 4. Unified Grievance & Complaint Desk Service (/api/complaint-service/* & /api/*)
router.use('/complaint-service', complaintsModule.routes);
router.use('/', complaintsModule.routes); // Backward compatibility flat mount

// 5. Institutional Administration Service (/api/admin-service/* & /api/*)
router.use('/admin-service', adminModule.routes);
router.use('/', adminModule.routes); // Backward compatibility flat mount

// 6. Cryptographic Audit & DPDP Compliance Service (/api/audit-service/* & /api/*)
router.use('/audit-service', auditModule.routes);
router.use('/', auditModule.routes); // Backward compatibility flat mount

// =========================================================================
// API GATEWAY: SECURE FILE STORAGE & RETRIEVAL
// =========================================================================
router.post(
  '/files/upload',
  authenticateToken,
  filesModule.fileUpload.uploadDocument.single('file'),
  filesModule.controller.uploadDocument
);
router.get(
  '/files/:fileId',
  authenticateToken,
  filesModule.controller.downloadFile
);

module.exports = router;
