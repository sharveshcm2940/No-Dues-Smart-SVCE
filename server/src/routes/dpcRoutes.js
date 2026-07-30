const express = require('express');
const router = express.Router();
const dpcController = require('../controllers/dpcController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/dashboard', verifyToken, checkRole(['dpc']), dpcController.getDPCDashboard);
router.post('/process-nodues', verifyToken, checkRole(['dpc']), dpcController.processDPCAction);

module.exports = router;
