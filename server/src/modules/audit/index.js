const auditRoutes = require('./audit.routes');
const auditLogController = require('../../controllers/auditLogController');
const consentController = require('../../controllers/consentController');
const auditChain = require('../../utils/auditChain');
const auditLogger = require('../../utils/auditLogger');

module.exports = {
  routes: auditRoutes,
  controllers: {
    auditLog: auditLogController,
    consent: consentController
  },
  auditChain,
  auditLogger
};
